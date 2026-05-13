export default function ChatPage() {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--space-lg)' }}>
        Mensajes
      </h1>

      <input className="input" placeholder="Buscar conversaciones..." id="chat-search" style={{ marginBottom: 'var(--space-md)' }} />

      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="card card--compact card--interactive" style={{ marginBottom: 'var(--space-sm)' }}>
          <div className="flex items-center gap-md">
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                <div className="skeleton" style={{ width: '40%', height: 14 }} />
                <div className="skeleton" style={{ width: 40, height: 10 }} />
              </div>
              <div className="skeleton" style={{ width: '70%', height: 12 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
