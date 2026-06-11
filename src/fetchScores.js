import { GROUPS, TEAM_NAME_MAP, fixtureKey } from './data';

const FD_TOKEN = process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
const WC_2026_ID = 2000; // football-data.org competition ID for FIFA World Cup

// Build a lookup of all valid fixture keys so we can match API results
function buildFixtureLookup() {
  const lookup = {}; // "TeamA|TeamB" (sorted) → fixtureKey
  for (const [grp, teams] of Object.entries(GROUPS)) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const f = { home: teams[i], away: teams[j], group: grp };
        const sorted = [teams[i], teams[j]].sort().join('|');
        lookup[sorted] = fixtureKey(f);
        // Also store which is home/away for correct score assignment
        lookup[sorted + '__fixture'] = f;
      }
    }
  }
  return lookup;
}

function normalise(apiName) {
  return TEAM_NAME_MAP[apiName] || apiName;
}

export async function fetchLiveScores() {
  if (!FD_TOKEN) {
    throw new Error('No football-data.org API token configured. Add REACT_APP_FOOTBALL_DATA_TOKEN to your Vercel environment variables.');
  }

  // Fetch all World Cup 2026 matches from football-data.org
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${WC_2026_ID}/matches`,
    {
      headers: { 'X-Auth-Token': FD_TOKEN },
    }
  );

  if (res.status === 429) throw new Error('Rate limit hit — wait a minute and try again.');
  if (!res.ok) throw new Error(`football-data.org error: ${res.status} ${res.statusText}`);

  const json = await res.json();
  const matches = json.matches || [];

  const lookup = buildFixtureLookup();
  const newScores = {};
  let updated = 0;

  for (const match of matches) {
    // Only process finished group stage matches
    if (match.stage !== 'GROUP_STAGE') continue;
    if (match.status !== 'FINISHED') continue;

    const homeTeam = normalise(match.homeTeam?.name || '');
    const awayTeam = normalise(match.awayTeam?.name || '');
    const homeGoals = match.score?.fullTime?.home;
    const awayGoals = match.score?.fullTime?.away;

    if (homeGoals === null || homeGoals === undefined) continue;
    if (awayGoals === null || awayGoals === undefined) continue;

    const sorted = [homeTeam, awayTeam].sort().join('|');
    const key = lookup[sorted];
    const fixture = lookup[sorted + '__fixture'];

    if (!key || !fixture) continue; // team not in our tournament list

    // Determine which side of our fixture is home/away
    if (fixture.home === homeTeam) {
      newScores[key] = { home: String(homeGoals), away: String(awayGoals) };
    } else {
      // API has them flipped vs our fixture order
      newScores[key] = { home: String(awayGoals), away: String(homeGoals) };
    }
    updated++;
  }

  return { scores: newScores, count: updated, total: matches.filter(m => m.stage === 'GROUP_STAGE').length };
}
