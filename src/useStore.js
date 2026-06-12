import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { generateAssignment } from './data';

async function getRow(key, setDebugError) {
  const { data, error } = await supabase
    .from('competition_state')
    .select('data')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error('getRow', key, error);
    setDebugError(`GET ${key}: ${error.message} (code: ${error.code})`);
    return null;
  }
  return data?.data ?? null;
}

async function setRow(key, value, setDebugError) {
  const { error } = await supabase
    .from('competition_state')
    .upsert({ key, data: value }, { onConflict: 'key' });
  if (error) {
    console.error('setRow', key, error);
    setDebugError(`SET ${key}: ${error.message} (code: ${error.code})`);
  }
}

export function useStore() {
  const [assignment, setAssignment] = useState(null);
  const [scores, setScores] = useState({});
  const [knockoutScores, setKnockoutScores] = useState({});
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [debugError, setDebugError] = useState(null);

  useEffect(() => {
    async function init() {
      // Show what env vars look like (masked)
      const url = process.env.REACT_APP_SUPABASE_URL;
      const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
      if (!url || !key) {
        setDebugError(`ENV MISSING: url=${url ? 'set' : 'MISSING'}, key=${key ? 'set' : 'MISSING'}`);
      }

      let stored = await getRow('assignment', setDebugError);
      if (stored) {
        setAssignment(stored.assignment);
      } else {
        const seed = Date.now();
        const a = generateAssignment(seed);
        await setRow('draw_seed', { seed }, setDebugError);
        await setRow('assignment', { assignment: a }, setDebugError);
        setAssignment(a);
      }

      const sc = await getRow('scores', setDebugError);
      if (sc) setScores(sc.scores ?? {});

      const ko = await getRow('knockout', setDebugError);
      if (ko) setKnockoutScores(ko.knockout ?? {});

      setReady(true);
    }
    init();
  }, []);

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
            const sc = await getRow('scores', setDebugError);
            if (sc) setScores(sc.scores ?? {});
          }
          if (key === 'knockout') {
            const ko = await getRow('knockout', setDebugError);
            if (ko) setKnockoutScores(ko.knockout ?? {});
          }
          if (key === 'assignment') {
            const a = await getRow('assignment', setDebugError);
            if (a) setAssignment(a.assignment);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ready]);

  const updateScore = useCallback(async (key, side, val) => {
    setScores(prev => {
      const next = { ...prev, [key]: { ...prev[key], [side]: val } };
      setRow('scores', { scores: next }, setDebugError);
      return next;
    });
  }, []);

  const updateKnockoutScore = useCallback(async (key, side, val) => {
    setKnockoutScores(prev => {
      const next = { ...prev, [key]: { ...prev[key], val } };
      setRow('knockout', { knockout: next }, setDebugError);
      return next;
    });
  }, []);

  const importScores = useCallback(async (newScores) => {
    setSyncing(true);
    setScores(prev => {
      const merged = { ...prev, ...newScores };
      setRow('scores', { scores: merged }, setDebugError).then(() => setSyncing(false));
      return merged;
    });
  }, []);

  const resetDraw = useCallback(async () => {
    if (!window.confirm('⚠️ This will re-draw ALL team assignments and clear ALL scores for every user. Are you sure?')) return;
    const seed = Date.now();
    const a = generateAssignment(seed);
    await Promise.all([
      setRow('draw_seed', { seed }, setDebugError),
      setRow('assignment', { assignment: a }, setDebugError),
      setRow('scores', { scores: {} }, setDebugError),
      setRow('knockout', { knockout: {} }, setDebugError),
    ]);
    setAssignment(a);
    setScores({});
    setKnockoutScores({});
  }, []);

  return {
    assignment, scores, knockoutScores,
    updateScore, updateKnockoutScore, importScores,
    resetDraw, ready, syncing, debugError,
  };
}
