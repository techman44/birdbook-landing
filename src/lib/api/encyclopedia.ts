import { api, API_BASE } from './client';

/**
 * Species data from the encyclopedia
 */
export interface Species {
  id: number;
  common_name: string;
  scientific_name: string;
  family: string;
  order_name?: string;
  species_code?: string;
  conservation_status?: string;
  key_features?: string[];
  habitat?: string;
  distribution?: string;
  size_info?: string;
  regions?: string[];
  habitat_types?: string[];
  photo_count?: number;
  thumbnail_url?: string | null;

  // Extended detail fields
  diet?: string;
  behavior?: string;
  breeding_info?: string;
  calls_vocalizations?: string;
  migration_patterns?: string;
  interesting_facts?: string[];
  indigenous_significance?: string;
  similar_species?: Array<{
    name: string;
    differences: string;
  }>;
  population_trends?: string;
}

/**
 * Encyclopedia photo from community submissions
 */
export interface EncyclopediaPhoto {
  id: number;
  identification_id?: number;
  image_path: string;
  vote_score: number;
  created_at: string;
  photographer?: string;
  photographer_username?: string;
  photographer_credit?: string;
  ai_confidence?: number;
  confidence?: number;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  url?: string;
  rotation_degrees?: number; // Image rotation (0, 90, 180, 270)
}

/**
 * Filter options for encyclopedia browsing
 */
export interface FilterOptions {
  families: Array<{ family: string; count: number }>;
  regions: Array<{ region: string; count: number }>;
  habitats: Array<{ habitat: string; count: number }>;
  conservation_statuses: Array<{ status: string; count: number }>;
}

/**
 * Encyclopedia statistics
 */
export interface EncyclopediaStats {
  total_species: number;
  species_with_identifications: number;
  total_photos: number;
  species_with_photos: number;
}

/**
 * Search parameters for species
 */
export interface SpeciesSearchParams {
  q?: string;
  family?: string;
  region?: string;
  habitat?: string;
  letter?: string;
  page?: number;
  limit?: number;
}

/**
 * Search response
 */
export interface SpeciesSearchResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  results: Species[];
}

/**
 * Media response
 */
export interface SpeciesMediaResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  photos: EncyclopediaPhoto[];
}

/**
 * Search species in the encyclopedia
 */
export async function searchSpecies(params: SpeciesSearchParams = {}): Promise<SpeciesSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set('q', params.q);
  if (params.family) searchParams.set('family', params.family);
  if (params.region) searchParams.set('region', params.region);
  if (params.habitat) searchParams.set('habitat', params.habitat);
  if (params.letter) searchParams.set('letter', params.letter);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return api.get(`encyclopedia/species${query ? `?${query}` : ''}`).json<SpeciesSearchResponse>();
}

/**
 * Semantic search — natural-language description matched against species
 * profile embeddings (pgvector). Returns the same Species item shape plus a
 * similarity score.
 */
export async function semanticSearchSpecies(
  q: string,
  limit = 20
): Promise<{ results: (Species & { similarity: number })[] }> {
  return api
    .get(`encyclopedia/semantic-search?q=${encodeURIComponent(q)}&limit=${limit}`)
    .json<{ results: (Species & { similarity: number })[] }>();
}

/**
 * Get species detail by ID
 */
export async function getSpeciesDetail(speciesId: number): Promise<Species> {
  return api.get(`encyclopedia/species/${speciesId}`).json<Species>();
}

/**
 * Get species by slug (common_name formatted as slug)
 */
export async function getSpeciesBySlug(slug: string): Promise<Species | null> {
  // First search by the slug converted back to name
  const name = slug.replace(/-/g, ' ');
  const response = await searchSpecies({ q: name, limit: 10 });

  // Find exact match
  const exactMatch = response.results.find(s =>
    s.common_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug
  );

  if (exactMatch) {
    return getSpeciesDetail(exactMatch.id);
  }

  // Fallback to first result if close match
  if (response.results.length > 0) {
    return getSpeciesDetail(response.results[0].id);
  }

  return null;
}

/**
 * Get media/photos for a species
 */
export async function getSpeciesMedia(
  speciesId: number,
  page: number = 1,
  limit: number = 24
): Promise<SpeciesMediaResponse> {
  return api.get(`encyclopedia/species/${speciesId}/media?page=${page}&limit=${limit}`).json<SpeciesMediaResponse>();
}

/**
 * Get community photos for a species (includes auto-linked identifications)
 */
