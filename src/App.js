import { useState, useMemo, useCallback } from 'react';
import { GROUPS, PEOPLE, COLORS, EMOJI, KNOCKOUT_ROUNDS, getGroupFixtures, fixtureKey } from './data';
import { useStore } from './useStore';
import { fetchLiveScores } from './fetchScores';

// ─── Design tokens ────────────────────────────────────────────────────────────
const dark  = '#020817';
const panel = '#0f172a';
const card  = '#1e293b';
const muted = '#475569';
const faint = '#1e293b';

// ─── Shared micro-components ──────────────────────────────────────────────────

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 14px',
      background: active ? '#fff' : 'transparent',
      color: active ? '#0c1a2e' : '#64748b',
      border: 'none',
      borderRadius: '8px 8px 0 0',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>{children}</button>
  );
}

function ScoreBox({ value, onChange, accent }) {
  return (
    <input
      type="number" min="0" max="99"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="–"
      style={{
        width: 46, height: 46,
        textAlign: 'center',
        fontSize: 20, fontWeight: 800,
        background: card,
        border: `2px solid ${accent || muted}`,
        borderRadius: 8,
        color: '#fff',
        outline: 'none',
        flexShrink: 0,
      }}
    />
  );
}

function SyncBadge({ syncing }) {
  if (!syncing) return null;
  return (
    <span style={{
      fontSize: 11, color: '#22c55e', fontWeight: 700,
      background: '#14532d', borderRadius: 20, padding: '2px 8px',
      marginLeft: 8, verticalAlign: 'middle',
    }}>● syncing…</span>
  );
}

