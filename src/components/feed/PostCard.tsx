'use client';

import { useState, useCallback } from 'react';
import {
  Heart,
  ThumbsDown,
  Repeat2,
  Share,
  Send,
  MessageCircle,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
} from 'lucide-react';
import styles from './PostCard.module.css';

/* ======================================
   Types
   ====================================== */
export interface Comment {
  id: number;
  user: string;
  handle: string;
  avatar: string;
  content: string;
  time: string;
  likes: number;
  liked: boolean;
  children?: Comment[];
}

export interface Post {
  id: number;
  user: string;
  handle: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  dislikes: number;
  comments: Comment[];
  reposts: number;
  shares: number;
}

/* ======================================
   Comment Thread (recursive)
   ====================================== */
function CommentThread({
  comment,
  depth = 0,
  onLikeComment,
}: {
  comment: Comment;
  depth?: number;
  onLikeComment?: (commentId: number) => Promise<boolean>;
}) {
  const [liked, setLiked] = useState(comment.liked);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [collapsed, setCollapsed] = useState(depth >= 2);
  const [children, setChildren] = useState<Comment[]>(comment.children || []);

  const handleLike = async () => {
    // Optimistic update
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    // Persist to DB if callback provided
    if (onLikeComment) {
      try {
        await onLikeComment(comment.id);
      } catch {
        // Revert on error
        setLiked((prev) => !prev);
        setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
      }
    }
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    const newReply: Comment = {
      id: Date.now(),
      user: 'Tú',
      handle: '@tu',
      avatar: '🏓',
      content: replyText,
      time: 'ahora',
      likes: 0,
      liked: false,
      children: [],
    };
    setChildren((prev) => [...prev, newReply]);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div
      className={styles.commentThread}
      style={{ marginLeft: depth > 0 ? 20 : 0 }}
    >
      {depth > 0 && <div className={styles.threadLine} />}
      <div className={styles.comment}>
        <div className={styles.commentAvatar}>{comment.avatar}</div>
        <div className={styles.commentBody}>
          <div className={styles.commentHeader}>
            <span className={styles.commentUser}>{comment.user}</span>
            <span className={styles.commentHandle}>
              {comment.handle} · {comment.time}
            </span>
          </div>
          <p className={styles.commentText}>{comment.content}</p>
          <div className={styles.commentActions}>
            <button
              className={`${styles.commentAction} ${liked ? styles.liked : ''}`}
              onClick={handleLike}
            >
              <Heart
                size={13}
                fill={liked ? 'currentColor' : 'none'}
                strokeWidth={liked ? 0 : 1.8}
              />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <button
              className={styles.commentAction}
              onClick={() => setShowReply(!showReply)}
            >
              <CornerDownRight size={13} strokeWidth={1.8} />
              <span>Responder</span>
            </button>
          </div>

          {/* Reply input */}
          {showReply && (
            <div className={styles.replyInput}>
              <input
                className={styles.replyField}
                placeholder="Escribe una respuesta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                autoFocus
              />
              <button
                className={styles.replySend}
                onClick={handleReply}
                disabled={!replyText.trim()}
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested children */}
      {children.length > 0 && (
        <>
          {depth >= 1 && (
            <button
              className={styles.collapseBtn}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <>
                  <ChevronDown size={12} /> {children.length} respuesta
                  {children.length > 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <ChevronUp size={12} /> Ocultar
                </>
              )}
            </button>
          )}
          {!collapsed &&
            children.map((child) => (
              <CommentThread key={child.id} comment={child} depth={depth + 1} onLikeComment={onLikeComment} />
            ))}
        </>
      )}
    </div>
  );
}

/* ======================================
   PostCard Component
   ====================================== */
