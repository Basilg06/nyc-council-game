// Hidden election mechanics — never exposed to the player directly.
// Formula per district:
//   score[faction] = factionApproval[faction] × factionInfluence[faction]
//                  + Σ groups( groupApproval × groupInfluence × AFFINITIES[group][faction] × districtSalience[group] )
// Winner = highest score.

// Group → faction affinity (0–1). How much a group's mobilization flows to each faction.
export const AFFINITIES = {
  openNY:          { dsa: 0.6, leftWfp: 0.3, progressive: 0.9, establishment: 0.5, centrist: 0.5, felder: 0,   republican: 0,   farRight: 0   },
  elizabethGarden: { dsa: 0,   leftWfp: 0,   progressive: 0.2, establishment: 0.5, centrist: 0.8, felder: 0.8, republican: 0.8, farRight: 0.9 },
  wfp:             { dsa: 0.5, leftWfp: 0.9, progressive: 0.7, establishment: 0.2, centrist: 0,   felder: 0,   republican: 0,   farRight: 0   },
  teamsters:       { dsa: 0.2, leftWfp: 0.7, progressive: 0.3, establishment: 0.7, centrist: 0.5, felder: 0,   republican: 0.7, farRight: 0.7 },
  tenantBloc:      { dsa: 0.9, leftWfp: 0.9, progressive: 0.6, establishment: 0.2, centrist: 0,   felder: 0,   republican: 0,   farRight: 0   },
  smallBusiness:   { dsa: 0,   leftWfp: 0,   progressive: 0,   establishment: 0.6, centrist: 0.9, felder: 0.9, republican: 0.8, farRight: 0.7 },
  pba:             { dsa: 0,   leftWfp: 0,   progressive: 0,   establishment: 0.5, centrist: 0.7, felder: 0.8, republican: 0.9, farRight: 0.9 },
};

// Budget action → influence shifts. Additive on a base of 1.0. Applied when action is chosen.
// Group shifts flow through AFFINITIES; faction shifts bypass it (direct mobilization).
export const INFLUENCE_SHIFTS = {
  hire_police:        { groups: { pba: 0.4 },                                              factions: { dsa: 0.2, leftWfp: 0.1, centrist: 0.1, republican: 0.2, farRight: 0.2 } },
  defer_capital:      { groups: { openNY: -0.1 },                                          factions: {} },
  cut_school_mandates:{ groups: {},                                                         factions: { dsa: 0.1, leftWfp: 0.1, progressive: 0.2 } },
  property_tax:       { groups: { wfp: 0.2, tenantBloc: 0.1, smallBusiness: 0.3 },         factions: { dsa: 0.2, leftWfp: 0.2 } },
  congestion_pricing: { groups: { openNY: 0.3, teamsters: 0.3 },                           factions: { farRight: 0.2 } },
  tax_rich:           { groups: { wfp: 0.3, smallBusiness: 0.3 },                          factions: { establishment: 0.2 } },
  pension_tricks:     { groups: { teamsters: 0.1 },                                        factions: {} },
  cut_police:         { groups: { wfp: 0.2, tenantBloc: 0.2, pba: 0.5 },                  factions: { dsa: 0.4, leftWfp: 0.3, republican: 0.3, farRight: 0.3 } },
  pension_pushback:   { groups: { teamsters: 0.4 },                                        factions: { dsa: 0.1, leftWfp: 0.2, establishment: 0.1, centrist: 0.1 } },
  sell_air_rights:    { groups: { openNY: 0.2, elizabethGarden: 0.3 },                     factions: {} },
  hochul_loan:        { groups: {},                                                         factions: { establishment: 0.1 } },
  bond_issuance:      { groups: { smallBusiness: 0.1 },                                    factions: {} },
  service_cuts:       { groups: { wfp: 0.3, teamsters: 0.2, tenantBloc: 0.4 },             factions: { dsa: 0.3, leftWfp: 0.2 } },
};

