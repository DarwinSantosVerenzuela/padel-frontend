'use client';
import ProNetLoader from '@/components/ui/ProNetLoader';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, MapPin, Trophy, X, Send, Heart, ThumbsDown, Repeat2, Share2, MessageCircle, Smile, Loader, Check } from 'lucide-react';
import { usePosts, CommentRow } from '@/hooks/usePosts';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useTranslation } from '@/i18n';
import TranslateButton from '@/components/feed/TranslateButton';
import EmojiPicker from '@/components/feed/EmojiPicker';
import styles from './page.module.css';

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

export default function FeedPage() {
  const { posts, loading, createPost, toggleReaction, addComment, getComments, uploadImage, sharePost } = usePosts();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [showComposer, setShowComposer] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [postTag, setPostTag] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Emoji state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Location state
  const [postLocation, setPostLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Comment state
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Share state
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);

  const openComposer = (tag?: string) => {
    setShowComposer(true);
    if (tag) setPostTag(tag);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const closeComposer = () => {
    setShowComposer(false);
    setNewContent('');
    setPostTag(null);
    setSelectedImages([]);
    setImagePreviews([]);
    setShowEmojiPicker(false);
    setPostLocation(null);
  };

  // ===== PHOTO HANDLING =====
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const allowed = files.slice(0, 4 - selectedImages.length); // Max 4 total
    const newImages = [...selectedImages, ...allowed];
    setSelectedImages(newImages);

    // Generate previews
    allowed.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ===== EMOJI HANDLING =====
  const insertEmoji = useCallback((emoji: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = newContent;
      const updated = text.slice(0, start) + emoji + text.slice(end);
      setNewContent(updated);
      // Restore cursor position
      setTimeout(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
      }, 10);
    } else {
      setNewContent((prev) => prev + emoji);
    }
  }, [newContent]);

  // ===== LOCATION HANDLING =====
  const handleLocationClick = async () => {
    if (postLocation) {
      setPostLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setLocationLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = pos.coords;

      // Reverse geocoding with Nominatim (free, no API key)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`
        );
        const geo = await res.json();
        const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
        const country = geo.address?.country || '';
        const name = city ? `${city}, ${country}` : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setPostLocation({ lat: latitude, lng: longitude, name });
      } catch {
        setPostLocation({ lat: latitude, lng: longitude, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
      }
    } catch (err: any) {
      if (err?.code === 1) alert('Permiso de ubicación denegado');
      else alert('No se pudo obtener tu ubicación');
    }
    setLocationLoading(false);
  };

  // ===== COMMENTS =====
  const toggleComments = async (postId: string) => {
    if (openComments === postId) {
      setOpenComments(null);
      setComments([]);
      setCommentText('');
      return;
    }
    setOpenComments(postId);
    setCommentLoading(true);
    const data = await getComments(postId);
    setComments(data);
    setCommentLoading(false);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    await addComment(postId, commentText.trim());
    const data = await getComments(postId);
    setComments(data);
    setCommentText('');
    setSendingComment(false);
  };

  // ===== SHARE =====
  const handleShare = async (postId: string, content: string) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    const shareText = content.slice(0, 100) + (content.length > 100 ? '...' : '');

    // Try native Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Post', text: shareText, url: shareUrl });
        await sharePost(postId);
        return;
      } catch { /* user cancelled or not supported */ }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSharedPostId(postId);
      setTimeout(() => setSharedPostId(null), 2000);
      await sharePost(postId);
    } catch {
      // Last resort: prompt
      prompt('Copia este enlace:', shareUrl);
    }
  };

  // ===== PUBLISH =====
  const publishPost = async () => {
    if (!newContent.trim() || publishing) return;
    setPublishing(true);

    // Upload images
    let media_urls: string[] = [];
    let media_types: string[] = [];
    if (selectedImages.length > 0) {
      for (const file of selectedImages) {
        const url = await uploadImage(file);
        if (url) {
          media_urls.push(url);
          media_types.push(file.type.startsWith('video') ? 'video' : 'image');
        }
      }
    }

    const opts: {
      location?: string;
      match_result?: string;
      media_urls?: string[];
      media_types?: string[];
    } = {};

    if (postLocation) opts.location = postLocation.name;
    if (postTag?.includes('Resultado')) opts.match_result = 'Resultado de partido';
    if (media_urls.length > 0) {
      opts.media_urls = media_urls;
      opts.media_types = media_types;
    }

    await createPost(newContent, opts);
    closeComposer();
    setPublishing(false);
  };

  return (
    <div className={styles.feed}>
      <div className={styles.heroSection}>
        <h1 className="section-title">{t('feed.title')}</h1>
        <p className="section-subtitle">{t('feed.subtitle')}</p>
      </div>

      {/* Stories */}
      <div className={styles.storiesRow}>
        {['🏓 Tu historia', '🔥 Torneos', '📍 Cerca', '⭐ Top', '🎯 Retos'].map((label, i) => (
          <button key={i} className={styles.storyBubble}>
            <div className={styles.storyCircle}><span>{label.split(' ')[0]}</span></div>
            <span className={styles.storyLabel}>{label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>

      {/* Create Post */}
      <div className={`card ${styles.createPost}`} onClick={() => openComposer()}>
        <div className="flex items-center gap-md">
          <div className={styles.avatarGlow}>{profile?.avatar_emoji || '🏓'}</div>
          <input className="input" placeholder={t('feed.placeholder')} readOnly style={{ cursor: 'pointer' }} />
        </div>
        <div className={styles.postActions}>
          <button className={styles.postAction} onClick={(e) => { e.stopPropagation(); openComposer(); setTimeout(handlePhotoClick, 200); }}><Camera size={14} strokeWidth={1.6} /> Foto</button>
          <button className={styles.postAction} onClick={(e) => { e.stopPropagation(); openComposer(); setTimeout(handleLocationClick, 200); }}><MapPin size={14} strokeWidth={1.6} /> Ubicación</button>
          <button className={styles.postAction} onClick={(e) => { e.stopPropagation(); openComposer('🏆 Resultado de partido'); }}><Trophy size={14} strokeWidth={1.6} /> Resultado</button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesSelected}
      />

      {/* Composer Modal */}
      {showComposer && (
        <div className={styles.composerOverlay} onClick={closeComposer}>
          <div className={styles.composer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.composerHeader}>
              <button className={styles.composerClose} onClick={closeComposer}><X size={20} /></button>
              <span className={styles.composerTitle}>{t('feed.createPost')}</span>
              <button className={styles.composerPublish} onClick={publishPost} disabled={!newContent.trim() || publishing}>
                {publishing ? <Loader size={16} className={styles.spinIcon} /> : <Send size={16} />}
                {publishing ? t('feed.publishing') : t('feed.publish')}
              </button>
            </div>
            <div className={styles.composerBody}>
              <div className={styles.composerUser}>
                <div className={styles.avatarGlow}>{profile?.avatar_emoji || '🏓'}</div>
                <div>
                  <span className={styles.composerName}>{profile?.display_name || 'Tú'}</span>
                  <span className={styles.composerHandle}>@{profile?.username || 'tu'}</span>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                className={styles.composerTextarea}
                placeholder={t('feed.placeholder')}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
              />

              {/* Image previews */}
              {imagePreviews.length > 0 && (
                <div className={styles.imagePreviewRow}>
                  {imagePreviews.map((src, i) => (
                    <div key={i} className={styles.imagePreview}>
                      <img src={src} alt={`Preview ${i + 1}`} />
                      <button className={styles.imageRemove} onClick={() => removeImage(i)}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Location tag */}
              {postLocation && (
                <div className={styles.composerTag}>
                  <span>📍 {postLocation.name}</span>
                  <button onClick={() => setPostLocation(null)}><X size={12} /></button>
                </div>
              )}

              {/* Other tags */}
              {postTag && (
                <div className={styles.composerTag}>
                  <span>{postTag}</span>
                  <button onClick={() => setPostTag(null)}><X size={12} /></button>
                </div>
              )}
            </div>

            {/* Composer Footer */}
            <div className={styles.composerFooter}>
              <button className={styles.postAction} onClick={handlePhotoClick} disabled={selectedImages.length >= 4}>
                <Camera size={14} /> {t('feed.photo')} {selectedImages.length > 0 ? `(${selectedImages.length}/4)` : ''}
              </button>
              <div style={{ position: 'relative' }}>
                <button className={styles.postAction} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <Smile size={14} /> Emoji
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={insertEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              <button
                className={`${styles.postAction} ${postLocation ? styles.postActionActive : ''}`}
                onClick={handleLocationClick}
                disabled={locationLoading}
              >
                {locationLoading ? <Loader size={14} className={styles.spinIcon} /> : <MapPin size={14} />}
                {t('feed.location')}
              </button>
              <button className={styles.postAction} onClick={() => setPostTag('🏆 Resultado de partido')}>
                <Trophy size={14} /> {t('feed.result')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      <div className={`stagger ${styles.postsContainer}`}>
        {loading ? (
          <ProNetLoader text="Cargando feed..." />
        ) : posts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '30px', marginBottom: '12px' }}>🏓</p>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{t('feed.noPostsYet')}</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>{t('feed.beFirst')}</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="card card--interactive" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {/* Post Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div className={styles.avatarGlow}>{post.author_avatar}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{post.author_name}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', marginLeft: 6 }}>@{post.author_username} · {timeAgo(post.created_at)}</span>
                </div>
              </div>

              {/* Content */}
              <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>{post.content}</p>
              <TranslateButton sourceId={post.id} sourceType="post" originalText={post.content} />

              {/* Post images */}
              {post.media_urls && post.media_urls.length > 0 && (
                <div className={`${styles.postImageGrid} ${styles[`grid${Math.min(post.media_urls.length, 4)}`]}`}>
                  {post.media_urls.slice(0, 4).map((url, i) => (
                    <img key={i} src={url} alt="" className={styles.postImage} loading="lazy" />
                  ))}
                </div>
              )}

              {/* Location */}
              {post.location && (
                <span className={styles.locationBadge}>📍 {post.location}</span>
              )}
              {post.match_result && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent)' }}>🏆 {post.match_result}</span>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                <button className={styles.postAction} onClick={() => toggleReaction(post.id, 'like')}>
                  <Heart size={14} /> {post.like_count > 0 ? post.like_count : ''}
                </button>
                <button className={styles.postAction} onClick={() => toggleReaction(post.id, 'dislike')}>
                  <ThumbsDown size={14} /> {post.dislike_count > 0 ? post.dislike_count : ''}
                </button>
                <button className={`${styles.postAction} ${openComments === post.id ? styles.postActionActive : ''}`} onClick={() => toggleComments(post.id)}>
                  <MessageCircle size={14} /> {post.comment_count > 0 ? post.comment_count : ''}
                </button>
                <button className={styles.postAction} onClick={() => toggleReaction(post.id, 'repost')}>
                  <Repeat2 size={14} /> {post.repost_count > 0 ? post.repost_count : ''}
                </button>
                <button className={`${styles.postAction} ${sharedPostId === post.id ? styles.postActionActive : ''}`} onClick={() => handleShare(post.id, post.content)}>
                  {sharedPostId === post.id ? <Check size={14} /> : <Share2 size={14} />}
                </button>
              </div>

              {/* Comment Section */}
              {openComments === post.id && (
                <div className={styles.commentSection}>
                  {/* Comment input */}
                  <div className={styles.commentInputWrap}>
                    <div className={styles.commentAvatar}>{profile?.avatar_emoji || '🏓'}</div>
                    <input
                      ref={commentInputRef}
                      className={styles.commentInput}
                      placeholder="Escribe un comentario..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id); } }}
                      disabled={sendingComment}
                    />
                    <button
                      className={styles.commentSendBtn}
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentText.trim() || sendingComment}
                    >
                      {sendingComment ? <Loader size={14} className={styles.spinIcon} /> : <Send size={14} />}
                    </button>
                  </div>

                  {/* Comment list */}
                  {commentLoading ? (
                    <p className={styles.commentEmpty}>Cargando comentarios...</p>
                  ) : comments.length === 0 ? (
                    <p className={styles.commentEmpty}>Sé el primero en comentar 💬</p>
                  ) : (
                    <div className={styles.commentList}>
                      {comments.map((c) => (
                        <div key={c.id} className={styles.commentItem}>
                          <div className={styles.commentAvatar}>{c.profiles?.avatar_emoji || '🏓'}</div>
                          <div className={styles.commentBody}>
                            <div className={styles.commentHeader}>
                              <span className={styles.commentAuthor}>{c.profiles?.display_name || 'Usuario'}</span>
                              <span className={styles.commentTime}>{timeAgo(c.created_at)}</span>
                            </div>
                            <p className={styles.commentText}>{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
