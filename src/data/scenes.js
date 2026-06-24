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
      }
    ],
  },

  swearing_in_week: {
    type: "time_pass",
    months: ["January"],
    year: "2026",
    next: "month1_brief",
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
      { text: "On to the budget.", next: "hub_post_speaker" },
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
      { text: "Get to work.", next: "budget_round1" },
    ],
  },

  budget_round1: {
    type: "budget_round",
    round: 1,
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
    ],
    next: "budget_round2",
  },

  budget_round2: {
    type: "budget_round",
    round: 2,
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
    ],
    next: "budget_round3",
  },

  budget_round3: {
    type: "budget_round",
    round: 3,
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
    ],
    next: (postBudget) => postBudget < 0 ? "budget_crisis" : "budget_result",
  },

  budget_crisis: {
    type: "budget_round",
    round: "CRISIS",
    urgent: true,
    title: "CRISIS — JUNE DEADLINE",
    prompt: "The Council won't pass an unbalanced budget. Albany is calling. Pick your poison.",
    options: [
      {
        id: "hochul_loan",
        label: "Emergency state loan from Hochul",
        delta: 4,
        costLabel: "you'll owe her — and she knows it",
        available: (s) => !s.flags.owesHochul && s.resources.budget + 4 >= 0,
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
        available: (s) => s.resources.budget + 7 >= 0,
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
        delta: (s) => Math.max(10, -s.resources.budget),
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
        id: "sell_air_rights",
        label: "Sell city air rights to developers",
        delta: 1,
        costLabel: "ESG supporters furious — YIMBY coalition approves",
        available: (s) => s.resources.budget + 1 >= 0,
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
    next: "budget_result",
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
        if (s.flags.deferredCapital) notes.push("The deferred capital projects will come back — infrastructure advocates are organizing.");
        if (s.flags.deferredPension) notes.push("The pension reclassification is a ticking clock. Someone will notice in year three.");
        if (s.flags.issuedBonds) notes.push("The bond issuance closes this year's books. Future budgets absorb the debt service.");
        if (s.flags.soldAirRights) notes.push("The air rights sale was a one-time hit. Housing advocates haven't forgotten.");
        return notes.length ? notes.join(" ") : "No deferred problems on the books — at least not yet.";
      },
      "But the calendar doesn't stop. June primary is six weeks out. Hochul needs to know where you stand.",
    ],
    choices: [
      { text: "Look at the primary.", next: "hub_post_budget" },
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
      "— END OF DEMO —",
    ],
    choices: [],
  },
};
