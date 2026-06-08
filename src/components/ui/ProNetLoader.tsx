'use client';

import styles from './ProNetLoader.module.css';

interface ProNetLoaderProps {
  size?: number;
  text?: string;
  subtitle?: string;
  fullPage?: boolean;
}

export default function ProNetLoader({ size = 48, text, subtitle, fullPage = false }: ProNetLoaderProps) {
  return (
    <div className={`${styles.loader} ${fullPage ? styles.fullPage : ''}`}>
      <img
        src="/logo-pronet.png"
        alt="ProNet"
        className={styles.logo}
        style={{ width: size, height: size }}
      />
      {text && <p className={styles.text}>{text}</p>}
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
