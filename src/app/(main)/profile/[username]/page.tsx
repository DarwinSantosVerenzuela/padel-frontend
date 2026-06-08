'use client';

import { useState, useEffect, use } from 'react';
import { UserPlus, UserCheck, MessageCircle, Share2, Grid3X3, Repeat2, Heart, ThumbsDown, ArrowLeft, TrendingUp, Award, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFollow } from '@/hooks/useFollow';
import styles from '../page.module.css';

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_emoji?: string;
  bio: string | null;
  skill_level?: string;
  preferred_position?: string;
  elo_rating?: number;
  city?: string | null;
  is_verified?: boolean;
  created_at?: string;
  [key: string]: any; // Allow additional fields from select('*')
}

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { followersCount, followingCount, postsCount, isFollowing, toggleFollow } = useFollow(profile?.id ?? null);

  useEffect(() => {
    (async () => {
      // If viewing own profile, redirect
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (!data) {
        setNotFound(true);
      } else if (user && data.id === user.id) {
        router.replace('/profile');
        return;
      } else {
        setProfile(data as UserProfile);
      }
      setLoading(false);
    })();
  }, [username, user, supabase, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando perfil...</span>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: '8px' }}>
        <span style={{ fontSize: '40px' }}>🤷</span>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Usuario no encontrado</p>
        <button className="btn btn--secondary" onClick={() => router.back()}>
          <ArrowLeft size={14} /> Volver
        </button>
      </div>
    );
  }

  const skillLevel = profile.skill_level || 'beginner';
  const levelLabel = skillLevel === 'beginner' ? 'Tak Rookie'
    : skillLevel === 'intermediate' ? 'Taker'
    : skillLevel === 'advanced' ? 'Tak Master' : 'Tak Legend';

  const prefPos = profile.preferred_position || 'any';
  const posLabel = prefPos === 'drive' ? 'Drive'
    : prefPos === 'reves' ? 'Revés' : 'Full Tak';

  return (
    <div className={styles.profile}>
      {/* Back button */}
      <button onClick={() => router.back()} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '-4px' }}>
        <ArrowLeft size={16} /> Volver
      </button>

      {/* ── Instagram-style Profile Header ── */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarCol}>
          <div className={styles.avatarRing}>
            <div className={styles.avatarCircle}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className={styles.avatarImage} />
              ) : (
                <span className={styles.avatarEmoji}>{profile.avatar_emoji || '🏓'}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.statsInline}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{postsCount}</span>
            <span className={styles.statLbl}>Posts</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{followersCount}</span>
            <span className={styles.statLbl}>Seguidores</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{followingCount}</span>
            <span className={styles.statLbl}>Siguiendo</span>
          </div>
        </div>
      </div>

      {/* Name + bio */}
      <div className={styles.nameSection}>
        <h1 className={styles.displayName}>
          {profile.display_name}
          {profile.is_verified && <span style={{ color: 'var(--blue)', marginLeft: '4px' }}>✓</span>}
        </h1>
        <p className={styles.handleText}>@{profile.username}</p>
        {profile.bio && <p className={styles.bioText}>{profile.bio}</p>}
        {profile.city && <p className={styles.bioText} style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>📍 {profile.city}</p>}
        <div className={styles.levelBadge}>
          <span>{levelLabel} · {posLabel}</span>
        </div>
      </div>

      {/* ── Action buttons: Follow / Message / Share ── */}
      <div className={styles.compactActions}>
        <button
          className={isFollowing ? styles.compactBtn : styles.followBtn}
          onClick={toggleFollow}
        >
          {isFollowing ? <><UserCheck size={13} /> Siguiendo</> : <><UserPlus size={13} /> Seguir</>}
        </button>
        <button className={styles.compactBtn} onClick={() => {
          // TODO: open/create conversation with this user
          router.push('/chat');
        }}>
          <MessageCircle size={13} /> Mensaje
        </button>
        <button
          className={styles.compactBtnIcon}
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: `${profile.display_name} en Tak`, url: window.location.href });
            }
          }}
          aria-label="Compartir"
        >
          <Share2 size={15} />
        </button>
      </div>

      {/* Tak Score */}
      <div className={styles.takScoreRow}>
        <div className={styles.takScoreCard}>
          <TrendingUp size={14} />
          <span className={styles.takScoreValue}>{profile.elo_rating ?? profile.elo ?? 1200}</span>
          <span className={styles.takScoreLabel}>Tak Score</span>
        </div>
        <div className={styles.takScoreCard}>
          <Award size={14} />
          <span className={styles.takScoreValue}>—</span>
          <span className={styles.takScoreLabel}>Partidos</span>
        </div>
        <div className={styles.takScoreCard}>
          <Calendar size={14} />
          <span className={styles.takScoreValue}>—</span>
          <span className={styles.takScoreLabel}>Racha</span>
        </div>
      </div>
    </div>
  );
}
