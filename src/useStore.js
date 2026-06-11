import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { generateAssignment } from './data';

// All state lives in a single Supabase table called `competition_state`
// with rows keyed by `key` (text) and value `data` (jsonb).
// Keys used:
//   "draw_seed"      → { seed: number }
//   "assignment"     → { assignment: object }
//   "scores"         → { scores: object }
//   "knockout"       → { knockout: object }

async function getRow(key) {
  const { data, error } = await supabase
    .from('competition_state')
    .select('data')
    .eq('key', key)
    .maybeSingle();
  if (error) { console.error('getRow', key, error); return null; }
  return data?.data ?? null;
}

async function setRow(key, value) {
  const { error } = await supabase
    .from('competition_state')
    .upsert({ key, data: value }, { onConflict: 'key' });
  if (error) console.error('setRow', key, error);
}

export function useStore() {
  const [assignment, setAssignment] = useState(null);
  const [scores, setScores] = useState({});
  const [knockoutScores, setKnockoutScores] = useState({});
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // Load or create the draw
      let stored = await getRow('assignment');
      if (stored) {
        setAssignment(stored.assignment);
      } else {
        const seed = Date.now();
        const a = generateAssignment(seed);
        await setRow('draw_seed', { seed });
        await setRow('assignment', { assignment: a });
        setAssignment(a);
      }

      // Load scores
      const sc = await getRow('scores');
      if (sc) setScores(sc.scores ?? {});

      const ko = await getRow('knockout');
      if (ko) setKnockoutScores(ko.knockout ?? {});

      setReady(true);
    }
    init();
  }, []);

  // ── Realtime subscription — refresh scores when any other device writes ─────
  useEffect(() => {
    if (!ready) return;
    const channel = supabase
      .channel('competition_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_state' },
        async (payload) => {
          const key = payload.new?.key;
          if (key === 'scores') {
            const sc = await getRow('scores');
            if (sc) setScores(sc.scores ?? {});
          }
          if (key === 'knockout') {
            const ko = await getRow('knockout');
            if (ko) setKnockoutScores(ko.knockout ?? {});
          }
          if (key === 'assignment') {
            const a = await getRow('assignment');
            if (a) setAssignment(a.assignment);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ready]);

  // ── Score writers ───────────────────────────────────────────────────────────
  const updateScore = useCallback(async (key, side, val) => {
    setScores(prev => {
      const next = { ...prev, [key]: { ...prev[key], [side]: val } };
      // Debounced write — fire and forget
      setRow('scores', { scores: next });
      return next;
    });
  }, []);

  const updateKnockoutScore = useCallback(async (key, side, val) => {
    setKnockoutScores(prev => {
      const next = { ...prev, [key]: { ...prev[key], val } };
      setRow('knockout', { knockout: next });
      return next;
    });
  }, []);

  // ── Bulk score import (used by the fetch-scores feature) ────────────────────
  const importScores = useCallback(async (newScores) => {
    setSyncing(true);
    setScores(prev => {
      const merged = { ...prev, ...newScores };
      setRow('scores', { scores: merged }).then(() => setSyncing(false));
      return merged;
    });
  }, []);

  // ── Re-draw (admin only) ────────────────────────────────────────────────────
  const resetDraw = useCallback(async () => {
    if (!window.confirm('⚠️ This will re-draw ALL team assignments and clear ALL scores for every user. Are you sure?')) return;
    const seed = Date.now();
    const a = generateAssignment(seed);
    await Promise.all([
      setRow('draw_seed', { seed }),
      setRow('assignment', { assignment: a }),
      setRow('scores', { scores: {} }),
      setRow('knockout', { knockout: {} }),
    ]);
    setAssignment(a);
    setScores({});
    setKnockoutScores({});
  }, []);

  return {
    assignment, scores, knockoutScores,
    updateScore, updateKnockoutScore, importScores,
    resetDraw, ready, syncing,
  };
}