export async function getCommunityPhotos(
  speciesId: number,
  limit: number = 20
): Promise<{
  species_id: number;
  species_name: string;
  scientific_name: string;
  total_photos: number;
  photos: EncyclopediaPhoto[];
}> {
  return api.get(`encyclopedia/species/${speciesId}/community-photos?limit=${limit}`).json();
}

/**
 * Get filter options for encyclopedia
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  return api.get('encyclopedia/filters').json<FilterOptions>();
}

/**
 * Get encyclopedia statistics
 */
export async function getEncyclopediaStats(): Promise<EncyclopediaStats> {
  return api.get('encyclopedia/stats').json<EncyclopediaStats>();
}

/**
 * Submit a photo to the encyclopedia
 */
export async function submitPhotoToEncyclopedia(
  speciesId: number,
  identificationId: number
): Promise<{
  success: boolean;
  media_id: number;
  status: string;
  message: string;
}> {
  return api.post(`encyclopedia/species/${speciesId}/media/submit?identification_id=${identificationId}`).json();
}

/**
 * Match a species name to encyclopedia entry
 */
export async function matchSpeciesByName(name: string): Promise<{
  matched: boolean;
  species_id?: number;
  common_name?: string;
  scientific_name?: string;
  bird_info?: Record<string, unknown>;
}> {
  return api.get(`encyclopedia/match-species?name=${encodeURIComponent(name)}`).json();
}

/**
 * Get image URL for encyclopedia media
 */
export function getMediaImageUrl(mediaId: number): string {
  return `${API_BASE}/encyclopedia/media/${mediaId}/image`;
}

/**
 * Get image URL for a community photo (by identification_id)
 * Works for both encyclopedia_media and direct identifications
 */
export function getCommunityPhotoUrl(photo: EncyclopediaPhoto & { media_id?: number | null }): string {
  // If it has a media_id (from encyclopedia_media table), use that endpoint
  const mediaId = (photo as { media_id?: number | null }).media_id;
  if (mediaId && mediaId > 0) {
    return `${API_BASE}/encyclopedia/media/${mediaId}/image`;
  }
  // Otherwise use the community photo endpoint with identification_id
  if (photo.identification_id) {
    return `${API_BASE}/encyclopedia/community-photo/${photo.identification_id}/image`;
  }
  // Fallback - shouldn't happen
  return '';
}

/**
 * Format region name (e.g., "eastern_australia" -> "Eastern Australia")
 */
export function formatRegion(region: string): string {
  return region
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format habitat name
 */
export function formatHabitat(habitat: string): string {
  return habitat.charAt(0).toUpperCase() + habitat.slice(1);
}

/**
 * Get conservation status code (e.g., "LC" from "LC (Least Concern)")
 */
export function getConservationCode(status: string | null | undefined): string {
  if (!status) return '';

  // Match common IUCN codes at start
  const match = status.match(/^(EX|EW|CR|EN|VU|NT|LC|DD|NE)/i);
  if (match) return match[1].toUpperCase();

  // Try to extract from parentheses
  const parenMatch = status.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const text = parenMatch[1].toLowerCase();
    if (text.includes('least concern')) return 'LC';
    if (text.includes('near threatened')) return 'NT';
    if (text.includes('vulnerable')) return 'VU';
    if (text.includes('endangered')) return 'EN';
    if (text.includes('critically endangered')) return 'CR';
    if (text.includes('extinct in the wild')) return 'EW';
    if (text.includes('extinct')) return 'EX';
    if (text.includes('data deficient')) return 'DD';
  }

  // Last resort
  if (status.length <= 4) return status.toUpperCase();
  return status.substring(0, 3).toUpperCase();
}

/**
 * Get conservation status color classes
 */
export function getConservationColorClasses(status: string | null | undefined): string {
  if (!status) return 'bg-gray-500 text-white';

  const statusLower = status.toLowerCase();

  if (statusLower.includes('extinct')) return 'bg-black text-white';
  if (statusLower.includes('critical')) return 'bg-red-600 text-white';
  if (statusLower.includes('endangered')) return 'bg-red-500 text-white';
  if (statusLower.includes('vulnerable')) return 'bg-orange-500 text-white';
  if (statusLower.includes('near threatened')) return 'bg-yellow-500 text-white';
  if (statusLower.includes('least concern')) return 'bg-green-500 text-white';

  return 'bg-gray-500 text-white';
}

/**
 * Create species slug from common name
 */
export function createSpeciesSlug(commonName: string): string {
  return commonName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
