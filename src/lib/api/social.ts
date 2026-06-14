import { api, API_BASE } from './client';

/**
 * EXIF Data extracted from photos
 * This contains camera settings and metadata from the original image
 */
export interface ExifData {
  // Camera & Lens
  camera_make?: string;
  camera_model?: string;
  lens_make?: string;
  lens_model?: string;

  // Capture settings
  focal_length?: string;
  aperture?: string;
  shutter_speed?: string;
  iso?: number;
  exposure_compensation?: string;
  metering_mode?: string;
  flash?: string;
  white_balance?: string;

  // Image properties
  image_width?: number;
  image_height?: number;
  orientation?: number;

  // Date/Time
  date_taken?: string;
  date_original?: string;

  // GPS (if embedded in image)
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;

  // Software
  software?: string;

  // Raw data for any additional fields
  [key: string]: unknown;
}

/**
 * Equipment information linked to an identification
 */
export interface Equipment {
  id: number;
  equipment_type: 'camera_body' | 'lens' | 'extender' | 'tripod' | 'filter';
  brand: string;
  model: string;
  full_name: string;
  specs?: Record<string, unknown>;
  raw_name?: string; // Original EXIF name if not in database
}

/**
 * Unified Sighting Package
 *
 * This is the SINGLE SOURCE OF TRUTH for bird sighting data.
 * All views (Feed, My Birds, Groups, Encyclopedia, Map, etc.)
 * should use this same interface.
 *
 * Supports both photo and audio identifications.
 */
export interface Sighting {
  // === Core Sighting Data ===
  id: number;
  public_id: string;
  caption: string | null;
  visibility: 'public' | 'followers' | 'private';
  is_rare: boolean;
  is_life_bird: boolean;
  comment_count: number;
  created_at: string;
  observed_at?: string;
  time_ago: string;

  // === Location Data ===
  location_name: string | null;
  display_lat: number | null;   // Fuzzy location for privacy
  display_lon: number | null;   // Fuzzy location for privacy
  location_precision?: 'exact' | 'approximate' | 'hidden';

  // === User Data ===
  user_id: number;
  username: string;
  profile_photo_url: string | null;

  // === Species Data ===
  species_id?: number | null;
  common_name: string;
  scientific_name: string | null;
  family: string | null;
  conservation_status: string | null;

  // === Photo Identification Data ===
  identification_id: number;
  image_path: string;
  confidence_score: number;
  exif_data?: ExifData | null;        // Camera settings and metadata
  has_original?: boolean;              // Whether full-res original is available
  original_format?: string | null;     // Original file format (RAW, etc.)
  rotation_degrees?: number;           // Image rotation (0, 90, 180, 270)

  // === Multi-bird detection (qwen-grounding) — present when ≥1 birds were boxed.
  // Shape matches the identify flow's DetectionsResult; the feed overlays
  // numbered indicators when there are ≥2 birds. ===
  detections?: {
    detections: Array<{ box: [number, number, number, number]; confidence: number }>;
    detector: string;
  } | null;

  // === Media type discriminator ('photo' for image posts, 'audio' for bird-call posts) ===
  media_type?: 'photo' | 'audio' | null;

  // === Audio Identification Data (for audio sightings) ===
  audio_identification_id?: number | null;
  audio_path?: string | null;
  audio_url?: string | null;       // /api/media URL for the stored audio file
  audio_duration?: number | null;
  audio_format?: string | null;
  // BirdNET per-segment detections for an audio recording (multiple species/calls).
  audio_predictions?: Array<{
    common_name?: string;
    scientific_name?: string;
    confidence?: number;
    start_time?: number;
    end_time?: number;
  }> | null;

  // === Equipment Data ===
  equipment?: Equipment[];             // Camera body, lens, etc.

  // === Social Engagement ===
  love_count: number;
  seen_too_count: number;
  view_count: number;
  user_loved: boolean;
  user_seen_too: boolean;
  reaction_count?: number;
  share_count?: number;

