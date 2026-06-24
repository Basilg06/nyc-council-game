export const FACTIONS = {
  dsa:           { name: "DSA",                   color: "#7B4FA3" },
  leftWfp:       { name: "Left-WFP/DSA-Aligned",  color: "#9B8FD4" },
  progressive:   { name: "Progressive Liberal",    color: "#5B7FE0" },
  establishment: { name: "Establishment Liberal",  color: "#2E3F8F" },
  centrist:      { name: "Centrist Liberal",       color: "#D9C76B" },
  felder:        { name: "Simcha Felder",          color: "#C9942F" },
  republican:    { name: "Republican",             color: "#B5402E" },
  farRight:      { name: "Far-Right Republican",   color: "#6E1F1F" },
};

export const REAL_COUNCIL = [
  // MANHATTAN
  { id: 1,  name: "Christopher Marte",     faction: "leftWfp",      termLimited: true  },
  { id: 2,  name: "Harvey Epstein",         faction: "progressive",  termLimited: false },
  { id: 3,  name: "Carl Wilson",            faction: "establishment",termLimited: false },
  { id: 4,  name: "Virginia Maloney",       faction: "establishment",termLimited: false },
  { id: 5,  name: "Julie Menin",            faction: "establishment",termLimited: true  }, // Speaker
  { id: 6,  name: "Gale Brewer",            faction: "progressive",  termLimited: true  },
  { id: 7,  name: "Shaun Abreu",            faction: "establishment",termLimited: true  }, // Maj. Leader
  { id: 8,  name: "Elsie Encarnacion",      faction: "progressive",  termLimited: false },
  { id: 9,  name: "Yusef Salaam",           faction: "progressive",  termLimited: false },
  { id: 10, name: "Carmen De La Rosa",      faction: "progressive",  termLimited: true  },
  // BRONX
  { id: 11, name: "Eric Dinowitz",          faction: "establishment",termLimited: true  },
  { id: 12, name: "Kevin Riley",            faction: "establishment",termLimited: true  },
  { id: 13, name: "Shirley Aldebol",        faction: "progressive",  termLimited: false },
  { id: 14, name: "Pierina Sanchez",        faction: "progressive",  termLimited: true  },
  { id: 15, name: "Oswald Feliz",           faction: "establishment",termLimited: true  },
  { id: 16, name: "Althea Stevens",         faction: "leftWfp",      termLimited: true  },
  { id: 17, name: "Justin Sanchez",         faction: "progressive",  termLimited: false },
  { id: 18, name: "Amanda Farías",          faction: "progressive",  termLimited: true  },
  // QUEENS
  { id: 19, name: "Vickie Paladino",        faction: "farRight",     termLimited: true  },
  { id: 20, name: "Sandra Ung",             faction: "establishment",termLimited: true  },
  { id: 21, name: "Shanel Thomas-Henry",    faction: "progressive",  termLimited: false },
  { id: 22, name: "Tiffany Cabán",          faction: "dsa",          termLimited: true  },
  { id: 23, name: "Linda Lee",              faction: "establishment",termLimited: true  },
  { id: 24, name: "James Gennaro",          faction: "centrist",     termLimited: true  },
  { id: 25, name: "Shekar Krishnan",        faction: "progressive",  termLimited: true  },
  { id: 26, name: "Julie Won",              faction: "leftWfp",      termLimited: true  },
  { id: 27, name: "Nantasha Williams",      faction: "establishment",termLimited: true  }, // Dep. Speaker
  { id: 28, name: "Tyrell Hankerson",       faction: "establishment",termLimited: false },
  { id: 29, name: "Lynn Schulman",          faction: "establishment",termLimited: true  },
  { id: 30, name: "Phil Wong",              faction: "centrist",     termLimited: false },
  { id: 31, name: "Selvena Brooks-Powers",  faction: "establishment",termLimited: true  },
  { id: 32, name: "Joann Ariola",           faction: "republican",   termLimited: true  },
  // BROOKLYN
  { id: 33, name: "Lincoln Restler",        faction: "leftWfp",      termLimited: true  },
  { id: 34, name: "Jennifer Gutiérrez",     faction: "leftWfp",      termLimited: true  },
  { id: 35, name: "Crystal Hudson",         faction: "leftWfp",      termLimited: true  },
  { id: 36, name: "Chi Ossé",               faction: "dsa",          termLimited: true  },
  { id: 37, name: "Sandy Nurse",            faction: "leftWfp",      termLimited: true  },
  { id: 38, name: "Alexa Avilés",           faction: "dsa",          termLimited: true  },
  { id: 39, name: "Shahana Hanif",          faction: "dsa",          termLimited: true  },
  { id: 40, name: "Rita Joseph",            faction: "leftWfp",      termLimited: true  },
  { id: 41, name: "Darlene Mealy",          faction: "centrist",     termLimited: true  },
  { id: 42, name: "Chris Banks",            faction: "establishment",termLimited: false },
  { id: 43, name: "Susan Zhuang",           faction: "centrist",     termLimited: false },
  { id: 44, name: "Simcha Felder",          faction: "felder",       termLimited: false },
  { id: 45, name: "Farah Louis",            faction: "establishment",termLimited: true  },
  { id: 46, name: "Mercedes Narcisse",      faction: "establishment",termLimited: true  },
  { id: 47, name: "Kayla Santosuosso",      faction: "progressive",  termLimited: false },
  { id: 48, name: "Inna Vernikov",          faction: "farRight",     termLimited: true  },
  // STATEN ISLAND
  { id: 49, name: "Kamillah Hanks",         faction: "establishment",termLimited: true  }, // Maj. Whip
  { id: 50, name: "David Carr",             faction: "republican",   termLimited: true  },
  { id: 51, name: "Frank Morano",           faction: "republican",   termLimited: false },
];

export const FACTION_COUNTS = Object.fromEntries(
  Object.keys(FACTIONS).map((k) => [k, REAL_COUNCIL.filter((m) => m.faction === k).length])
);

export function buildCouncil() {
  const members = REAL_COUNCIL.map((d) => ({ ...d, vote: null, named: false }));
  const meninSeat = members.find((m) => m.id === 5);
  if (meninSeat) { meninSeat.name = "Julie Menin"; meninSeat.named = true; meninSeat.key = "menin"; }
  const hudsonSeat = members.find((m) => m.id === 35);
  if (hudsonSeat) { hudsonSeat.name = "Crystal Hudson"; hudsonSeat.named = true; hudsonSeat.key = "hudson"; }
  return members;
}
