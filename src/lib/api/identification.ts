import { api, API_BASE } from './client';

// EXIF extraction types
export interface ExifData {
  latitude: number | null;
  longitude: number | null;
  camera_body: string | null;
  lens: string | null;
  focal_length: string | null;
  aperture: string | null;
  iso: string | null;
  shutter_speed: string | null;
  date_taken: string | null;
}

export async function extractExif(file: File): Promise<ExifData> {
  const formData = new FormData();
  formData.append('file', file);

  // This endpoint doesn't require auth - send without Authorization header
  const response = await fetch(
    `${API_BASE}/equipment/extract-exif`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    // Return empty data on error instead of throwing
    return {
      latitude: null,
      longitude: null,
      camera_body: null,
      lens: null,
      focal_length: null,
      aperture: null,
      iso: null,
      shutter_speed: null,
      date_taken: null,
    };
  }

  return response.json();
}

// Location search using Nominatim
export interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export async function searchLocation(query: string): Promise<LocationResult[]> {
  if (query.length < 3) return [];

  try {
    // Use backend location API which proxies to local Nominatim
    const response = await fetch(
      `${API_BASE}/location/search?q=${encodeURIComponent(query)}&limit=5`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    // Transform backend response to match expected format
    return (data.locations || []).map((loc: { lat: number; lon: number; display_name: string }) => ({
      display_name: loc.display_name,
      lat: String(loc.lat),
      lon: String(loc.lon),
    }));
  } catch (error) {
    console.warn('Location search failed:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    // Use backend location API which proxies to local Nominatim
    const response = await fetch(
      `${API_BASE}/location/reverse?lat=${lat}&lon=${lon}`
    );

    if (!response.ok) {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    const data = await response.json();
    return data.location_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

export interface IdentificationOption {
  species: string;
  confidence: number;
  reasoning: string;
}

// Multi-bird detection (generic detector contract — boxes normalized 0-1)
export interface BirdDetection {
  box: [number, number, number, number]; // [x1, y1, x2, y2], x1<x2, y1<y2
  confidence: number;
}

export interface DetectionsResult {
  detections: BirdDetection[];
  detector: string; // e.g. "qwen-grounding"
}

export interface IdentificationResult {
  id: number;
  status: 'analyzing' | 'verifying' | 'complete' | 'failed' | 'uploaded';
  status_message?: string;
  species?: string;
  confidence?: number;
  reasoning?: string;
  options?: IdentificationOption[];
  consensus_species?: string;
  consensus_confidence?: number;
  model_results?: Array<{
    model?: string;
    top_prediction: string;
    confidence: number;
    reasoning?: string;
    region?: [number, number, number, number]; // set for per-bird region IDs
    options?: IdentificationOption[];
  }>;
  detections?: DetectionsResult | null;
  bird_info?: {
    habitat?: string;
    distribution?: string;
    size?: string;
    diet?: string;
    behavior?: string;
    conservation_status?: string;
    breeding_info?: string;
    calls_vocalizations?: string;
    migration_patterns?: string;
    interesting_facts?: string;
    indigenous_significance?: string;
    similar_species?: string;
    population_trends?: string;
  };
  latitude?: number;
  longitude?: number;
  location_name?: string;
  created_at: string;
  verified_at?: string;
  image_path: string;
}

export interface UploadOptions {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  aiMode?: 'n8n_ai' | 'full_ai' | 'none';
  cameraBody?: string;
  lens?: string;
}

export async function uploadImage(
  file: File,
  options: UploadOptions = {}
): Promise<IdentificationResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (options.latitude !== undefined) {
    formData.append('latitude', options.latitude.toString());
  }
  if (options.longitude !== undefined) {
    formData.append('longitude', options.longitude.toString());
  }
  if (options.locationName) {
    formData.append('location_name', options.locationName);
  }
  if (options.aiMode) {
    formData.append('ai_mode', options.aiMode);
  }
  if (options.cameraBody) {
    formData.append('camera_body', options.cameraBody);
  }
  if (options.lens) {
    formData.append('lens', options.lens);
  }

  // Use fetch directly for FormData (ky has issues with FormData in some cases)
  // Import auth store to get token properly
  const { useAuthStore } = await import('../stores/auth-store');
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    throw new Error('You must be logged in to upload images');
  }

  const response = await fetch(
    `${API_BASE}/identify/upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

export async function getIdentificationStatus(id: number): Promise<IdentificationResult> {
  return api.get(`identify/status/${id}`).json<IdentificationResult>();
}

export async function getIdentification(id: number): Promise<IdentificationResult> {
  return api.get(`identify/${id}`).json<IdentificationResult>();
}

// Result of a re-identify run: the AI options are returned WITHOUT being
// applied to the record. The user picks one via selectSpecies().
export interface ReIdentifyResult {
  id: number;
  options: IdentificationOption[];
  species: string;
  confidence: number;
  reasoning: string;
  consensus_species?: string;
  applied: boolean;
}

export async function reIdentify(
  id: number | string,
  possiblyIncorrect: boolean = false,
  suggestedSpecies?: string
): Promise<ReIdentifyResult> {
  const params = new URLSearchParams();
  if (possiblyIncorrect) params.set('possibly_incorrect', 'true');
  if (suggestedSpecies) params.set('suggested_species', suggestedSpecies);

  const query = params.toString();
  return api
    .post(`identify/re-identify/${id}${query ? `?${query}` : ''}`)
    .json<ReIdentifyResult>();
}

// Apply a user-selected species to an identification (after re-identify, or
// a fully manual ID). Accepts numeric id or public_id.
export interface SelectSpeciesPayload {
  species: string;
  confidence?: number | null;
  source: 'ai_option' | 'manual';
}

export interface SelectSpeciesResult {
  success: boolean;
  identification_id: number;
  species: string;
  confidence?: number | null;
  source: string;
  species_id?: number | null;
  applied: boolean;
}

export async function selectSpecies(
  id: number | string,
  payload: SelectSpeciesPayload
): Promise<SelectSpeciesResult> {
  return api
    .post(`identify/${id}/select-species`, { json: payload })
    .json<SelectSpeciesResult>();
}

// Identify a single bird within a multi-bird photo by its bounding box
// (normalized 0-1). The backend crops the region and runs the AI on it.
export interface RegionIdentifyResult {
  identification_id: number;
  options: IdentificationOption[];
  species: string;
  confidence: number;
  reasoning: string;
  region: [number, number, number, number];
  sighting_species_recorded: boolean;
}

export async function identifyRegion(
  id: number | string,
  box: [number, number, number, number]
): Promise<RegionIdentifyResult> {
  return api
    .post(`identify/${id}/identify-region`, { json: { box }, timeout: 120000 })
    .json<RegionIdentifyResult>();
}

export async function deleteIdentification(id: number): Promise<void> {
  await api.delete(`identify/${id}`);
}

// Equipment info attached to an identification
export interface EquipmentInfo {
  id?: number;
  type: string;
  raw_name: string;
  brand?: string;
  model?: string;
  full_name?: string;
  specs?: Record<string, unknown>;
  product_image_url?: string;
}

// Full detail response with EXIF and equipment
export interface IdentificationDetail extends IdentificationResult {
  public_id?: string; // URL-safe opaque identifier for shareable links
  exif_data?: {
    camera_body?: string;
    lens?: string;
    focal_length?: string;
    aperture?: string;
    iso?: string;
    shutter_speed?: string;
    date_taken?: string;
  };
  has_original?: boolean;
  original_format?: string;
  original_filename?: string;
  equipment?: EquipmentInfo[];
  species_id?: number;
  identified_at?: string;
  verified_at?: string;
  encyclopedia_opt_out?: boolean;
  rotation_degrees?: number; // Image rotation (0, 90, 180, 270)
}

export async function getIdentificationDetail(id: number | string): Promise<IdentificationDetail> {
  // Backend accepts a numeric id or a 16-char opaque public_id.
  return api.get(`identify/detail/${id}`).json<IdentificationDetail>();
}

export function getImageUrl(identificationId: number, token: string): string {
  return `${API_BASE}/identify/image/${identificationId}?token=${token}`;
}

export function getConfidenceLevel(confidence: number): {
  label: string;
  text: string;
  color: string;
  bgColor: string;
} {
  if (confidence >= 0.8) {
    return {
      label: 'HIGH',
      text: 'Strong match',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  } else if (confidence >= 0.5) {
    return {
      label: 'MEDIUM',
      text: 'Possible match',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    };
  } else {
    return {
      label: 'LOW',
      text: 'Weak match',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    };
  }
}

// My Birds API
export interface MyBirdsSighting {
  id: number;
  identification_id: number;
  public_id?: string; // URL-safe opaque identifier for shareable links
  common_name: string;
  scientific_name?: string;
  species_id?: number;
  created_at: string;
  location_name?: string;
  display_lat?: number;
  display_lon?: number;
  confidence_score?: number;
  is_rare: boolean;
  is_life_bird: boolean;
  conservation_status?: string;
  rotation_degrees?: number; // Image rotation (0, 90, 180, 270)
  image_path?: string; // Direct path to the image file
  media_type?: 'photo' | 'audio'; // Discriminates photo vs audio identifications
  audio_url?: string; // Direct path to the audio file (audio identifications)
}

export interface MyBirdsResponse {
  sightings: MyBirdsSighting[];
  total: number;
  has_more: boolean;
}

export async function getMyBirds(page: number = 1, limit: number = 24): Promise<MyBirdsResponse> {
  return api.get(`identify/my-birds?page=${page}&limit=${limit}`).json<MyBirdsResponse>();
}

// Encyclopedia matching
export interface EncyclopediaMatch {
  matched: boolean;
  bird_info?: {
    common_name: string;
    scientific_name: string;
    family: string;
    conservation_status?: string;
    description?: string;
  };
  species_id?: number;
  scientific_name?: string;
}

export async function matchSpecies(name: string): Promise<EncyclopediaMatch> {
  return api
    .get(`encyclopedia/match-species?name=${encodeURIComponent(name)}`)
    .json<EncyclopediaMatch>();
}

// Update identification metadata (location, camera equipment, privacy, rotation)
export interface MetadataUpdate {
  latitude?: number;
  longitude?: number;
  location_name?: string;
  camera_body?: string;
  lens?: string;
  iso?: string;
  aperture?: string;
  shutter_speed?: string;
  focal_length?: string;
  date_taken?: string;
  encyclopedia_opt_out?: boolean;
  rotation_degrees?: number; // 0, 90, 180, or 270
}

export async function updateIdentificationMetadata(
  id: number,
  data: MetadataUpdate
): Promise<{ success: boolean; message: string; updated_fields: string[] }> {
  return api
    .patch(`identify/${id}/metadata`, { json: data })
    .json<{ success: boolean; message: string; updated_fields: string[] }>();
}
