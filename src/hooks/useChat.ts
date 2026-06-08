'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ── Types ── */
export interface ChatConversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    display_name: string;
    username: string;
    avatar_emoji: string;
  };
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  read: boolean;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_emoji: string;
  };
  reactions: { emoji: string; user_id: string }[];
}

/* ── Hook ── */
export function useChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const supabase = createClient();
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);

  /* ── Fetch conversations ── */
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get all conversations where user is a member
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = memberships.map((m) => m.conversation_id);

    const results: ChatConversation[] = [];

    for (const convId of convIds) {
      // Get the other member
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id, profiles(id, display_name, username, avatar_emoji)')
        .eq('conversation_id', convId)
        .neq('user_id', user.id)
        .limit(1);

      const otherProfile = members?.[0]?.profiles as any;
      if (!otherProfile) continue;

      // Get last message
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', convId)
        .neq('user_id', user.id)
        .eq('read', false);

      results.push({
        id: convId,
        updated_at: lastMsg?.created_at || '',
        other_user: {
          id: otherProfile.id,
          display_name: otherProfile.display_name,
          username: otherProfile.username,
          avatar_emoji: otherProfile.avatar_emoji,
        },
        last_message: lastMsg?.content || null,
        last_message_at: lastMsg?.created_at || null,
        unread_count: count || 0,
      });
    }

    // Sort by most recent message
    results.sort((a, b) => {
      const aTime = a.last_message_at || '0';
      const bTime = b.last_message_at || '0';
      return bTime.localeCompare(aTime);
    });

    setConversations(results);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  /* ── Start / find 1-on-1 conversation ── */
  const startConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    // Check if conversation already exists between these two users
    const { data: myConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myConvs) {
      for (const mc of myConvs) {
        const { data: otherMember } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', mc.conversation_id)
          .eq('user_id', otherUserId)
          .maybeSingle();

        if (otherMember) return mc.conversation_id;
      }
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();
    if (convErr || !conv) return null;

    // Add both members
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

    await fetchConversations();
    return conv.id;
  };

  /* ── Load messages for a conversation ── */
  const openConversation = useCallback(async (convId: string) => {
    if (!user) return;
    setActiveConvId(convId);
    setMsgLoading(true);

    const { data } = await supabase
      .from('messages')
      .select('*, profiles(display_name, avatar_emoji)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100);

    // Load reactions for these messages
    const messages: ChatMessage[] = [];
    if (data) {
      const msgIds = data.map((m) => m.id);
      const { data: allReactions } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', msgIds);

      for (const m of data) {
        messages.push({
          ...m,
          reactions: allReactions?.filter((r) => r.message_id === m.id) || [],
        });
      }
    }

    setActiveMessages(messages);
    setMsgLoading(false);

    // Mark as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', convId)
      .neq('user_id', user.id)
      .eq('read', false);

    // Update conversation unread count locally
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  }, [supabase, user]);

  /* ── Send message ── */
  const sendMessage = async (content: string) => {
    if (!user || !activeConvId || !content.trim()) return;

    // Rate limit: 1 second between messages
    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;

    // Truncate content to 5000 chars
    const safeContent = content.slice(0, 5000);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConvId,
        user_id: user.id,
        content: safeContent,
      })
      .select('*, profiles(display_name, avatar_emoji)')
      .single();

    if (!error && data) {
      const newMsg: ChatMessage = { ...data, reactions: [] };
      setActiveMessages((prev) => [...prev, newMsg]);

      // Update conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, last_message: safeContent, last_message_at: data.created_at }
            : c
        ).sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''))
      );
    }
  };

  /* ── Toggle reaction ── */
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }

    // Update local state
    setActiveMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const hasReaction = m.reactions.some((r) => r.user_id === user!.id && r.emoji === emoji);
        return {
          ...m,
          reactions: hasReaction
            ? m.reactions.filter((r) => !(r.user_id === user!.id && r.emoji === emoji))
            : [...m.reactions, { emoji, user_id: user!.id }],
        };
      })
    );
  };

  /* ── Mark conversation as read ── */
  const markAsRead = async (convId: string) => {
    if (!user) return;
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', convId)
      .neq('user_id', user.id)
      .eq('read', false);
  };

  /* ── Unread count ── */
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  /* ── Close conversation ── */
  const closeConversation = () => {
    setActiveConvId(null);
    setActiveMessages([]);
    setTypingUsers([]);
    fetchConversations();
  };

  /* ══════════════════════════════════════
     FASE C3: REALTIME SUBSCRIPTIONS
     ══════════════════════════════════════ */

  // Subscribe to new messages in active conversation
  useEffect(() => {
    if (!activeConvId || !user) return;

    const channel = supabase
      .channel(`chat:${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        // Don't duplicate own messages (already added optimistically)
        if (newMsg.user_id === user.id) return;

        // Fetch profile for the message
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_emoji')
          .eq('id', newMsg.user_id)
          .single();

        const fullMsg: ChatMessage = {
          ...newMsg,
          profiles: profile || { display_name: 'Usuario', avatar_emoji: '🏓' },
          reactions: [],
        };

        setActiveMessages((prev) => [...prev, fullMsg]);

        // Auto-mark as read since we're viewing
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('id', newMsg.id);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [activeConvId, user, supabase]);

  /* ══════════════════════════════════════
     FASE C4: TYPING INDICATOR
     ══════════════════════════════════════ */

  // Send typing signal
  const sendTyping = useCallback(() => {
    if (!activeConvId || !user || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id },
    });
  }, [activeConvId, user]);

  // Listen for typing signals
  useEffect(() => {
    if (!activeConvId || !user) return;

    const channel = supabase.channel(`typing:${activeConvId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const typerId = payload.payload?.user_id;
        if (!typerId || typerId === user.id) return;

        setTypingUsers((prev) => (prev.includes(typerId) ? prev : [...prev, typerId]));

        // Clear after 3 seconds
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== typerId));
        }, 3000);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [activeConvId, user, supabase]);

  /* ══════════════════════════════════════
     FASE C4: ONLINE PRESENCE
     ══════════════════════════════════════ */

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUsers(new Set(Object.keys(state)));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    });

    presenceRef.current = channel;

    return () => {
      channel.unsubscribe();
      presenceRef.current = null;
    };
  }, [user, supabase]);

  return {
    conversations,
    activeMessages,
    activeConvId,
    loading,
    msgLoading,
    typingUsers,
    onlineUsers,
    totalUnread,
    fetchConversations,
    startConversation,
    openConversation,
    closeConversation,
    sendMessage,
    toggleReaction,
    markAsRead,
    sendTyping,
  };
}