  // === Groups ===
  shared_groups: Array<{ id: number; name: string; slug: string }>;

  // === Media (for multi-media sightings) ===
  media?: Array<{
    id: number;
    media_type: 'image' | 'audio';
    media_id: number;
    display_order: number;
    is_primary: boolean;
    media_caption?: string | null;
  }>;
}

export interface FeedResponse {
  page: number;
  limit: number;
  sightings: Sighting[];
  has_more: boolean;
}

export interface FeedParams {
  page?: number;
  limit?: number;
  filter?: 'following' | 'discover' | 'groups' | 'nearby' | 'rare';
  user_id?: number;
  username?: string;
  camera?: string;
  lens?: string;
}

export async function getFeed(params: FeedParams = {}): Promise<FeedResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.filter) searchParams.set('filter', params.filter);
  if (params.user_id) searchParams.set('user_id', params.user_id.toString());
  if (params.username) searchParams.set('username', params.username);
  if (params.camera) searchParams.set('camera', params.camera);
  if (params.lens) searchParams.set('lens', params.lens);

  const query = searchParams.toString();
  return api.get(`social/feed${query ? `?${query}` : ''}`).json<FeedResponse>();
}

export type ReactionType = 'love' | 'seen_too';

export async function addReaction(
  targetType: 'sighting' | 'comment',
  targetId: number,
  reactionType: ReactionType
): Promise<void> {
  const params = new URLSearchParams({
    target_type: targetType,
    target_id: targetId.toString(),
    reaction_type: reactionType,
  });
  await api.post(`social/reactions/add?${params}`);
}

export async function removeReaction(
  targetType: 'sighting' | 'comment',
  targetId: number,
  reactionType: ReactionType
): Promise<void> {
  const params = new URLSearchParams({
    target_type: targetType,
    target_id: targetId.toString(),
    reaction_type: reactionType,
  });
  await api.delete(`social/reactions/remove?${params}`);
}

export async function addDiscussionReaction(
  discussionId: number,
  reactionType: ReactionType
): Promise<void> {
  const params = new URLSearchParams({ reaction_type: reactionType });
  await api.post(`social/discussions/${discussionId}/react?${params}`);
}

export async function removeDiscussionReaction(
  discussionId: number,
  reactionType: ReactionType
): Promise<void> {
  const params = new URLSearchParams({ reaction_type: reactionType });
  await api.delete(`social/discussions/${discussionId}/react?${params}`);
}

export interface Comment {
  id: number;
  user_id: number;
  username: string;
  profile_photo_url: string | null;
  content: string;
  created_at: string;
  time_ago: string;
  is_edited: boolean;
  reaction_count: number;
  reply_count: number;
  parent_comment_id: number | null;
  depth?: number;
  replies: Comment[];
}

export async function getComments(sightingId: number): Promise<Comment[]> {
  const response = await api.get(`social/sightings/${sightingId}/comments`).json<{ comments: Comment[] }>();
  return response.comments;
}

export async function addComment(
  sightingId: number,
  content: string,
  parentCommentId?: number
): Promise<Comment> {
  return api.post(`social/comments/add`, {
    json: {
      target_type: 'sighting',
      target_id: sightingId,
      content,
      parent_comment_id: parentCommentId || null
    },
  }).json<Comment>();
}

export async function getDiscussionComments(discussionId: number): Promise<Comment[]> {
  const response = await api.get(`social/discussions/${discussionId}/comments`)
    .json<{ comments: Array<Partial<Comment>> }>();
  // Normalize: discussion comments may be missing is_edited / reply_count fields
  const normalize = (c: Partial<Comment>): Comment => ({
    is_edited: false,
    reply_count: c.replies?.length ?? 0,
    replies: (c.replies ?? []).map(normalize),
    ...c,
  } as Comment);
  return (response.comments || []).map(normalize);
}

