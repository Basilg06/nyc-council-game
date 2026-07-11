import { runCouncilElectionMut } from "./elections";

function adj(s, deltas) {
  for (const [k, d] of Object.entries(deltas)) {
    s.factionApproval[k] = Math.max(0, Math.min(100, s.factionApproval[k] + d));
  }
}

// Determine the Democratic primary winner based on endorsement and group state.
function determineGovPrimary(s) {
  let hochul  = 100;
  let delgado = 50;
  let salazar = 25;

  if (s.flags.endorsedGov === "hochul")   hochul  += 30;
  if (s.flags.endorsedGov === "delgado")  delgado += 30;
  if (s.flags.endorsedGov === "salazar")  salazar += 50;

  const wfpStrength  = s.groups.wfp.approval       * (s.influence?.groups?.wfp       ?? 1.0);
  const tenStrength  = s.groups.tenantBloc.approval * (s.influence?.groups?.tenantBloc ?? 1.0);
  const dsaStrength  = s.factionApproval.dsa        * (s.influence?.factions?.dsa      ?? 1.0);

  if (wfpStrength >= 70)  { delgado += 30; salazar += 20; }
  else if (wfpStrength >= 55) { delgado += 20; salazar += 10; }

  if (tenStrength >= 60)  { delgado += 15; salazar += 10; }
  if (dsaStrength >= 65)  { salazar += 25; }

  if (s.resources.budget >= 0) hochul += 10;
  if (s.flags.backedMenin)     hochul += 10;
  if (s.flags.backedHudson)    salazar += 15;

  if (salazar >= hochul && salazar >= delgado) return "salazar";
  if (delgado > hochul)                        return "delgado";
  return "hochul";
}

// Determine the November general election winner.
function determineGovGeneral(s, primary) {
  const demBase    = primary === "hochul" ? 75 : primary === "delgado" ? 60 : 55;
  let blakeman     = 60;
  let dem          = demBase;

  if (s.flags.endorsedGov === "blakeman") blakeman += 15;
  else if (s.flags.endorsedGov === primary) dem += 10;

  const pbaStrength = s.groups.pba.approval * (s.influence?.groups?.pba ?? 1.0);
  if (pbaStrength >= 60) blakeman += 10;

  return blakeman > dem ? "blakeman" : primary;
}

// Compute endorsement power from the groups that amplify this endorsement.
// weights = { groupKey: 0–1, ... } summing to 1.0
// Returns a multiplier (typically 0.5–2.0).
function endorsementPower(s, weights) {
  let total = 0;
  for (const [key, w] of Object.entries(weights)) {
    const groupApproval = s.groups[key]?.approval ?? 50;
    const groupInfluence = s.influence?.groups?.[key] ?? 1.0;
    total += groupApproval * groupInfluence * w;
  }
  return total / 50;
}

// Apply endorsement effects scaled by power.
// effects = { factions: {k: delta}, groups: {k: delta}, influence: { groups: {}, factions: {} } }
// Approval deltas are multiplied by power; influence shifts are flat.
function applyEndorsement(s, power, effects) {
  for (const [k, d] of Object.entries(effects.factions ?? {})) {
    s.factionApproval[k] = Math.max(0, Math.min(100, s.factionApproval[k] + Math.round(d * power)));
  }
  for (const [k, d] of Object.entries(effects.groups ?? {})) {
    s.groups[k].approval = Math.max(0, Math.min(100, s.groups[k].approval + Math.round(d * power)));
  }
  if (s.influence) {
    for (const [k, d] of Object.entries(effects.influence?.groups ?? {})) {
      s.influence.groups[k] = Math.max(0, (s.influence.groups[k] ?? 1.0) + d);
    }
    for (const [k, d] of Object.entries(effects.influence?.factions ?? {})) {
      s.influence.factions[k] = Math.max(0, (s.influence.factions[k] ?? 1.0) + d);
    }
  }
}

const MENIN_FX  = { establishment: +10, centrist: +6, felder: +4, republican: +5, progressive: -5, dsa: -10, leftWfp: -8 };
const HUDSON_FX = { dsa: +12, leftWfp: +10, progressive: +6, establishment: -10, centrist: -7, felder: -5, republican: -8, farRight: -5 };
const CARR_FX   = { republican: +15, farRight: +12, felder: +8, dsa: -12, leftWfp: -10, progressive: -8, establishment: -6, centrist: -4 };

