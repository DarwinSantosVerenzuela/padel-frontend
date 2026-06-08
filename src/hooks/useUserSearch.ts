'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';

export interface UserResult {
  id: string;
  display_name: string;
  username: string;
  avatar_emoji: string;
  level: string;
}

export function useUserSearch() {
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const supabase = createClient();
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const term = `%${query}%`;
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_emoji, level')
        .or(`display_name.ilike.${term},username.ilike.${term}`)
        .neq('id', user?.id || '')
        .limit(10);

      setResults((data || []) as UserResult[]);
      setSearching(false);
    }, 300); // 300ms debounce
  }, [supabase, user]);

  const clear = () => {
    setResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  return { results, searching, search, clear };
}
