export default function CourtsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--space-xs)' }}>
        Canchas Cercanas
      </h1>
      <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-lg)' }}>
        Encuentra y reserva la cancha perfecta.
      </p>

      <input className="input" placeholder="Buscar canchas..." id="courts-search" style={{ marginBottom: 'var(--space-md)' }} />

      {/* Map placeholder */}
      <div className="card" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)', background: 'var(--green-subtle)' }}>
        <span className="text-secondary">🗺️ Google Maps se cargará aquí</span>
      </div>

      {/* Court cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="card card--interactive" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }} />
          <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '40%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}
