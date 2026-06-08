'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import styles from './Header.module.css';

export default function Header({ title = 'Tak' }: { title?: string }) {
  const { profile, user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setNotifCount(count || 0);
    })();
  }, [user, supabase]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const q = searchQuery.trim().replace('@', '');
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(8);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, supabase]);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && inputRef.current) inputRef.current.focus();
  }, [showSearch]);

  return (
    <header className={styles.header} id="app-header">
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/feed" className={styles.logo} id="header-logo">
          <span className={styles.logoIcon}>🏓</span>
          <span className={styles.logoText}>{title}</span>
        </Link>

        {/* Search overlay */}
        {showSearch && (
          <div className={styles.searchOverlay}>
            <div className={styles.searchBar}>
              <Search size={16} className={styles.searchIcon} />
              <input
                ref={inputRef}
                className={styles.searchInput}
                placeholder="Buscar takers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className={styles.searchClose} onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
                <X size={16} />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className={styles.searchDropdown}>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    className={styles.searchResult}
                    onClick={() => {
                      router.push(`/profile/${u.username}`);
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className={styles.searchAvatar} />
                    ) : (
                      <span className={styles.searchAvatarEmoji}>{u.avatar_emoji || '🏓'}</span>
                    )}
                    <div className={styles.searchInfo}>
                      <span className={styles.searchName}>{u.display_name}</span>
                      <span className={styles.searchHandle}>@{u.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searching && <div className={styles.searchDropdown}><p style={{ padding: '12px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>Buscando...</p></div>}
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {profile && (
            <span className={styles.userChip}>
              {profile.avatar_emoji} {profile.display_name.split(' ')[0]}
            </span>
          )}
          <button onClick={() => setShowSearch(!showSearch)} className={styles.actionBtn} id="header-search" aria-label="Buscar">
            <Search size={20} strokeWidth={1.8} />
          </button>
          <button
            className={styles.actionBtn}
            id="header-notifications"
            aria-label="Notificaciones"
            onClick={() => { /* TODO: notifications page */ }}
          >
            <Bell size={20} strokeWidth={1.8} />
            {notifCount > 0 && <div className={styles.notifDot} />}
          </button>
        </div>
      </div>
    </header>
  );
}
