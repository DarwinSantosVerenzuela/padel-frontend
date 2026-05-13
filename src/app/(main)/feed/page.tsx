import styles from './page.module.css';

export default function FeedPage() {
  return (
    <div className={styles.feed}>
      <h1 className={styles.title}>Tu Feed</h1>
      <p className="text-secondary text-sm">
        Comparte, debate y conecta con la comunidad de pádel.
      </p>

      {/* Placeholder for feed content */}
      <div className={styles.createPost}>
        <div className="card card--interactive">
          <div className="flex items-center gap-md">
            <div className="avatar avatar--md" style={{ background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🏓
            </div>
            <input
              className="input"
              placeholder="¿Qué está pasando en el pádel?"
              readOnly
              id="create-post-input"
            />
          </div>
        </div>
      </div>

      {/* Example post cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ marginTop: 'var(--space-md)' }}>
          <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="skeleton avatar--md" style={{ borderRadius: '50%', width: 40, height: 40 }} />
            <div className="flex-col gap-xs" style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '40%', height: 14 }} />
              <div className="skeleton" style={{ width: '25%', height: 10, marginTop: 4 }} />
            </div>
          </div>
          <div className="skeleton" style={{ width: '100%', height: 12, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '80%', height: 12, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '60%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}