export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [dislikeCount, setDislikeCount] = useState(post.dislikes);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [showComments, setShowComments] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(post.comments);

  const handleLike = useCallback(() => {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      if (disliked) {
        setDisliked(false);
        setDislikeCount((c) => c - 1);
      }
    }
  }, [liked, disliked]);

  const handleDislike = useCallback(() => {
    if (disliked) {
      setDisliked(false);
      setDislikeCount((c) => c - 1);
    } else {
      setDisliked(true);
      setDislikeCount((c) => c + 1);
      if (liked) {
        setLiked(false);
        setLikeCount((c) => c - 1);
      }
    }
  }, [liked, disliked]);

  const handleRepost = useCallback(() => {
    setReposted((r) => !r);
    setRepostCount((c) => (reposted ? c - 1 : c + 1));
  }, [reposted]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: Date.now(),
      user: 'Tú',
      handle: '@tu',
      avatar: '🏓',
      content: commentText,
      time: 'ahora',
      likes: 0,
      liked: false,
      children: [],
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
  };

  return (
    <article className={`card ${styles.postCard} animate-fade-in`}>
      {/* Header */}
      <div className={styles.postHeader}>
        <div className={styles.postAvatar}>{post.avatar}</div>
        <div className={styles.postMeta}>
          <span className={styles.postUser}>{post.user}</span>
          <span className={styles.postHandle}>
            {post.handle} · {post.time}
          </span>
        </div>
        <button className={styles.postMore}>
          <MoreHorizontal size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <p className={styles.postContent}>{post.content}</p>

      {/* Actions bar — vector icons */}
      <div className={styles.actionsBar}>
        {/* Like */}
        <button
          className={`${styles.actionBtn} ${liked ? styles.activeLike : ''}`}
          onClick={handleLike}
          aria-label="Me gusta"
        >
          <Heart
            size={18}
            strokeWidth={liked ? 0 : 1.6}
            fill={liked ? 'currentColor' : 'none'}
          />
          <span className={styles.actionCount}>{likeCount}</span>
        </button>

        {/* Dislike */}
        <button
          className={`${styles.actionBtn} ${disliked ? styles.activeDislike : ''}`}
          onClick={handleDislike}
          aria-label="No me gusta"
        >
          <ThumbsDown
            size={18}
            strokeWidth={disliked ? 0 : 1.6}
            fill={disliked ? 'currentColor' : 'none'}
          />
          {dislikeCount > 0 && (
            <span className={styles.actionCount}>{dislikeCount}</span>
          )}
        </button>

        {/* Comments */}
        <button
          className={`${styles.actionBtn} ${showComments ? styles.activeComment : ''}`}
          onClick={() => setShowComments(!showComments)}
          aria-label="Comentarios"
        >
          <MessageCircle
            size={18}
            strokeWidth={showComments ? 0 : 1.6}
            fill={showComments ? 'currentColor' : 'none'}
          />
          <span className={styles.actionCount}>{comments.length}</span>
        </button>

        {/* Repost */}
        <button
          className={`${styles.actionBtn} ${reposted ? styles.activeRepost : ''}`}
          onClick={handleRepost}
          aria-label="Repostear"
        >
          <Repeat2
            size={18}
            strokeWidth={reposted ? 2.2 : 1.6}
          />
          <span className={styles.actionCount}>{repostCount}</span>
        </button>

        {/* Share / Send */}
        <div className={styles.shareWrap}>
          <button
            className={styles.actionBtn}
            onClick={() => setShowShareMenu(!showShareMenu)}
            aria-label="Compartir"
          >
            <Share size={18} strokeWidth={1.6} />
          </button>

          {showShareMenu && (
            <div className={styles.shareMenu}>
              <button className={styles.shareOption}>
                <Share size={14} />
                <span>Compartir con usuario</span>
              </button>
              <button className={styles.shareOption}>
                <Send size={14} />
                <span>Enviar por mensaje</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className={styles.commentsSection}>
          {/* Write comment */}
          <div className={styles.writeComment}>
            <div className={styles.writeAvatar}>🏓</div>
            <input
              className={styles.commentInput}
              placeholder="Escribe un comentario..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button
              className={styles.commentSend}
              onClick={handleAddComment}
              disabled={!commentText.trim()}
            >
              <Send size={16} />
            </button>
          </div>

          {/* Thread list */}
          <div className={styles.threadsList}>
            {comments.length === 0 ? (
              <p className={styles.noComments}>
                Sé el primero en comentar
              </p>
            ) : (
              comments.map((c) => (
                <CommentThread key={c.id} comment={c} depth={0} onLikeComment={undefined} />
              ))
            )}
          </div>
        </div>
      )}
    </article>
  );
}
