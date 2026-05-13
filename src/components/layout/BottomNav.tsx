'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Gamepad2,
  MapPin,
  MessageCircle,
  User,
} from 'lucide-react';
import styles from './BottomNav.module.css';

const navItems = [
  { href: '/feed', icon: Home, label: 'Feed', labelEn: 'Feed' },
  { href: '/play', icon: Gamepad2, label: 'Jugar', labelEn: 'Play' },
  { href: '/courts', icon: MapPin, label: 'Canchas', labelEn: 'Courts' },
  { href: '/chat', icon: MessageCircle, label: 'Chat', labelEn: 'Chat' },
  { href: '/profile', icon: User, label: 'Perfil', labelEn: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} id="bottom-navigation">
      <div className={styles.inner}>
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${isActive ? styles.active : ''}`}
              id={`nav-${item.labelEn.toLowerCase()}`}
            >
              <div className={styles.iconWrap}>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={styles.icon}
                />
                {isActive && <div className={styles.dot} />}
              </div>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
