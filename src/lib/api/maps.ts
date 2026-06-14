import { api } from './client';

export interface SightingBadge {
  type: string;
  label: string;
  color: string;
}

export interface MapSighting {
  id: number;
  public_id?: string;
  identification_id: number;
  lat: number;
  lon: number;
  location_name: string | null;
  species: string;
  species_name?: string;
  scientific_name?: string;
  caption: string | null;
  image_path: string;
  created_at: string;
  time_ago?: string;
  user_id: number;
  username: string;
  profile_photo_url: string | null;
  reaction_count: number;
  badges?: SightingBadge[];
  is_rare?: boolean;
  is_life_bird?: boolean;
  conservation_status?: string | null;
  order_name?: string | null;
  family?: string | null;
}

export interface MapSightingsResponse {
  sightings: MapSighting[];
  count: number;
}

export async function getMapSightings(params?: {
  species?: string;
  species_id?: number;
  username?: string;
  days?: number;
  limit?: number;
  // Location-based filtering
  lat?: number;
  lon?: number;
  radius_km?: number;
  // Bounding box
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}): Promise<MapSightingsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.species) searchParams.set('species', params.species);
  if (params?.species_id) searchParams.set('species_id', String(params.species_id));
  if (params?.username) searchParams.set('username', params.username);
  if (params?.days) searchParams.set('days', String(params.days));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  // Location-based
  if (params?.lat !== undefined) searchParams.set('lat', String(params.lat));
  if (params?.lon !== undefined) searchParams.set('lon', String(params.lon));
  if (params?.radius_km !== undefined) searchParams.set('radius_km', String(params.radius_km));
  // Bounding box
  if (params?.north !== undefined) searchParams.set('north', String(params.north));
  if (params?.south !== undefined) searchParams.set('south', String(params.south));
  if (params?.east !== undefined) searchParams.set('east', String(params.east));
  if (params?.west !== undefined) searchParams.set('west', String(params.west));

  const query = searchParams.toString();
  return api.get(`social/map/sightings${query ? `?${query}` : ''}`).json<MapSightingsResponse>();
}

// Types for species autocomplete
export interface MapSpecies {
  id: number;
  common_name: string;
  scientific_name: string;
  sighting_count: number;
}

export interface MapSpeciesResponse {
  species: MapSpecies[];
}

// Get species list for map filter autocomplete
export async function getMapSpecies(search?: string): Promise<MapSpeciesResponse> {
  const searchParams = new URLSearchParams();
  if (search) searchParams.set('search', search);
  const query = searchParams.toString();
  return api.get(`social/map/species${query ? `?${query}` : ''}`).json<MapSpeciesResponse>();
}

// Types for location search (Nominatim)
export interface LocationResult {
  place_id: number;
  name: string;
  display_name: string;
  short_name: string;
  lat: number;
  lon: number;
  type: string;
  address: {
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface LocationSearchResponse {
  locations: LocationResult[];
}

// Search for locations using Nominatim
export async function searchLocations(q: string, limit: number = 5): Promise<LocationSearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', q);
  searchParams.set('limit', String(limit));
  return api.get(`location/search?${searchParams.toString()}`).json<LocationSearchResponse>();
}

// Types for hotspots
export interface MapHotspot {
  location_name: string;
  country_code: string | null;
  state_region: string | null;
  lat: number;
  lon: number;
  sighting_count: number;
  species_count: number;
  observer_count: number;
  latest_sighting: string;
  time_ago: string;
}

export interface MapHotspotsResponse {
  hotspots: MapHotspot[];
  days: number;
}

// Get birding hotspots
export async function getMapHotspots(days: number = 30, limit: number = 20): Promise<MapHotspotsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('days', String(days));
  searchParams.set('limit', String(limit));
  return api.get(`social/map/hotspots?${searchParams.toString()}`).json<MapHotspotsResponse>();
}

// Types for recent sightings summary
export interface RecentSightingsResponse {
  count: number;
  bounds: {
    north: number | null;
    south: number | null;
    east: number | null;
    west: number | null;
  } | null;
  species_count: number;
  observer_count: number;
  hours: number;
}

// Get recent sightings summary
export async function getRecentSightingsSummary(hours: number = 24): Promise<RecentSightingsResponse> {
  return api.get(`social/map/recent?hours=${hours}`).json<RecentSightingsResponse>();
}

// Types for user search on map
export interface MapUser {
  id: number;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
  sighting_count: number;
}

export interface MapUsersResponse {
  users: MapUser[];
}

// Search users for map filter
export async function getMapUsers(search?: string): Promise<MapUsersResponse> {
  const searchParams = new URLSearchParams();
  if (search) searchParams.set('search', search);
  const query = searchParams.toString();
  return api.get(`social/map/users${query ? `?${query}` : ''}`).json<MapUsersResponse>();
}

// Types for unified map search
export interface UnifiedSearchResult {
  species: MapSpecies[];
  users: MapUser[];
  locations: Array<{
    location_name: string;
    state_region: string | null;
    country_code: string | null;
    lat: number;
    lon: number;
    sighting_count: number;
  }>;
}

// Unified search across species, users, and locations
export async function searchMapUnified(q: string, limit: number = 5): Promise<UnifiedSearchResult> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', q);
  searchParams.set('limit', String(limit));
  return api.get(`social/map/search?${searchParams.toString()}`).json<UnifiedSearchResult>();
}
