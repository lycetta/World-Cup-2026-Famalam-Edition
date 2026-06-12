// Vercel Serverless Function — proxies football-data.org to avoid CORS issues
// and keeps the API token server-side only.
//
// Accessible at: /api/scores

export default async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN; // server-side only, no REACT_APP_ prefix

  if (!token) {
    return res.status(500).json({ error: 'FOOTBALL_DATA_TOKEN not configured on server' });
  }

  try {
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/2000/matches',
      { headers: { 'X-Auth-Token': token } }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `football-data.org error: ${response.status}`, detail: text });
    }

    const data = await response.json();

    // Cache for 60 seconds to avoid hammering the free-tier rate limit
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