function Banner({ type, msg, onClose }) {
  if (!msg) return null;
  const colours = {
    success: { bg: '#14532d', border: '#15803d', text: '#86efac' },
    error:   { bg: '#7f1d1d', border: '#991b1b', text: '#fca5a5' },
    info:    { bg: '#1e3a5f', border: '#1d4ed8', text: '#93c5fd' },
  };
  const c = colours[type] || colours.info;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 10, padding: '10px 14px', marginBottom: 14,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 13, fontWeight: 600,
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', fontSize: 16, marginLeft: 8 }}>×</button>
    </div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ assignment, resetDraw }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, marginBottom: 20 }}>
        {PEOPLE.map(person => {
          const c = COLORS[person];
          const myTeams = assignment[person];
          const groups = [...new Set(myTeams.map(t => t.group))].sort();
          return (
            <div key={person} style={{
              background: `linear-gradient(140deg,${c.bg} 0%,${panel} 100%)`,
              borderRadius: 16, padding: 18,
              border: `2px solid ${c.accent}40`,
              boxShadow: `0 0 24px ${c.accent}15`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 26 }}>{EMOJI[person]}</span>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{person}</div>
                  <div style={{ color: c.accent, fontSize: 11, fontWeight: 600 }}>12 Teams · 12 Groups</div>
                </div>
              </div>
              {groups.map(grp => {
                const t = myTeams.find(x => x.group === grp);
                return (
                  <div key={grp} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: `3px solid ${c.accent}` }}>
                    <span style={{ color: c.accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Group {grp}</span>
                    <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 1 }}>⚽ {t.team}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{
        background: panel, borderRadius: 12, padding: '12px 16px',
        border: `1px solid ${faint}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ color: muted, fontSize: 12 }}>
          Draw is permanently fixed and shared across all devices.
        </div>
        <button onClick={resetDraw} style={{
          background: '#7f1d1d', color: '#fca5a5',
          border: '1px solid #991b1b', borderRadius: 8,
          padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>↺ Re-draw (admin)</button>
      </div>
    </div>
  );
}

// ─── GROUP STAGE ──────────────────────────────────────────────────────────────
function GroupStage({ assignment, scores, updateScore, onFetch, fetching, syncing }) {
  const [activeGroup, setActiveGroup] = useState('A');
  const [banner, setBanner] = useState(null);

  const teamOwner = useMemo(() => {
    const map = {};
    PEOPLE.forEach(p => assignment[p].forEach(({ team }) => { map[team] = p; }));
    return map;
  }, [assignment]);

  const handleFetch = async () => {
    setBanner(null);
    try {
      const result = await onFetch();
      setBanner({ type: 'success', msg: `✓ Updated ${result.count} completed results from ${result.total} group stage fixtures.` });
    } catch (e) {
      setBanner({ type: 'error', msg: `✗ ${e.message}` });
    }
  };

  const fixtures = getGroupFixtures(activeGroup);

  return (
    <div>
      {/* Fetch button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={handleFetch}
          disabled={fetching}
          style={{
            background: fetching ? card : '#1d4ed8',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '9px 18px', fontWeight: 700, fontSize: 13,
            cursor: fetching ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {fetching ? '⏳ Fetching…' : '🌐 Fetch Live Scores'}
          <SyncBadge syncing={syncing} />
        </button>
      </div>

      <Banner type={banner?.type} msg={banner?.msg} onClose={() => setBanner(null)} />

      {/* Group picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {Object.keys(GROUPS).map(g => (
          <button key={g} onClick={() => setActiveGroup(g)} style={{
            padding: '5px 12px', borderRadius: 8,
            border: activeGroup === g ? 'none' : `1px solid ${card}`,
            background: activeGroup === g ? '#3b82f6' : card,
            color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>Group {g}</button>
        ))}
      </div>

      {/* Team ownership banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {GROUPS[activeGroup].map(t => {
          const owner = teamOwner[t];
          const c = COLORS[owner];
          return (
            <div key={t} style={{
              background: c.bg, border: `1px solid ${c.accent}`,
              borderRadius: 8, padding: '4px 12px',
              color: '#fff', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {EMOJI[owner]} {t} <span style={{ color: c.accent, fontSize: 11 }}>({owner})</span>
            </div>
          );
        })}
      </div>

      {/* Fixtures */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {fixtures.map(f => {
          const key = fixtureKey(f);
          const ho = teamOwner[f.home], ao = teamOwner[f.away];
          const hc = COLORS[ho], ac = COLORS[ao];
          const hs = scores[key]?.home ?? '';
          const as_ = scores[key]?.away ?? '';
          const done = hs !== '' && as_ !== '';

          return (
            <div key={key} style={{
              background: panel, borderRadius: 12,
              padding: '12px 14px',
              border: done ? '1px solid #22c55e50' : `1px solid ${faint}`,
              display: 'grid',
              gridTemplateColumns: '1fr 46px 28px 46px 1fr',
              alignItems: 'center', gap: 8,
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{f.home}</div>
                <div style={{ color: hc.accent, fontSize: 10 }}>{EMOJI[ho]} {ho}</div>
              </div>
              <ScoreBox value={hs} onChange={v => updateScore(key, 'home', v)} accent={hc.accent} />
              <div style={{ textAlign: 'center', color: muted, fontWeight: 800, fontSize: 11 }}>VS</div>
              <ScoreBox value={as_} onChange={v => updateScore(key, 'away', v)} accent={ac.accent} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{f.away}</div>
                <div style={{ color: ac.accent, fontSize: 10 }}>{EMOJI[ao]} {ao}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KNOCKOUTS ────────────────────────────────────────────────────────────────
function Knockouts({ assignment, knockoutScores, updateKnockoutScore }) {
  const teamOwner = useMemo(() => {
    const map = {};
    PEOPLE.forEach(p => assignment[p].forEach(({ team }) => { map[team] = p; }));
    return map;
  }, [assignment]);

  const allTeams = Object.values(GROUPS).flat();

  const getVal = (round, slot, field) =>
    knockoutScores[`${round}__${slot}__${field}`]?.val ?? '';
  const setVal = (round, slot, field, val) =>
    updateKnockoutScore(`${round}__${slot}__${field}`, 'x', val);

  return (
    <div>
      <div style={{ color: muted, fontSize: 12, marginBottom: 16 }}>
        As teams progress, type their names into each slot. The autocomplete shows all 48 teams.
      </div>

      <datalist id="teamlist">
        {allTeams.map(t => <option key={t} value={t} />)}
      </datalist>

      {KNOCKOUT_ROUNDS.map(({ label, slots, pts }) => (
        <div key={label} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</div>
            <div style={{ color: '#22c55e', fontSize: 11, fontWeight: 700, background: '#14532d', borderRadius: 20, padding: '1px 8px' }}>win = {pts} pts</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: slots }).map((_, i) => {
              const home = getVal(label, i, 'home');
              const away = getVal(label, i, 'away');
              const hs   = getVal(label, i, 'hscore');
              const as_  = getVal(label, i, 'ascore');
              const ho = teamOwner[home];
              const ao = teamOwner[away];
              const hc = ho ? COLORS[ho] : null;
              const ac = ao ? COLORS[ao] : null;
              const done = hs !== '' && as_ !== '';

              return (
                <div key={i} style={{
                  background: panel, borderRadius: 12, padding: '10px 12px',
                  border: done ? '1px solid #22c55e50' : `1px solid ${faint}`,
                  display: 'grid',
                  gridTemplateColumns: '1fr 46px 28px 46px 1fr',
                  alignItems: 'center', gap: 8,
                }}>
                  {/* Home */}
                  <div style={{ textAlign: 'right' }}>
                    <input list="teamlist" value={home}
                      onChange={e => setVal(label, i, 'home', e.target.value)}
                      placeholder="Team…"
                      style={{
                        background: 'transparent', border: 'none',
                        borderBottom: `2px solid ${hc ? hc.accent : card}`,
                        color: hc ? '#fff' : '#64748b', fontWeight: 700, fontSize: 12,
                        textAlign: 'right', width: '100%', outline: 'none', padding: '2px 0',
                      }}
                    />
                    {ho && <div style={{ color: hc.accent, fontSize: 10 }}>{EMOJI[ho]} {ho}</div>}
                  </div>
                  <ScoreBox value={hs} onChange={v => setVal(label, i, 'hscore', v)} accent={hc?.accent} />
                  <div style={{ textAlign: 'center', color: muted, fontWeight: 800, fontSize: 11 }}>VS</div>
                  <ScoreBox value={as_} onChange={v => setVal(label, i, 'ascore', v)} accent={ac?.accent} />
                  {/* Away */}
                  <div style={{ textAlign: 'left' }}>
                    <input list="teamlist" value={away}
                      onChange={e => setVal(label, i, 'away', e.target.value)}
                      placeholder="Team…"
                      style={{
                        background: 'transparent', border: 'none',
                        borderBottom: `2px solid ${ac ? ac.accent : card}`,
                        color: ac ? '#fff' : '#64748b', fontWeight: 700, fontSize: 12,
                        width: '100%', outline: 'none', padding: '2px 0',
                      }}
                    />
                    {ao && <div style={{ color: ac.accent, fontSize: 10 }}>{EMOJI[ao]} {ao}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SCOREBOARD ───────────────────────────────────────────────────────────────
function Scoreboard({ assignment, scores, knockoutScores }) {
  const teamOwner = useMemo(() => {
    const map = {};
    PEOPLE.forEach(p => assignment[p].forEach(({ team }) => { map[team] = p; }));
    return map;
  }, [assignment]);

  const tally = useMemo(() => {
    const t = {};
    PEOPLE.forEach(p => { t[p] = { w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 }; });

    // Group stage
    for (const [grp] of Object.entries(GROUPS)) {
      getGroupFixtures(grp).forEach(f => {
        const key = fixtureKey(f);
        const hs = scores[key]?.home;
        const as_ = scores[key]?.away;
        if (hs === '' || hs === undefined || as_ === '' || as_ === undefined) return;
        const h = parseInt(hs), a = parseInt(as_);
        if (isNaN(h) || isNaN(a)) return;
        const ho = teamOwner[f.home], ao = teamOwner[f.away];
        t[ho].gf += h; t[ho].ga += a;
        t[ao].gf += a; t[ao].ga += h;
        if (h > a) { t[ho].w++; t[ho].pts += 3; t[ao].l++; }
        else if (h < a) { t[ao].w++; t[ao].pts += 3; t[ho].l++; }
        else { t[ho].d++; t[ho].pts++; t[ao].d++; t[ao].pts++; }
      });
    }

    // Knockout stage
    KNOCKOUT_ROUNDS.forEach(({ label, slots, pts: bonus }) => {
      for (let i = 0; i < slots; i++) {
        const home = knockoutScores[`${label}__${i}__home`]?.val ?? '';
        const away = knockoutScores[`${label}__${i}__away`]?.val ?? '';
        const hs   = knockoutScores[`${label}__${i}__hscore`]?.val ?? '';
        const as_  = knockoutScores[`${label}__${i}__ascore`]?.val ?? '';
        if (!home || !away || hs === '' || as_ === '') return;
        const h = parseInt(hs), a = parseInt(as_);
        if (isNaN(h) || isNaN(a)) return;
        const ho = teamOwner[home], ao = teamOwner[away];
        if (!ho || !ao) return;
        t[ho].gf += h; t[ho].ga += a;
        t[ao].gf += a; t[ao].ga += h;
        if (h > a) { t[ho].pts += bonus; }
        else if (h < a) { t[ao].pts += bonus; }
        // draws in KO rounds: no extra points (goes to extra time/pens — you can add a winner field later)
      }
    });

    return t;
  }, [assignment, scores, knockoutScores, teamOwner]);

  const ranked = [...PEOPLE].sort((a, b) =>
    tally[b].pts - tally[a].pts || (tally[b].gf - tally[b].ga) - (tally[a].gf - tally[a].ga) || tally[b].gf - tally[a].gf
  );

  const medals = ['🥇', '🥈', '🥉', '4️⃣'];

  return (
    <div>
      {/* Main table */}
      <div style={{ background: panel, borderRadius: 14, overflow: 'hidden', border: `1px solid ${faint}`, marginBottom: 16 }}>
        <div style={{ background: card, padding: '10px 16px', display: 'grid', gridTemplateColumns: '32px 1fr 44px 44px 44px 56px 60px', gap: 6 }}>
          {['', 'Sponsor', 'W', 'D', 'L', 'GD', 'Pts'].map((h, i) => (
            <div key={i} style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: i > 1 ? 'center' : 'left' }}>{h}</div>
          ))}
        </div>
        {ranked.map((p, idx) => {
          const c = COLORS[p];
          const t = tally[p];
          const gd = t.gf - t.ga;
          return (
            <div key={p} style={{
              padding: '12px 16px',
              display: 'grid', gridTemplateColumns: '32px 1fr 44px 44px 44px 56px 60px', gap: 6,
              alignItems: 'center',
              borderTop: `1px solid ${faint}`,
              background: idx === 0 ? `${c.accent}12` : 'transparent',
            }}>
              <div style={{ fontSize: 16 }}>{medals[idx]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{EMOJI[p]}</span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{p}</span>
              </div>
              {[t.w, t.d, t.l].map((v, i) => (
                <div key={i} style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>{v}</div>
              ))}
              <div style={{ textAlign: 'center', color: gd >= 0 ? '#86efac' : '#fca5a5', fontSize: 14, fontWeight: 600 }}>
                {gd > 0 ? `+${gd}` : gd}
              </div>
              <div style={{ textAlign: 'center', color: c.accent, fontWeight: 900, fontSize: 22 }}>{t.pts}</div>
            </div>
          );
        })}
      </div>

      {/* Points guide */}
      <div style={{ background: panel, borderRadius: 12, padding: '12px 16px', border: `1px solid ${faint}` }}>
        <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Points Guide</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px', fontSize: 12, color: '#94a3b8' }}>
          <div>Group win <span style={{ color: '#fff', float: 'right' }}>3 pts</span></div>
          <div>Group draw <span style={{ color: '#fff', float: 'right' }}>1 pt</span></div>
          {KNOCKOUT_ROUNDS.map(({ label, pts }) => (
            <div key={label}>{label} win <span style={{ color: '#fff', float: 'right' }}>{pts} pts</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const {
    assignment, scores, knockoutScores,
    updateScore, updateKnockoutScore, importScores,
    resetDraw, ready, syncing,
  } = useStore();

  const [tab, setTab] = useState('overview');
  const [fetching, setFetching] = useState(false);

  const handleFetch = useCallback(async () => {
    setFetching(true);
    try {
      const result = await fetchLiveScores();
      await importScores(result.scores);
      return result;
    } finally {
      setFetching(false);
    }
  }, [importScores]);

  if (!ready || !assignment) {
    return (
      <div style={{
        minHeight: '100vh', background: dark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}>
        <div style={{ color: '#3b82f6', fontSize: 16, fontWeight: 700 }}>⏳ Connecting to shared database…</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview',  label: '🗓 Draw'        },
    { id: 'fixtures',  label: '⚽ Group Stage'  },
    { id: 'knockout',  label: '🏆 Knockouts'   },
    { id: 'scores',    label: '📊 Scoreboard'  },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg,${dark} 0%,#0c1a2e 60%,${dark} 100%)`,
      fontFamily: "'Segoe UI',system-ui,sans-serif",
      color: '#e2e8f0',
      paddingBottom: 60,
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg,#0c1a2e 0%,#1a3a5c 50%,#0c1a2e 100%)',
        padding: '18px 14px 0',
        borderBottom: '1px solid #1e3a5f',
        marginBottom: 22,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 30 }}>🌍</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#3b82f6', textTransform: 'uppercase' }}>FIFA World Cup 2026</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' }}>Sponsor Competition</h1>
            </div>
            <SyncBadge syncing={syncing} />
          </div>
          <div style={{ color: muted, fontSize: 12, marginBottom: 14 }}>
            {PEOPLE.join(' · ')} — shared live scores · all devices in sync
          </div>
          <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
            {tabs.map(t => <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Tab>)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 12px' }}>
        {tab === 'overview' && <Overview assignment={assignment} resetDraw={resetDraw} />}
        {tab === 'fixtures' && <GroupStage assignment={assignment} scores={scores} updateScore={updateScore} onFetch={handleFetch} fetching={fetching} syncing={syncing} />}
        {tab === 'knockout' && <Knockouts assignment={assignment} knockoutScores={knockoutScores} updateKnockoutScore={updateKnockoutScore} />}
        {tab === 'scores'   && <Scoreboard assignment={assignment} scores={scores} knockoutScores={knockoutScores} />}
      </div>
    </div>
  );
}
