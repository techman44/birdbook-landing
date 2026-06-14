import { api } from './client';

// ============================================================================
// Types
// ============================================================================

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  is_admin: boolean;
  is_active: boolean;
  has_google_login: boolean;
  created_at: string | null;
  updated_at: string | null;
  identification_count: number;
  sighting_count: number;
}

export interface AdminUserDetail extends AdminUser {
  stats: {
    identifications: number;
    sightings: number;
    life_list_count: number;
    reactions: number;
    comments: number;
  };
}

export interface UsersListResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface Equipment {
  id: number;
  equipment_type: string;
  brand: string;
  model: string;
  full_name: string;
  specs: Record<string, unknown> | null;
  msrp_usd: number | null;
  affiliate_url: string | null;
  product_image_url: string | null;
  release_year: number | null;
  is_active: boolean;
  exif_aliases: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface EquipmentListResponse {
  equipment: Equipment[];
  total: number;
  limit: number;
  offset: number;
}

export interface Species {
  id: number;
  common_name: string;
  scientific_name: string;
  species_code: string | null;
  family: string | null;
  order_name: string | null;
  conservation_status: string | null;
  human_verified: boolean;
  needs_review: boolean;
  identification_count: number;
  created_at: string | null;
  last_updated: string | null;
}

export interface SpeciesDetail extends Species {
  alternative_names: string[];
  class_name: string | null;
  habitat: string | null;
  distribution: string | null;
  size_info: string | null;
  diet: string | null;
  behavior: string | null;
  breeding_info: string | null;
  calls_vocalizations: string | null;
  migration_patterns: string | null;
  interesting_facts: string | null;
  indigenous_significance: string | null;
  key_features: string[];
  regions: string[];
  habitat_types: string[];
  reasoning: string | null;
  similar_species: string | null;
  population_trends: string | null;
}

export interface SpeciesListResponse {
  species: Species[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthStatus {
  timestamp: string;
  services: {
    ml_server: ServiceHealth;
    audio_server: ServiceHealth;
    litellm_gateway?: ServiceHealth;
    database: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'offline' | 'not_configured' | 'error';
  url?: string | null;
  response_time_ms?: number;
  error?: string;
  device?: string;
  loaded_models?: string[];
  total_models?: number;
  species_count?: number;
  model?: string;
}

export interface WorkflowStats {
  timestamp: string;
  image_identification: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    verifying: number;
    success_rate: string;
  };
  audio_identification: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    birds_detected: number;
    success_rate: string;
  };
  social: {
    total_sightings: number;
    last_24h: number;
    last_7d: number;
  };
  totals?: {
    users: number;
    active_users: number;
    sightings: number;
    groups: number;
  };
}

export interface AdminSighting {
  id: number;
  public_id: string;
  caption: string | null;
  visibility: string;
  location_name: string | null;
  created_at: string | null;
  reaction_count: number;
  comment_count: number;
  user_id: number;
  username: string;
  species_name: string | null;
}

export interface AdminSightingsResponse {
  sightings: AdminSighting[];
  total: number;
  limit: number;
  offset: number;
}

export interface RecentActivity {
  activity: {
    type: 'image' | 'audio';
    id: number;
    user_id: number;
    species: string | null;
    status: string;
    created_at: string | null;
    completed_at?: string | null;
  }[];
}

export interface ContentReport {
  id: number;
  reporter_id: number;
  reporter_username: string;
  content_type: 'sighting' | 'comment' | 'group_post' | 'profile';
  content_id: number;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
}

export interface ReportsListResponse {
  reports: ContentReport[];
  total: number;
}

// ============================================================================
// User Management
// ============================================================================

export async function getUsers(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  is_active?: boolean;
  is_admin?: boolean;
}): Promise<UsersListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
  if (params?.is_admin !== undefined) searchParams.set('is_admin', String(params.is_admin));

  const query = searchParams.toString();
  return api.get(`admin/users${query ? `?${query}` : ''}`).json<UsersListResponse>();
}

export async function getUserDetail(userId: number): Promise<AdminUserDetail> {
  return api.get(`admin/users/${userId}`).json<AdminUserDetail>();
}

export async function updateUser(
  userId: number,
  data: {
    is_admin?: boolean;
    is_active?: boolean;
    username?: string;
    email?: string;
    display_name?: string;
    bio?: string;
  }
): Promise<{ status: string; id: number; username: string }> {
  return api.put(`admin/users/${userId}`, { json: data }).json();
}

export async function deactivateUser(userId: number): Promise<{ status: string; message: string }> {
  return api.post(`admin/users/${userId}/deactivate`).json();
}

export async function activateUser(userId: number): Promise<{ status: string; message: string }> {
  return api.post(`admin/users/${userId}/activate`).json();
}

export async function deleteUser(
  userId: number,
  confirm: boolean = false
): Promise<{ status: string; message: string; deleted_counts?: Record<string, number | string> }> {
  return api.delete(`admin/users/${userId}?confirm=${confirm}`).json();
}

