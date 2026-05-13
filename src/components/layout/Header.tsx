'use client';

import Link from 'next/link';
import { Bell, Search, Trophy } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'PadelApp' }: HeaderProps) {
  return (
    <header className={styles.header} id="app-header">
      <div className={styles.inner}>
        <Link href="/feed" className={styles.logo} id="header-logo">
          <span className={styles.logoIcon}>🏓</span>
          <span className={styles.logoText}>{title}</span>
        </Link>

        <div className={styles.actions}>
          <Link href="/rankings" className={styles.actionBtn} id="header-rankings">
            <Trophy size={20} strokeWidth={1.8} />
          </Link>
          <Link href="/search" className={styles.actionBtn} id="header-search">
            <Search size={20} strokeWidth={1.8} />
          </Link>
          <Link href="/notifications" className={styles.actionBtn} id="header-notifications">
            <Bell size={20} strokeWidth={1.8} />
            <div className={styles.notifDot} />
          </Link>
        </div>
      </div>
    </header>
  );
}
