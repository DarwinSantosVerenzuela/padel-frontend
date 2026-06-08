'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Star, Search } from 'lucide-react';
import { useCourts, Court } from '@/hooks/useCourts';
import ProNetLoader from '@/components/ui/ProNetLoader';
import styles from './page.module.css';

function MapComponent({ courts, onSelectCourt }: { courts: Court[]; onSelectCourt: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const initCalled = useRef(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || initCalled.current || courts.length === 0) return;
    initCalled.current = true;

    let map: any = null;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Use first court or user location as center
      const center: [number, number] = courts[0]?.lat && courts[0]?.lng
        ? [courts[0].lat, courts[0].lng]
        : [10.50, -66.85]; // Default: Caracas

      map = L.map(mapRef.current!, {
        center,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const courtIcon = L.divIcon({
        className: '',
        html: '<div style="width:30px;height:30px;background:#30D158;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #2C2C2E;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏓</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      courts.forEach((court) => {
        if (!court.lat || !court.lng) return; // Skip courts without coordinates
        const marker = L.marker([court.lat, court.lng], { icon: courtIcon }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:160px">
            <b style="font-size:14px">${court.name}</b><br/>
            <span style="color:#666">${court.address}</span><br/>
            <span style="color:#30D158;font-weight:700">$${court.price_per_hour}/h</span> · 
            <span>${court.total_courts} canchas</span>
          </div>`
        );
        marker.on('click', () => onSelectCourt(court.id));
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstance.current = map;
      setLoading(false);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserLoc({ lat: latitude, lng: longitude });
            const userIcon = L.divIcon({
              className: '',
              html: '<div style="width:14px;height:14px;background:#0A84FF;border-radius:50%;border:3px solid #2C2C2E;box-shadow:0 0 0 4px rgba(10,132,255,0.25)"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });
            L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
            map.setView([latitude, longitude], 14);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        mapInstance.current = null;
      }
    };
  }, [courts, onSelectCourt]);

  const centerOnUser = () => {
    if (userLoc && mapInstance.current) {
      mapInstance.current.setView([userLoc.lat, userLoc.lng], 15);
    }
  };

  return (
    <div className={styles.mapWrap}>
      <div ref={mapRef} className={styles.mapContainer} />
      {loading && <div className={styles.mapLoading}><span>Cargando mapa...</span></div>}
      <button className={styles.locateBtn} onClick={centerOnUser} aria-label="Mi ubicación">
        <Navigation size={16} />
      </button>
    </div>
  );
}

export default function CourtsPage() {
  const { courts, loading, logCourtVisit } = useCourts();
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filters = ['Todas', 'Techadas', 'Aire libre', 'Premium', 'Con Bar'];

  const handleSelectCourt = useCallback((id: string) => {
    setSelectedCourt(id);
    logCourtVisit(id);
    const el = document.getElementById(`court-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [logCourtVisit]);

  const filtered = courts.filter((c) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.address.toLowerCase().includes(q) && !(c.city || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    // Tag filter
    if (activeFilter === 'Todas') return true;
    if (activeFilter === 'Techadas') return c.is_indoor;
    if (activeFilter === 'Aire libre') return !c.is_indoor;
    if (activeFilter === 'Premium') return c.avg_rating >= 4.5;
    if (activeFilter === 'Con Bar') return c.has_bar || c.has_restaurant;
    return true;
  });

  return (
    <div className={styles.courts}>
      <div className={styles.heroSection}>
        <h1 className="section-title">Canchas Cercanas</h1>
        <p className="section-subtitle">Encuentra y reserva la cancha perfecta</p>
      </div>

      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar canchas..."
          id="courts-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.filtersRow}>
        {filters.map((f) => (
          <button
            key={f}
            className={`${styles.filterChip} ${activeFilter === f ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <ProNetLoader text="Buscando canchas..." subtitle="Estamos buscando canchas cerca de ti" />
        </div>
      ) : courts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏓</div>
          <p className={styles.emptyTitle}>No hay canchas disponibles</p>
          <p className={styles.emptySubtitle}>Aún no hay canchas registradas en tu zona. ¡Pronto habrá más!</p>
        </div>
      ) : (
        <>
          {filtered.some(c => c.lat && c.lng) && (
            <MapComponent courts={filtered.filter(c => c.lat && c.lng)} onSelectCourt={handleSelectCourt} />
          )}

          <div className={`stagger ${styles.courtsList}`}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Sin resultados</p>
                <p className={styles.emptySubtitle}>No se encontraron canchas con ese filtro</p>
              </div>
            ) : (
              filtered.map((court) => (
                <button
                  key={court.id}
                  className={`${styles.courtCard} ${selectedCourt === court.id ? styles.courtSelected : ''} animate-fade-in`}
                  id={`court-${court.id}`}
                  onClick={() => {
                    if (court.id !== selectedCourt) logCourtVisit(court.id);
                    setSelectedCourt(court.id === selectedCourt ? null : court.id);
                  }}
                >
                  <div className={styles.courtIcon}><MapPin size={20} /></div>
                  <div className={styles.courtInfo}>
                    <div className={styles.courtRow}>
                      <h3 className={styles.courtName}>{court.name}</h3>
                      <span className={styles.courtPrice}>${court.price_per_hour}/h</span>
                    </div>
                    <p className={styles.courtAddress}>{court.address}</p>
                    <div className={styles.courtMeta}>
                      <span className={styles.courtRating}><Star size={11} fill="currentColor" /> {court.avg_rating || '—'}</span>
                      <span className={styles.courtCourts}>{court.total_courts} canchas</span>
                      {court.distance_km != null && (
                        <span className={styles.courtDistance}>{court.distance_km} km</span>
                      )}
                    </div>
                    {selectedCourt === court.id && (
                      <div className={styles.courtActions}>
                        <button className={`btn btn--primary btn--sm ${styles.bookBtn}`} onClick={(e) => { e.stopPropagation(); alert(`Reserva para ${court.name} — próximamente`); }}>
                          Reservar
                        </button>
                        <span className={styles.courtTags}>{court.tags.join(' · ')}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
