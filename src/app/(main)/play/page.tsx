export default function PlayPage() {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 'var(--space-xs)' }}>
        Jugar Pádel
      </h1>
      <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-lg)' }}>
        Elige cómo quieres jugar hoy.
      </p>

      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
        {/* Manual Match */}
        <div className="card card--interactive" id="play-manual">
          <div className="flex items-center gap-md">
            <div style={{ fontSize: 32 }}>🎯</div>
            <div>
              <h3 className="font-semibold">Crear Partido</h3>
              <p className="text-secondary text-sm">Elige jugadores, cancha y horario</p>
            </div>
          </div>
        </div>

        {/* Random Match */}
        <div className="card card--interactive" id="play-random">
          <div className="flex items-center gap-md">
            <div style={{ fontSize: 32 }}>🎲</div>
            <div>
              <h3 className="font-semibold">Match Aleatorio</h3>
              <p className="text-secondary text-sm">La app te empareja por ranking y ubicación</p>
            </div>
          </div>
        </div>

        {/* Challenge */}
        <div className="card card--interactive" id="play-challenge">
          <div className="flex items-center gap-md">
            <div style={{ fontSize: 32 }}>⚔️</div>
            <div>
              <h3 className="font-semibold">Retar a Alguien</h3>
              <p className="text-secondary text-sm">Desafía a cualquier jugador, sin importar ranking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
