'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';

export interface MatchRow {
  id: string;
  court_id: string | null;
  created_by: string;
  date: string;
  time: string;
  mode: 'manual' | 'random' | 'challenge';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  courts?: { name: string } | null;
}

export function useMatches() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { user } = useAuth();

  const fetchMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('*, courts(name)')
      .or(`created_by.eq.${user.id}`)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });
    if (data) setMatches(data as MatchRow[]);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const createMatch = async (courtId: string | null, date: string, time: string, mode: 'manual' | 'random' | 'challenge') => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('matches')
      .insert({
        court_id: courtId,
        created_by: user.id,
        date,
        time,
        mode,
        status: 'open',
      })
      .select('*, courts(name)')
      .single();

    if (!error && data) {
      // Add creator as player
      await supabase.from('match_players').insert({ match_id: data.id, user_id: user.id, team: 1 });
      await fetchMatches();
    }
    return data;
  };

  const cancelMatch = async (matchId: string) => {
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', matchId);
    await fetchMatches();
  };

  return { matches, loading, createMatch, cancelMatch, refetch: fetchMatches };
}
