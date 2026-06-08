'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const passwordsMatch = password === confirmPassword;
  const isValid = password.length >= 6 && passwordsMatch;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/feed';
      }, 2000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <div className={styles.logo}>{success ? '✅' : '🔑'}</div>
          <h1 className={styles.title}>
            {success ? '¡Listo!' : 'Nueva contraseña'}
          </h1>
          <p className={styles.subtitle}>
            {success
              ? 'Tu contraseña ha sido actualizada. Redirigiendo...'
              : 'Ingresa tu nueva contraseña para restablecer tu cuenta'}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleReset} className={styles.form}>
            {/* New Password */}
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type={showPw ? 'text' : 'password'}
                className={styles.input}
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                autoFocus
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type={showConfirmPw ? 'text' : 'password'}
                className={`${styles.input} ${confirmPassword && !passwordsMatch ? styles.inputError : ''}`}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirmPw(!showConfirmPw)}>
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Validation hints */}
            <div className={styles.hints}>
              <span className={`${styles.hint} ${password.length >= 6 ? styles.hintValid : ''}`}>
                <Check size={12} /> Mínimo 6 caracteres
              </span>
              <span className={`${styles.hint} ${password && confirmPassword && passwordsMatch ? styles.hintValid : ''}`}>
                <Check size={12} /> Las contraseñas coinciden
              </span>
            </div>

            {/* Error */}
            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitBtn} disabled={!isValid || loading}>
              {loading ? <div className={styles.spinner} /> : <Check size={16} />}
              Restablecer contraseña
            </button>
          </form>
        ) : (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>
              <Check size={28} />
            </div>
            <p>Serás redirigido automáticamente...</p>
          </div>
        )}
      </div>
    </div>
  );
}
