'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  MessageCircle,
  CircleUserRound,
} from 'lucide-react';
import { SoftHomeIcon, SoftLocationIcon, SoftShopIcon } from '@/components/icons/NavIcons';
import PadelRacketIcon from '@/components/icons/PadelRacketIcon';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import styles from './BottomNav.module.css';

const navItems = [
  { href: '/feed', icon: SoftHomeIcon, label: 'Tak', labelEn: 'Tak' },
  { href: '/play', icon: PadelRacketIcon, label: 'Taketear', labelEn: 'Play' },
  { href: '/courts', icon: SoftLocationIcon, label: 'Canchas', labelEn: 'Courts' },
  { href: '/shop', icon: SoftShopIcon, label: 'Tienda', labelEn: 'Shop' },
  { href: '/chat', icon: MessageCircle, label: 'Chat', labelEn: 'Chat' },
  { href: '/profile', icon: CircleUserRound, label: 'Perfil', labelEn: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const supabase = createClient();

  // Sliding pill refs
  const innerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState({ x: 0, w: 0, h: 0, ready: false });

  const activeIndex = navItems.findIndex(item => pathname?.startsWith(item.href));

  const measure = useCallback(() => {
    if (activeIndex < 0) return;
    const el = itemRefs.current[activeIndex];
    const container = innerRef.current;
    if (!el || !container) return;
    const cr = container.getBoundingClientRect();
    const ir = el.getBoundingClientRect();
    setPill({ x: ir.left - cr.left, w: ir.width, h: ir.height, ready: true });
  }, [activeIndex]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);
    if (!memberships || memberships.length === 0) { setUnreadCount(0); return; }
    const convIds = memberships.map((m) => m.conversation_id);
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('user_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);
  }, [user, supabase]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const updateCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('pronet_cart') || '[]');
        setCartCount(Array.isArray(cart) ? cart.length : 0);
      } catch { setCartCount(0); }
    };
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('cart-updated', updateCart);
    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('cart-updated', updateCart);
    };
  }, []);

  return (
    <nav className={styles.nav} id="bottom-navigation">
      <div className={styles.inner} ref={innerRef}>
        {/* Sliding green pill */}
        {pill.ready && (
          <div
            className={styles.slider}
            style={{
              transform: `translateX(${pill.x}px)`,
              width: pill.w,
              height: pill.h,
            }}
          />
        )}

        {navItems.map((item, index) => {
          const isActive = activeIndex === index;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => { itemRefs.current[index] = el; }}
              className={`${styles.item} ${isActive ? styles.active : ''}`}
              id={`nav-${item.labelEn.toLowerCase()}`}
            >
              <div className={styles.iconWrap}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={styles.icon}
                />
                {item.href === '/chat' && unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
                {item.href === '/shop' && cartCount > 0 && (
                  <span className={styles.badgeCart}>{cartCount > 9 ? '9+' : cartCount}</span>
                )}
              </div>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
