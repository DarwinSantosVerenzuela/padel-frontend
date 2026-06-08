'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Court {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  total_courts: number;
  surface_type: string;
  is_indoor: boolean;
  has_lighting: boolean;
  has_restaurant: boolean;
  has_bar: boolean;
  price_per_hour: number;
  currency: string;
  avg_rating: number;
  total_reviews: number;
  cover_image_url: string | null;
  logo_url: string | null;
  distance_km?: number;
  tags: string[];
}

function generateTags(court: Omit<Court, 'tags'>): string[] {
  const tags: string[] = [];
  if (court.is_indoor) tags.push('Techada');
  else tags.push('Aire libre');
  if (court.has_restaurant) tags.push('Restaurante');
  if (court.has_bar) tags.push('Bar');
  if (court.has_lighting) tags.push('Iluminación');
  if (court.avg_rating >= 4.5) tags.push('Premium');
  return tags;
}

/**
 * Extract lat/lng from various PostGIS return formats:
 * 1. Separate lat/lng columns
 * 2. GeoJSON object: { type: "Point", coordinates: [lng, lat] }
 * 3. GeoJSON string: '{"type":"Point","coordinates":[-66.845,10.502]}'
 * 4. WKT string: "POINT(-66.845 10.502)"
 */
function extractCoords(c: any): { lat: number; lng: number } {
  // 1. Direct lat/lng columns
  if (c.lat != null && c.lng != null && Number(c.lat) !== 0) {
    return { lat: Number(c.lat), lng: Number(c.lng) };
  }

  // 2. GeoJSON object from PostgREST
  if (c.location && typeof c.location === 'object' && c.location.coordinates) {
    return { lat: c.location.coordinates[1], lng: c.location.coordinates[0] };
  }

  // 3. GeoJSON string
  if (c.location && typeof c.location === 'string') {
    // Try GeoJSON parse
    try {
      if (c.location.startsWith('{')) {
        const geo = JSON.parse(c.location);
        if (geo.coordinates) {
          return { lat: geo.coordinates[1], lng: geo.coordinates[0] };
        }
      }
    } catch { /* not JSON */ }

    // Try WKT: "POINT(-66.845 10.502)" or "SRID=4326;POINT(-66.845 10.502)"
    const wktMatch = c.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      return { lat: Number(wktMatch[2]), lng: Number(wktMatch[1]) };
    }
  }

  return { lat: 0, lng: 0 };
}

