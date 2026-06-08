'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';

interface UseFollowResult {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  loading: boolean;
  toggleFollow: () => Promise<void>;
}

export function useFollow(targetUserId: string | null): UseFollowResult {
  const { user } = useAuth();
  const supabase = createClient();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    const [followers, following, posts, myFollow] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', targetUserId),
      user && user.id !== targetUserId
        ? supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', targetUserId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setFollowersCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setPostsCount(posts.count || 0);
    setIsFollowing(!!myFollow.data);
    setLoading(false);
  }, [targetUserId, user, supabase]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const toggleFollow = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
  }, [user, targetUserId, isFollowing, supabase]);

  return { followersCount, followingCount, postsCount, isFollowing, loading, toggleFollow };
}
