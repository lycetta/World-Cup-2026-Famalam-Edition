# ⚽ World Cup 2026 Sponsor Competition

Mobile-friendly tracker for four sponsors across all 48 teams and all 12 groups.  
**Shared live scores** — any device that enters a result syncs it to all others in real time.  
**Auto-fetch** — one button pulls all finished results from football-data.org automatically.

---

## What you need to set up (all free, ~15 minutes total)

| Service | What it does | Cost |
|---------|-------------|------|
| **GitHub** | Stores your code | Free |
| **Vercel** | Hosts the website | Free |
| **Supabase** | Shared database — syncs scores across phones | Free |
| **football-data.org** | Live World Cup results API | Free |

---

## Step 1 — Supabase (shared database)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up free
2. Click **New Project**, give it a name (e.g. `worldcup2026`), choose a region, set a password → **Create project** (takes ~1 min)
3. Once ready, go to **SQL Editor** (left sidebar) → **New query**
4. Paste and run this SQL to create the database table:

```sql
create table competition_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Enable realtime so score changes push to all devices instantly
alter publication supabase_realtime add table competition_state;

-- Allow anyone with the anon key to read and write
-- (the anon key is safe to expose in a front-end app)
alter table competition_state enable row level security;

create policy "Public read" on competition_state
  for select using (true);

create policy "Public write" on competition_state
  for all using (true) with check (true);
```

5. Go to **Settings → API** and copy:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon public** key → `REACT_APP_SUPABASE_ANON_KEY`

---

## Step 2 — football-data.org API key

1. Go to [football-data.org](https://www.football-data.org/client/register) → register (just email + password)
2. Check your email for your API token
3. That token → `REACT_APP_FOOTBALL_DATA_TOKEN`

> The free tier gives you 10 requests/minute — more than enough. The fetch button pulls all group stage results in a single request.

---

## Step 3 — Put code on GitHub

1. Go to [github.com](https://github.com) → sign in → **New repository** → name it `worldcup2026` → **Create repository**
2. Open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "World Cup 2026 sponsor tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/worldcup2026.git
git push -u origin main
```

*(Replace `YOUR_USERNAME` with your GitHub username)*

---

## Step 4 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. **Add New → Project** → select `worldcup2026`
3. Before clicking Deploy, go to **Environment Variables** and add all three:

   | Name | Value |
   |------|-------|
   | `REACT_APP_SUPABASE_URL` | your Supabase project URL |
   | `REACT_APP_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `REACT_APP_FOOTBALL_DATA_TOKEN` | your football-data.org token |

4. Click **Deploy** → wait ~1 minute
5. Share the URL (e.g. `worldcup2026.vercel.app`) with all four sponsors — **no login needed**

---

## How the app works

| Tab | What it does |
|-----|-------------|
| 🗓 **Draw** | Each sponsor's 12 teams (one per group). Fixed permanently on first load, same for every device. |
| ⚽ **Group Stage** | All 72 fixtures across groups A–L. Hit **Fetch Live Scores** to auto-fill finished results. Manual entry also works. |
| 🏆 **Knockouts** | Type team names as they progress. Autocomplete shows all 48 teams. |
| 📊 **Scoreboard** | Live points table. Updates instantly as scores are entered on any device. |

### Points system

| Stage | Win |
|-------|-----|
| Group stage win | 3 pts |
| Group stage draw | 1 pt each |
| Round of 32 win | 5 pts |
| Round of 16 win | 7 pts |
| Quarter-Final win | 10 pts |
| Semi-Final win | 15 pts |
| Final win | 25 pts |

### Fetch Live Scores button
- Pulls all **finished** group stage matches from football-data.org
- Merges results with any existing scores (won't overwrite manually entered knockout scores)
- Syncs to all devices via Supabase in real time
- Anyone can press it — it's safe to press multiple times

### Re-draw button
- Hidden in the Draw tab, labelled **(admin)**
- Clears all scores and picks a new random assignment
- Only use this before the tournament starts

---

## Local development

```bash
cp .env.example .env
# Fill in your three keys in .env
npm install
npm start
```

Runs on http://localhost:3000