export async function addDiscussionComment(
  discussionId: number,
  content: string,
  parentCommentId?: number
): Promise<Comment> {
  const result = await api.post(`social/discussions/${discussionId}/comments`, {
    json: {
      content,
      parent_comment_id: parentCommentId || null,
    },
  }).json<Partial<Comment>>();
  return {
    is_edited: false,
    reply_count: 0,
    replies: [],
    reaction_count: 0,
    parent_comment_id: parentCommentId ?? null,
    ...result,
  } as Comment;
}

export async function updateComment(
  commentId: number,
  content: string
): Promise<{ success: boolean; message: string; comment: Comment }> {
  return api.patch(`social/comments/${commentId}`, {
    json: { content },
  }).json<{ success: boolean; message: string; comment: Comment }>();
}

export async function deleteComment(
  commentId: number
): Promise<{ success: boolean; message: string }> {
  return api.delete(`social/comments/${commentId}`).json<{ success: boolean; message: string }>();
}

export async function updateDiscussionComment(
  commentId: number,
  content: string
): Promise<{ success: boolean }> {
  return api.patch(`social/discussions/comments/${commentId}`, {
    json: { content },
  }).json<{ success: boolean }>();
}

export async function deleteDiscussionComment(
  commentId: number
): Promise<{ success: boolean }> {
  return api.delete(`social/discussions/comments/${commentId}`).json<{ success: boolean }>();
}

// Share sighting types
export interface ShareSightingRequest {
  identification_id: number;
  caption?: string;
  location_name?: string;
  exact_lat?: number;
  exact_lon?: number;
  share_exact_location?: boolean;
  visibility?: 'public' | 'followers' | 'private';
  group_ids?: string; // Comma-separated group IDs
}

export interface ShareSightingResponse {
  success: boolean;
  sighting: {
    id: number;
    identification_id: number;
    user_id: number;
    species_id: number | null;
    caption: string;
    visibility: string;
    is_rare: boolean;
    is_life_bird: boolean;
    created_at: string;
  };
  message: string;
}

export async function shareSighting(data: ShareSightingRequest): Promise<ShareSightingResponse> {
  // Use JSON as the backend expects it (BaseModel)
  const token = typeof window !== 'undefined' && localStorage.getItem('birdbook-auth')
    ? JSON.parse(localStorage.getItem('birdbook-auth')!).state?.accessToken
    : null;

  const body: Record<string, unknown> = {
    identification_id: data.identification_id,
    visibility: data.visibility || 'public',
  };

  if (data.caption) body.caption = data.caption;
  if (data.location_name) body.location_name = data.location_name;
  if (data.exact_lat !== undefined) body.exact_lat = data.exact_lat;
  if (data.exact_lon !== undefined) body.exact_lon = data.exact_lon;
  if (data.share_exact_location !== undefined) body.share_exact_location = data.share_exact_location;
  if (data.group_ids) body.group_ids = data.group_ids;

  const response = await fetch(
    `${API_BASE}/social/sightings/share`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to share sighting' }));
    throw new Error(error.detail || 'Failed to share sighting');
  }

  return response.json();
}

// Share audio sighting types
export interface ShareAudioSightingRequest {
  audio_identification_id: number;
  caption?: string;
  location_name?: string;
  exact_lat?: number;
  exact_lon?: number;
  share_exact_location?: boolean;
  visibility?: 'public' | 'followers' | 'private';
  group_ids?: string; // Comma-separated group IDs
}

export async function shareAudioSighting(data: ShareAudioSightingRequest): Promise<ShareSightingResponse> {
  const token = typeof window !== 'undefined' && localStorage.getItem('birdbook-auth')
    ? JSON.parse(localStorage.getItem('birdbook-auth')!).state?.accessToken
    : null;

  const body: Record<string, unknown> = {
    audio_identification_id: data.audio_identification_id,
    visibility: data.visibility || 'public',
  };

  if (data.caption) body.caption = data.caption;
  if (data.location_name) body.location_name = data.location_name;
  if (data.exact_lat !== undefined) body.exact_lat = data.exact_lat;
  if (data.exact_lon !== undefined) body.exact_lon = data.exact_lon;
  if (data.share_exact_location !== undefined) body.share_exact_location = data.share_exact_location;
  if (data.group_ids) body.group_ids = data.group_ids;

  const response = await fetch(
    `${API_BASE}/social/sightings/share-audio`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to share audio sighting' }));
    throw new Error(error.detail || 'Failed to share audio sighting');
  }

  return response.json();
}