export const SCENES = {
  intro: {
    type: "chamber_action",
    prompt: "January 2026 — You have just been sworn in as Mayor of New York City.",
    buttonText: "Enter the Mayor's Office", next: "call_hochul",
  },

  call_hochul: {
    type: "phone_call", speaker: "hochul",
    lines: [
      "Mayor — congratulations. New York City made the right call.",
      "I want to make sure we start this relationship right. The state has real capacity to help the city succeed. That capacity flows when Albany and City Hall are aligned. We've seen what happens when they aren't.",
      "I wish you the best of luck.",
    ],
    choices: [
      {
        text: "\"Appreciate the call Governor. Excited to be working with you.\"",
        next: "call_trump",
        effect: (s) => {
          s.figures.hochul.approval = Math.min(100, s.figures.hochul.approval + 8);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 4);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
        },
      },
      {
        text: "\"Thank you. We will have a lot to discuss.\"",
        next: "call_trump",
        effect: (s) => {
          s.figures.hochul.approval = Math.min(100, s.figures.hochul.approval + 3);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 4);
        },
      },
      {
        text: "\"If NYC made the right call, where was your endorsement?\"",
        next: "call_trump",
        effect: (s) => {
          s.figures.hochul.approval = Math.max(0, s.figures.hochul.approval - 4);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 5);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 4);
          s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 5);
        },
      },
    ],
  },

  call_trump: {
    type: "phone_call", speaker: "trump",
    decline: {
      next: "call_tisch",
      effect: (s) => {
        s.figures.trump.approval = Math.max(0, s.figures.trump.approval - 10);
        s.factionApproval.dsa        = Math.min(100, s.factionApproval.dsa        + 6);
        s.factionApproval.progressive= Math.min(100, s.factionApproval.progressive+ 5);
        s.factionApproval.republican = Math.max(0,   s.factionApproval.republican - 4);
      },
    },
    turns: [
      {
        lines: ['"Congrats."'],
        choices: [
          {
            text: '"Thank you Mr. President!"',
            effect: (s) => { s.figures.trump.approval = Math.min(100, s.figures.trump.approval + 4); },
          },
          { text: '"..."' },
        ],
      },
      {
        lines: [
          '"This is where I\'m from, I\'m sure you know."',
          '"I\'ve spent a long long time here."',
        ],
        choices: [
          {
            text: '"Of course Mr. President. It\'s the best city in the world."',
            effect: (s) => {
              s.figures.trump.approval = Math.min(100, s.figures.trump.approval + 4);
              s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2);
            },
          },
          { text: '"..."' },
        ],
      },
      {
        lines: ['"So don\'t fuck it up."'],
        choices: [
          { text: '"..."', next: "call_tisch" },
        ],
      },
    ],
  },

  call_tisch: {
    type: "phone_call", speaker: "tisch",
    lines: [
      "Mayor, congratulations. I'll keep this short, I know your schedule today.",
      "I'm the Police Commissioner. Crime is down, we have a reform agenda I believe is achievable, and I want to make sure we're on the same page before things get complicated.",
      "This job is hard, and you need allies.",
      "So if you swing,",
      "don't miss."
    ],
    choices: [
      {
        text: "\"Understood....\"",
        next: "swearing_in_week",
        effect: (s) => {
          s.flags.metTisch = true;
          s.figures.tisch.approval = Math.min(100, s.figures.tisch.approval + 6);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
        },
      },
      {
        text: "\"We'll see.\"",
        next: "swearing_in_week",
        effect: (s) => {
          s.figures.tisch.approval = Math.min(100, s.figures.tisch.approval - 3);
        },
      },
      {
        text: "\"Actually — I want your resignation on my desk tonight.\"",
        next: "tisch_fired_react",
        effect: (s) => {
          s.flags.firedTisch = true;
          s.figures.tisch.approval = 12;
          s.figures.tisch.role = "Former NYPD Commissioner";
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 15);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 5);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 6);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 6);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 4);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 4);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 3);
        },
      },
    ],
  },

  tisch_fired_react: {
    type: "dialogue", speaker: "tisch",
    lines: [
      '"...Huh."',
      '"Four months stabilizing this department, and the new administration\'s first act is a beheading. The deputy mayors said you might be reckless. I told them you\'d at least be smart about it."',
      '"You\'ll have my letter within the hour. And Mr. Mayor — you just swung."',
      '"Don\'t miss."',
    ],
    choices: [
      { text: "Next order of business.", next: "blue_flu" },
    ],
  },

  blue_flu: {
    type: "dialogue", speaker: "park", urgent: true,
    lines: [
      "It started on the overnight in the four-eight in the Bronx. By this morning's shift change, sixty-two percent of patrol is out sick citywide.",
      "PBA President Frank Doran was on the radio at seven. Quote: 'There's a bug going around. Something about job security.' End quote.",
      "The Taylor Law makes striking illegal for uniformed officers — so officially, this isn't a strike. It's the flu. Meanwhile response time in Brownsville is forty-one minutes and the tabloids are doing live shots outside empty precinct houses.",
      "You fired their commissioner. This is the answer. How do you respond?",
    ],
    choices: [
      {
        text: "Invoke the Taylor Law. Dock pay, suspend the organizers, terminate repeat no-shows.",
        next: "strike_bombing",
        effect: (s) => {
          s.flags.strike2026 = "crackdown";
          s.approval = Math.max(0, s.approval - 3);
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 12);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 5);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 6);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 5);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 3);
        },
      },
      {
        text: "Bring the PBA to the table. Back pay, and a voice in choosing the next commissioner.",
        next: "strike_resolution",
        effect: (s) => {
          s.flags.strike2026 = "negotiated";
          s.resources.budget -= 3;
          s.approval = Math.max(0, s.approval - 4);
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 10);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 3);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 3);
        },
      },
      {
        text: "No negotiations with an illegal action. Hold the line and wait them out.",
        next: "strike_resolution",
        effect: (s) => {
          s.flags.strike2026 = "waited";
          s.approval = Math.max(0, s.approval - 6);
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 6);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 3);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 3);
        },
      },
    ],
  },

  strike_bombing: {
    type: "dialogue", speaker: "park", urgent: true,
    lines: [
      "Three nights after the first termination letters went out — 3 AM. An explosion at the Property Clerk's warehouse in Long Island City.",
      "The building was empty. No one hurt. But the evidence storage for four active corruption cases went up with it — including two against officers you just terminated.",
      "No one has claimed it. The PBA condemned it 'in the strongest terms' — in the same statement noting that 'morale has never been lower and the city was warned.'",
      "ATF wants in. The arson squad is already on scene — which means, and I want to be precise about this, the department is investigating itself.",
    ],
    choices: [
      {
        text: "Go on camera. Put this at the union leadership's feet.",
        next: "strike_resolution",
        effect: (s) => {
          s.flags.strikeBomb = "blamed";
          s.approval = Math.max(0, s.approval - 2);
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 10);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 8);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 4);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 4);
        },
      },
      {
        text: "Call for calm. Let the investigation work — and say nothing you can't prove.",
        next: "strike_resolution",
        effect: (s) => {
          s.flags.strikeBomb = "calm";
          s.approval = Math.min(100, s.approval + 2);
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 3);
        },
      },
      {
        text: "Hand the case to the FBI. The department can't investigate itself.",
        next: "strike_resolution",
        effect: (s) => {
          s.flags.strikeBomb = "federal";
          s.figures.trump.approval = Math.min(100, s.figures.trump.approval + 4);
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 6);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 3);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2);
        },
      },
    ],
  },

  strike_resolution: {
    type: "dialogue", speaker: "park",
    lines: [
      (s) => {
        if (s.flags.strike2026 === "negotiated")
          return "The sick-out ended in six days. The settlement cost you three budget points, a seat at the commissioner search for the union, and — let's be honest — the appearance of control. But the cars are back on patrol.";
        if (s.flags.strike2026 === "waited")
          return "Eleven days. Crime stats you don't want to read, a tabloid clock counting 'DAYS WITHOUT A MAYOR IN CONTROL,' and then it just — ended. Cops drifted back. Nothing was resolved. Everything was noted.";
        // crackdown
        return s.flags.strikeBomb
          ? "After nineteen days the sick-out collapsed. The terminations stood. The department came back to work — but make no mistake, it did not come back to you."
          : "The crackdown broke the sick-out in nineteen days.";
      },
      (s) => {
        if (s.flags.strikeBomb === "blamed")
          return "The warehouse case is open. Your accusation is on tape, unproven, and playing on a loop in every precinct locker room in the city.";
        if (s.flags.strikeBomb === "calm")
          return "The warehouse case is open. Your restraint bought you something with the rank and file — not forgiveness, but something.";
        if (s.flags.strikeBomb === "federal")
          return "The FBI took the warehouse case. The White House noticed you asked. So did every cop in the city.";
        return "The department has an interim commissioner, a grievance list, and a long memory.";
      },
      "Now — the Council still needs a Speaker, and that fight didn't pause for any of this.",
    ],
    choices: [
      { text: "Back to work.", next: "paper_strike" },
    ],
  },

  swearing_in_week: {
    type: "time_pass",
    months: ["January"],
    year: "2026",
    next: "desk_jan2026",
  },

  desk_jan2026: {
    type: "office",
    month: "JANUARY 2026",
    maxItems: 2,
    headline: "First full week. Everyone in the city wants a piece of your calendar, and the Speaker vote is three weeks out. Time for two of these — choose what kind of mayor you are.",
    inbox: [
      {
        id: "jan_hochul",
        label: "Albany — the Governor's sit-down",
        desc: "Hochul asked for this on the congratulations call. Her people have proposed three dates. They're counting.",
        next: "hochul_sitdown",
        done: (s) => !!s.flags.metHochul,
      },
      {
        id: "jan_tisch",
        label: "One Police Plaza — the reform briefing",
        show: (s) => !s.flags.firedTisch,
        desc: "Tisch's promised briefing document arrived at 7 AM, tabbed and indexed. She wants an hour to walk you through it.",
        next: "tisch_briefing",
        done: (s) => !!s.flags.tischBriefing,
      },
      {
        id: "jan_doran",
        label: "PBA — Frank Doran wants a meeting",
        show: (s) => !s.flags.firedTisch,
        desc: "The union president. The patrol contract expired fourteen months ago, and he'd rather size you up in person.",
        next: "doran_grievance",
        done: (s) => !!s.flags.metDoran,
      },
      {
        id: "jan_rats",
        label: "Kathleen Corradi — the rat czar — wants five minutes",
        desc: "The citywide director of rodent mitigation, an Adams appointee who survived the transition. She has a pilot program, a slide deck, and — reportedly — props.",
        next: "rat_czar",
        done: (s) => !!s.flags.metRatCzar,
      },
    ],
    next: "month1_brief",
    nextLabel: "TO THE SPEAKER FIGHT",
  },

  hochul_sitdown: {
    type: "dialogue", speaker: "hochul",
    lines: [
      (s) => s.figures.hochul.approval >= 45
        ? "Thanks for making the time, Mayor. I meant what I said on the phone — this works better when we work it together."
        : "Mayor. I'll be honest — I wasn't sure this meeting was going to happen. Let's use it.",
      "Here's my opening: the state has four hundred million in discretionary housing capital that needs a city partner by spring. I'd rather announce it standing next to you than spend it upstate.",
      "What I need back is simple. When Albany takes a hit in your press room, I need it to be aimed at the legislature — not at me.",
    ],
    choices: [
      {
        text: "\"Partner on the housing money. And I can live with that arrangement.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metHochul = true;
          s.figures.hochul.approval = Math.min(100, s.figures.hochul.approval + 6);
          s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 3);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 3);
        },
      },
      {
        text: "\"I'll take the money. The press room stays mine.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metHochul = true;
          s.figures.hochul.approval = Math.min(100, s.figures.hochul.approval + 1);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 2);
        },
      },
      {
        text: "\"Vouchers first. The housing capital is a press release — voucher reform is the ballgame.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metHochul = true;
          s.figures.hochul.approval = Math.max(0, s.figures.hochul.approval - 4);
          s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 6);
          s.groups.wfp.approval = Math.min(100, s.groups.wfp.approval + 3);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 3);
        },
      },
    ],
  },

  tisch_briefing: {
    type: "dialogue", speaker: "tisch",
    lines: [
      "An hour, as promised. Three things in the folder worth your attention.",
      "One: precision policing metrics — we can keep crime falling without the stop numbers that get this city sued. Two: a disciplinary docket I want to clear in ninety days, before the union turns it into a siege. Three: overtime. It's a runaway train, and every mayor before you decided it was next year's problem.",
      "I can execute all three. What I can't do is execute them while being contradicted from the podium. So — do I have the room?",
    ],
    choices: [
      {
        text: "\"You have the room. All three.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.tischBriefing = true;
          s.figures.tisch.approval = Math.min(100, s.figures.tisch.approval + 6);
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 2);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2);
        },
      },
      {
        text: "\"Run the metrics and the docket. Overtime waits for the budget.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.tischBriefing = true;
          s.figures.tisch.approval = Math.min(100, s.figures.tisch.approval + 3);
        },
      },
      {
        text: "\"I'll read the folder. Don't get ahead of me, Commissioner.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.tischBriefing = true;
          s.figures.tisch.approval = Math.max(0, s.figures.tisch.approval - 3);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 2);
        },
      },
    ],
  },

  doran_grievance: {
    type: "dialogue", speaker: "doran",
    lines: [
      "Appreciate the time, Mr. Mayor. I'll skip the flowers.",
      "My members have worked fourteen months without a contract. Fourteen. The last administration ran out the clock, and the one before that ran out the clock, and every year the academy classes get smaller and the exits get bigger.",
      "I'm not asking you to sign anything today. I'm asking whether the PBA is dealing with a mayor — or with another clock.",
    ],
    choices: [
      {
        text: "\"Reopen the contract talks. This quarter.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metDoran = true;
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 6);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 3);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 2);
        },
      },
      {
        text: "\"You're dealing with a mayor. After the budget, you're first in line.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metDoran = true;
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 2);
        },
      },
      {
        text: "\"Every union in this city is in line, Mr. Doran. Get in it.\"",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metDoran = true;
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 5);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 3);
          s.groups.teamsters.approval = Math.max(0, s.groups.teamsters.approval - 2);
        },
      },
    ],
  },

  rat_czar: {
    type: "dialogue", speaker: "park",
    lines: [
      "Kathleen Corradi. Adams appointed her, two administrations kept her, and she has outlasted four deputy mayors. Twenty-two minutes, eleven slides, and at one point she produced — from a bag — a model of a sealed curbside container she referred to as 'the future.'",
      "The ask: $4 million to expand containerized trash to three more community districts. The data's actually good — burrow counts down forty percent in the pilot.",
      "It's rats, Mr. Mayor. It is also, per the polling, the single most popular thing this government does.",
    ],
    choices: [
      {
        text: "Keep her. Fund the expansion. Stand next to the container at the presser.",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metRatCzar = true;
          s.resources.budget -= 1;
          s.approval = Math.min(100, s.approval + 3);
        },
      },
      {
        text: "Keep her, fund it quietly. No mayor should be photographed with 'the future.'",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metRatCzar = true;
          s.resources.budget -= 1;
          s.approval = Math.min(100, s.approval + 1);
        },
      },
      {
        text: "Keep her, no money this quarter. The rats can hold the line until spring.",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metRatCzar = true;
          s.approval = Math.max(0, s.approval - 1);
        },
      },
      {
        text: "Dismiss her. Fold the office. The city does not need a rat czar.",
        next: "desk_jan2026",
        effect: (s) => {
          s.flags.metRatCzar = true;
          s.flags.dismissedRatCzar = true;
          s.approval = Math.max(0, s.approval - 2);
        },
      },
    ],
  },

  month1_brief: {
    type: "dialogue", speaker: "park",
    lines: [
      "Mr. Mayor. The Council needs a Speaker before you can move any legislation. The vote is in three weeks.",
      "Three candidates in play: Julie Menin — establishment, East Side. Crystal Hudson — DSA-backed, Crown Heights. David Carr — Republican from Staten Island, pitching himself as a cross-aisle unity pick, but mainstream Dems won't touch it.",
      "Menin has the establishment locked. Hudson has DSA and left-WFP. Neither has 26 yet.",
      "Who are you backing?",
    ],
    choices: [
      { text: "Back Julie Menin.", next: "menin_whip",
        effect: (s) => { s.flags.backedMenin = true; adj(s, MENIN_FX); } },
      { text: "Back Crystal Hudson.", next: "hudson_whip",
        effect: (s) => { s.flags.backedHudson = true; adj(s, HUDSON_FX); } },
      { text: "Push David Carr as the unity candidate.", next: "carr_whip",
        effect: (s) => { s.flags.pushedCarr = true; adj(s, CARR_FX); } },
      { text: "Stay neutral — let the Council sort it out.", next: "neutral_advance" },
      { text: "Back Simcha Felder.", disabled: true, tooltip: "Not in this lifetime." },
    ],
  },

  carr_whip: {
    type: "whip_vote",
    candidate: "carr",
    needed: 26,
    title: "BUILDING CARR'S COALITION",
    callLabel: "CARR MAKES HIS PITCH",
    callNext: "carr_scene",
    groups: [
      {
        key: "carr_repub",
        name: "Republicans + Far-Right",
        votes: 5,
        locked: true,
        lockedMsg: "Carr's base — locked",
      },
      {
        key: "carr_ctr",
        name: "Centrist Democrats",
        votes: 4,
        locked: false,
        ask: '"Four centrist Dems who are open to bipartisan governance. They\'ll take political heat from the party, but some genuinely want cross-aisle leadership. Give them a real argument."',
        offers: [
          { id: "unity_frame", label: "Frame Carr as a genuine unity candidate",        costLabel: "alienates left factions" },
          { id: "ctr_commit",  label: "Promise centrists committee chairs if Carr wins", costLabel: "alienates Dem establishment" },
        ],
        project(selected) {
          let score = 0;
          if (selected.includes("unity_frame")) score += 55;
          if (selected.includes("ctr_commit"))  score += 45;
          const pct = Math.min(100, score);
          const won = pct >= 45;
          const note = pct === 0
            ? "Centrists won't support a Republican without a compelling argument."
            : pct >= 55 ? "Unity framing lands — 4 centrist Dems will back Carr."
            : "Committee offer gives centrists something concrete to stand on.";
          return { pct, note, won };
        },
        winFx(s, selected) {
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 6);
          if (selected.includes("unity_frame")) s.factionApproval.dsa          = Math.max(0, s.factionApproval.dsa          - 5);
          if (selected.includes("ctr_commit"))  s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 5);
        },
        loseFx() {},
      },
      {
        key: "carr_est",
        name: "Establishment Democrats",
        votes: 17,
        unavailable: true,
        unavailableMsg: "Won't hand a Republican the gavel",
      },
    ],
  },

  carr_scene: {
    type: "dialogue", speaker: "carr",
    lines: [
      (s) => s.flags.groupStatus?.carr_ctr === "won"
        ? '"You got the centrists — I didn\'t expect that. But without the establishment, I\'m still nowhere near 26. It\'s over."'
        : '"I appreciate the push, Mr. Mayor. But Democratic members won\'t move — not the centrists, not the establishment. I\'m not getting to 26."',
      '"I\'m withdrawing. I didn\'t want you to hear it second-hand."',
      '"It\'s Menin or Hudson now. Pick a side."',
    ],
    choices: [
      { text: "Back Julie Menin.", next: "menin_whip",
        effect: (s) => { s.flags.backedMenin = true; adj(s, MENIN_FX); } },
      { text: "Back Crystal Hudson.", next: "hudson_whip",
        effect: (s) => { s.flags.backedHudson = true; adj(s, HUDSON_FX); } },
    ],
  },

  menin_whip: {
    type: "whip_vote",
    candidate: "menin",
    needed: 26,
    title: "WHIPPING VOTES — MENIN",
    groups: [
      {
        key: "est",
        name: "Establishment Bloc",
        votes: 17,
        locked: true,
        lockedMsg: "Menin's base — 17 locked",
      },
      {
        key: "ctr",
        name: "Centrists",
        votes: 4,
        locked: true,
        lockedMsg: "Leaning Menin — 4 locked",
      },
      {
        key: "feld",
        name: "Felder (Independent)",
        votes: 1,
        locked: true,
        lockedMsg: "1 vote — locked",
      },
      {
        key: "repub",
        name: "Republicans",
        votes: 5,
        locked: false,
        ask: '"They\'ll cross the aisle for Menin, but want something concrete first."',
        offers: [
          { id: "repub_committee", label: "Promise committee vice-chair seat", costLabel: "symbolic — alienates the left" }
		  ],
        project(selected) {
          const pct = selected.includes("repub_committee") ? 100 : 0;
          const won = pct >= 40;
          const note = pct === 0
            ? "Republicans won't move without a commitment."
            : "Committee seat offer secures all 5 Republican votes — Menin hits 27.";
          return { pct, note, won };
        },
        winFx(s) {
          s.factionApproval.republican = Math.min(100, s.factionApproval.republican + 8);
          s.factionApproval.progressive = Math.max(0, s.factionApproval.progressive - 5);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 5);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 5);
        },
        loseFx() {},
      },
      {
        key: "prog_cross",
        name: "Progressive Crossovers",
        votes: 4,
        locked: false,
        ask: '"Four progressive members are persuadable — not DSA hardliners, but they need real housing commitments to justify backing the establishment candidate. Win these 4 and Menin hits 26."',
        offers: [
          { id: "prog_housing",   label: "Pledge housing fund",            costLabel: "−3 budget pts" },
          { id: "prog_committee", label: "Promise Housing Committee seat",  costLabel: "establishment resents losing the committee" },
        ],
        project(selected) {
          let score = 0;
          if (selected.includes("prog_housing"))   score += 60;
          if (selected.includes("prog_committee")) score += 35;
          const pct = Math.min(100, score);
          const won = pct >= 35;
          const note = pct === 0
            ? "Progressives won't flip without concrete housing commitments."
            : pct >= 60 ? "$15M housing pledge locks in 4 crossover votes — Menin hits 26."
            : "Committee promise should swing them — Menin reaches 26.";
          return { pct, note, won };
        },
        winFx(s, selected) {
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 5);
          if (selected.includes("prog_housing"))   s.resources.budget -= 3;
          if (selected.includes("prog_committee")) s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 4);
        },
        loseFx() {},
      },
    ],
  },

  hudson_whip: {
    type: "whip_vote",
    candidate: "hudson",
    needed: 26,
    title: "WHIPPING VOTES — HUDSON",
    groups: [
      {
        key: "dsa",
        name: "DSA Bloc",
        votes: 4,
        locked: true,
        lockedMsg: "Hudson's base — 4 locked",
      },
      {
        key: "wfp",
        name: "Left-WFP Bloc",
        votes: 8,
        locked: true,
        lockedMsg: "Committed — 8 votes",
      },
      {
        key: "prog_lib",
        name: "Progressive Liberals",
        votes: 12,
        locked: false,
        ask: '"All 12 progressive liberals — they like Hudson ideologically but worry about DSA dominance of the Speaker\'s office. They need to know they\'ll have real power, not just a seat at the table."',
        offers: [
          { id: "committee_chairs", label: "Guarantee prog-lib bloc key committee chairs", costLabel: "DSA feels sidelined −8" },
          { id: "gov_pledge",       label: "Extract Hudson's moderate governance pledge",   costLabel: "left flank feels sold out −5 L-WFP" },
        ],
        project(selected) {
          const hasChairs  = selected.includes("committee_chairs");
          const hasPledge  = selected.includes("gov_pledge");
          if (!hasChairs && !hasPledge) {
            return { pct: 0, won: false, note: "Progressive liberals won't move without a concrete commitment — they've been promised things before." };
          }
          return { pct: 100, won: true, note: hasChairs && hasPledge
            ? "Both commitments land. The prog-lib bloc is fully in — and DSA is furious."
            : hasChairs
              ? "Committee chair guarantees seal it. The prog-lib bloc trusts you now — DSA feels squeezed."
              : "The governance pledge reassures moderates. Hudson's left flank feels the compromise." };
        },
        winFx(s, selected) {
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 8);
          if (selected.includes("committee_chairs")) s.factionApproval.dsa    = Math.max(0, s.factionApproval.dsa    - 8);
          if (selected.includes("gov_pledge"))       s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 5);
        },
        loseFx() {},
      },
      {
        key: "ctr_cross",
        name: "Establishment Crossovers",
        votes: 4,
        locked: false,
        ask: '"All 4 centrists — they won\'t back a DSA-adjacent candidate without establishment cover. They want either Albany\'s blessing or a concrete pro-business commitment."',
        offers: [
          { id: "hochul_call",  label: "Call Hochul — ask for her backing",  costLabel: "you'll owe her a future favor" },
          { id: "biz_tax_cut",  label: "Endorse a business tax cut",          costLabel: "−5 budget pts" },
        ],
        project(selected) {
          const hasHochul = selected.includes("hochul_call");
          const hasTax    = selected.includes("biz_tax_cut");
          if (!hasHochul && !hasTax) {
            return { pct: 0, won: false, note: "Centrists need either Hochul's blessing or a pro-business commitment — pick one." };
          }
          return { pct: 100, won: true, note: hasHochul
            ? "Hochul's backing gives centrists the cover they need. They're in."
            : "A business tax cut commitment lands. Centrists are satisfied — and your budget takes the hit." };
        },
        winFx(s, selected) {
          if (selected.includes("hochul_call")) s.flags.owesHochul = true;
          if (selected.includes("biz_tax_cut"))  s.resources.budget -= 5;
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 6);
          s.groups.smallBusiness.approval = Math.min(100, s.groups.smallBusiness.approval + (selected.includes("biz_tax_cut") ? 10 : 0));
        },
        loseFx() {},
      },
    ],
  },

  neutral_advance: {
    type: "chamber_action",
    prompt: "January — you stepped back. The Council will sort it out.",
    buttonText: "Advance to the vote", next: "vote_scene",
    effect: (s) => { s.flags.stayedNeutral = true; },
  },

  vote_scene: {
    type: "dialogue", speaker: "park",
    lines: [
      '"The Council is in session. Here\'s where it stands —"',
      (s) => {
        const gs = s.flags.groupStatus || {};
        if (s.flags.stayedNeutral) return "Without your intervention, the establishment coalition held. Menin has the numbers.";
        if (s.flags.backedMenin) {
          const votes = 22 + (gs.repub === "won" ? 5 : 0) + (gs.prog_cross === "won" ? 4 : 0);
          return votes >= 26
            ? `Menin has ${votes} committed — she's over the line.`
            : `Menin has ${votes} — short of 26. It goes to a floor fight.`;
        }
        if (s.flags.backedHudson) {
          const votes = 12 + (gs.prog_lib === "won" ? 12 : 0) + (gs.ctr_cross === "won" ? 4 : 0);
          return votes >= 26
            ? `Hudson has ${votes} committed — just enough to win.`
            : `Hudson has ${votes} — short of 26. She needed both blocs.`;
        }
        return "The count is unclear.";
      },
    ],
    choices: [
      { text: "Call the vote.", next: "epilogue",
        effect: (s) => {
          s.month = 2; s.monthLabel = "February";
          const gs = s.flags.groupStatus || {};
          const meninVotes  = s.flags.backedMenin
            ? 22 + (gs.repub === "won" ? 5 : 0) + (gs.prog_cross === "won" ? 4 : 0)
            : 22;
          const hudsonVotes = s.flags.backedHudson
            ? 12 + (gs.prog_lib === "won" ? 12 : 0) + (gs.ctr_cross === "won" ? 4 : 0)
            : 12;
          const hudsonWins = s.flags.backedHudson && hudsonVotes >= 26;
          s.flags.speakerElected = hudsonWins ? "hudson" : "menin";

          if (hudsonWins) s.figures.hochul.approval = Math.max(0,   s.figures.hochul.approval - 12);
          else            s.figures.hochul.approval = Math.min(100, s.figures.hochul.approval + 10);

          if (hudsonWins) {
            s.figures.speaker.name       = "Speaker Hudson";
            s.figures.speaker.role       = "NYC Council Speaker — leftWFP";
            s.figures.speaker.color      = "#7B4FA3";
            s.figures.speaker.popularity = 58;
            s.figures.speaker.approval   = s.flags.backedHudson ? 72 : s.flags.stayedNeutral ? 48 : 28;
          } else {
            s.figures.speaker.name       = "Speaker Menin";
            s.figures.speaker.role       = "NYC Council Speaker — Establishment";
            s.figures.speaker.color      = "#2E3F8F";
            s.figures.speaker.popularity = 55;
            s.figures.speaker.approval   = s.flags.backedMenin ? 70 : s.flags.stayedNeutral ? 55 : 26;
          }
        },
      },
    ],
  },

  epilogue: {
    type: "dialogue", speaker: "park",
    lines: [
      (s) => {
        const gs = s.flags.groupStatus || {};
        if (s.flags.speakerElected === "hudson") {
          const votes = 12 + (gs.prog_lib === "won" ? 12 : 0) + (gs.ctr_cross === "won" ? 4 : 0);
          return `Crystal Hudson is elected Speaker, ${votes}–${51 - votes}. The chamber erupts. The progressive wing has real power for the first time in years.`;
        }
        let menVotes, hudVotes;
        if (s.flags.backedMenin) {
          menVotes = 22 + (gs.repub === "won" ? 5 : 0) + (gs.prog_cross === "won" ? 4 : 0);
          hudVotes = 51 - menVotes;
        } else {
          hudVotes = s.flags.backedHudson
            ? 12 + (gs.prog_lib === "won" ? 12 : 0) + (gs.ctr_cross === "won" ? 4 : 0)
            : 12;
          menVotes = 51 - hudVotes;
        }
        return `Julie Menin is elected Speaker, ${menVotes}–${hudVotes}. Hochul calls within the hour. The establishment holds.`;
      },
      (s) => {
        if (s.flags.speakerElected === "menin"  && s.flags.backedMenin)  return "Your backing made the difference. Menin owes you the first session.";
        if (s.flags.speakerElected === "hudson" && s.flags.backedHudson) return "Your bet paid off. Hudson knows exactly who built that coalition.";
        if (s.flags.stayedNeutral) return "You stayed out of it. The Speaker won without you. You'll spend the next year proving you belong in the room.";
        return "You backed the losing side. The new Speaker will remember.";
      },
    ],
    choices: [
      { text: "On to the budget.", next: "paper_speaker" },
    ],
  },

  time_to_budget: {
    type: "time_pass",
    months: ["February", "March", "April", "May"],
    year: "2026",
    next: "budget_intro",
    nextEffect: (s) => { s.month = 5; s.monthLabel = "May"; },
  },

  time_to_primary: {
    type: "time_pass",
    months: ["June"],
    year: "2026",
    next: "governor_primary",
  },

  call_speaker_ratczar: {
    type: "phone_call",
    speaker: (s) => (s.flags.speakerElected === "hudson" ? "hudson" : "menin"),
    turns: [
      {
        lines: [
          '"Mr. Mayor. Congratulations again on— actually, no. Let me get right to it."',
          '"Did you fire the rat czar?"',
        ],
        choices: [
          { text: '"The position was administratively redundant—"' },
          { text: '"...Yes."' },
        ],
      },
      {
        lines: [
          '"Forty minutes ago, this Council passed Intro 0001-2026 — the Rodent Mitigation Permanence Act — by a vote of 48 to 3."',
          '"My first bill. My first act as Speaker. Do you understand that? Members who won\'t agree on the time of day co-sponsored this thing."',
          '"Kathleen Corradi is now a chartered position with independent budget protection. She reports to the Council. On matters of rodent policy she — let me check the bill text — she functionally outranks you."',
          '"The container press conference is Thursday. You will be standing next to the container."',
        ],
        choices: [
          {
            text: '"...I\'ll be there."',
            next: "hub_post_speaker",
            effect: (s) => {
              s.flags.ratCzarPermanent = true;
              s.approval = Math.min(100, s.approval + 1);
            },
          },
          {
            text: '"This is an absurd use of the Council\'s first session."',
            next: "hub_post_speaker",
            effect: (s) => {
              s.flags.ratCzarPermanent = true;
              s.figures.speaker.approval = Math.max(0, s.figures.speaker.approval - 3);
            },
          },
        ],
      },
    ],
  },

  hub_post_speaker: {
    type: "hub",
    month: "February 2026",
    headline: "The speaker vote is settled. The budget fight lands in May.",
    nextLabel: "Enter the budget session",
    next: "time_to_budget",
    maxActions: 2,
    actions: [
      {
        id: "press_conf",
        label: "Hold a press conference",
        location: { x: 404, y: 432, name: "City Hall", },
        description: "Take a public position on the transit funding fight. Builds goodwill citywide, costs you with the establishment.",
        effect: (s) => {
          s.approval = Math.min(100, s.approval + 3);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 3);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 2);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 3);
        },
      },
      {
        id: "biz_roundtable",
        label: "Business roundtable",
        location: { x: 456, y: 295, name: "Midtown", },
        description: "Quarterly meeting with the BID coalition and Chamber of Commerce. Useful before the budget fight.",
        effect: (s) => {
          s.groups.smallBusiness.approval = Math.min(100, s.groups.smallBusiness.approval + 8);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 5);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 3);
        },
      },
      {
        id: "tenant_rally",
        label: "Tenant rights rally",
        location: { x: 540, y: 215, name: "South Bronx", },
        description: "Show up for the housing coalition. Signals where you stand on rent ahead of budget negotiations.",
        effect: (s) => {
          s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 8);
          s.groups.wfp.approval = Math.min(100, s.groups.wfp.approval + 5);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 4);
          s.groups.smallBusiness.approval = Math.max(0, s.groups.smallBusiness.approval - 4);
        },
      },
      {
        id: "pba_ceremony",
        label: "NYPD promotion ceremony",
        location: { x: 210, y: 638, name: "Staten Island", },
        description: "Attend the quarterly promotion event. PBA notices who shows up and who doesn't.",
        effect: (s) => {
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 8);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
          s.factionApproval.republican = Math.min(100, s.factionApproval.republican + 3);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 5);
        },
      },
      {
        id: "transit_tour",
        label: "Subway accessibility tour",
        location: { x: 672, y: 392, name: "Flushing, Queens", },
        description: "Ride the MTA with Open NY activists. Good press in transit-dependent districts.",
        effect: (s) => {
          s.groups.openNY.approval = Math.min(100, s.groups.openNY.approval + 8);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 4);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 3);
        },
      },
    ],
  },

  hub_post_budget: {
    type: "hub",
    month: "June 2026",
    headline: "The budget is signed. Pick two policy fights to anchor your agenda before the primary.",
    nextLabel: "Look at the primary",
    next: "time_to_primary",
    maxActions: 2,
    actions: [
      {
        id: "policy_subway",
        label: "2nd Avenue Subway — Phase 2",
        location: { x: 440, y: 338, name: "Upper East Side" },
        description: "Push to extend the Q train to 125th Street. Big infrastructure bet — popular in transit circles, costs political capital downtown.",
        effect: (s) => {
          s.groups.openNY.approval           = Math.min(100, s.groups.openNY.approval + 9);
          s.factionApproval.progressive      = Math.min(100, s.factionApproval.progressive + 5);
          s.factionApproval.establishment    = Math.min(100, s.factionApproval.establishment + 3);
          s.groups.elizabethGarden.approval  = Math.max(0,   s.groups.elizabethGarden.approval - 4);
          s.factionApproval.felder           = Math.max(0,   s.factionApproval.felder - 3);
        },
      },
      {
        id: "policy_rent",
        label: "Citywide Rent Control",
        location: { x: 538, y: 218, name: "South Bronx" },
        description: "Announce support for universal rent stabilization across all five boroughs. Tenants love it; landlords and the real estate lobby won't forget.",
        effect: (s) => {
          s.groups.tenantBloc.approval       = Math.min(100, s.groups.tenantBloc.approval + 10);
          s.groups.wfp.approval              = Math.min(100, s.groups.wfp.approval + 6);
          s.factionApproval.dsa              = Math.min(100, s.factionApproval.dsa + 6);
          s.factionApproval.leftWfp          = Math.min(100, s.factionApproval.leftWfp + 5);
          s.groups.smallBusiness.approval    = Math.max(0,   s.groups.smallBusiness.approval - 6);
          s.factionApproval.establishment    = Math.max(0,   s.factionApproval.establishment - 5);
        },
      },
      {
        id: "policy_buses",
        label: "Free Buses Citywide",
        location: { x: 700, y: 358, name: "Flushing, Queens" },
        description: "Zero-fare bus network for all five boroughs. Enormous quality-of-life win for outer-borough commuters, expensive signal to fiscal moderates.",
        effect: (s) => {
          s.groups.openNY.approval           = Math.min(100, s.groups.openNY.approval + 8);
          s.factionApproval.dsa              = Math.min(100, s.factionApproval.dsa + 5);
          s.factionApproval.progressive      = Math.min(100, s.factionApproval.progressive + 5);
          s.groups.teamsters.approval        = Math.min(100, s.groups.teamsters.approval + 4);
          s.factionApproval.centrist         = Math.max(0,   s.factionApproval.centrist - 4);
          s.factionApproval.felder           = Math.max(0,   s.factionApproval.felder - 3);
        },
      },
      {
        id: "policy_streets",
        label: "Clean Up the Streets",
        location: { x: 770, y: 462, name: "Southeast Queens" },
        description: "Quality-of-life crackdown: public safety, broken windows, park enforcement. Outer-borough voters respond; the left reads it as criminalization.",
        effect: (s) => {
          s.groups.pba.approval              = Math.min(100, s.groups.pba.approval + 8);
          s.factionApproval.centrist         = Math.min(100, s.factionApproval.centrist + 6);
          s.factionApproval.republican       = Math.min(100, s.factionApproval.republican + 4);
          s.factionApproval.felder           = Math.min(100, s.factionApproval.felder + 4);
          s.factionApproval.dsa              = Math.max(0,   s.factionApproval.dsa - 7);
          s.factionApproval.leftWfp          = Math.max(0,   s.factionApproval.leftWfp - 5);
        },
      },
      {
        id: "policy_unions",
        label: "Promote Union Labor",
        location: { x: 618, y: 282, name: "Hunts Point, Bronx" },
        description: "Project labor agreements, prevailing wage requirements, and a push to unionize city contractors. Broad labor coalition but business groups push back.",
        effect: (s) => {
          s.groups.teamsters.approval        = Math.min(100, s.groups.teamsters.approval + 10);
          s.factionApproval.leftWfp          = Math.min(100, s.factionApproval.leftWfp + 5);
          s.factionApproval.establishment    = Math.min(100, s.factionApproval.establishment + 4);
          s.factionApproval.dsa              = Math.min(100, s.factionApproval.dsa + 3);
          s.groups.smallBusiness.approval    = Math.max(0,   s.groups.smallBusiness.approval - 5);
          s.factionApproval.centrist         = Math.max(0,   s.factionApproval.centrist - 3);
        },
      },
    ],
  },

  budget_intro: {
    type: "dialogue", speaker: "park",
    lines: [
      "Speaker's settled. Now the real work starts.",
      (s) => `We're carrying a ${Math.abs(s.resources.budget)}-point structural deficit into this term. Council needs a balanced budget by June. Three rounds of hard choices ahead — administrative cuts, revenue, and structural reform.`,
      "Every measure costs something. Some options depend on who's Speaker. Some depend on what you promised to get here.",
      "Let's start.",
    ],
    choices: [
      { text: "Get to work.", next: "budget_fight_2026" },
    ],
  },

  budget_fight_2026: {
    type: "budget_fight",
    next: "budget_result",
    rounds: [
      {
    title: "ROUND 1 — ADMINISTRATIVE",
    prompt: "Low-hanging fruit. Administrative levers — real savings, but each one has a constituency that will notice.",
    options: [
      {
        id: "defer_capital",
        label: "Defer capital projects",
        delta: 2,
        costLabel: "infrastructure advocates furious — problem deferred, not solved",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 2;
          s.flags.deferredCapital = true;
          s.groups.openNY.approval = Math.max(0, s.groups.openNY.approval - 6);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 3);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 3);
        },
      },
      {
        id: "cut_school_mandates",
        label: "Cut school size mandates",
        delta: 3,
        costLabel: "reads as anti-education — progressive base is furious",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 3;
          s.factionApproval.progressive = Math.max(0, s.factionApproval.progressive - 6);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 4);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 4);
        },
      },
      {
        id: "hire_police",
        label: "Hire more police officers",
        delta: -3,
        costLabel: "costs budget pts — right-wing approval, left-wing fury",
        available: () => true,
        effect: (s) => {
          s.resources.budget -= 3;
          s.factionApproval.republican = Math.min(100, s.factionApproval.republican + 6);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
          s.factionApproval.felder = Math.min(100, s.factionApproval.felder + 4);
          s.factionApproval.farRight = Math.min(100, s.factionApproval.farRight + 6);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 8);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 6);
          s.factionApproval.progressive = Math.max(0, s.factionApproval.progressive - 4);
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 10);
          s.groups.tenantBloc.approval = Math.max(0, s.groups.tenantBloc.approval - 5);
          s.groups.wfp.approval = Math.max(0, s.groups.wfp.approval - 5);
        },
      },
      {
        id: "abstain_r1",
        label: "Take no action this round",
        delta: 0,
        costLabel: "the deficit stands — the Council reads it as drift",
        available: () => true,
        effect: (s) => {
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 2);
        },
      },
    ],
      },
      {
    title: "ROUND 2 — REVENUE",
    prompt: "Real money. These measures pick a fight with someone who can afford lawyers.",
    options: [
      {
        id: "tax_rich",
        label: "Raise taxes on the wealthy",
        delta: 6,
        costLabel: "establishment and real estate revolt — Albany pushback expected",
        available: (s) => s.flags.speakerElected === "hudson" || s.flags.backedMenin,
        unavailableReason: "Menin won't bring this to the floor without your earlier backing",
        effect: (s) => {
          s.resources.budget += 6;
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 6);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 5);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 4);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 6);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 4);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 8);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 6);
          s.groups.smallBusiness.approval = Math.max(0, s.groups.smallBusiness.approval - 8);
          s.groups.wfp.approval = Math.min(100, s.groups.wfp.approval + 7);
        },
      },
      {
        id: "congestion_pricing",
        label: "Expand congestion pricing",
        delta: 5,
        costLabel: "Teamsters and outer-borough members furious",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 5;
          s.groups.openNY.approval = Math.min(100, s.groups.openNY.approval + 8);
          s.groups.teamsters.approval = Math.max(0, s.groups.teamsters.approval - 8);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 5);
          s.factionApproval.felder = Math.max(0, s.factionApproval.felder - 4);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 5);
        },
      },
      {
        id: "property_tax",
        label: "Property tax reassessment",
        delta: 4,
        costLabel: "real estate lobby and establishment fight back",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 4;
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 5);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 4);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 4);
          s.groups.smallBusiness.approval = Math.max(0, s.groups.smallBusiness.approval - 10);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 4);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 4);
          s.factionApproval.felder = Math.max(0, s.factionApproval.felder - 4);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 4);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 4);
        },
      },
      {
        id: "abstain_r2",
        label: "Take no action this round",
        delta: 0,
        costLabel: "no new revenue — the gap doesn't close itself",
        available: () => true,
        effect: (s) => {
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 2);
        },
      },
    ],
      },
      {
    title: "ROUND 3 — STRUCTURAL REFORM",
    prompt: "The hard calls. These define administrations.",
    options: [
      {
        id: "cut_police",
        label: "Cut the police budget",
        delta: 6,
        costLabel: "PBA goes to war — Hudson Speaker required",
        available: (s) => s.flags.speakerElected === "hudson",
        unavailableReason: "Speaker Menin won't bring this to the floor",
        effect: (s) => {
          s.resources.budget += 6;
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 8);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 6);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 4);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 10);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 10);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 5);
          s.factionApproval.felder = Math.max(0, s.factionApproval.felder - 6);
          s.groups.pba.approval = Math.max(0, s.groups.pba.approval - 12);
          s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 5);
          s.groups.wfp.approval = Math.min(100, s.groups.wfp.approval + 6);
        },
      },
      {
        id: "pension_pushback",
        label: "Push back pension retirement age",
        delta: 6,
        costLabel: "Teamsters and unions declare war",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 6;
          s.groups.teamsters.approval = Math.max(0, s.groups.teamsters.approval - 10);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 8);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 6);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 4);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 3);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 4);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 4);
        },
      },
      {
        id: "pension_tricks",
        label: "Pension accounting reclassification",
        delta: 3,
        costLabel: "kicks the can — future administrations pay",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 3;
          s.flags.deferredPension = true;
        },
      },
      {
        id: "abstain_r3",
        label: "Take no action this round",
        delta: 0,
        costLabel: "no structural reform — the deficit rides into June",
        available: () => true,
        effect: (s) => {
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 2);
        },
      },
    ],
      },
    ],
    crisis: {
      urgent: true,
    title: "CRISIS — JUNE DEADLINE",
    prompt: "The Council won't pass an unbalanced budget. Albany is calling. Pick your poison.",
    options: [
      {
        id: "hochul_loan",
        label: "Emergency state loan from Hochul",
        delta: 4,
        costLabel: "you'll owe her — and she knows it",
        available: (s, proj) => !s.flags.owesHochul && proj + 4 >= 0,
        unavailableReason: (s) => s.flags.owesHochul ? "You already owe Hochul — she won't move" : "Won't close the deficit",
        effect: (s) => {
          s.resources.budget += 4;
          s.flags.owesHochul = true;
          s.figures.hochul.approval = Math.max(0, s.figures.hochul.approval - 10);
        },
      },
      {
        id: "bond_issuance",
        label: "Emergency municipal bond issuance",
        delta: 7,
        costLabel: "future mayors inherit this debt — credit rating takes a hit",
        available: (s, proj) => proj + 7 >= 0,
        unavailableReason: "Won't close the deficit",
        effect: (s) => {
          s.resources.budget += 7;
          s.flags.issuedBonds = true;
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 3);
          s.factionApproval.progressive = Math.max(0, s.factionApproval.progressive - 3);
        },
      },
      {
        id: "service_cuts",
        label: "Slash city services — balance the budget at any cost",
        delta: (s, proj) => Math.max(10, -(proj ?? s.resources.budget)),
        costLabel: "at least +10 — deeper deficits mean deeper cuts and worse penalties",
        available: () => true,
        effect: (s) => {
          const gap   = Math.max(10, -s.resources.budget);
          const extra = Math.max(0, gap - 10);
          s.resources.budget = 0;
          const approvalHit = Math.round(10 + extra * 1.5);
          const factionHit  = Math.round(8  + extra * 1.0);
          const tenantHit   = Math.round(8  + extra * 1.5);
          s.approval = Math.max(0, s.approval - approvalHit);
          for (const f of Object.keys(s.factionApproval)) {
            s.factionApproval[f] = Math.max(0, s.factionApproval[f] - factionHit);
          }
          s.groups.tenantBloc.approval = Math.max(0, s.groups.tenantBloc.approval - tenantHit);
          s.groups.wfp.approval        = Math.max(0, s.groups.wfp.approval        - Math.round(4 + extra * 0.8));
          s.groups.pba.approval        = Math.max(0, s.groups.pba.approval        - Math.round(extra * 0.4));
        },
      },
      {
        id: "control_board",
        label: "Refuse the hard choices — let Albany impose a Financial Control Board",
        delta: (s, proj) => -(proj ?? s.resources.budget),
        costLabel: "balances the books by surrendering them — nothing like it since 1975",
        available: () => true,
        effect: (s) => {
          s.resources.budget = 0;
          s.flags.controlBoard = true;
          s.approval = Math.max(0, s.approval - 10);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 8);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 5);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 4);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 4);
          s.figures.hochul.approval = Math.max(0, s.figures.hochul.approval - 5);
        },
      },
      {
        id: "sell_air_rights",
        label: "Sell city air rights to developers",
        delta: 1,
        costLabel: "ESG supporters furious — YIMBY coalition approves",
        available: (s, proj) => proj + 1 >= 0,
        unavailableReason: "Won't close the deficit",
        effect: (s) => {
          s.resources.budget += 1;
          s.flags.soldAirRights = true;
          s.groups.openNY.approval = Math.min(100, s.groups.openNY.approval + 8);
          s.groups.elizabethGarden.approval = Math.max(0, s.groups.elizabethGarden.approval - 10);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 5);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 6);
          s.factionApproval.felder = Math.max(0, s.factionApproval.felder - 2);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 2);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 2);
          s.groups.wfp.approval = Math.max(0, s.groups.wfp.approval - 2);
        },
      },
    ],
    },
  },

  budget_result: {
    type: "dialogue", speaker: "park",
    lines: [
      (s) => {
        const b = s.resources.budget;
        if (b >= 0)   return `The books balance. Budget: +${b} pts. You've done what no recent mayor managed in year one.`;
        if (b >= -5)  return `Deficit nearly closed. Budget: ${b} pts. Not perfect — but you've turned the corner.`;
        if (b >= -10) return `Still a gap, but manageable. Budget: ${b} pts. The Council moves on. You've bought time.`;
        return `Budget: ${b} pts. The deficit barely moved. Albany is watching. So is the bond market.`;
      },
      (s) => {
        const notes = [];
        if (s.flags.controlBoard) notes.push("The Control Board balanced the books — and took the keys. Every budget modification now needs Albany's signature.");
        if (s.flags.deferredCapital) notes.push("The deferred capital projects will come back — infrastructure advocates are organizing.");
        if (s.flags.deferredPension) notes.push("The pension reclassification is a ticking clock. Someone will notice in year three.");
        if (s.flags.issuedBonds) notes.push("The bond issuance closes this year's books. Future budgets absorb the debt service.");
        if (s.flags.soldAirRights) notes.push("The air rights sale was a one-time hit. Housing advocates haven't forgotten.");
        return notes.length ? notes.join(" ") : "No deferred problems on the books — at least not yet.";
      },
      "But the calendar doesn't stop. June primary is six weeks out. Hochul needs to know where you stand.",
    ],
    choices: [
      { text: "Look at the primary.", next: "paper_budget" },
    ],
  },

  // ─── Inside City Hall — the Year One sit-down ───

  press_y1_q1: {
    type: "dialogue", speaker: "calloway",
    lines: [
      "Mr. Mayor, welcome to Inside City Hall. Six months in — let's get into it.",
      (s) => {
        if (s.flags.stayedNeutral) return "The Speaker fight. You stayed out of it entirely — the only mayor in living memory to sit out a Speaker race. Members on both sides called it, and I'm quoting, 'a first-class seat on the fence.' Was it strategy or was it fear?";
        if (s.flags.pushedCarr) return "The Speaker fight. You pushed David Carr — a Republican — as a unity candidate, and it collapsed inside a week. What did that experiment tell you about your read on this Council?";
        if (s.flags.backedHudson && s.flags.speakerElected === "hudson") return "The Speaker fight. You built Crystal Hudson's coalition — the first DSA-aligned Speaker in the chamber's history. Business leaders say you handed the legislature to the far left. What do you say to them?";
        if (s.flags.backedHudson) return "The Speaker fight. You went all in for Crystal Hudson and she lost. The Speaker's office now belongs to someone who watched you try. How does anything on your agenda pass this Council?";
        if (s.flags.backedMenin && s.flags.speakerElected === "menin") return "The Speaker fight. You backed Julie Menin early and she won — with, reporting suggests, some expensive promises made on your behalf. What exactly did this Speakership cost the second floor?";
        return "The Speaker fight. You backed the losing side, and the gavel went elsewhere. Every mayor needs twenty-six votes eventually. Where do yours come from now?";
      },
    ],
    choices: [
      {
        text: "Own it — the call was right, and I'd make it again.",
        next: "press_y1_q2",
        effect: (s) => {
          s.approval = Math.min(100, s.approval + 2);
          const won = (s.flags.backedHudson && s.flags.speakerElected === "hudson") || (s.flags.backedMenin && s.flags.speakerElected === "menin");
          if (!won) s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 2);
        },
      },
      {
        text: "Deflect — the Council chooses its Speaker, not the Mayor.",
        next: "press_y1_q2",
        effect: (s) => {
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 2);
          s.approval = Math.max(0, s.approval - 1);
        },
      },
      {
        text: "Pivot to results — voters care about what passes, not who holds the gavel.",
        next: "press_y1_q2",
        effect: (s) => {
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2);
        },
      },
    ],
  },

  press_y1_q2: {
    type: "dialogue", speaker: "calloway",
    lines: [
      (s) => {
        if (s.flags.controlBoard) return "The budget. A state Financial Control Board is running this city's books — the first since 1975. You are, on paper, the least fiscally independent mayor in fifty years. How is that not a resignation-level failure?";
        if (s.resources.budget < 0) return `The budget. You adopted it ${Math.abs(s.resources.budget)} points out of balance, and the bond market noticed even if the Council didn't. What do you know that Moody's doesn't?`;
        if (s.flags.deferredPension && s.flags.deferredCapital) return "The budget. Balanced — technically. Our review found deferred capital work and a pension reclassification that three actuaries we called described with words I can't say on air. Is this a balanced budget or a staged photo of one?";
        if (s.flags.issuedBonds) return "The budget. Balanced — with emergency bonds that every future budget will be paying off. You've been in office six months and you've already borrowed from your successor. Why should voters believe the math ever gets easier?";
        return "The budget. Balanced, on time, without gimmicks anyone's found — I'll admit our researchers tried. The unions say the quiet part: it balanced on their backs. Whose year was this budget, Mr. Mayor?";
      },
    ],
    choices: [
      {
        text: "The math is the math — read the adopted budget.",
        next: "press_y1_q3",
        effect: (s) => {
          if (s.resources.budget >= 0 && !s.flags.controlBoard) { s.approval = Math.min(100, s.approval + 2); s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 2); }
          else s.approval = Math.max(0, s.approval - 2);
        },
      },
      {
        text: "Be candid — every budget is a set of painful choices, and I made mine in the open.",
        next: "press_y1_q3",
        effect: (s) => {
          s.approval = Math.min(100, s.approval + 1);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 2);
        },
      },
      {
        text: "Blame the inheritance — this deficit was on the books before my name was on the door.",
        next: "press_y1_q3",
        effect: (s) => {
          s.approval = Math.max(0, s.approval - 1);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 2);
        },
      },
    ],
  },

  press_y1_q3: {
    type: "dialogue", speaker: "calloway",
    lines: [
      (s) => {
        if (s.flags.firedTisch) return "Last one, and it's the one everyone at home is waiting for. You fired a sitting Police Commissioner in your first week and the department answered with the largest job action since 1971. Whatever happens for the rest of your term, that's the first line of the story. Do you accept that?";
        if (s.flags.owesHochul) return "Last one. Our Albany sources use a specific phrase about you and the Governor: 'the Mayor owes one.' The gubernatorial primary is six weeks out. When she calls in that favor — and she will — what does New York City pay?";
        return "Last one. The gubernatorial primary is six weeks out, every camp wants your endorsement, and your phone — I'm told — has never been busier. Six months in: is New York City better off than it was in December?";
      },
    ],
    choices: [
      {
        text: "Answer it straight, eyes on the lens.",
        next: "hub_post_budget",
        effect: (s) => {
          s.flags.pressY1 = true;
          s.approval = Math.min(100, s.approval + 3);
        },
      },
      {
        text: "Give the practiced non-answer. Land no punches, take none.",
        next: "hub_post_budget",
        effect: (s) => {
          s.flags.pressY1 = true;
        },
      },
      {
        text: "\"We're out of time, Diane.\" Stand up.",
        next: "hub_post_budget",
        effect: (s) => {
          s.flags.pressY1 = true;
          s.approval = Math.max(0, s.approval - 3);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 2);
        },
      },
    ],
  },

  gov_campaign: {
    type: "hub",
    month: "June 2026",
    headline: "Endorsement's in. Six weeks of retail politics before primary day. Where do you put your body?",
    nextLabel: "Primary day",
    next: "governor_primary_result",
    maxActions: 1,
    actions: [
      {
        id: "camp_wfp",
        label: "WFP — canvassing and phone banking",
        location: { x: 530, y: 465, name: "Crown Heights" },
        description: "Join Working Families organizers for doors and phones across the five boroughs. Signals clearly where you stand on the left.",
        effect: (s) => {
          s.groups.wfp.approval             = Math.min(100, s.groups.wfp.approval + 10);
          s.influence.groups.wfp             = (s.influence.groups.wfp ?? 1.0) + 0.3;
          s.factionApproval.dsa              = Math.min(100, s.factionApproval.dsa + 4);
          s.factionApproval.leftWfp          = Math.min(100, s.factionApproval.leftWfp + 4);
          s.factionApproval.establishment    = Math.max(0,   s.factionApproval.establishment - 3);
        },
      },
      {
        id: "camp_tenants",
        label: "Tenant Bloc — door-knocking in public housing",
        location: { x: 538, y: 218, name: "South Bronx" },
        description: "Walk the NYCHA towers with tenant organizers. High visibility in housing-dense districts, strong signal on rent.",
        effect: (s) => {
          s.groups.tenantBloc.approval       = Math.min(100, s.groups.tenantBloc.approval + 10);
          s.influence.groups.tenantBloc       = (s.influence.groups.tenantBloc ?? 1.0) + 0.3;
          s.factionApproval.dsa              = Math.min(100, s.factionApproval.dsa + 3);
          s.factionApproval.leftWfp          = Math.min(100, s.factionApproval.leftWfp + 3);
        },
      },
      {
        id: "camp_teamsters",
        label: "Teamsters — rallies and union halls",
        location: { x: 618, y: 375, name: "Jackson Heights" },
        description: "Join building trades rallies and union-hall events in Queens and the Bronx. Broad labor coalition, centrist-friendly.",
        effect: (s) => {
          s.groups.teamsters.approval        = Math.min(100, s.groups.teamsters.approval + 10);
          s.influence.groups.teamsters        = (s.influence.groups.teamsters ?? 1.0) + 0.3;
          s.factionApproval.establishment    = Math.min(100, s.factionApproval.establishment + 4);
          s.factionApproval.centrist         = Math.min(100, s.factionApproval.centrist + 3);
        },
      },
      {
        id: "camp_biz",
        label: "Small Business — fundraisers and block associations",
        location: { x: 700, y: 355, name: "Flushing, Queens" },
        description: "Hit the BID fundraiser circuit and outer-borough block associations. Signals fiscal moderation ahead of November.",
        effect: (s) => {
          s.groups.smallBusiness.approval    = Math.min(100, s.groups.smallBusiness.approval + 10);
          s.influence.groups.smallBusiness    = (s.influence.groups.smallBusiness ?? 1.0) + 0.3;
          s.factionApproval.centrist         = Math.min(100, s.factionApproval.centrist + 4);
          s.factionApproval.felder           = Math.min(100, s.factionApproval.felder + 3);
          s.factionApproval.leftWfp          = Math.max(0,   s.factionApproval.leftWfp - 3);
        },
      },
      {
        id: "camp_pba",
        label: "PBA — precincts and outer-borough ceremonies",
        location: { x: 200, y: 645, name: "Staten Island" },
        description: "Attend promotion ceremonies and precinct events. Puts you firmly in the law-and-order lane — the left will notice.",
        effect: (s) => {
          s.groups.pba.approval              = Math.min(100, s.groups.pba.approval + 10);
          s.influence.groups.pba              = (s.influence.groups.pba ?? 1.0) + 0.3;
          s.factionApproval.republican       = Math.min(100, s.factionApproval.republican + 4);
          s.factionApproval.centrist         = Math.min(100, s.factionApproval.centrist + 3);
          s.factionApproval.dsa              = Math.max(0,   s.factionApproval.dsa - 5);
          s.factionApproval.leftWfp          = Math.max(0,   s.factionApproval.leftWfp - 4);
        },
      },
      {
        id: "camp_openNY",
        label: "Open NY — transit and housing events",
        location: { x: 456, y: 292, name: "Midtown" },
        description: "Ride the subway with Open NY advocates and headline their transit town halls. Good press, progressive-friendly.",
        effect: (s) => {
          s.groups.openNY.approval           = Math.min(100, s.groups.openNY.approval + 10);
          s.influence.groups.openNY           = (s.influence.groups.openNY ?? 1.0) + 0.3;
          s.factionApproval.progressive      = Math.min(100, s.factionApproval.progressive + 4);
          s.factionApproval.leftWfp          = Math.min(100, s.factionApproval.leftWfp + 3);
          s.groups.elizabethGarden.approval  = Math.max(0,   s.groups.elizabethGarden.approval - 5);
        },
      },
      {
        id: "camp_stay",
        label: "Stay in City Hall — let the primary come to you",
        location: { x: 404, y: 432, name: "City Hall" },
        description: "Skip the trail. Manage the city, stay neutral on the race, preserve relationships on all sides.",
        effect: (s) => {
          s.factionApproval.establishment    = Math.min(100, s.factionApproval.establishment + 5);
        },
      },
    ],
  },

  governor_primary: {
    type: "dialogue", speaker: "park",
    lines: [
      "June 2026. The Democratic gubernatorial primary is two weeks out.",
      "Hochul is the incumbent. On her left: Antonio Delgado — labor-backed, running on housing and tenant protections. Julia Salazar is also in the field, drawing from the DSA base. And Bruce Blakeman is running a law-and-order Republican campaign, pulling outer-borough votes from whoever fumbles first.",
      (s) => s.flags.owesHochul
        ? "You called in that favor. Hochul's people are already expecting your endorsement — this isn't much of a decision."
        : "A mayoral endorsement moves precincts in this city. Who are you backing?",
    ],
    choices: [
      {
        text: "Endorse Hochul.",
        next: "gov_campaign",
        effect: (s) => {
          const power = endorsementPower(s, { teamsters: 0.4, smallBusiness: 0.3, pba: 0.3 });
          applyEndorsement(s, power, {
            factions: { establishment: 5, centrist: 3, leftWfp: -4, progressive: -3, dsa: -6, felder: -2 },
            groups:   { wfp: -8 },
            influence: { factions: { establishment: 0.2 }, groups: { teamsters: 0.1 } },
          });
          s.flags.owesHochul = false;
          s.flags.endorsedGov = "hochul";
        },
      },
      {
        text: "Endorse Antonio Delgado.",
        available: (s) => !s.flags.owesHochul,
        tooltip: "You owe Hochul — you can't publicly cross her.",
        next: "gov_campaign",
        effect: (s) => {
          const power = endorsementPower(s, { wfp: 0.5, tenantBloc: 0.3, openNY: 0.2 });
          applyEndorsement(s, power, {
            factions: { leftWfp: 6, progressive: 4, dsa: 3, establishment: -4, centrist: -3, felder: -2 },
            groups:   { wfp: 8, tenantBloc: 3 },
            influence: { groups: { wfp: 0.3, tenantBloc: 0.1 } },
          });
          s.flags.endorsedGov = "delgado";
        },
      },
      {
        text: "Endorse Julia Salazar.",
        available: (s) => !s.flags.owesHochul && (s.factionApproval.dsa >= 60 || s.flags.backedHudson),
        tooltip: "Requires DSA approval ≥ 60, or having backed Hudson for Speaker.",
        next: "gov_campaign",
        effect: (s) => {
          const power = endorsementPower(s, { wfp: 0.4, tenantBloc: 0.4, openNY: 0.2 });
          applyEndorsement(s, power, {
            factions: { dsa: 10, leftWfp: 6, progressive: 3, establishment: -8, centrist: -6, felder: -5, republican: -3 },
            groups:   { wfp: 10, tenantBloc: 5 },
            influence: { groups: { wfp: 0.3, tenantBloc: 0.2 }, factions: { dsa: 0.3 } },
          });
          s.flags.endorsedGov = "salazar";
        },
      },
      {
        text: "Endorse Bruce Blakeman.",
        available: (s) => !s.flags.owesHochul && (
          (s.factionApproval.republican >= 50 && s.groups.pba.approval >= 65) ||
          s.factionApproval.farRight >= 50
        ),
        tooltip: "Requires Rep ≥ 50 + PBA ≥ 65, or Far-Right approval ≥ 50.",
        next: "gov_campaign",
        effect: (s) => {
          const power = endorsementPower(s, { pba: 0.5, smallBusiness: 0.3, elizabethGarden: 0.2 });
          applyEndorsement(s, power, {
            factions: { farRight: 8, republican: 6, centrist: 3, dsa: -12, leftWfp: -10, progressive: -8, establishment: -6 },
            groups:   { pba: 10, smallBusiness: 5 },
            influence: { groups: { pba: 0.4, smallBusiness: 0.2 }, factions: { farRight: 0.3 } },
          });
          s.flags.endorsedGov = "blakeman";
        },
      },
    ],
  },

  governor_primary_result: {
    type: "dialogue", speaker: "park",
    lines: [
      "June 28 — primary night.",
      (s) => {
        const w = determineGovPrimary(s);
        if (w === "hochul")  return "Hochul holds. The institutional machine delivered — labor, city officials, suburban Democrats. She wins by eight points.";
        if (w === "delgado") return "Delgado wins. It's narrow — two points in the final count. WFP and the tenant coalition turned out in numbers nobody modeled. Albany is about to get interesting.";
        if (w === "salazar") return "Salazar wins. The room goes quiet. Nobody expected this. The left coalition held together and the upstate margins collapsed. Hochul concedes at midnight.";
        return "";
      },
      (s) => {
        const w = determineGovPrimary(s);
        const e = s.flags.endorsedGov;
        const power = (() => {
          if (e === "hochul")   return endorsementPower(s, { teamsters: 0.4, smallBusiness: 0.3, pba: 0.3 });
          if (e === "delgado")  return endorsementPower(s, { wfp: 0.5, tenantBloc: 0.3, openNY: 0.2 });
          if (e === "salazar")  return endorsementPower(s, { wfp: 0.4, tenantBloc: 0.4, openNY: 0.2 });
          if (e === "blakeman") return endorsementPower(s, { pba: 0.5, smallBusiness: 0.3, elizabethGarden: 0.2 });
          return 1;
        })();
        const strength = power > 1.4 ? "strong" : power > 0.8 ? "moderate" : "weak";
        if (e === w)
          return `Your endorsement carried ${strength} weight and helped push ${w === "hochul" ? "Hochul over the line" : w === "delgado" ? "Delgado across the finish" : "Salazar to the impossible"}.`;
        if (e === "blakeman")
          return `You backed Blakeman — a Democrat won anyway. Your endorsement won't be forgotten by whoever heads to Albany.`;
        if (w === "hochul" && e !== "hochul")
          return `Hochul survived without you. She noticed. Your ${strength} endorsement of ${e} didn't change the outcome — but it changed the relationship.`;
        return `Your endorsement of ${e} didn't deliver the race, but it positioned you with a rising coalition heading into November.`;
      },
    ],
    choices: [
      {
        text: "November.",
        next: "governor_general_result",
        effect: (s) => {
          const winner = determineGovGeneral(s, determineGovPrimary(s));
          s.flags.govWinner = winner;
          if (winner !== "hochul") {
            s.figures.hochul.approval = s.flags.endorsedGov === winner ? 72 : 22;
            s.figures.hochul.popularity = s.flags.endorsedGov === winner ? 68 : 30;
          }
        },
      },
    ],
  },

  governor_general_result: {
    type: "dialogue", speaker: "park",
    lines: [
      "November 3, 2026 — general election night.",
      (s) => {
        const primary = determineGovPrimary(s);
        const general = determineGovGeneral(s, primary);
        if (general === "blakeman") return "Blakeman wins. A Republican governor for the first time in twenty years. The room is silent. State aid to the city is already in question — his first press release mentions the MTA and congestion pricing.";
        if (general === "hochul")   return "Hochul wins reelection. Four more years. Albany stays where it was — neither an ally nor an obstacle, unless you made it one.";
        if (general === "delgado")  return "Delgado wins the general. A new governor, labor-backed, with a housing agenda the WFP helped write. Your relationship with Albany depends entirely on what you built this spring.";
        if (general === "salazar")  return "Salazar wins. New York is New York. She's governor-elect, calling for statewide rent stabilization before the results are even certified.";
        return "";
      },
      (s) => {
        const primary = determineGovPrimary(s);
        const general = determineGovGeneral(s, primary);
        const e = s.flags.endorsedGov;
        if (general === "blakeman")
          return e === "blakeman"
            ? "You backed him. Your phone is already ringing — outer-borough Republicans want to know what you're going to do with this."
            : "You didn't see this coming. Nobody did. The next budget conversation with Albany just got a lot harder.";
        if (e === general)
          return "You backed the winner. The governor's office will take your calls. How much that's worth depends on what you ask for.";
        if (e === "hochul" && general !== "hochul")
          return "You backed Hochul and she lost. The new governor knows where you stood. Starting from zero.";
        return "You didn't back the winner, but you're not toxic either. The relationship is transactional from here.";
      },
      "Year one is in the books. Take the holidays. Year two won't wait.",
    ],
    choices: [
      {
        text: "On to 2027.",
        next: "paper_gov",
        effect: (s) => { s.month = 11; s.monthLabel = "November"; },
      },
    ],
  },

  // ═══════════════════════ YEAR TWO — 2027 ═══════════════════════

  time_to_2027: {
    type: "time_pass",
    months: ["December", "January"],
    year: "2026 → 2027",
    next: "year2_brief",
    nextEffect: (s) => { s.year = 2027; },
  },

  year2_brief: {
    type: "dialogue", speaker: "park",
    lines: [
      "Happy New Year, Mr. Mayor. Year two.",
      (s) => {
        const notes = [];
        if (s.flags.deferredCapital) notes.push("the capital work we deferred is still deferred");
        if (s.flags.deferredPension) notes.push("the pension paper is still where we left it");
        if (s.flags.issuedBonds)     notes.push("first bond service payment hits in April");
        return notes.length
          ? `The books carried over — and so did the fine print: ${notes.join(", ")}.`
          : "Clean books, no skeletons. That's rarer than you know in this building.";
      },
      "Council elections are in November. All fifty-one seats. Everything you do this year is on that ballot, whether you like it or not.",
      "Your desk is already stacking up — take things in whatever order you want. Just don't leave anything sitting there past budget season.",
    ],
    choices: [
      {
        text: "To the desk.",
        next: "office_2027",
        effect: (s) => { s.month = 2; s.monthLabel = "February"; },
      },
    ],
  },

  office_2027: {
    type: "office",
    month: "WINTER–SPRING 2027",
    headline: "The desk sets the pace now. Take the meetings in any order — all of them, before budget season opens.",
    inbox: [
      {
        id: "inb_crisis",
        label: (s) => s.flags.deferredCapital ? "DOT — urgent structural briefing" : "OEM — storm posture briefing",
        desc: (s) => s.flags.deferredCapital
          ? "Something happened on the BQE overnight. The Deputy Mayor is pale."
          : "A nor'easter is stacking up off the coast. Sanitation wants a posture.",
        next: (s) => (s.flags.deferredCapital ? "crisis_bqe" : "crisis_blizzard"),
        done: (s) => !!s.flags.crisis2027,
      },
      {
        id: "inb_trump",
        label: "The White House is calling",
        desc: "The President's office has called the switchboard three times since Thursday. They'll keep calling.",
        next: "call_trump_2027",
        effect: (s) => { s.month = 3; s.monthLabel = "March"; },
        done: (s) => !!s.flags.fedThreat,
      },
      {
        id: "inb_speaker",
        label: "The Speaker wants five minutes",
        desc: "Whatever it is, it's big enough that they're asking in person instead of leaking it.",
        next: "call_speaker_2027",
        effect: (s) => { s.month = 4; s.monthLabel = "April"; },
        done: (s) => !!s.flags.speakerBill,
      },
      {
        id: "inb_press",
        label: "NY1 — the year-two sit-down",
        desc: "Calloway's producers have been circling since New Year's. Take it early and shape the narrative, or late and answer for everything.",
        next: "press_y2_q1",
        done: (s) => !!s.flags.pressY2,
      },
    ],
    next: "budget_2027",
    nextEffect: (s) => { s.month = 5; s.monthLabel = "May"; },
    nextLabel: "OPEN BUDGET SEASON",
  },

  // ─── Inside City Hall — the Year Two sit-down ───
  // Questions react to whatever the player has already handled this year,
  // so taking the interview early vs. late genuinely changes it.

  press_y2_q1: {
    type: "dialogue", speaker: "calloway",
    lines: [
      "Mr. Mayor. Year two. Let's not waste it on pleasantries.",
      (s) => {
        if (s.flags.fedThreat === "defied") return "You told the President of the United States — on a call your own staff leaked — that this city complies with federal law and nothing more. Three billion in grants, frozen. Was the sentence worth the money?";
        if (s.flags.fedThreat === "negotiated") return "There's a deal with Washington. Nobody will say what's in it — not your office, not theirs — which usually means somebody's ashamed of something. What did you trade, Mr. Mayor?";
        if (s.flags.fedThreat === "declined") return "The President of the United States called this building, and you didn't pick up. Some voters love that. The ones whose grants got slow-walked love it less. Explain the math to them.";
        if (s.flags.crisis2027 === "bqe_repaired") return "The BQE. Concrete on the promenade, a deferral memo with your administration's name on it — and then, credit where due, an eleven-day repair the engineers are still praising. Which half of that story is the real one?";
        if (s.flags.crisis2027 === "bqe_patched") return "The BQE. A forty-foot section failed, and your answer was scaffolding and a study. Every engineer we've spoken to uses the word 'interim' with a very specific tone. When does interim end?";
        if (s.flags.crisis2027 === "bqe_blamed") return "The BQE. You pointed at Albany, Albany pointed back with your own deferral memo, and the cantilever is still cracked. Who actually fixes the road, Mr. Mayor?";
        if (s.flags.crisis2027 === "blizzard_hero") return "The blizzard. Twenty-six inches, every street plowed twice, a photo on a salt spreader that your comms shop could not have staged better. Was that governance or was that a campaign ad?";
        if (s.flags.crisis2027 === "blizzard_manhattan") return "The blizzard. Manhattan was clear by Tuesday. Bayside dug out by Friday. You've seen the 'Tale of Two Cities' coverage — is there a version of this where the outer boroughs aren't second?";
        if (s.flags.crisis2027 === "blizzard_cheap") return "The blizzard. Nine days of school closures, two water mains, and an ambulance stuck on 164th Street in a video with four million views. What do you say to the family that was in that ambulance?";
        return "It's February, City Hall has been remarkably quiet, and the desk calendar we obtained shows a stack of meetings you haven't taken yet. The White House, the Speaker, a storm season. What are you waiting for?";
      },
    ],
    choices: [
      {
        text: "Take the question head-on.",
        next: "press_y2_q2",
        effect: (s) => { s.approval = Math.min(100, s.approval + 2); },
      },
      {
        text: "Reframe it — talk about what the city got, not what it cost.",
        next: "press_y2_q2",
        effect: (s) => { s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2); },
      },
      {
        text: "Dispute the premise entirely.",
        next: "press_y2_q2",
        effect: (s) => { s.approval = Math.max(0, s.approval - 2); s.factionApproval.farRight = Math.min(100, s.factionApproval.farRight + 1); },
      },
    ],
  },

  press_y2_q2: {
    type: "dialogue", speaker: "calloway",
    lines: [
      (s) => {
        if (s.flags.newCommissioner) return "Commissioner Vasquez. Four months in, well-liked at One Police Plaza, and every profile mentions the same thing: whose shadow she works in. Do you regret how the Tisch era ended?";
        if (s.flags.firedTisch) return "One Police Plaza has been run by an interim commissioner for over a year — since the firing, the sick-out, the warehouse. The city's police department is a headless institution in an election year. When does that end?";
        if (s.flags.speakerBill === "blocked") return "The Speaker brought you their signature bill and your budget office killed it. Fifty-one council seats are on the ballot in November, and the Speaker has a long memory and a whip list. What did blocking it buy you?";
        if (s.flags.speakerBill === "rtc_backed") return "Right to Counsel — certified by your budget office, cheered by every tenant group in the city, and quietly loathed by the real estate lobby that funds half this town's campaigns. You've picked a side. Say it on camera.";
        if (s.flags.speakerBill === "sbr_backed") return "The small business package — your OMB scored it, the storefronts love it, and the left says you found money for landlords' tenants but not for NYCHA's. All fifty-one seats vote in November. Whose turnout are you betting on?";
        return "November. All fifty-one Council seats, two years of your choices on the ballot, and every faction in this city keeping score. Give me the honest version: what does a good night look like?";
      },
    ],
    choices: [
      {
        text: "Answer like it's a legacy question — because it is.",
        next: "office_2027",
        effect: (s) => {
          s.flags.pressY2 = true;
          s.approval = Math.min(100, s.approval + 2);
        },
      },
      {
        text: "Answer like a candidate — everything routes back to the message.",
        next: "office_2027",
        effect: (s) => {
          s.flags.pressY2 = true;
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 2);
          s.approval = Math.max(0, s.approval - 1);
        },
      },
      {
        text: "\"Good night, Diane.\" It's a live show — make her cut to break.",
        next: "office_2027",
        effect: (s) => {
          s.flags.pressY2 = true;
          s.approval = Math.max(0, s.approval - 2);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 2);
        },
      },
    ],
  },

  budget_2027: {
    type: "budget_fight",
    next: "budget_2027_result",
    rounds: [
      {
    title: "FISCAL YEAR 2028 — ONE BIG CALL",
    prompt: (s) => {
      const bits = [];
      if (s.flags.issuedBonds) bits.push("last year's bond service starts hitting this cycle");
      if (s.flags.fedThreat === "defied") bits.push("the frozen federal grants left holes in eleven agency budgets");
      if (s.flags.controlBoard) bits.push("every line item goes through Albany's board");
      const context = bits.length ? ` Context: ${bits.join("; ")}.` : "";
      return `Year two's budget is one defining choice, not three.${context} What's the headline?`;
    },
    options: [
      {
        id: "y2_hold_line",
        label: "Hold spending flat — a caretaker budget",
        delta: 2,
        costLabel: "nobody's inspired, nobody's furious",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 2;
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 3);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 3);
          s.approval = Math.max(0, s.approval - 1);
        },
      },
      {
        id: "y2_expand",
        label: "Expand — housing vouchers and mental health teams",
        delta: -4,
        costLabel: "an agenda with your name on it, and a bill to match",
        available: () => true,
        effect: (s) => {
          s.resources.budget -= 4;
          s.approval = Math.min(100, s.approval + 3);
          s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 7);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 5);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 4);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 4);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 3);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 3);
        },
      },
      {
        id: "y2_reserves",
        label: "Replenish the rainy-day fund",
        delta: 3,
        costLabel: "the responsible choice — and it reads that way, which is to say boring",
        available: () => true,
        effect: (s) => {
          s.resources.budget += 3;
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 4);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
          s.groups.smallBusiness.approval = Math.min(100, s.groups.smallBusiness.approval + 3);
          s.approval = Math.max(0, s.approval - 1);
        },
      },
      {
        id: "y2_backfill",
        label: "Backfill the frozen federal grants with city money",
        delta: -3,
        costLabel: "you said the city stands alone — this is what that costs",
        available: (s) => s.flags.fedThreat === "defied",
        unavailableReason: "Only relevant if federal grants were frozen",
        effect: (s) => {
          s.resources.budget -= 3;
          s.approval = Math.min(100, s.approval + 4);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 4);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 4);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 3);
        },
      },
      {
        id: "y2_defuse_pension",
        label: "Quietly unwind the pension reclassification",
        delta: -3,
        costLabel: "defuses the year-three bomb before anyone finds it",
        available: (s) => !!s.flags.deferredPension,
        unavailableReason: "No pension reclassification on the books",
        effect: (s) => {
          s.resources.budget -= 3;
          s.flags.deferredPension = false;
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 2);
        },
      },
    ],
      },
    ],
  },

  budget_2027_result: {
    type: "dialogue", speaker: "park",
    lines: [
      (s) => {
        const b = s.resources.budget;
        if (b >= 0) return `The FY28 budget passed the Council without theater. Position: ${b >= 0 ? "+" : ""}${b} points. A second year of solvency is the kind of thing nobody thanks you for and everybody notices.`;
        return `The FY28 budget passed. Position: ${b} points. The gap is a known quantity now — which is both better and worse than a surprise.`;
      },
      "Summer's open. The election is in November, and where you spend these months decides who's mobilized when it counts.",
    ],
    choices: [
      {
        text: "Into the summer.",
        next: "hub_2027",
        effect: (s) => { s.month = 6; s.monthLabel = "June"; },
      },
    ],
  },

  crisis_bqe: {
    type: "dialogue", speaker: "park", urgent: true,
    lines: [
      "At 6:40 this morning a forty-foot section of the BQE cantilever in Brooklyn Heights dropped concrete onto the promenade below. No injuries — a jogger cleared the area ninety seconds earlier.",
      "The stabilization work on that stretch was in the capital plan. It was one of the projects we deferred to balance the budget.",
      "The Post already has the memo. Their headline is one word: 'DEFERRED.'",
      "DOT says we have three options. None of them are good.",
    ],
    choices: [
      {
        text: "Full emergency repair. Whatever it costs.",
        next: "crisis_result",
        effect: (s) => {
          s.resources.budget -= 4;
          s.flags.crisis2027 = "bqe_repaired";
          s.approval = Math.min(100, s.approval + 4);
          s.groups.openNY.approval = Math.min(100, s.groups.openNY.approval + 6);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 4);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
        },
      },
      {
        text: "Shore it up, fence it off, study it. Cheap.",
        next: "crisis_result",
        effect: (s) => {
          s.resources.budget -= 1;
          s.flags.crisis2027 = "bqe_patched";
          s.approval = Math.max(0, s.approval - 3);
          s.groups.openNY.approval = Math.max(0, s.groups.openNY.approval - 5);
          s.factionApproval.progressive = Math.max(0, s.factionApproval.progressive - 3);
        },
      },
      {
        text: "The BQE is a state road. Put this on Albany.",
        next: "crisis_result",
        effect: (s) => {
          s.flags.crisis2027 = "bqe_blamed";
          s.approval = Math.min(100, s.approval + 1);
          s.figures.hochul.approval = Math.max(0, s.figures.hochul.approval - 8);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 4);
          s.factionApproval.farRight = Math.min(100, s.factionApproval.farRight + 3);
        },
      },
    ],
  },

  crisis_blizzard: {
    type: "dialogue", speaker: "park", urgent: true,
    lines: [
      "Nor'easter. Twenty-six inches in eighteen hours — the biggest February storm since 2010. Sanitation is calling it a two-borough problem: Queens and Staten Island are buried.",
      "Every mayor gets one snowstorm. Lindsay never recovered from his. De Blasio got dragged for a golf-cart photo. This one is yours.",
      "OEM needs a posture in the next hour.",
    ],
    choices: [
      {
        text: "Full mobilization. Every plow, every borough, overtime unlimited.",
        next: "crisis_result",
        effect: (s) => {
          s.resources.budget -= 2;
          s.flags.crisis2027 = "blizzard_hero";
          s.approval = Math.min(100, s.approval + 6);
          s.groups.teamsters.approval = Math.min(100, s.groups.teamsters.approval + 5);
          s.factionApproval.republican = Math.min(100, s.factionApproval.republican + 3);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
        },
      },
      {
        text: "Prioritize Manhattan arteries and hospital corridors first.",
        next: "crisis_result",
        effect: (s) => {
          s.resources.budget -= 1;
          s.flags.crisis2027 = "blizzard_manhattan";
          s.approval = Math.max(0, s.approval - 2);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 3);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 4);
          s.factionApproval.felder = Math.max(0, s.factionApproval.felder - 3);
          s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 4);
        },
      },
      {
        text: "Standard response. It's snow — it melts.",
        next: "crisis_result",
        effect: (s) => {
          s.flags.crisis2027 = "blizzard_cheap";
          s.approval = Math.max(0, s.approval - 8);
          s.groups.teamsters.approval = Math.max(0, s.groups.teamsters.approval - 4);
          s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 4);
          s.factionApproval.republican = Math.max(0, s.factionApproval.republican - 5);
        },
      },
    ],
  },

  crisis_result: {
    type: "dialogue", speaker: "park",
    lines: [
      (s) => {
        switch (s.flags.crisis2027) {
          case "bqe_repaired":   return "Crews worked around the clock for eleven days. The cantilever is stable, the promenade is open, and the tabloids moved on. Expensive — but nobody's running attack ads about a bridge you fixed.";
          case "bqe_patched":    return "The shoring went up in a week. DOT calls it 'interim.' Everyone at the table knows 'interim' means 'until after the election.' The engineers' report is sealed — for now.";
          case "bqe_blamed":     return "Albany fired back within the hour — the Governor's office released the city's own deferral memo. The lawyers are billing. The cantilever is still cracked.";
          case "blizzard_hero":  return "Seventy-two hours, every street plowed twice. The Daily News ran a photo of you on a salt spreader in Middle Village. Outer-borough approval hasn't looked like this in years.";
          case "blizzard_manhattan": return "Manhattan was clear by Tuesday. Bayside dug itself out by Friday. The 'Tale of Two Cities' segments wrote themselves. Queens will remember this in November.";
          case "blizzard_cheap": return "It didn't melt. It froze, thawed, and froze again. Nine days of school closures, two water main breaks, and a viral video of an ambulance stuck on 164th Street. That one's going to follow you.";
          default: return "The situation resolved.";
        }
      },
      "That's handled. The desk is still full.",
    ],
    choices: [
      { text: "Back to the desk.", next: "office_2027" },
    ],
  },

  call_trump_2027: {
    type: "phone_call", speaker: "trump",
    decline: {
      next: "office_2027",
      effect: (s) => {
        s.flags.fedThreat = "declined";
        s.figures.trump.approval = Math.max(0, s.figures.trump.approval - 10);
        s.resources.budget -= 2;
        s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 5);
        s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 4);
        s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 5);
      },
    },
    turns: [
      {
        lines: [
          '"I\'m hearing things about your city."',
          '"Bad things. Very bad things."',
        ],
        choices: [
          { text: '"What can I do for you, Mr. President?"' },
          { text: '"..."' },
        ],
      },
      {
        lines: [
          '"Your sanctuary nonsense. My people tell me I can pull three billion in federal grants — like that."',
          '"So here\'s what\'s going to happen. You\'re going to start cooperating with ICE, and everything stays nice and friendly."',
        ],
        choices: [
          {
            text: '"The city complies with federal law. Nothing more."',
            effect: (s) => {
              s.flags.fedThreat = "defied";
              s.figures.trump.approval = Math.max(0, s.figures.trump.approval - 6);
              s.resources.budget -= 3;
              s.approval = Math.min(100, s.approval + 3);
              s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 6);
              s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 5);
              s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 4);
              s.factionApproval.farRight = Math.max(0, s.factionApproval.farRight - 5);
            },
          },
          {
            text: '"Let\'s talk. Quietly."',
            effect: (s) => {
              s.flags.fedThreat = "negotiated";
              s.figures.trump.approval = Math.min(100, s.figures.trump.approval + 5);
              s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2);
              s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 8);
              s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 6);
              s.factionApproval.progressive = Math.max(0, s.factionApproval.progressive - 4);
            },
          },
          {
            text: '"..."',
            effect: (s) => {
              s.flags.fedThreat = "stonewalled";
              s.figures.trump.approval = Math.max(0, s.figures.trump.approval - 3);
            },
          },
        ],
      },
      {
        lines: [
          (s) => s.flags.fedThreat === "negotiated"
            ? '"Smart. Very smart. My people will call your people."'
            : s.flags.fedThreat === "defied"
              ? '"Wrong answer. We\'ll see how long that lasts."'
              : '"The silent treatment. Okay. Okay. We\'ll do it the other way."',
        ],
        choices: [
          { text: '"Goodbye, Mr. President."', next: "office_2027" },
        ],
      },
    ],
  },

  call_speaker_2027: {
    type: "phone_call",
    speaker: (s) => (s.flags.speakerElected === "hudson" ? "hudson" : "menin"),
    turns: [
      {
        lines: [
          (s) => {
            const madeThem = (s.flags.speakerElected === "hudson" && s.flags.backedHudson) ||
                             (s.flags.speakerElected === "menin" && s.flags.backedMenin);
            if (madeThem) return s.flags.speakerElected === "hudson"
              ? "Mayor. I still remember who built my coalition — so I'm bringing this to you before it leaks."
              : "Mayor. You had my back in January — I'm returning the courtesy before this hits the press.";
            return s.flags.speakerElected === "hudson"
              ? "Mayor. We haven't talked much this year. That's been deliberate — on both sides. But this one requires a conversation."
              : "Mayor. I'll be brief — we don't need to pretend this is a social call.";
          },
          (s) => s.flags.speakerElected === "hudson"
            ? "The Council is moving a Right to Counsel expansion — a lawyer for every tenant facing eviction, citywide. I have the votes to pass it. What I need is your budget office to certify the funding instead of fighting me."
            : "I'm moving a small business relief package — tax abatements for storefronts, expedited permitting, the works. I have the votes. What I need is your OMB to score it honestly instead of burying it.",
        ],
        choices: [
          {
            text: '"Certify it. Let\'s get it done."',
            effect: (s) => {
              s.resources.budget -= 2;
              s.figures.speaker.approval = Math.min(100, s.figures.speaker.approval + 10);
              if (s.flags.speakerElected === "hudson") {
                s.flags.speakerBill = "rtc_backed";
                s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 8);
                s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 5);
                s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 5);
                s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 3);
              } else {
                s.flags.speakerBill = "sbr_backed";
                s.groups.smallBusiness.approval = Math.min(100, s.groups.smallBusiness.approval + 8);
                s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 5);
                s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 4);
                s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 3);
              }
            },
          },
          {
            text: '"My budget office scores what the numbers say. No promises."',
            effect: (s) => {
              s.flags.speakerBill = "neutral";
              s.figures.speaker.approval = Math.max(0, s.figures.speaker.approval - 4);
            },
          },
          {
            text: '"Not this year. The budget can\'t carry it."',
            effect: (s) => {
              s.flags.speakerBill = "blocked";
              s.figures.speaker.approval = Math.max(0, s.figures.speaker.approval - 12);
              if (s.flags.speakerElected === "hudson") {
                s.groups.tenantBloc.approval = Math.max(0, s.groups.tenantBloc.approval - 6);
                s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 6);
                s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 5);
                s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
              } else {
                s.groups.smallBusiness.approval = Math.max(0, s.groups.smallBusiness.approval - 6);
                s.factionApproval.centrist = Math.max(0, s.factionApproval.centrist - 5);
                s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 4);
                s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 2);
              }
            },
          },
        ],
      },
      {
        lines: [
          (s) => {
            if (s.flags.speakerBill === "rtc_backed") return "Good. Tenants remember who showed up. So do I.";
            if (s.flags.speakerBill === "sbr_backed") return "Good. The storefronts remember who showed up. So do I.";
            if (s.flags.speakerBill === "neutral")    return "The numbers. Right. Well — we'll see what the numbers say when you need twenty-six votes for something.";
            return "Noted, Mr. Mayor. I hope the budget can carry the next thing you need from this Council.";
          },
        ],
        choices: [
          { text: '"Talk soon, Speaker."', next: "office_2027" },
        ],
      },
    ],
  },

  hub_2027: {
    type: "hub",
    month: "June 2027",
    headline: "Council elections in six months. All 51 seats. Where you spend the summer decides who's mobilized in November.",
    nextLabel: "Head into the fall",
    next: "time_to_fall_2027",
    maxActions: 2,
    actions: [
      {
        id: "y2_nycha",
        label: "NYCHA repair blitz",
        location: { x: 538, y: 218, name: "South Bronx" },
        description: "Emergency elevator and boiler repairs across 40 developments. Tenants notice. Costs real money.",
        effect: (s) => {
          s.resources.budget -= 2;
          s.groups.tenantBloc.approval = Math.min(100, s.groups.tenantBloc.approval + 9);
          s.influence.groups.tenantBloc = (s.influence.groups.tenantBloc ?? 1.0) + 0.2;
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 3);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 3);
        },
      },
      {
        id: "y2_precinct",
        label: "Precinct ride-alongs",
        location: { x: 770, y: 462, name: "Southeast Queens" },
        description: "A month of Friday nights with patrol commands in high-crime precincts. The PBA mobilizes for allies.",
        effect: (s) => {
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 9);
          s.influence.groups.pba = (s.influence.groups.pba ?? 1.0) + 0.2;
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 4);
          s.factionApproval.leftWfp = Math.max(0, s.factionApproval.leftWfp - 3);
        },
      },
      {
        id: "y2_climate",
        label: "Rockaways resiliency tour",
        location: { x: 672, y: 560, name: "The Rockaways" },
        description: "Walk the new dune line with coastal engineers and Open NY. Climate money is popular everywhere it lands.",
        effect: (s) => {
          s.groups.openNY.approval = Math.min(100, s.groups.openNY.approval + 8);
          s.influence.groups.openNY = (s.influence.groups.openNY ?? 1.0) + 0.2;
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 4);
          s.approval = Math.min(100, s.approval + 2);
        },
      },
      {
        id: "y2_smallbiz",
        label: "Small business week",
        location: { x: 700, y: 355, name: "Flushing, Queens" },
        description: "Storefront tours, permit-fast-track announcements, ribbon cuttings. The BID coalition turns out its members.",
        effect: (s) => {
          s.groups.smallBusiness.approval = Math.min(100, s.groups.smallBusiness.approval + 9);
          s.influence.groups.smallBusiness = (s.influence.groups.smallBusiness ?? 1.0) + 0.2;
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 4);
          s.factionApproval.felder = Math.min(100, s.factionApproval.felder + 3);
        },
      },
      {
        id: "y2_labor",
        label: "Union hall circuit",
        location: { x: 618, y: 282, name: "Hunts Point, Bronx" },
        description: "Teamsters, building trades, 32BJ. Labor's ground game is the best in the city — if it's working for you.",
        effect: (s) => {
          s.groups.teamsters.approval = Math.min(100, s.groups.teamsters.approval + 9);
          s.influence.groups.teamsters = (s.influence.groups.teamsters ?? 1.0) + 0.2;
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 3);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 3);
        },
      },
      {
        id: "y2_wfp",
        label: "WFP field program",
        location: { x: 530, y: 465, name: "Crown Heights" },
        description: "Fund the canvass. WFP's volunteers knock every door in the contested districts — for whoever they believe in.",
        effect: (s) => {
          s.groups.wfp.approval = Math.min(100, s.groups.wfp.approval + 9);
          s.influence.groups.wfp = (s.influence.groups.wfp ?? 1.0) + 0.2;
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 3);
          s.factionApproval.leftWfp = Math.min(100, s.factionApproval.leftWfp + 4);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 3);
        },
      },
      {
        id: "y2_onepp",
        label: "One Police Plaza summit",
        show: (s) => !s.flags.firedTisch,
        location: { x: 415, y: 452, name: "One Police Plaza" },
        description: "A full day with Tisch and her deputy commissioners on the reform agenda. The Commissioner notices who invests in her.",
        effect: (s) => {
          s.figures.tisch.approval = Math.min(100, s.figures.tisch.approval + 8);
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 4);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 2);
          s.factionApproval.dsa = Math.max(0, s.factionApproval.dsa - 3);
        },
      },
      {
        id: "y2_commsearch",
        label: "Seat a new Commissioner",
        show: (s) => !!s.flags.firedTisch,
        location: { x: 415, y: 452, name: "One Police Plaza" },
        description: "End the interim era. Elena Vasquez — 22 years on the job, chief of detectives, no politics anyone can find — is ready to take the oath.",
        effect: (s) => {
          s.flags.newCommissioner = true;
          s.figures.tisch = { name: "Comm. Elena Vasquez", role: "NYPD Police Commissioner", color: "#D9C76B", approval: 55, popularity: 50 };
          s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 5);
          s.factionApproval.centrist = Math.min(100, s.factionApproval.centrist + 3);
          s.factionApproval.establishment = Math.min(100, s.factionApproval.establishment + 2);
        },
      },
    ],
  },

  time_to_fall_2027: {
    type: "time_pass",
    months: ["July", "August", "September", "October", "November"],
    year: "2027",
    next: "election_night_2027",
  },

  election_night_2027: {
    type: "dialogue", speaker: "park",
    lines: [
      "November 2, 2027. Election night.",
      "Fifty-one districts. Two years of your choices on the ballot — the budget, the storm, the White House, all of it.",
      "The first returns close at nine.",
    ],
    choices: [
      {
        text: "Watch the returns.",
        next: "election_results_2027",
        effect: (s) => { runCouncilElectionMut(s); },
      },
    ],
  },

  election_results_2027: {
    type: "dialogue", speaker: "park",
    lines: [
      (s) => {
        const e = s.flags.election2027;
        if (!e || e.flips.length === 0) return "Every coalition held. Fifty-one incumbent factions defended their ground — the first status-quo election in twenty years. Boring is a kind of verdict too.";
        const gains = {};
        for (const fl of e.flips) {
          gains[fl.to] = (gains[fl.to] || 0) + 1;
          gains[fl.from] = (gains[fl.from] || 0) - 1;
        }
        const names = { dsa: "DSA", leftWfp: "Left-WFP", progressive: "progressives", establishment: "the establishment", centrist: "centrists", felder: "Felder", republican: "Republicans", farRight: "the far right" };
        const winners = Object.entries(gains).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
        const losers  = Object.entries(gains).filter(([, n]) => n < 0).sort((a, b) => a[1] - b[1]);
        const wTxt = winners.map(([f, n]) => `${names[f]} +${n}`).join(", ");
        const lTxt = losers.map(([f, n]) => `${names[f]} ${n}`).join(", ");
        return `${e.flips.length} seat${e.flips.length !== 1 ? "s" : ""} changed hands tonight. Winners: ${wTxt}. Losers: ${lTxt}.`;
      },
      (s) => {
        const c = s.flags.election2027?.counts || {};
        const gop = (c.republican || 0) + (c.farRight || 0);
        const left = (c.dsa || 0) + (c.leftWfp || 0);
        return `The new math: ${51 - gop} Democratic seats, ${gop} Republican. The left bloc holds ${left}. Every bill you need next year starts from these numbers.`;
      },
      (s) => {
        const e = s.flags.election2027;
        const myGuy = s.flags.speakerElected;
        if (!e) return "The Speaker's office is quiet tonight.";
        const leftGain = e.flips.filter((f) => ["dsa", "leftWfp"].includes(f.to)).length - e.flips.filter((f) => ["dsa", "leftWfp"].includes(f.from)).length;
        if (myGuy === "hudson") {
          return leftGain > 0
            ? "Hudson's wing grew tonight. Her speakership — and your alliance with it — just got stronger."
            : leftGain < 0
              ? "Hudson's wing shrank. She'll need you more next year — or she'll need someone to blame."
              : "Hudson's numbers held. Steady as she goes.";
        }
        return leftGain > 0
          ? "The left grew tonight. Menin's coalition will feel the squeeze — and so will anything you try to pass through the middle."
          : "Menin's center held. The establishment machine still turns.";
      },
    ],
    choices: [
      { text: "The year winds down.", next: "paper_election27" },
    ],
  },

  // ═══════════════════ ENDGAME — OPERATION SAFEGUARD ═══════════════════

  federal_endgame: {
    type: "dialogue", speaker: "park", urgent: true,
    lines: [
      "One more thing before the year closes. It's not small.",
      "DHS activated something at 6 AM called Operation Safeguard — a federal task force 'to restore order in New York City.' Six hundred agents. ICE, ATF, Border Patrol tactical units. They're staging at Liberty State Park, across the water, where the cameras can see them.",
      "The White House hasn't called. The order is signed. Whether those agents cross the river — and what happens when they do — depends on relationships you've been building, or burning, for two years.",
    ],
    choices: [
      {
        text: "Call the President.",
        show: (s) => s.figures.trump.approval >= 35,
        next: "endgame_spared",
      },
      {
        text: "Call One Police Plaza.",
        show: (s) => s.figures.trump.approval < 35 && !s.flags.firedTisch && s.figures.tisch.approval >= 55,
        next: "endgame_stand",
      },
      {
        text: "Call the new Commissioner.",
        show: (s) => s.figures.trump.approval < 35 && !!s.flags.firedTisch && !!s.flags.newCommissioner && s.groups.pba.approval >= 45,
        next: "endgame_stand_new",
      },
      {
        text: "Find out where the NYPD stands.",
        show: (s) => s.figures.trump.approval < 35 && !!s.flags.firedTisch && s.groups.pba.approval < 35,
        next: "endgame_betrayed",
      },
      {
        text: "Get ahead of it.",
        show: (s) =>
          s.figures.trump.approval < 35 &&
          !(!s.flags.firedTisch && s.figures.tisch.approval >= 55) &&
          !(s.flags.firedTisch && s.flags.newCommissioner && s.groups.pba.approval >= 45) &&
          !(s.flags.firedTisch && s.groups.pba.approval < 35),
        next: "endgame_middle",
      },
    ],
  },

  endgame_stand_new: {
    type: "phone_call", speaker: "vasquez",
    turns: [
      {
        lines: [
          '"Mr. Mayor. Commissioner Vasquez. My counterparts at DHS expected a different answer from this building, so I want you to hear mine directly."',
          '"I took this job four months ago knowing exactly whose shadow came with it. I don\'t work for Washington."',
          '"Department posture as of oh-six-hundred: no joint operations, no database access without a court order. The rank and file aren\'t thrilled about backing you — they\'re less thrilled about being somebody\'s occupying force."',
          '"It\'ll hold, Mr. Mayor. It won\'t be pretty, but it\'ll hold."',
        ],
        choices: [
          {
            text: '"Thank you, Commissioner."',
            next: "year2_report",
            effect: (s) => {
              s.flags.endgame = "stand_new";
              s.approval = Math.min(100, s.approval + 4);
              s.figures.tisch.approval = Math.min(100, s.figures.tisch.approval + 6);
              s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 3);
              s.figures.trump.approval = Math.max(0, s.figures.trump.approval - 5);
              s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 3);
              s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 3);
            },
          },
        ],
      },
    ],
  },

  endgame_spared: {
    type: "phone_call", speaker: "trump",
    turns: [
      {
        lines: [
          '"Relax. I called it off an hour ago."',
          '"They wanted to do a whole thing. Tanks on the BQE, the works. I said no. Not this city."',
          '"You\'ve been straight with me. I don\'t forget that. Nobody believes me when I say it, but I don\'t."',
        ],
        choices: [
          {
            text: '"...Thank you, Mr. President."',
            next: "year2_report",
            effect: (s) => {
              s.flags.endgame = "spared";
              s.figures.trump.approval = Math.min(100, s.figures.trump.approval + 3);
            },
          },
          {
            text: '"..."',
            next: "year2_report",
            effect: (s) => { s.flags.endgame = "spared"; },
          },
        ],
      },
    ],
  },

  endgame_stand: {
    type: "phone_call", speaker: "tisch",
    turns: [
      {
        lines: [
          '"Mayor. My counterparts at DHS sent over their operational map an hour ago. They\'re expecting precinct-level cooperation. Access, databases, detainer holds."',
          '"So I want to be clear about something before the morning briefings."',
          '"The NYPD takes orders from City Hall. Not from a staging ground in Secaucus. I\'ve instructed every borough commander: no joint operations, no database access, no holds without a judge\'s signature."',
          '"If Washington wants this city, they can come ask you for it. Thirty-four thousand officers are about to make that conversation very expensive."',
        ],
        choices: [
          {
            text: '"Thank you, Jess. Whatever you need."',
            next: "year2_report",
            effect: (s) => {
              s.flags.endgame = "stand";
              s.approval = Math.min(100, s.approval + 5);
              s.figures.tisch.approval = Math.min(100, s.figures.tisch.approval + 6);
              s.groups.pba.approval = Math.min(100, s.groups.pba.approval + 4);
              s.figures.trump.approval = Math.max(0, s.figures.trump.approval - 5);
              s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 4);
              s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 4);
            },
          },
        ],
      },
    ],
  },

  endgame_betrayed: {
    type: "dialogue", speaker: "park", urgent: true,
    lines: [
      "Frank Doran went on Fox an hour ago. He called the task force — quote — 'the backup this city's cops have been begging for since the firings.'",
      "Precinct commanders are coordinating with federal teams directly. Gang databases, warrant lists, building access. City Hall found out from a press release.",
      "The department you decapitated and the union you broke picked a side tonight. It isn't ours. Six hundred agents become six thousand by spring — and every one of them will have an NYPD guide who knows the block.",
      "There's no version of this where we win the winter. The question is what's still standing by then.",
    ],
    choices: [
      {
        text: "Endure it.",
        next: "year2_report",
        effect: (s) => {
          s.flags.endgame = "betrayed";
          s.approval = Math.max(0, s.approval - 8);
          s.factionApproval.establishment = Math.max(0, s.factionApproval.establishment - 4);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 3);
        },
      },
    ],
  },

  endgame_middle: {
    type: "dialogue", speaker: "park",
    lines: [
      "The first federal teams crossed at dawn — raids in Corona, East New York, and the Bronx Hub. Forty-one arrests, six of them people with no record at all.",
      (s) => s.flags.firedTisch
        ? "The interim commissioner issued a statement so carefully worded it said nothing. The department is neither helping the feds nor stopping them — it's watching, the way you watch a fight you don't have a side in."
        : "The Commissioner is issuing carefully worded statements — no joint operations, but no interference either. The department is holding the middle, which is more than it might have done.",
      "Corp counsel filed in the Southern District an hour after the first door came off its hinges. We'll win some of it. Not before spring. Six hundred agents, and the city gets to find out what it's actually made of.",
    ],
    choices: [
      {
        text: "Fight it in court.",
        next: "year2_report",
        effect: (s) => {
          s.flags.endgame = "middle";
          s.approval = Math.max(0, s.approval - 4);
          s.figures.trump.approval = Math.max(0, s.figures.trump.approval - 3);
          s.factionApproval.dsa = Math.min(100, s.factionApproval.dsa + 2);
          s.factionApproval.progressive = Math.min(100, s.factionApproval.progressive + 2);
        },
      },
    ],
  },

  // ═══════════════════════ THE NEW YORK LEDGER ═══════════════════════

  paper_speaker: {
    type: "newspaper",
    next: (s) => (s.flags.dismissedRatCzar ? "call_speaker_ratczar" : "hub_post_speaker"),
    nextLabel: "BACK TO CITY HALL",
    stories: [
      {
        headline: (s) => s.flags.speakerElected === "hudson"
          ? "Hudson Takes the Gavel"
          : "Menin Elected Speaker; Establishment Holds the Center",
        body: (s) => {
          const gs = s.flags.groupStatus || {};
          if (s.flags.speakerElected === "hudson") {
            const votes = 12 + (gs.prog_lib === "won" ? 12 : 0) + (gs.ctr_cross === "won" ? 4 : 0);
            return `Crystal Hudson of Brooklyn was elected Speaker of the City Council yesterday, ${votes}–${51 - votes}, the first DSA-aligned member to hold the chamber's top post. The progressive wing, long a noisy minority, now controls the legislative calendar, committee assignments, and — as one member put it on background — "the thermostat." Establishment members left the chamber quickly.`;
          }
          const votes = s.flags.backedMenin
            ? 22 + (gs.repub === "won" ? 5 : 0) + (gs.prog_cross === "won" ? 4 : 0)
            : 22 + 4;
          return `Julie Menin of Manhattan was elected Speaker yesterday, ${Math.max(votes, 26)}–${51 - Math.max(votes, 26)}, in a result that surprised no one who counts votes for a living. The establishment coalition held, the left made noise, and the Council's center of gravity remains exactly where it has been for a decade: somewhere east of the Speaker's office and north of controversy.`;
        },
      },
      {
        headline: (s) => {
          if (s.flags.stayedNeutral) return "Mayor Sat Out the Speaker Fight — Aides Call It Strategy";
          const won = (s.flags.backedHudson && s.flags.speakerElected === "hudson") || (s.flags.backedMenin && s.flags.speakerElected === "menin");
          return won ? "Mayor's Early Bet Pays Off" : "City Hall Backed the Losing Horse";
        },
        body: (s) => {
          if (s.flags.stayedNeutral) return "Whether standing back was discipline or indecision depends on which floor of City Hall you ask.";
          const won = (s.flags.backedHudson && s.flags.speakerElected === "hudson") || (s.flags.backedMenin && s.flags.speakerElected === "menin");
          return won
            ? "The new Speaker's first call after the vote was to the second floor of City Hall. The second was to her scheduler."
            : "The new Speaker's office declined to comment on the Mayor's role in the race, which is itself a comment.";
        },
      },
      {
        headline: (s) => s.flags.pushedCarr ? "The Carr Experiment Ends Quietly" : null,
        body: () => "The Staten Island Republican's cross-aisle bid drew a mayoral push and little else. He withdrew before the floor vote.",
      },
    ],
  },

  paper_strike: {
    type: "newspaper",
    next: "swearing_in_week",
    nextLabel: "THREE WEEKS TO THE SPEAKER VOTE",
    stories: [
      {
        headline: (s) => {
          if (s.flags.strike2026 === "crackdown") return "City Breaks 'Blue Flu' After 19 Days";
          if (s.flags.strike2026 === "negotiated") return "Peace at a Price: Sick-Out Ends in Settlement";
          return "The Flu Burns Out: NYPD Sick-Out Ends Without a Deal";
        },
        body: (s) => {
          if (s.flags.strike2026 === "crackdown")
            return `The largest police job action since 1971 collapsed yesterday under Taylor Law penalties that union lawyers called "vindictive" and City Hall called "the statute." Hundreds of termination letters stand. Patrol strength is back above ninety percent, and precinct locker rooms are papered with photocopies of the Mayor's statement, annotated. The department returned to work. Nobody at One Police Plaza claims it returned to normal.`;
          if (s.flags.strike2026 === "negotiated")
            return `The deal that ended the sick-out gives the PBA back pay, amnesty for participants, and — most consequentially — a formal seat on the panel that will choose the next Police Commissioner. City Hall calls it pragmatism. The tabloids call it tribute. Both descriptions fit the facts.`;
          return `Eleven days after it began with a "bug going around" the four-eight, the sick-out simply stopped. No deal, no terminations, no resolution — just a department drifting back to work and a city that spent a week and a half timing ambulances. Nothing was settled, which both sides seem to regard as unfinished business.`;
        },
      },
      {
        headline: () => "Tisch, Out: 'I Said Don't Miss'",
        body: () => "The former Commissioner's only public comment since her dismissal came outside her Upper East Side building, four words long, delivered without breaking stride. Her allies say she is 'weighing options.' Her enemies can't find any.",
      },
      {
        headline: (s) => s.flags.strikeBomb ? "Warehouse Blast: No Arrests, Four Cases Gutted" : null,
        body: (s) => {
          if (s.flags.strikeBomb === "blamed") return "The Mayor's on-camera accusation against union leadership remains unmatched by charges. The PBA has framed it, literally — copies hang in every borough office.";
          if (s.flags.strikeBomb === "federal") return "The FBI's takeover of the investigation was read at One Police Plaza as an insult and in Washington as an invitation.";
          return "Investigators have released nothing. The evidence that burned included files in two corruption cases against terminated officers, a coincidence no one in the building believes.";
        },
      },
    ],
  },

  paper_budget: {
    type: "newspaper",
    next: "press_y1_q1",
    nextLabel: "SIX WEEKS TO THE PRIMARY",
    stories: [
      {
        headline: (s) => {
          if (s.flags.controlBoard) return "Albany Takes the Books";
          if (s.resources.budget >= 0) return "Balanced: Council Adopts Budget On Time";
          return "City Adopts Budget in the Red";
        },
        body: (s) => {
          if (s.flags.controlBoard)
            return `For the first time since the Beame administration, a state Financial Control Board holds approval power over every significant city expenditure. The Mayor's office calls the arrangement "temporary." The board's enabling statute does not use that word. Fiscal monitors in Albany described city negotiators as "cooperative," which in Albany is not a compliment.`;
          if (s.resources.budget >= 0)
            return `The adopted budget closes a structural deficit that three previous administrations managed mostly by describing it differently. The coalition that passed it — and the constituencies that paid for it — will both be on the ballot in November of next year. Comptroller's office analysts called the math "real, with asterisks."`;
          return `The Council adopted a budget ${Math.abs(s.resources.budget)} points out of balance, papered over with assurances that next year will be different. The bond market's reaction was a half-step downgrade in outlook — polite, for now. Albany noticed. Albany always notices.`;
        },
      },
      {
        headline: () => "What the Deal Cost",
        body: (s) => {
          const items = [];
          if (s.flags.deferredCapital) items.push("capital projects deferred (again)");
          if (s.flags.deferredPension) items.push("a pension reclassification actuaries call 'creative'");
          if (s.flags.issuedBonds) items.push("emergency bonds future budgets will service");
          if (s.flags.soldAirRights) items.push("air rights sold over neighborhood objections");
          if (s.flags.owesHochul) items.push("a favor owed to the Governor, size unspecified");
          return items.length
            ? `The fine print, itemized: ${items.join("; ")}. Every entry has a constituency, and every constituency has a memory.`
            : "Remarkably little, by the standards of these things. The fine print contains no time bombs that anyone has found yet. Analysts are rereading it.";
        },
      },
      {
        headline: () => "Primary Season Opens",
        body: () => "The Democratic gubernatorial primary is six weeks out. The Mayor's endorsement — if one comes — is the last major piece on the board.",
      },
    ],
  },

  paper_gov: {
    type: "newspaper",
    next: "time_to_2027",
    nextLabel: "ON TO 2027",
    stories: [
      {
        headline: (s) => {
          switch (s.flags.govWinner) {
            case "delgado": return "Delgado Storms Albany";
            case "salazar": return "Salazar Shocks the Nation";
            case "blakeman": return "Blakeman Takes Albany";
            default: return "Hochul Holds";
          }
        },
        body: (s) => {
          switch (s.flags.govWinner) {
            case "delgado": return "The labor-backed insurgent completed his march to the Executive Mansion last night, carrying a housing platform the WFP largely drafted and a coalition that did not exist eighteen months ago. City Hall's relationship with Albany now runs through people who remember exactly who helped — and who didn't.";
            case "salazar": return "New York elected a democratic socialist governor last night, a sentence that will take some getting used to in the suites of Midtown and the caucus rooms of Washington. The Governor-elect called for statewide rent stabilization before the networks finished calling the race.";
            case "blakeman": return "The first Republican governor in two decades won on a law-and-order message aimed squarely at the five boroughs, which voted against him and will now negotiate their transit funding with him. His transition team's first announcement mentioned the MTA, congestion pricing, and 'fiscal accountability for New York City' in a single sentence.";
            default: return "The Governor survived the most serious primary challenge of her career and a general election that briefly looked interesting. Albany remains what it was: neither ally nor obstacle, pending further developments. Her margin was built on the suburbs, labor, and the institutional Democratic machine — the same coalition as always, one more time.";
          }
        },
      },
      {
        headline: (s) => s.flags.endorsedGov === s.flags.govWinner
          ? "Mayor Picked the Winner"
          : "City Hall on the Outside",
        body: (s) => s.flags.endorsedGov === s.flags.govWinner
          ? "The Mayor's endorsement is now an asset in the Executive Mansion's ledger. What it purchases remains to be negotiated."
          : "The Mayor backed someone else, a fact the winner's staff mentions unprompted. The relationship is described, charitably, as 'professional.'",
      },
      {
        headline: () => "All 51 Council Seats on the Ballot Next November",
        body: () => "Party strategists on every side are already modeling the map. The Mayor's first two years will be the subtext of every race.",
      },
    ],
  },

  paper_election27: {
    type: "newspaper",
    next: "federal_endgame",
    nextEffect: (s) => { s.month = 12; s.monthLabel = "December"; },
    nextLabel: "DECEMBER",
    stories: [
      {
        headline: (s) => {
          const n = s.flags.election2027?.flips.length ?? 0;
          if (n === 0) return "Status Quo: Council Map Holds";
          if (n <= 3) return `Council Shifts at the Margins: ${n} Seat${n !== 1 ? "s" : ""} Flip`;
          return `Council Shakeup: ${n} Seats Change Hands`;
        },
        body: (s) => {
          const e = s.flags.election2027;
          if (!e || e.flips.length === 0)
            return "Fifty-one districts, fifty-one holds — the first status-quo Council election in a generation. Incumbency, it turns out, is a hell of a drug, and two years of City Hall's choices moved votes without moving seats. Both parties' strategists claim vindication, which means neither has any.";
          const gop = (e.counts.republican || 0) + (e.counts.farRight || 0);
          return `The new Council seats ${51 - gop} Democrats against ${gop} Republicans, but the story is inside the majority: the factional balance that decides Speakers, budgets, and everything else shifted last night in ways both parties will spend the winter measuring. Turnout patterns tracked the constituencies City Hall spent two years courting — or crossing.`;
        },
      },
      {
        headline: (s) => {
          if (s.flags.scandal2027 === "stood_by") return "Ticket-Gate Shadowed Every Race";
          if (s.flags.scandal2027) return "Ticket-Gate: A Scandal That Didn't Land";
          return null;
        },
        body: (s) => s.flags.scandal2027 === "stood_by"
          ? "The Mayor's decision to stand by his Buildings Commissioner gave every challenger a closing argument. Several used it verbatim."
          : "The October story that was supposed to reshape the race mostly didn't — swift handling, or short memories, depending on the columnist.",
      },
      {
        headline: () => "Washington Watches: DHS 'Reviewing Options' on New York",
        body: () => "Federal law enforcement postures toward the city have hardened all autumn. Administration officials, asked directly about task force rumors, said only that 'everything is on the table.' City Hall has made no public preparations. December will tell.",
      },
    ],
  },

  year2_report: {
    type: "report",
  },
};
