export default function ProfilePage() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="avatar avatar--xl skeleton" style={{ margin: '0 auto', width: 80, height: 80, borderRadius: '50%' }} />
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginTop: 'var(--space-md)' }}>Mi Perfil</h1>
        <p className="text-secondary text-sm">@username</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        {[
          { label: 'Partidos', value: '—' },
          { label: 'ELO', value: '1200' },
          { label: 'Seguidores', value: '—' },
        ].map((stat) => (
          <div key={stat.label} className="card card--compact" style={{ textAlign: 'center' }}>
            <div className="font-bold text-lg text-green">{stat.value}</div>
            <div className="text-secondary text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      <button className="btn btn--primary btn--full" id="edit-profile-btn">
        Editar Perfil
      </button>
    </div>
  );
}
