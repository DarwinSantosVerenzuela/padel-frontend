'use client';

import { useState, useEffect } from 'react';
import { Settings, Edit3, Award, TrendingUp, Calendar, X, Check, MessageSquareText, Repeat2, Heart, ThumbsDown, Globe, UserPlus, UserCheck, Share2, Crown, Flame } from 'lucide-react';
import PadelRacketIcon from '@/components/icons/PadelRacketIcon';
import { useAuth } from '@/lib/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { useProfileActivity, ActivityPost } from '@/hooks/useProfileActivity';
import { useFollow } from '@/hooks/useFollow';
import { useTranslation, LOCALE_LABELS, type Locale } from '@/i18n';
import AvatarUpload from '@/components/profile/AvatarUpload';
import ProNetLoader from '@/components/ui/ProNetLoader';
import styles from './page.module.css';

const emojiOptions = ['🏓', '🎾', '🏅', '⚡', '🔥', '🎯', '⭐', '🏆'];
const levelOptions = ['Tak Rookie', 'Taker', 'Tak Master', 'Tak Legend'];
const positionOptions = ['Revés', 'Drive', 'Full Tak'];

type ActivityTab = 'posts' | 'reposts' | 'reactions';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function ActivityCard({ post, badge }: { post: ActivityPost; badge?: React.ReactNode }) {
  return (
    <div className={styles.activityCard}>
      {badge && <div className={styles.activityBadge}>{badge}</div>}
      <div className={styles.activityHeader}>
        {post.author_avatar?.startsWith('http') ? (
          <img src={post.author_avatar} alt="" className={styles.activityAvatarImg} />
        ) : (
          <div className={styles.activityAvatar}>{post.author_avatar}</div>
        )}
        <div className={styles.activityMeta}>
          <span className={styles.activityAuthor}>{post.author_name}</span>
          <span className={styles.activityHandle}>@{post.author_username} · {timeAgo(post.created_at)}</span>
        </div>
      </div>
      <p className={styles.activityContent}>{post.content}</p>
      {post.location && <span className={styles.activityLocation}>📍 {post.location}</span>}
      {post.match_result && <span className={styles.activityLocation}>🏆 {post.match_result}</span>}
      <div className={styles.activityStats}>
        <span><Heart size={12} /> {post.like_count}</span>
        <span><ThumbsDown size={12} /> {post.dislike_count}</span>
        <span><Repeat2 size={12} /> {post.repost_count}</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const supabase = createClient();
  const { myPosts, myReposts, myReactions, loading: activityLoading } = useProfileActivity();
  const { t, locale, setLocale } = useTranslation();
  const { followersCount, followingCount, postsCount } = useFollow(user?.id ?? null);

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatar, setAvatar] = useState('🏓');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [level, setLevel] = useState('Principiante');
  const [position, setPosition] = useState('Ambos');
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActivityTab>('posts');
  const [showSettings, setShowSettings] = useState(false);

  // Sync from profile
  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setHandle('@' + profile.username);
      setAvatar(profile.avatar_emoji);
      setAvatarUrl(profile.avatar_url);
      setLevel(profile.level);
      setPosition(profile.position);
    }
  }, [profile]);

  // Temp state for editing
  const [tmpName, setTmpName] = useState(name);
  const [tmpHandle, setTmpHandle] = useState(handle);
  const [tmpAvatar, setTmpAvatar] = useState(avatar);
  const [tmpBio, setTmpBio] = useState(bio);
  const [tmpLevel, setTmpLevel] = useState(level);
  const [tmpPosition, setTmpPosition] = useState(position);

  const openEdit = () => {
    setTmpName(name);
    setTmpHandle(handle);
    setTmpAvatar(avatar);
    setTmpBio(bio);
    setTmpLevel(level);
    setTmpPosition(position);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!user) return;
    const username = (tmpHandle || handle).replace('@', '');
    await supabase.from('profiles').update({
      display_name: tmpName || name,
      username,
      avatar_emoji: tmpAvatar,
      bio: tmpBio || null,
      level: tmpLevel,
      position: tmpPosition,
    }).eq('id', user.id);

    setName(tmpName || name);
    setHandle('@' + username);
    setAvatar(tmpAvatar);
    setBio(tmpBio);
    setLevel(tmpLevel);
    setPosition(tmpPosition);
    setEditing(false);
    await refreshProfile();
  };

  const tabs: { key: ActivityTab; icon: React.ReactNode; label: string }[] = [
    { key: 'posts', icon: <MessageSquareText size={18} strokeWidth={1.6} />, label: t('profile.posts') },
    { key: 'reposts', icon: <Repeat2 size={18} strokeWidth={1.6} />, label: t('profile.reposts') },
    { key: 'reactions', icon: <Heart size={18} strokeWidth={1.6} />, label: t('profile.reactions') },
  ];

  const getActiveContent = () => {
    switch (activeTab) {
      case 'posts': return myPosts;
      case 'reposts': return myReposts;
      case 'reactions': return myReactions;
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'posts': return { icon: '✍️', text: t('profile.noPostsYet'), sub: t('profile.shareInFeed') };
      case 'reposts': return { icon: '🔁', text: t('profile.noReposts'), sub: t('profile.repostHint') };
      case 'reactions': return { icon: '💚', text: t('profile.noReactions'), sub: t('profile.reactHint') };
    }
  };

  const activeContent = getActiveContent();
  const emptyMsg = getEmptyMessage();

  return (
    <div className={styles.profile}>
      {/* ── Instagram-style Profile Header ── */}
      <div className={styles.profileHeader}>
        {/* Avatar (left side) */}
        <div className={styles.avatarCol}>
          <div className={styles.avatarRing}>
            <div className={styles.avatarCircle}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className={styles.avatarImage} />
              ) : (
                <span className={styles.avatarEmoji}>{avatar}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row (right side) — Instagram style */}
        <div className={styles.statsInline}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{postsCount}</span>
            <span className={styles.statLbl}>{t('profile.posts')}</span>
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

      {/* Name + bio below avatar row */}
      <div className={styles.nameSection}>
        <h1 className={styles.displayName}>{name}</h1>
        <p className={styles.handleText}>{handle}</p>
        {bio && <p className={styles.bioText}>{bio}</p>}
        <div className={styles.levelBadge}>
          <span>{level} · {position}</span>
        </div>
      </div>

      {/* ── Compact action buttons (small, subtle) ── */}
      <div className={styles.compactActions}>
        <button className={styles.compactBtn} onClick={openEdit} id="edit-profile-btn">
          <Edit3 size={13} /> {t('profile.editProfile')}
        </button>
        <button className={styles.compactBtn} onClick={() => {
          if (navigator.share) {
            navigator.share({ title: `${name} en Tak`, url: window.location.href });
          }
        }}>
          <Share2 size={13} /> Compartir
        </button>
        <button
          className={styles.compactBtnIcon}
          id="settings-btn"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Tak Score / Quick Stats */}
      <div className={styles.takScoreRow}>
        <div className={styles.takScoreCard}>
          <TrendingUp size={14} />
          <span className={styles.takScoreValue}>{profile?.elo ?? 1200}</span>
          <span className={styles.takScoreLabel}>Tak Score</span>
        </div>
        <div className={styles.takScoreCard}>
          <PadelRacketIcon size={14} />
          <span className={styles.takScoreValue}>{(profile as any)?.elo_matches_played ?? 0}</span>
          <span className={styles.takScoreLabel}>Partidos</span>
        </div>
        <div className={`${styles.takScoreCard} ${styles.takScoreStreak}`}>
          <Flame size={14} />
          <span className={styles.takScoreValue}>{(profile as any)?.win_streak ?? 0}</span>
          <span className={styles.takScoreLabel}>Tak Racha</span>
        </div>
        <div className={`${styles.takScoreCard} ${styles.takScoreRanking}`}>
          <Crown size={14} />
          <span className={styles.takScoreValue}>{(profile as any)?.best_ranking ? `#${(profile as any).best_ranking}` : '—'}</span>
          <span className={styles.takScoreLabel}>Mejor Ranking</span>
        </div>
      </div>

      {/* ── Activity Tabs (Instagram-style) ── */}
      <div className={styles.activitySection}>
        <div className={styles.activityTabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`activity-tab-${tab.key}`}
              className={`${styles.activityTab} ${activeTab === tab.key ? styles.activityTabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
              aria-label={tab.label}
            >
              {tab.icon}
              <span className={styles.activityTabLabel}>{tab.label}</span>
            </button>
          ))}
          <div
            className={styles.tabIndicator}
            style={{ transform: `translateX(${tabs.findIndex(t => t.key === activeTab) * 100}%)` }}
          />
        </div>

        <div className={styles.activityList}>
          {activityLoading ? (
            <ProNetLoader size={36} text={t('common.loading')} />
          ) : activeContent.length === 0 ? (
            <div className={styles.activityEmpty}>
              <span className={styles.emptyIcon}>{emptyMsg.icon}</span>
              <p className={styles.emptyText}>{emptyMsg.text}</p>
              <p className={styles.emptySubtext}>{emptyMsg.sub}</p>
            </div>
          ) : (
            activeContent.map((post) => (
              <ActivityCard
                key={`${post.id}-${post.reaction_type || ''}`}
                post={post}
                badge={
                  activeTab === 'reposts' ? (
                    <><Repeat2 size={12} /> {t('profile.reposted')}</>
                  ) : activeTab === 'reactions' && post.reaction_type ? (
                    post.reaction_type === 'like'
                      ? <><Heart size={12} /> {t('profile.liked')}</>
                      : <><ThumbsDown size={12} /> {t('profile.disliked')}</>
                  ) : undefined
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editing && (
        <div className={styles.editOverlay} onClick={() => setEditing(false)}>
          <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editHeader}>
              <button className={styles.editClose} onClick={() => setEditing(false)}><X size={20} /></button>
              <span className={styles.editTitle}>{t('profile.editProfile')}</span>
              <button className={styles.editSave} onClick={saveEdit}><Check size={18} /> {t('profile.save')}</button>
            </div>

            <div className={styles.editBody}>
              <label className={styles.fieldLabel}>{t('profile.photo')}</label>
              <AvatarUpload
                currentUrl={avatarUrl}
                currentEmoji={avatar}
                onUploaded={(url) => { setAvatarUrl(url); }}
                onRemoved={() => { setAvatarUrl(null); }}
              />

              <label className={styles.fieldLabel}>{t('profile.avatar')} (emoji)</label>
              <div className={styles.emojiPicker}>
                {emojiOptions.map((e) => (
                  <button key={e} className={`${styles.emojiOption} ${tmpAvatar === e ? styles.emojiSelected : ''}`} onClick={() => setTmpAvatar(e)}>
                    {e}
                  </button>
                ))}
              </div>

              <label className={styles.fieldLabel}>{t('profile.name')}</label>
              <input className="input" value={tmpName} onChange={(e) => setTmpName(e.target.value)} placeholder="Tu nombre" />

              <label className={styles.fieldLabel}>{t('profile.username')}</label>
              <input className="input" value={tmpHandle} onChange={(e) => setTmpHandle(e.target.value)} placeholder="@username" />

              <label className={styles.fieldLabel}>Bio</label>
              <textarea className="input" value={tmpBio} onChange={(e) => setTmpBio(e.target.value)} placeholder="Cuéntanos sobre ti..." rows={3} style={{ resize: 'none' }} />

              <label className={styles.fieldLabel}>{t('profile.level')}</label>
              <div className={styles.chipGroup}>
                {levelOptions.map((l) => (
                  <button key={l} className={`${styles.chip} ${tmpLevel === l ? styles.chipActive : ''}`} onClick={() => setTmpLevel(l)}>{l}</button>
                ))}
              </div>

              <label className={styles.fieldLabel}>{t('profile.position')}</label>
              <div className={styles.chipGroup}>
                {positionOptions.map((p) => (
                  <button key={p} className={`${styles.chip} ${tmpPosition === p ? styles.chipActive : ''}`} onClick={() => setTmpPosition(p)}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className={styles.editOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editHeader}>
              <button className={styles.editClose} onClick={() => setShowSettings(false)}><X size={20} /></button>
              <span className={styles.editTitle}>{t('profile.settings')}</span>
              <div />
            </div>
            <div className={styles.editBody}>
              <label className={styles.fieldLabel}>
                <Globe size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                {t('profile.language')}
              </label>
              <div className={styles.chipGroup}>
                {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    className={`${styles.chip} ${locale === key ? styles.chipActive : ''}`}
                    onClick={async () => {
                      setLocale(key);
                      if (user) {
                        await supabase.from('profiles').update({ locale: key }).eq('id', user.id);
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn--secondary btn--full"
                  onClick={signOut}
                  style={{ color: '#ff3b30' }}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
