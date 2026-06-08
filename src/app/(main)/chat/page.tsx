'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Smile, MoreVertical, Plus, Search, X, Check, CheckCheck } from 'lucide-react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useAuth } from '@/lib/auth/AuthProvider';
import ProNetLoader from '@/components/ui/ProNetLoader';
import styles from './page.module.css';

/* ── Helpers ── */
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function dateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

const quickReactions = ['❤️', '😂', '🔥', '👍', '😮', '😢'];

/* ── Message Bubble ── */
function MessageBubble({ msg, isMine, onReact }: { msg: ChatMessage; isMine: boolean; onReact: (emoji: string) => void }) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className={`${styles.msgRow} ${isMine ? styles.msgSent : styles.msgReceived}`}>
      <div
        className={`${styles.bubble} ${isMine ? styles.bubbleSent : styles.bubbleReceived}`}
        onDoubleClick={() => setShowReactions(!showReactions)}
      >
        <p className={styles.msgText}>{msg.content}</p>
        <div className={styles.msgMeta}>
          <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
          {isMine && (
            <span className={`${styles.msgCheck} ${msg.read ? styles.msgRead : ''}`}>
              {msg.read ? <CheckCheck size={13} /> : <Check size={13} />}
            </span>
          )}
        </div>
      </div>
      {msg.reactions.length > 0 && (
        <div className={`${styles.reactions} ${isMine ? styles.reactionsRight : styles.reactionsLeft}`}>
          {/* Group by emoji */}
          {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
            const count = msg.reactions.filter((r) => r.emoji === emoji).length;
            return (
              <button key={emoji} className={styles.reactionChip} onClick={() => onReact(emoji)}>
                {emoji}{count > 1 ? ` ${count}` : ''}
              </button>
            );
          })}
        </div>
      )}
      {showReactions && (
        <div className={`${styles.reactionPicker} ${isMine ? styles.pickerRight : styles.pickerLeft}`}>
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              className={styles.reactionBtn}
              onClick={() => { onReact(emoji); setShowReactions(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── New Chat Modal ── */
function NewChatModal({ onClose, onSelect }: { onClose: () => void; onSelect: (userId: string) => void }) {
  const { results, searching, search, clear } = useUserSearch();
  const [query, setQuery] = useState('');

  return (
    <div className={styles.newChatOverlay} onClick={onClose}>
      <div className={styles.newChatModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.newChatHeader}>
          <button onClick={onClose}><X size={20} /></button>
          <span className={styles.newChatTitle}>Nueva Conversación</span>
          <div style={{ width: 20 }} />
        </div>
        <div className={styles.newChatSearch}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar usuario..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            autoFocus
          />
        </div>
        <div className={styles.newChatResults}>
          {searching && <div className={styles.searchStatus}>Buscando...</div>}
          {!searching && query.length >= 2 && results.length === 0 && (
            <div className={styles.searchStatus}>No se encontraron usuarios</div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              className={styles.userResult}
              onClick={() => { onSelect(u.id); clear(); }}
            >
              <div className={styles.userAvatar}>{u.avatar_emoji}</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{u.display_name}</span>
                <span className={styles.userHandle}>@{u.username} · {u.level}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Chat Page ── */
export default function ChatPage() {
  const {
    conversations,
    activeMessages,
    activeConvId,
    loading,
    msgLoading,
    typingUsers,
    onlineUsers,
    openConversation,
    closeConversation,
    startConversation,
    sendMessage,
    toggleReaction,
    sendTyping,
  } = useChat();

  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages.length]);

  // Focus input when opening conversation
  useEffect(() => {
    if (activeConvId) inputRef.current?.focus();
  }, [activeConvId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input;
    setInput('');
    await sendMessage(msg);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    sendTyping();
  };

  const handleNewChat = async (userId: string) => {
    setShowNewChat(false);
    const convId = await startConversation(userId);
    if (convId) openConversation(convId);
  };

  // Get active conversation info
  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let lastDate = '';
  for (const msg of activeMessages) {
    const date = dateSeparator(msg.created_at);
    if (date !== lastDate) {
      groupedMessages.push({ date, messages: [] });
      lastDate = date;
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  /* ── Conversation List View ── */
  if (!activeConvId) {
    return (
      <div className={styles.chat}>
        <div className={styles.heroSection}>
          <div className={styles.headerRow}>
            <div>
              <h1 className="section-title">Mensajes</h1>
              <p className="section-subtitle">Tus conversaciones</p>
            </div>
            <button className={styles.newChatBtn} onClick={() => setShowNewChat(true)}>
              <Plus size={18} />
            </button>
          </div>
        </div>

        <input className="input" placeholder="Buscar conversaciones..." id="chat-search" />

        {loading ? (
          <ProNetLoader text="Cargando conversaciones..." />
        ) : conversations.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <p className={styles.emptyText}>No tienes conversaciones</p>
            <p className={styles.emptySubtext}>Busca un jugador para empezar a chatear</p>
            <button className="btn btn--primary" onClick={() => setShowNewChat(true)}>
              <Plus size={16} /> Nueva conversación
            </button>
          </div>
        ) : (
          <div className={`stagger ${styles.convList}`}>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className={`${styles.convCard} animate-fade-in`}
                onClick={() => openConversation(conv.id)}
              >
                <div className={styles.avatarWrap}>
                  <div className={styles.convAvatar}>{conv.other_user.avatar_emoji}</div>
                  {onlineUsers.has(conv.other_user.id) && <div className={styles.onlineDot} />}
                </div>
                <div className={styles.convContent}>
                  <div className={styles.convTopRow}>
                    <span className={styles.convName}>{conv.other_user.display_name}</span>
                    <span className={styles.convTime}>{timeAgo(conv.last_message_at)}</span>
                  </div>
                  <div className={styles.convBottomRow}>
                    <p className={styles.convMessage}>{conv.last_message || 'Inicia la conversación...'}</p>
                    {conv.unread_count > 0 && <span className={styles.unreadBadge}>{conv.unread_count}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onSelect={handleNewChat} />}
      </div>
    );
  }

  /* ── Active Chat View ── */
  return (
    <div className={styles.chatView}>
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <button className={styles.backBtn} onClick={closeConversation}>
          <ArrowLeft size={20} />
        </button>
        <div className={styles.chatHeaderInfo}>
          <div className={styles.avatarWrap}>
            <div className={styles.chatHeaderAvatar}>{activeConv?.other_user.avatar_emoji || '🏓'}</div>
            {activeConv && onlineUsers.has(activeConv.other_user.id) && <div className={styles.onlineDotSm} />}
          </div>
          <div>
            <span className={styles.chatHeaderName}>{activeConv?.other_user.display_name || 'Chat'}</span>
            <span className={styles.chatHeaderStatus}>
              {typingUsers.length > 0
                ? 'escribiendo...'
                : activeConv && onlineUsers.has(activeConv.other_user.id)
                  ? 'En línea'
                  : 'Desconectado'}
            </span>
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <button className={styles.chatHeaderBtn}><MoreVertical size={18} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesArea} ref={scrollRef}>
        <div className={styles.messagesInner}>
          {msgLoading ? (
            <ProNetLoader size={36} text="Cargando mensajes..." />
          ) : activeMessages.length === 0 ? (
            <div className={styles.msgEmptyState}>
              <div style={{ fontSize: 36 }}>👋</div>
              <p>¡Envía el primer mensaje!</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                <div className={styles.dateSeparator}>
                  <span>{group.date}</span>
                </div>
                {group.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={msg.user_id === user?.id}
                    onReact={(emoji) => toggleReaction(msg.id, emoji)}
                  />
                ))}
              </div>
            ))
          )}
          {typingUsers.length > 0 && (
            <div className={`${styles.msgRow} ${styles.msgReceived}`}>
              <div className={`${styles.bubble} ${styles.bubbleReceived} ${styles.typingBubble}`}>
                <div className={styles.typingDots}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div className={styles.inputBar}>
        <button className={styles.inputAction}><Smile size={20} /></button>
        <input
          ref={inputRef}
          className={styles.msgInput}
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          maxLength={5000}
        />
        {input.trim() ? (
          <button className={styles.sendBtn} onClick={handleSend}>
            <Send size={18} />
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>
    </div>
  );
}