// ============================================================================
// UNIFIED BIRD IDENTIFICATION API
// ============================================================================

/**
 * Input mode for bird identification
 */
export type IdentificationMode = 'photo' | 'audio' | 'text';

/**
 * AI analysis mode
 */
export type AIMode = 'quick' | 'detailed' | 'none';

/**
 * Unified Identification Request
 *
 * This is the SINGLE entry point for all bird identification requests.
 * Whether uploading a photo, audio recording, or text description,
 * use this unified interface.
 */
export interface IdentificationRequest {
  // === Input Type ===
  mode: IdentificationMode;

  // === File Input (for photo/audio) ===
  file?: File;

  // === Text Input (for text description) ===
  description?: string;

  // === Location (critical for accurate ID) ===
  latitude?: number;
  longitude?: number;
  location_name?: string;

  // === AI Configuration ===
  ai_mode?: AIMode;
  skip_ai?: boolean;

  // === Equipment (optional, for photo) ===
  camera_body?: string;
  lens?: string;

  // === Date/Time (optional, defaults to now) ===
  observed_at?: Date;
}

/**
 * Species prediction from AI models
 */
export interface SpeciesPrediction {
  species: string;
  scientific_name?: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Unified Identification Response
 *
 * The response from any identification request (photo/audio/text)
 * uses this same structure.
 */
export interface IdentificationResponse {
  // === Core Result ===
  id: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';

  // === Primary Species Match ===
  species: string;
  scientific_name?: string;
  confidence: number;
  reasoning?: string;

  // === Alternative Matches ===
  options: SpeciesPrediction[];

  // === Input Type ===
  mode: IdentificationMode;

  // === Media Reference ===
  image_path?: string;
  audio_path?: string;

  // === EXIF Data (for photos) ===
  exif_data?: ExifData | null;

  // === Equipment (if detected/provided) ===
  equipment?: Equipment[];

