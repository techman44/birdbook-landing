import { getApiBase } from './client';

// Location search using the backend Nominatim proxy (/api/location/search).
// Pass lat/lon to bias ranking toward the user's position (backend sends a
// ~2 degree viewbox to Nominatim without bounded=1, so nearby results come
// first but remote matches still appear).

export interface LocationSearchResult {
  place_id: number | null;
  name: string;
  display_name: string;
  short_name: string;
  lat: number;
  lon: number;
  type: string | null;
  address: {
    suburb: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postcode: string | null;
  };
}

export interface SearchLocationOptions {
  limit?: number;
  lat?: number;
  lon?: number;
}

export async function searchLocations(
  query: string,
  options: SearchLocationOptions = {}
): Promise<LocationSearchResult[]> {
  if (query.length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    limit: String(options.limit ?? 5),
  });
  if (options.lat !== undefined && options.lon !== undefined) {
    params.set('lat', String(options.lat));
    params.set('lon', String(options.lon));
  }

  try {
    const response = await fetch(`${getApiBase()}/location/search?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.locations || [];
  } catch {
    return [];
  }
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

let cachedPosition: GeoPoint | null = null;
let positionPromise: Promise<GeoPoint | null> | null = null;

/**
 * Request the browser's position once and cache it for the session.
 * Resolves null when geolocation is unavailable, denied, or times out —
 * callers should treat that as "no proximity bias" and carry on.
 */
export function getBrowserPosition(): Promise<GeoPoint | null> {
  if (cachedPosition) return Promise.resolve(cachedPosition);
  if (positionPromise) return positionPromise;

  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(null);
  }

  positionPromise = new Promise<GeoPoint | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        resolve(cachedPosition);
      },
      () => {
        // Denied or unavailable — graceful fallback, allow retry next session
        positionPromise = null;
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 }
    );
  });

  return positionPromise;
}