// District group salience weights. H=0.8, M=0.5, L=0.2, absent=0.
// Groups: openNY, elizabethGarden, wfp, teamsters, tenantBloc, smallBusiness, pba
export const DISTRICT_DATA = {
  // MANHATTAN
  1:  { faction: "leftWfp",      groups: { openNY: 0.8, elizabethGarden: 0.5, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  2:  { faction: "progressive",  groups: { openNY: 0.8, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  3:  { faction: "establishment", groups: { openNY: 0.5, elizabethGarden: 0.5, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.2 } },
  4:  { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0.2, teamsters: 0.2, tenantBloc: 0.2, smallBusiness: 0.8, pba: 0.5 } },
  5:  { faction: "establishment", groups: { openNY: 0.5, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.8, pba: 0.5 } },
  6:  { faction: "progressive",  groups: { openNY: 0.5, elizabethGarden: 0.5, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.2 } },
  7:  { faction: "establishment", groups: { openNY: 0.5, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.5 } },
  8:  { faction: "progressive",  groups: { openNY: 0.5, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  9:  { faction: "progressive",  groups: { openNY: 0.5, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  10: { faction: "progressive",  groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  // BRONX
  11: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.5, pba: 0.5 } },
  12: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.5 } },
  13: { faction: "progressive",  groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.5 } },
  14: { faction: "progressive",  groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  15: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.5 } },
  16: { faction: "leftWfp",      groups: { openNY: 0.5, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  17: { faction: "progressive",  groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  18: { faction: "progressive",  groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.5 } },
  // QUEENS
  19: { faction: "farRight",     groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0,   teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.5, pba: 0.8 } },
  20: { faction: "establishment", groups: { openNY: 0.5, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.8, pba: 0.5 } },
  21: { faction: "progressive",  groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.5 } },
  22: { faction: "dsa",          groups: { openNY: 0.8, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  23: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.5, pba: 0.8 } },
  24: { faction: "centrist",     groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.8, pba: 0.5 } },
  25: { faction: "progressive",  groups: { openNY: 0.5, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  26: { faction: "leftWfp",      groups: { openNY: 0.8, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  27: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.5 } },
  28: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.5 } },
  29: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0.2, teamsters: 0.2, tenantBloc: 0.5, smallBusiness: 0.8, pba: 0.5 } },
  30: { faction: "centrist",     groups: { openNY: 0.5, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.8, pba: 0.5 } },
  31: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.5, pba: 0.8 } },
  32: { faction: "republican",   groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0,   teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.5, pba: 0.8 } },
  // BROOKLYN
  33: { faction: "leftWfp",      groups: { openNY: 0.8, elizabethGarden: 0.5, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  34: { faction: "leftWfp",      groups: { openNY: 0.8, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  35: { faction: "leftWfp",      groups: { openNY: 0.5, elizabethGarden: 0.5, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  36: { faction: "dsa",          groups: { openNY: 0.5, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  37: { faction: "leftWfp",      groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.8, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.2, pba: 0.2 } },
  38: { faction: "dsa",          groups: { openNY: 0.5, elizabethGarden: 0.5, wfp: 0.8, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  39: { faction: "dsa",          groups: { openNY: 0.5, elizabethGarden: 0.8, wfp: 0.8, teamsters: 0.2, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.2 } },
  40: { faction: "leftWfp",      groups: { openNY: 0.2, elizabethGarden: 0.5, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.5 } },
  41: { faction: "centrist",     groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.5 } },
  42: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.5 } },
  43: { faction: "centrist",     groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.8, pba: 0.8 } },
  44: { faction: "felder",       groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0,   teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.8, pba: 0.5 } },
  45: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.2, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.8, smallBusiness: 0.5, pba: 0.5 } },
  46: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.5, wfp: 0.2, teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.5, pba: 0.8 } },
  47: { faction: "progressive",  groups: { openNY: 0.2, elizabethGarden: 0.5, wfp: 0.5, teamsters: 0.5, tenantBloc: 0.5, smallBusiness: 0.5, pba: 0.5 } },
  48: { faction: "farRight",     groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0,   teamsters: 0.5, tenantBloc: 0.2, smallBusiness: 0.8, pba: 0.8 } },
  // STATEN ISLAND
  49: { faction: "establishment", groups: { openNY: 0.2, elizabethGarden: 0.8, wfp: 0.2, teamsters: 0.8, tenantBloc: 0.2, smallBusiness: 0.5, pba: 0.8 } },
  50: { faction: "republican",   groups: { openNY: 0,   elizabethGarden: 0.8, wfp: 0,   teamsters: 0.8, tenantBloc: 0.2, smallBusiness: 0.8, pba: 0.8 } },
  51: { faction: "republican",   groups: { openNY: 0,   elizabethGarden: 0.8, wfp: 0,   teamsters: 0.8, tenantBloc: 0.2, smallBusiness: 0.8, pba: 0.8 } },
};

// Apply influence shifts from a chosen budget action to game state.
export function applyInfluenceShifts(actionId, state) {
  const shifts = INFLUENCE_SHIFTS[actionId];
  if (!shifts) return state;
  const influence = {
    groups:   { ...state.influence.groups },
    factions: { ...state.influence.factions },
  };
  for (const [key, delta] of Object.entries(shifts.groups || {})) {
    influence.groups[key] = Math.max(0, (influence.groups[key] ?? 1.0) + delta);
  }
  for (const [key, delta] of Object.entries(shifts.factions || {})) {
    influence.factions[key] = Math.max(0, (influence.factions[key] ?? 1.0) + delta);
  }
  return { ...state, influence };
}

// Score all factions for a district and return the winning faction key.
export function calculateDistrictWinner(districtId, state) {
  const district = DISTRICT_DATA[districtId];
  if (!district) return null;
  const { factionApproval, groups, influence } = state;
  const INCUMBENCY_BONUS = 25;
  const scores = {};
  for (const faction of Object.keys(factionApproval)) {
    let score = factionApproval[faction] * (influence.factions[faction] ?? 1.0);
    if (faction === district.faction) score += INCUMBENCY_BONUS;
    for (const [groupKey, salience] of Object.entries(district.groups)) {
      if (!salience) continue;
      const groupApproval = groups[groupKey]?.approval ?? 50;
      const groupInfluence = influence.groups[groupKey] ?? 1.0;
      const affinity = AFFINITIES[groupKey]?.[faction] ?? 0;
      score += groupApproval * groupInfluence * affinity * salience;
    }
    scores[faction] = score;
  }
  return Object.entries(scores).reduce(
    (best, [f, s]) => (s > best[1] ? [f, s] : best),
    ['', -Infinity]
  )[0];
}

// Run all 51 districts and return a map of { districtId: winnerFaction }.
export function calculateAllDistricts(state) {
  return Object.fromEntries(
    Object.keys(DISTRICT_DATA).map((id) => [id, calculateDistrictWinner(Number(id), state)])
  );
}
