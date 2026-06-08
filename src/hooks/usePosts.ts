'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';

export interface PostRow {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  media_urls: string[];
  media_types: string[];
  location: string | null;
  match_result: string | null;
  created_at: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  like_count: number;
  dislike_count: number;
  repost_count: number;
  comment_count: number;
}

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  likes_count?: number;
  liked_by_me?: boolean;
  profiles: { display_name: string; username: string; avatar_emoji: string };
}

export function usePosts() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { user } = useAuth();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts_with_counts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setPosts(data as PostRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('posts')
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path);
    return urlData.publicUrl;
  };

  // Create post with optional media and location
  const createPost = async (
    content: string,
    opts?: {
      location?: string;
      match_result?: string;
      image_url?: string;
      media_urls?: string[];
      media_types?: string[];
    }
  ) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content,
        location: opts?.location || null,
        match_result: opts?.match_result || null,
        image_url: opts?.image_url || null,
        media_urls: opts?.media_urls || [],
        media_types: opts?.media_types || [],
      })
      .select()
      .single();

    if (!error && data) {
      // Log analytics for media uploads
      if (opts?.media_urls && opts.media_urls.length > 0) {
        await logActivity('photo_upload', 'post', data.id, { count: opts.media_urls.length });
      }
      // Log analytics for location share
      if (opts?.location) {
        await logActivity('location_share', 'post', data.id, { location_name: opts.location });
      }
      await fetchPosts();
    }
    return data;
  };

  // Toggle reaction (like, dislike, repost)
  const toggleReaction = async (postId: string, type: 'like' | 'dislike' | 'repost') => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .eq('type', type)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: user.id, type });
      // Log dislike/repost for analytics (likes are auto-logged by DB trigger)
      if (type === 'dislike') await logActivity('post_dislike', 'post', postId);
      if (type === 'repost') await logActivity('post_repost', 'post', postId);
    }
    await fetchPosts();
  };

  // Add comment
  const addComment = async (postId: string, content: string, parentId?: string) => {
    if (!user) return;
    await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_id: parentId || null,
    });
    await fetchPosts();
  };

  // Get comments with like count
  const getComments = async (postId: string): Promise<CommentRow[]> => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(display_name, username, avatar_emoji)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    return (data || []) as CommentRow[];
  };

  // Toggle comment like (persistent in DB)
  const toggleCommentLike = async (commentId: string): Promise<boolean> => {
    if (!user) return false;

    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
      return false; // unliked
    } else {
      await supabase.from('likes').insert({ user_id: user.id, comment_id: commentId });
      return true; // liked
    }
  };

  // Share post — log for analytics
  const sharePost = async (postId: string) => {
    await logActivity('share_post', 'post', postId);
  };

  // Generic activity logger for analytics
  const logActivity = async (
    action: string,
    targetType: string,
    targetId: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    try {
      await supabase.from('user_activity_log').insert({
        user_id: user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        metadata: metadata || {},
      });
    } catch {
      // Silent fail — analytics should never break UX
    }
  };

  return {
    posts,
    loading,
    createPost,
    toggleReaction,
    addComment,
    getComments,
    toggleCommentLike,
    sharePost,
    uploadImage,
    logActivity,
    refetch: fetchPosts,
  };
}
