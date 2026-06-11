// ─── All 48 teams across 12 groups ───────────────────────────────────────────
export const GROUPS = {
  A: ["Mexico", "South Africa", "Korea Republic", "Czechia"],
  B: ["Canada", "Bosnia & Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Türkiye"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

// Map football-data.org team names → our display names
// (their API uses full official FIFA names)
export const TEAM_NAME_MAP = {
  "Mexico": "Mexico",
  "South Africa": "South Africa",
  "Korea Republic": "Korea Republic",
  "Czech Republic": "Czechia",
  "Czechia": "Czechia",
  "Canada": "Canada",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Bosnia & Herzegovina": "Bosnia & Herzegovina",
  "Qatar": "Qatar",
  "Switzerland": "Switzerland",
  "Brazil": "Brazil",
  "Morocco": "Morocco",
  "Haiti": "Haiti",
  "Scotland": "Scotland",
  "USA": "United States",
  "United States": "United States",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Türkiye",
  "Türkiye": "Türkiye",
  "Germany": "Germany",
  "Curaçao": "Curaçao",
  "Curacao": "Curaçao",
  "Ivory Coast": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Ecuador": "Ecuador",
  "Netherlands": "Netherlands",
  "Japan": "Japan",
  "Sweden": "Sweden",
  "Tunisia": "Tunisia",
  "Belgium": "Belgium",
  "Egypt": "Egypt",
  "Iran": "Iran",
  "IR Iran": "Iran",
  "New Zealand": "New Zealand",
  "Spain": "Spain",
  "Cape Verde": "Cape Verde",
  "Saudi Arabia": "Saudi Arabia",
  "Uruguay": "Uruguay",
  "France": "France",
  "Senegal": "Senegal",
  "Iraq": "Iraq",
  "Norway": "Norway",
  "Argentina": "Argentina",
  "Algeria": "Algeria",
  "Austria": "Austria",
  "Jordan": "Jordan",
  "Portugal": "Portugal",
  "DR Congo": "DR Congo",
  "Congo DR": "DR Congo",
  "Democratic Republic of Congo": "DR Congo",
  "Uzbekistan": "Uzbekistan",
  "Colombia": "Colombia",
  "England": "England",
  "Croatia": "Croatia",
  "Ghana": "Ghana",
  "Panama": "Panama",
};

export const PEOPLE = ["Andrew", "Ben", "Claire", "Anna"];

export const COLORS = {
  Andrew: { bg: "#0f2744", accent: "#3b82f6", border: "#1d4ed8" },
  Ben:    { bg: "#0f2d1a", accent: "#22c55e", border: "#15803d" },
  Claire: { bg: "#2d1040", accent: "#a855f7", border: "#7e22ce" },
  Anna:   { bg: "#3d1a0a", accent: "#f97316", border: "#c2410c" },
};

export const EMOJI = { Andrew: "🔵", Ben: "🟢", Claire: "🟣", Anna: "🟠" };

// ─── Seeded deterministic draw ────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

export function generateAssignment(seed) {
  const rand = seededRandom(seed);
  const assignment = {};
  PEOPLE.forEach(p => { assignment[p] = []; });

  for (const [grp, teams] of Object.entries(GROUPS)) {
    const perm = [...PEOPLE].sort(() => rand() - 0.5);
    const shuffledTeams = [...teams].sort(() => rand() - 0.5);
    perm.forEach((person, idx) => {
      assignment[person].push({ team: shuffledTeams[idx], group: grp });
    });
  }
  return assignment;
}

// ─── Fixture helpers ──────────────────────────────────────────────────────────
export function getGroupFixtures(group) {
  const teams = GROUPS[group];
  const fixtures = [];
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++)
      fixtures.push({ home: teams[i], away: teams[j], group });
  return fixtures;
}

export function fixtureKey(f) {
  return `${f.group}__${f.home}__${f.away}`;
}

// ─── Knockout structure ───────────────────────────────────────────────────────
export const KNOCKOUT_ROUNDS = [
  { label: "Round of 32",    slots: 16, pts: 5  },
  { label: "Round of 16",    slots: 8,  pts: 7  },
  { label: "Quarter-Finals", slots: 4,  pts: 10 },
  { label: "Semi-Finals",    slots: 2,  pts: 15 },
  { label: "Final",          slots: 1,  pts: 25 },
];