export function useCourts() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const supabase = createClient();

  // Try to get user location
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => { /* denied or unavailable */ },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const fetchCourts = useCallback(async () => {
    setLoading(true);

    const mapCourt = (c: any, distance?: number): Court => {
      const coords = extractCoords(c);
      const base = {
        id: c.id,
        name: c.name,
        slug: c.slug,
        address: c.address,
        city: c.city,
        country: c.country,
        lat: coords.lat,
        lng: coords.lng,
        total_courts: c.total_courts,
        surface_type: c.surface_type,
        is_indoor: c.is_indoor ?? false,
        has_lighting: c.has_lighting ?? true,
        has_restaurant: c.has_restaurant ?? false,
        has_bar: c.has_bar ?? false,
        price_per_hour: Number(c.price_per_hour) || 0,
        currency: c.currency || 'USD',
        avg_rating: Number(c.avg_rating) || 0,
        total_reviews: c.total_reviews || 0,
        cover_image_url: c.cover_image_url,
        logo_url: c.logo_url,
        distance_km: distance ?? c.distance_km,
        tags: [] as string[],
      };
      base.tags = generateTags(base);
      return base;
    };

    // Try RPC with geolocation if available
    if (userLocation) {
      try {
        const rpcPromise = supabase.rpc('find_nearby_courts', {
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          radius_km: 50,
          max_results: 30,
        });
        const rpcTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject('timeout'), 3500)
        );
        const { data, error } = await Promise.race([rpcPromise, rpcTimeout]);

        if (!error && data && (data as any[]).length > 0) {
          setCourts((data as any[]).map((c: any) => mapCourt(c, c.distance_km)));
          setLoading(false);
          return;
        }
      } catch {
        // RPC not available or timed out — fall through silently
      }
    }

    // Fallback: direct query with timeout
    try {
      const queryPromise = supabase
        .from('courts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject('timeout'), 3500)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (!error && data && (data as any[]).length > 0) {
        const mapped = (data as any[]).map((c: any) => mapCourt(c));
        setCourts(mapped);
        setLoading(false);
        return;
      }
    } catch {
      // Query failed or timed out — fall through to demo courts
    }

    // ====== FALLBACK: Hardcoded Caracas courts ======
    const demoCourts: Court[] = [
      {
        id: 'demo-1', name: 'Padel Club Las Mercedes', slug: 'padel-club-las-mercedes',
        address: 'Calle Madrid, Las Mercedes, Caracas', city: 'Caracas', country: 'Venezuela',
        lat: 10.4806, lng: -66.8589, total_courts: 6, surface_type: 'césped artificial',
        is_indoor: false, has_lighting: true, has_restaurant: true, has_bar: true,
        price_per_hour: 25, currency: 'USD', avg_rating: 4.7, total_reviews: 84,
        cover_image_url: null, logo_url: null, tags: [],
      },
      {
        id: 'demo-2', name: 'ProNet Arena Altamira', slug: 'pronet-arena-altamira',
        address: 'Av. Luis Roche, Altamira, Caracas', city: 'Caracas', country: 'Venezuela',
        lat: 10.4966, lng: -66.8500, total_courts: 8, surface_type: 'césped artificial',
        is_indoor: true, has_lighting: true, has_restaurant: true, has_bar: true,
        price_per_hour: 35, currency: 'USD', avg_rating: 4.9, total_reviews: 127,
        cover_image_url: null, logo_url: null, tags: [],
      },
      {
        id: 'demo-3', name: 'Padel Zone La Castellana', slug: 'padel-zone-castellana',
        address: 'Av. Eugenio Mendoza, La Castellana, Caracas', city: 'Caracas', country: 'Venezuela',
        lat: 10.5030, lng: -66.8515, total_courts: 4, surface_type: 'césped artificial',
        is_indoor: false, has_lighting: true, has_restaurant: false, has_bar: true,
        price_per_hour: 20, currency: 'USD', avg_rating: 4.4, total_reviews: 45,
        cover_image_url: null, logo_url: null, tags: [],
      },
      {
        id: 'demo-4', name: 'Club de Padel El Hatillo', slug: 'club-padel-hatillo',
        address: 'Calle La Paz, El Hatillo, Caracas', city: 'Caracas', country: 'Venezuela',
        lat: 10.4267, lng: -66.8250, total_courts: 5, surface_type: 'césped artificial',
        is_indoor: false, has_lighting: true, has_restaurant: true, has_bar: false,
        price_per_hour: 22, currency: 'USD', avg_rating: 4.5, total_reviews: 62,
        cover_image_url: null, logo_url: null, tags: [],
      },
      {
        id: 'demo-5', name: 'Padel Factory Chuao', slug: 'padel-factory-chuao',
        address: 'Av. Venezuela, Chuao, Caracas', city: 'Caracas', country: 'Venezuela',
        lat: 10.4850, lng: -66.8550, total_courts: 7, surface_type: 'césped artificial',
        is_indoor: true, has_lighting: true, has_restaurant: false, has_bar: true,
        price_per_hour: 30, currency: 'USD', avg_rating: 4.6, total_reviews: 73,
        cover_image_url: null, logo_url: null, tags: [],
      },
      {
        id: 'demo-6', name: 'Smash Padel Santa Fe', slug: 'smash-padel-santa-fe',
        address: 'Calle El Progreso, Santa Fe, Caracas', city: 'Caracas', country: 'Venezuela',
        lat: 10.4720, lng: -66.8700, total_courts: 3, surface_type: 'césped artificial',
        is_indoor: false, has_lighting: true, has_restaurant: false, has_bar: false,
        price_per_hour: 18, currency: 'USD', avg_rating: 4.2, total_reviews: 31,
        cover_image_url: null, logo_url: null, tags: [],
      },
    ];
    // Generate tags for demo courts
    demoCourts.forEach(c => { c.tags = generateTags(c); });
    setCourts(demoCourts);

    setLoading(false);
  }, [supabase, userLocation]);

  useEffect(() => { fetchCourts(); }, [fetchCourts]);

  // Log court visit for analytics (silent, non-blocking)
  const logCourtVisit = useCallback(async (courtId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('user_activity_log').insert({
        user_id: user.id,
        action: 'court_visit',
        target_type: 'court',
        target_id: courtId,
      }).then(() => {});
    } catch {
      // Silent fail — table may not exist yet
    }
  }, [supabase]);

  return { courts, loading, refetch: fetchCourts, logCourtVisit };
}
