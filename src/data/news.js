// State-reactive headline generator for the news wire ticker.
// Deterministic — no randomness, so the ticker is stable across re-renders.

const FILLERS = [
  "RAT SIGHTINGS DOWN 12% IN PILOT DISTRICTS, CITY SAYS",
  "MTA ANNOUNCES WEEKEND SERVICE CHANGES ON 14 LINES",
  "CITY HALL PIGEON REMOVED AFTER BRIEF OCCUPATION OF PRESS ROOM",
  "ALTERNATE SIDE PARKING SUSPENDED THURSDAY",
  "STATEN ISLAND FERRY RIDERSHIP HITS POST-PANDEMIC HIGH",
  "DOT UNVEILS NEW BENCH",
];

export function getHeadlines(s) {
  const h = [];
  const f = s.flags;
  const b = s.resources.budget;

  // ── Crisis + federal arcs (loudest first) ──
  if (f.crisis2027 === "bqe_repaired")   h.push("BQE EMERGENCY REPAIR COMPLETE — ENGINEERS CREDIT FAST RESPONSE");
  if (f.crisis2027 === "bqe_patched")    h.push("BQE 'TEMPORARY' SHORING ENTERS FOURTH MONTH");
  if (f.crisis2027 === "bqe_blamed")     h.push("CITY-ALBANY BLAME GAME OVER BQE COLLAPSE CONTINUES");
  if (f.crisis2027 === "blizzard_hero")  h.push("SNOW RESPONSE WINS RARE OUTER-BOROUGH PRAISE");
  if (f.crisis2027 === "blizzard_manhattan") h.push("'SECOND-CLASS BOROUGHS' — QUEENS SEETHES OVER PLOW MAP");
  if (f.crisis2027 === "blizzard_cheap") h.push("UNPLOWED FOR DAYS: THE STORM RESPONSE THAT WASN'T");

  if (f.fedThreat === "defied")     h.push("CITY DEFIES WHITE HOUSE ON IMMIGRATION ENFORCEMENT — GRANTS FROZEN");
  if (f.fedThreat === "negotiated") h.push("QUIET DEAL WITH WASHINGTON RAISES QUESTIONS ON THE LEFT");
  if (f.fedThreat === "declined")   h.push("MAYOR DECLINES PRESIDENT'S CALL — WEST WING 'TAKING NOTES'");

  if (f.scandal2027 === "fired")    h.push("BUILDINGS COMMISSIONER OUT SAME DAY AS TICKET-GATE STORY");
  if (f.scandal2027 === "stood_by") h.push("TICKET-GATE INVESTIGATION DRAGS ON — CANDIDATES POUNCE");
  if (f.scandal2027 === "quiet")    h.push("FRIDAY-NIGHT RESIGNATION RAISES 'WHAT ELSE?' QUESTIONS");

  if (f.election2027) {
    const n = f.election2027.flips.length;
    h.push(n > 0 ? `COUNCIL SHAKEUP: ${n} SEAT${n !== 1 ? "S" : ""} CHANGE HANDS` : "COUNCIL MAP HOLDS — EVERY COALITION DEFENDS ITS GROUND");
  }

  // ── Budget ──
  if (b < -8)      h.push(`COMPTROLLER: CITY DEFICIT AT ${Math.abs(b)} POINTS — 'UNSUSTAINABLE TRAJECTORY'`);
  else if (b < 0)  h.push(`CITY BUDGET GAP NARROWS TO ${Math.abs(b)} PTS`);
  else if (f.issuedBonds || f.deferredPension) h.push("BOOKS BALANCED — ANALYSTS QUESTION THE MATH");

  // ── Speaker ──
  if (f.speakerElected === "hudson") h.push("SPEAKER HUDSON SETS AMBITIOUS LEGISLATIVE CALENDAR");
  if (f.speakerElected === "menin")  h.push("SPEAKER MENIN CONSOLIDATES COMMITTEE CONTROL");

  // ── Albany ──
  if (f.govWinner === "blakeman") h.push("GOVERNOR BLAKEMAN VOWS 'FISCAL DISCIPLINE' FOR MTA");
  if (f.govWinner === "salazar")  h.push("GOVERNOR SALAZAR PUSHES STATEWIDE RENT STABILIZATION");
  if (f.govWinner === "delgado")  h.push("GOVERNOR DELGADO'S HOUSING PACKAGE CLEARS FIRST HURDLE");
  if (!f.govWinner && f.owesHochul) h.push("ALBANY SOURCES: CITY HALL 'OWES THE GOVERNOR ONE'");
  if (s.figures.hochul.approval < 25) h.push("ALBANY FREEZE-OUT: GOVERNOR'S OFFICE 'NOT RETURNING CALLS'");

  // ── Relationships ──
  if (s.figures.trump.approval >= 40) h.push("WHITE HOUSE CALLS RELATIONSHIP WITH CITY HALL 'PRODUCTIVE'");
  else if (s.figures.trump.approval < 12) h.push("PRESIDENT ATTACKS MAYOR IN LATE-NIGHT POST");

  if (s.groups.pba.approval < 30)      h.push("PBA: 'CITY HALL HAS ABANDONED THE NYPD'");
  else if (s.groups.pba.approval > 65) h.push("PBA PRESIDENT PRAISES 'PARTNER IN CITY HALL'");
  if (s.groups.tenantBloc.approval > 65) h.push("TENANT COALITION: 'FINALLY, A MAYOR WHO SHOWS UP'");
  if (s.groups.teamsters.approval < 35)  h.push("TEAMSTERS LOCAL 237 WEIGHS NO-CONFIDENCE VOTE");

  // ── Ticking time bombs ──
  if (f.deferredCapital && !f.crisis2027) h.push("ENGINEERS WARN: DEFERRED CAPITAL WORK 'A GAMBLE'");
  if (f.deferredPension) h.push("PENSION RECLASSIFICATION RAISES EYEBROWS AT COMPTROLLER'S OFFICE");
  if (f.soldAirRights)   h.push("AIR RIGHTS SALE FINALIZED — GARDEN COALITION PLANS LAWSUIT");

  // Pad with evergreen filler so the wire never runs dry.
  const out = h.slice(0, 7);
  let i = 0;
  while (out.length < 6 && i < FILLERS.length) out.push(FILLERS[i++]);
  return out;
}