// ============================================================================
// Equipment Management
// ============================================================================

export async function getEquipment(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  equipment_type?: string;
}): Promise<EquipmentListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.equipment_type) searchParams.set('equipment_type', params.equipment_type);

  const query = searchParams.toString();
  return api.get(`admin/equipment${query ? `?${query}` : ''}`).json<EquipmentListResponse>();
}

export async function createEquipment(data: {
  equipment_type: string;
  brand: string;
  model: string;
  full_name?: string;
  specs?: Record<string, unknown>;
  msrp_usd?: number;
  affiliate_url?: string;
  product_image_url?: string;
  release_year?: number;
  exif_aliases?: string[];
}): Promise<{ status: string; id: number; full_name: string }> {
  return api.post('admin/equipment', { json: data }).json();
}

export async function updateEquipment(
  equipmentId: number,
  data: Partial<{
    equipment_type: string;
    brand: string;
    model: string;
    full_name: string;
    specs: Record<string, unknown>;
    msrp_usd: number;
    affiliate_url: string;
    product_image_url: string;
    release_year: number;
    exif_aliases: string[];
    is_active: boolean;
  }>
): Promise<{ status: string; id: number; full_name: string }> {
  return api.put(`admin/equipment/${equipmentId}`, { json: data }).json();
}

export async function deleteEquipment(
  equipmentId: number
): Promise<{ status: string; message: string }> {
  return api.delete(`admin/equipment/${equipmentId}`).json();
}

// ============================================================================
// Species Management
// ============================================================================

export async function getSpeciesList(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  needs_review?: boolean;
}): Promise<SpeciesListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.needs_review !== undefined) searchParams.set('needs_review', String(params.needs_review));

  const query = searchParams.toString();
  return api.get(`admin/species${query ? `?${query}` : ''}`).json<SpeciesListResponse>();
}

export async function getSpeciesDetail(speciesId: number): Promise<SpeciesDetail> {
  return api.get(`admin/species/${speciesId}`).json<SpeciesDetail>();
}

export async function updateSpecies(
  speciesId: number,
  data: Partial<{
    common_name: string;
    scientific_name: string;
    species_code: string;
    alternative_names: string[];
    family: string;
    order_name: string;
    habitat: string;
    distribution: string;
    size_info: string;
    diet: string;
    behavior: string;
    conservation_status: string;
    breeding_info: string;
    calls_vocalizations: string;
    migration_patterns: string;
    interesting_facts: string;
    indigenous_significance: string;
    key_features: string[];
    regions: string[];
    habitat_types: string[];
    human_verified: boolean;
    needs_review: boolean;
  }>
): Promise<{ status: string; id: number; common_name: string }> {
  return api.put(`admin/species/${speciesId}`, { json: data }).json();
}

export async function deleteSpecies(
  speciesId: number
): Promise<{ status: string; message: string }> {
  return api.delete(`admin/species/${speciesId}`).json();
}

// ============================================================================
// System Health & Stats
// ============================================================================

export async function getSystemHealth(): Promise<HealthStatus> {
  return api.get('admin/health').json<HealthStatus>();
}

export async function getWorkflowStats(): Promise<WorkflowStats> {
  return api.get('admin/stats').json<WorkflowStats>();
}

export async function getRecentActivity(limit: number = 20): Promise<RecentActivity> {
  return api.get(`admin/recent-activity?limit=${limit}`).json<RecentActivity>();
}

// ============================================================================
// Content Moderation (Placeholder - implement these endpoints in backend)
// ============================================================================

export async function getContentReports(params?: {
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  limit?: number;
  offset?: number;
}): Promise<ReportsListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  return api.get(`admin/reports${query ? `?${query}` : ''}`).json<ReportsListResponse>();
}

export async function resolveReport(
  reportId: number,
  action: 'dismiss' | 'warn' | 'remove_content' | 'ban_user'
): Promise<{ status: string; message: string }> {
  return api.post(`admin/reports/${reportId}/resolve`, { json: { action } }).json();
}

// ============================================================================
// God Mode Actions
// ============================================================================

export async function getAdminSightings(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<AdminSightingsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return api.get(`admin/sightings${query ? `?${query}` : ''}`).json<AdminSightingsResponse>();
}

export async function deleteSighting(sightingId: number): Promise<{ status: string; message: string }> {
  return api.delete(`admin/sightings/${sightingId}`).json();
}

export async function deleteComment(commentId: number): Promise<{ status: string; message: string }> {
  return api.delete(`admin/comments/${commentId}`).json();
}

export async function deleteGroupPost(postId: number): Promise<{ status: string; message: string }> {
  return api.delete(`admin/group-posts/${postId}`).json();
}

export async function deleteGroup(groupId: number): Promise<{ status: string; message: string }> {
  return api.delete(`admin/groups/${groupId}`).json();
}