  // === Raw Response (for debugging) ===
  raw?: Record<string, unknown>;
}

/**
 * Unified Bird Identification Function
 *
 * This is the SINGLE API call for all bird identification.
 * Handles photo, audio, and text descriptions with a consistent interface.
 *
 * @example
 * // Photo identification
 * const result = await identifyBird({
 *   mode: 'photo',
 *   file: imageFile,
 *   latitude: -33.8688,
 *   longitude: 151.2093,
 *   location_name: 'Sydney, NSW',
 *   ai_mode: 'quick'
 * });
 *
 * @example
 * // Audio identification
 * const result = await identifyBird({
 *   mode: 'audio',
 *   file: audioFile,
 *   latitude: -33.8688,
 *   longitude: 151.2093
 * });
 *
 * @example
 * // Text description identification
 * const result = await identifyBird({
 *   mode: 'text',
 *   description: 'Small brown bird with red breast, seen near water',
 *   location_name: 'Melbourne, VIC'
 * });
 */
// Update Sighting
export interface UpdateSightingRequest {
  caption?: string | null;
  location_name?: string | null;
  is_rare?: boolean;
  is_life_bird?: boolean;
  visibility?: 'public' | 'followers' | 'private';
}

export async function updateSighting(
  sightingId: number,
  data: UpdateSightingRequest
): Promise<{ success: boolean; message: string }> {
  return api.patch(`social/sightings/${sightingId}`, {
    json: data,
  }).json<{ success: boolean; message: string }>();
}

export async function deleteSighting(sightingId: number): Promise<void> {
  await api.delete(`social/sightings/${sightingId}`);
}

export async function identifyBird(
  request: IdentificationRequest,
  token: string
): Promise<IdentificationResponse> {
  // Uses the dynamic API_BASE imported from client.ts

  if (!token) {
    throw new Error('Authentication token required');
  }

  // Validate inputs based on mode
  if (request.mode === 'photo' || request.mode === 'audio') {
    if (!request.file) {
      throw new Error(`No file provided for ${request.mode} identification`);
    }
  } else if (request.mode === 'text') {
    if (!request.description) {
      throw new Error('No description provided for text identification');
    }
  }

  const formData = new FormData();

  // Add file if present
  if (request.file) {
    formData.append('file', request.file);
  }

  // Add text description if present
  if (request.description) {
    formData.append('description', request.description);
  }

  // Location data - critical for accurate identification
  if (request.latitude && request.longitude) {
    formData.append('latitude', request.latitude.toString());
    formData.append('longitude', request.longitude.toString());
  }
  if (request.location_name) {
    formData.append('location_name', request.location_name);
  }

  // AI configuration
  if (request.skip_ai) {
    formData.append('skip_ai', 'true');
  } else if (request.ai_mode) {
    formData.append('ai_mode', request.ai_mode);
  }

  // Equipment metadata
  if (request.camera_body) {
    formData.append('camera_body', request.camera_body);
  }
  if (request.lens) {
    formData.append('lens', request.lens);
  }

  // Observed date/time
  if (request.observed_at) {
    formData.append('observed_at', request.observed_at.toISOString());
  }

  // Determine endpoint based on mode
  let endpoint: string;
  switch (request.mode) {
    case 'audio':
      endpoint = `${API_BASE}/identify/audio`;
      break;
    case 'text':
      endpoint = `${API_BASE}/identify/text`;
      break;
    case 'photo':
    default:
      endpoint = `${API_BASE}/identify/upload`;
      break;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Identification failed' }));
    throw new Error(error.detail || 'Identification failed');
  }

  const result = await response.json();

  // Normalize the response to unified format
  return {
    id: result.id || result.identification_id,
    status: result.status || 'complete',
    species: result.species || result.consensus_species || result.primary_species || 'Unknown',
    scientific_name: result.scientific_name || '',
    confidence: result.confidence || result.consensus_confidence || 0,
    reasoning: result.reasoning || null,
    mode: request.mode,
    options: result.options || (result.model_results || []).map((r: Record<string, unknown>) => ({
      species: r.top_prediction || r.species,
      scientific_name: r.scientific_name,
      confidence: r.confidence,
      reasoning: r.reasoning
    })),
    image_path: result.image_path,
    audio_path: result.audio_path,
    exif_data: result.exif_data,
    equipment: result.equipment,
    raw: result
  };
}

// ============================================================================
// SIGHTING DETAIL API
// ============================================================================

/**
 * Extended Sighting Detail for the sighting detail page
 * Includes all fields from Sighting plus additional detail-specific fields
 */
export interface SightingDetail extends Sighting {
  // Additional fields from the detail endpoint
  display_name?: string | null;
}

/**
 * Get a single sighting by ID or public_id with all details
 * Used for the public sighting detail page (/sighting/[id])
 * The backend handles both numeric IDs and public_id strings
 */
export async function getSighting(identifier: string | number): Promise<SightingDetail> {
  return api.get(`social/sightings/${identifier}`).json<SightingDetail>();
}

/**
 * View source types for analytics tracking
 * Per UNIFIED_MEDIA_PIPELINE.md Section 13
 */
export type ViewSource = 'feed' | 'profile' | 'group' | 'encyclopedia' | 'maps' | 'share_link' | 'lightbox' | 'discover' | 'event';

/**
 * Record a view on a sighting (for view count tracking)
 * This should be called when a user views the sighting detail page or opens the lightbox.
 * Deduplication: Same user can only count once per day per sighting (handled by backend).
 */
export async function recordSightingView(sightingId: number, viewSource?: ViewSource): Promise<void> {
  const formData = new FormData();
  if (viewSource) {
    formData.append('view_source', viewSource);
  }
  await api.post(`social/sightings/${sightingId}/view`, { body: formData });
}
