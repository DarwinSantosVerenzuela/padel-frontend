'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';

export interface ActivityPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
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
  // For reactions tab
  reaction_type?: 'like' | 'dislike';
}

export function useProfileActivity() {
  const [myPosts, setMyPosts] = useState<ActivityPost[]>([]);
  const [myReposts, setMyReposts] = useState<ActivityPost[]>([]);
  const [myReactions, setMyReactions] = useState<ActivityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { user } = useAuth();

  const fetchMyPosts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('posts_with_counts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setMyPosts(data as ActivityPost[]);
  }, [supabase, user]);

  const fetchMyReposts = useCallback(async () => {
    if (!user) return;
    // Get post IDs the user reposted
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('user_id', user.id)
      .eq('type', 'repost')
      .order('created_at', { ascending: false });

    if (reactions && reactions.length > 0) {
      const postIds = reactions.map((r) => r.post_id);
      const { data: posts } = await supabase
        .from('posts_with_counts')
        .select('*')
        .in('id', postIds);
      if (posts) {
        // Maintain repost order
        const ordered = postIds
          .map((id) => posts.find((p) => p.id === id))
          .filter(Boolean);
        setMyReposts(ordered as ActivityPost[]);
      }
    } else {
      setMyReposts([]);
    }
  }, [supabase, user]);

  const fetchMyReactions = useCallback(async () => {
    if (!user) return;
    // Get post IDs the user liked or disliked
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id, type')
      .eq('user_id', user.id)
      .in('type', ['like', 'dislike'])
      .order('created_at', { ascending: false });

    if (reactions && reactions.length > 0) {
      const postIds = reactions.map((r) => r.post_id);
      const { data: posts } = await supabase
        .from('posts_with_counts')
        .select('*')
        .in('id', postIds);
      if (posts) {
        // Merge reaction type into each post
        const ordered = reactions
          .map((r) => {
            const post = posts.find((p) => p.id === r.post_id);
            if (!post) return null;
            return { ...post, reaction_type: r.type as 'like' | 'dislike' };
          })
          .filter(Boolean);
        setMyReactions(ordered as ActivityPost[]);
      }
    } else {
      setMyReactions([]);
    }
  }, [supabase, user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyPosts(), fetchMyReposts(), fetchMyReactions()]);
    setLoading(false);
  }, [fetchMyPosts, fetchMyReposts, fetchMyReactions]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  return { myPosts, myReposts, myReactions, loading, refetch: fetchAll };
}
