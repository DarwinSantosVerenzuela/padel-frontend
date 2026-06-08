'use client';

import { useState } from 'react';
import { X, Shuffle, Swords, Plus, ChevronRight } from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';
import { useCourts } from '@/hooks/useCourts';
import { useAuth } from '@/lib/auth/AuthProvider';
import styles from './page.module.css';

export default function PlayPage() {
  const { matches, createMatch, cancelMatch } = useMatches();
  const { courts } = useCourts();
  const { profile } = useAuth();

  const [showModal, setShowModal] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Create Match form state
  const [formCourt, setFormCourt] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');

  const handleCreateMatch = async () => {
    if (!formCourt || !formDate || !formTime) return;
    await createMatch(formCourt, formDate, formTime, 'manual');
    setShowModal(null);
    setFormCourt('');
    setFormDate('');
    setFormTime('');
  };

  const startRandomSearch = async () => {
    setSearching(true);
    setShowModal(null);
    const today = new Date().toISOString().split('T')[0];
    await createMatch(null, today, '18:00', 'random');
    setSearching(false);
  };

  const sendChallenge = async () => {
    const today = new Date().toISOString().split('T')[0];
    await createMatch(null, today, '00:00', 'challenge');
    setShowModal(null);
  };

  const quickStats = [
    { label: 'Partidos', value: String(matches.length), icon: '🏓' },
    { label: 'Victorias', value: '0', icon: '🏆' },
    { label: 'Ranking', value: '—', icon: '📊' },
    { label: 'Tak Score', value: String(profile?.elo ?? 1200), icon: '⭐' },
  ];

  return (
    <div className={styles.play}>
      <div className={styles.heroSection}>
        <h1 className="section-title">Taketear</h1>
        <p className="section-subtitle">Elige tu modo de juego</p>
      </div>

      <div className={styles.statsGrid}>
        {quickStats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={styles.statIcon}>{stat.icon}</span>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Play Modes */}
      <div className={`stagger ${styles.modesGrid}`}>
        <button className={`${styles.modeCard} animate-fade-in`} onClick={() => setShowModal('manual')} id="play-manual">
          <div className={styles.modeIcon}>🎯</div>
          <div className={styles.modeContent}>
            <div className={styles.modeTitleRow}>
              <h3 className={styles.modeTitle}>Crear Partido</h3>
            </div>
            <p className={styles.modeDesc}>Elige jugadores, cancha y horario</p>
          </div>
          <ChevronRight size={16} className={styles.modeArrowIcon} />
        </button>

        <button className={`${styles.modeCard} animate-fade-in`} onClick={() => { if (!searching) setShowModal('random'); }} id="play-random">
          <div className={styles.modeIcon}>🎲</div>
          <div className={styles.modeContent}>
            <div className={styles.modeTitleRow}>
              <h3 className={styles.modeTitle}>Takeo Aleatorio</h3>
              <span className={styles.modeBadge}>{searching ? 'Buscando...' : '3 online'}</span>
            </div>
            <p className={styles.modeDesc}>{searching ? 'Encontrando takers...' : 'Te emparejamos por ranking y ubicación'}</p>
          </div>
          {searching ? <div className={styles.spinner} /> : <ChevronRight size={16} className={styles.modeArrowIcon} />}
        </button>

        <button className={`${styles.modeCard} animate-fade-in`} onClick={() => setShowModal('challenge')} id="play-challenge">
          <div className={styles.modeIcon}>⚔️</div>
          <div className={styles.modeContent}>
            <div className={styles.modeTitleRow}>
              <h3 className={styles.modeTitle}>Reto Tak</h3>
              <span className={styles.modeBadge}>Nuevo</span>
            </div>
            <p className={styles.modeDesc}>Desafía a cualquier taker</p>
          </div>
          <ChevronRight size={16} className={styles.modeArrowIcon} />
        </button>
      </div>

      {/* Active Matches */}
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Partidos activos</h2>
        {matches.length === 0 ? (
          <div className={`card ${styles.emptyMatch}`}>
            <div className={styles.emptyIcon}>🏓</div>
            <p className={styles.emptyText}>No tienes partidos activos</p>
            <p className={styles.emptySubtext}>Crea un partido o busca un match aleatorio</p>
          </div>
        ) : (
          <div className={styles.matchesList}>
            {matches.map((m) => (
              <div key={m.id} className={`card card--compact ${styles.matchCard}`}>
                <div className={styles.matchHeader}>
                  <span className={styles.matchMode}>{m.mode === 'manual' ? '🎯' : m.mode === 'random' ? '🎲' : '⚔️'}</span>
                  <span className={styles.matchTitle}>{m.courts?.name || 'Por definir'}</span>
                  <span className="badge badge--accent">{m.status === 'open' ? 'Abierto' : 'En curso'}</span>
                </div>
                <div className={styles.matchMeta}>
                  <span>{m.date} · {m.time}</span>
                  <span>{m.mode}</span>
                </div>
                <div className={styles.matchActions}>
                  <button className="btn btn--ghost" onClick={() => cancelMatch(m.id)}>Cancelar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Match */}
      {showModal === 'manual' && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button className={styles.modalClose} onClick={() => setShowModal(null)}><X size={20} /></button>
              <span className={styles.modalTitle}>Crear Partido</span>
              <div />
            </div>
            <div className={styles.modalBody}>
              <label className={styles.fieldLabel}>Cancha</label>
              <select className="input" value={formCourt} onChange={(e) => setFormCourt(e.target.value)}>
                <option value="">Seleccionar cancha...</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — ${c.price_per_hour / 100}/h</option>
                ))}
              </select>
              <label className={styles.fieldLabel}>Fecha</label>
              <input type="date" className="input" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <label className={styles.fieldLabel}>Hora</label>
              <input type="time" className="input" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn--primary btn--full" onClick={handleCreateMatch} disabled={!formCourt || !formDate || !formTime}>
                <Plus size={16} /> Crear partido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Random */}
      {showModal === 'random' && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button className={styles.modalClose} onClick={() => setShowModal(null)}><X size={20} /></button>
              <span className={styles.modalTitle}>Match Aleatorio</span>
              <div />
            </div>
            <div className={styles.modalBody} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, margin: '16px 0' }}>🎲</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Te emparejaremos con jugadores de nivel similar.</p>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn--primary btn--full" onClick={startRandomSearch}>
                <Shuffle size={16} /> Buscar match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Challenge */}
      {showModal === 'challenge' && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button className={styles.modalClose} onClick={() => setShowModal(null)}><X size={20} /></button>
              <span className={styles.modalTitle}>Retar a Alguien</span>
              <div />
            </div>
            <div className={styles.modalBody} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, margin: '16px 0' }}>⚔️</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Envía un reto a cualquier jugador.</p>
              <input className="input" placeholder="Buscar jugador..." />
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn--primary btn--full" onClick={sendChallenge}>
                <Swords size={16} /> Enviar reto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
