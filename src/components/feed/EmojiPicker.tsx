'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './EmojiPicker.module.css';

const CATEGORIES = [
  {
    name: 'Deportes',
    icon: '🏓',
    emojis: ['🏓', '⚽', '🎾', '🏀', '⭐', '🔥', '💯', '🏆', '🥇', '🥈', '🥉', '🎯', '🏅', '⚡', '💥', '🏐', '🎳', '🏋️', '🤸', '🏊'],
  },
  {
    name: 'Caras',
    icon: '😀',
    emojis: ['😀', '😂', '🤣', '😍', '🤩', '😎', '🥳', '😤', '😡', '😭', '🤯', '😏', '🙄', '😬', '🥲', '😅', '😱', '🤝', '🫡', '🤔'],
  },
  {
    name: 'Manos',
    icon: '👏',
    emojis: ['👏', '💪', '✌️', '🤙', '👋', '🙌', '🤞', '👍', '👎', '✊', '🤜', '🤛', '👊', '🫶', '🙏', '🤌', '👆', '👇', '☝️', '✋'],
  },
  {
    name: 'Celebración',
    icon: '🎉',
    emojis: ['🎉', '🎊', '🥂', '🍾', '🎶', '💫', '✨', '💎', '❤️', '💚', '💙', '💛', '🧡', '💜', '🖤', '🤍', '❤️‍🔥', '🫰', '💐', '🌟'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className={styles.picker} ref={pickerRef}>
      {/* Category tabs */}
      <div className={styles.tabs}>
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            className={`${styles.tab} ${activeCategory === i ? styles.tabActive : ''}`}
            onClick={() => setActiveCategory(i)}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className={styles.grid}>
        {CATEGORIES[activeCategory].emojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            className={styles.emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
