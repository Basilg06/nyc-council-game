import { buildCouncil } from "./data/council";

export const initialState = {
  month: 1,
  monthLabel: "January",
  resources: { budget: -12, favorHochul: false },
  figures: {
    hochul:  { name: "Gov. Kathy Hochul",        role: "Governor — Democrat",              color: "#2E3F8F", approval: 40, popularity: 55 },
    trump:   { name: "Pres. Donald Trump",        role: "President — Far-Right Republican", color: "#B5402E", approval: 20, popularity: 28 },
    speaker: { name: "Speaker — TBD",             role: "NYC Council Speaker",              color: "#888888", approval: 50, popularity: 50 },
    tisch:   { name: "Comm. Jessica Tisch",       role: "NYPD Police Commissioner",         color: "#2E5A5A", approval: 50, popularity: 54 },
  },
  groups: {
    openNY:          { name: "Open NY",                     color: "#5B7FE0", approval: 52 },
    elizabethGarden: { name: "Friends of Eliz. St Garden",  color: "#2D5C3E", approval: 48 },
    wfp:             { name: "Working Families Party",      color: "#7B4FA3", approval: 55 },
    teamsters:       { name: "Teamsters",                   color: "#C9942F", approval: 45 },
    tenantBloc:      { name: "NY Tenant Bloc",              color: "#9B8FD4", approval: 50 },
    smallBusiness:   { name: "United/Small Business",       color: "#D9C76B", approval: 42 },
    pba:             { name: "Police Benevolent Assn",      color: "#8B1A1A", approval: 40 },
  },
  approval: 50,
  factionApproval: {
    dsa:           42,
    leftWfp:       48,
    progressive:   51,
    establishment: 54,
    centrist:      49,
    felder:        40,
    republican:    20,
    farRight:      10,
  },
  flags: {
    backedMenin: false,
    backedHudson: false,
    pushedCarr: false,
    stayedNeutral: false,
    speakerElected: null,
    groupStatus: {},
    owesHochul: false,
    deferredCapital: false,
    deferredPension: false,
    issuedBonds: false,
    soldAirRights: false,
    endorsedGov: null,
    govWinner: null,
  },
  council: buildCouncil(),
  influence: {
    groups: {
      openNY: 1.0, elizabethGarden: 1.0, wfp: 1.0, teamsters: 1.0,
      tenantBloc: 1.0, smallBusiness: 1.0, pba: 1.0,
    },
    factions: {
      dsa: 1.0, leftWfp: 1.0, progressive: 1.0, establishment: 1.0,
      centrist: 1.0, felder: 1.0, republican: 1.0, farRight: 1.0,
    },
  },
};
