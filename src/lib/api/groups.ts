import { api } from './client';
import type { Sighting } from './social';

export interface BirdingGroup {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  group_type: 'regional' | 'species_focus' | 'skill_level' | 'general';
  privacy: 'public' | 'private' | 'invite_only';
  region_name: string | null;
  member_count: number;
  created_at: string;
  is_owner: boolean;
  is_member: boolean;
  my_role: string | null;
  is_favourite: boolean;
}

export interface GroupsListResponse {
  groups: BirdingGroup[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface GroupDetail extends BirdingGroup {
  cover_image_url: string | null;
  owner_id: number;
  owner_username: string;
  settings: Record<string, unknown>;
}

export interface GroupMember {
  membership_id?: number;
  user_id: number;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
  role: string;
  joined_at: string;
  sighting_count: number;
  total_sightings?: number;
  total_species?: number;
  group_sightings?: number;
}

export interface GroupMembersResponse {
  members: GroupMember[];
  total: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
}

export interface GroupPost {
  id: number;
  group_id?: number;
  user_id: number;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
  // Post type - 'sighting' for shared sightings, or 'discussion'/'photo'/'audio' for discussions
  item_type?: 'sighting' | 'discussion';
  // The group_posts row id — needed for moderation actions (remove/restore).
  // For sightings this differs from `id` (the sighting id); for discussions
  // it differs from `id` (the discussion id).
  group_post_id?: number | null;
  post_type: 'discussion' | 'photo' | 'audio' | null;
  title: string | null;
  content: string;
  caption?: string | null;
  is_bird_content: boolean;
  species_name: string | null;
  common_name?: string | null;
  scientific_name?: string | null;
  family?: string | null;
  conservation_status?: string | null;
  location_name: string | null;
  location_precision?: 'exact' | 'approximate' | 'hidden';
  visibility?: 'public' | 'followers' | 'private';
  // Media attachments for discussions
  media_attachments: Array<{ path: string; type: string; original_name: string }> | null;
  audio_path: string | null;
  // Image path for sightings
  image_path: string | null;
  image_url: string | null;
  identification_id: number | null;
  public_id?: string | null;
  // Sighting-specific fields
  is_rare?: boolean;
  is_life_bird?: boolean;
  display_lat?: number;
  display_lon?: number;
  confidence_score?: number;
  rotation_degrees?: number; // Image rotation (0, 90, 180, 270)
  exif_data?: Record<string, unknown> | null;
  has_original?: boolean;
  original_format?: string | null;
  observed_at?: string | null;
  view_count?: number;
  shared_groups?: Array<{ id: number; name: string; slug: string }>;
  time_ago?: string;
  created_at: string;
  updated_at?: string;
  comment_count: number;
  reaction_count: number;
  love_count: number;
  seen_too_count: number;
  user_reacted: boolean;
  user_loved: boolean;
  user_seen_too: boolean;
}

export interface GroupPostsResponse {
  posts: GroupPost[];
  total: number;
  has_more: boolean;
}

export type GroupFilter = 'all' | 'my_groups' | 'suggested';

export async function getGroups(params?: {
  filter?: GroupFilter;
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<GroupsListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.filter) searchParams.set('filter', params.filter);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.per_page) searchParams.set('per_page', String(params.per_page));

  const query = searchParams.toString();
  return api.get(`social/groups/list${query ? `?${query}` : ''}`).json<GroupsListResponse>();
}

// All group API functions now use slug instead of numeric ID
export async function getGroupDetail(slug: string): Promise<GroupDetail> {
  return api.get(`social/groups/${slug}`).json<GroupDetail>();
}

export async function getGroupMembers(
  slug: string,
  limit?: number,
  page?: number,
  q?: string
): Promise<GroupMembersResponse> {
  const searchParams = new URLSearchParams();
  if (limit) searchParams.set('limit', String(limit));
  if (page) searchParams.set('page', String(page));
  if (q) searchParams.set('q', q);
  const query = searchParams.toString();
  return api.get(`social/groups/${slug}/members${query ? `?${query}` : ''}`).json<GroupMembersResponse>();
}

// ============================================================================
// Group moderation (admin/moderator tools)
// ============================================================================

export interface ModerationPost {
  id: number;
  post_type: 'sighting' | 'discussion';
  created_at: string;
  time_ago: string;
  is_removed: boolean;
  removal_reason: string | null;
  sighting_id: number | null;
  discussion_id: number | null;
  user_id: number;
  username: string;
  profile_photo_url: string | null;
  removed_by_username: string | null;
  summary: string | null;
}

export interface ModerationPostsResponse {
  page: number;
  limit: number;
  posts: ModerationPost[];
  has_more: boolean;
}

export async function getGroupModerationPosts(
  slug: string,
  page?: number,
  limit?: number
): Promise<ModerationPostsResponse> {
  const searchParams = new URLSearchParams();
  if (page) searchParams.set('page', String(page));
  if (limit) searchParams.set('limit', String(limit));
  const query = searchParams.toString();
  return api
    .get(`social/groups/${slug}/moderation/posts${query ? `?${query}` : ''}`)
    .json<ModerationPostsResponse>();
}

export async function removeGroupPost(
  slug: string,
  postId: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  return api
    .post(`social/groups/${slug}/posts/${postId}/remove`, { json: { reason: reason ?? '' } })
    .json();
}

export async function restoreGroupPost(
  slug: string,
  postId: number
): Promise<{ success: boolean; message: string }> {
  return api.post(`social/groups/${slug}/posts/${postId}/restore`).json();
}

export async function removeGroupMember(
  slug: string,
  userId: number
): Promise<{ success: boolean; message: string }> {
  return api.delete(`social/groups/${slug}/members/${userId}`).json();
}

export async function setGroupMemberRole(
  slug: string,
  userId: number,
  role: 'member' | 'moderator'
): Promise<{ success: boolean; message: string; role: string }> {
  return api.post(`social/groups/${slug}/members/${userId}/role`, { json: { role } }).json();
}

export async function getGroupPosts(
  slug: string,
  page?: number,
  perPage?: number,
  postType?: 'discussion' | 'photo' | 'audio'
): Promise<GroupPostsResponse> {
  const searchParams = new URLSearchParams();
  if (page) searchParams.set('page', String(page));
  if (perPage) searchParams.set('limit', String(perPage));
  if (postType) searchParams.set('post_type', postType);
  const query = searchParams.toString();
  // Use combined-feed endpoint which returns discussions, photos, and shared sightings
  return api.get(`social/groups/${slug}/combined-feed${query ? `?${query}` : ''}`).json<GroupPostsResponse>();
}

export async function joinGroup(slug: string): Promise<{ message: string }> {
  return api.post(`social/groups/${slug}/join`).json();
}

export async function leaveGroup(slug: string): Promise<{ message: string }> {
  return api.post(`social/groups/${slug}/leave`).json();
}

export async function toggleGroupFavourite(slug: string): Promise<{ is_favourite: boolean }> {
  return api.post(`social/groups/${slug}/favourite`).json();
}

export interface CreateGroupDiscussionData {
  post_type: 'discussion' | 'photo' | 'audio';
  title?: string;
  content?: string;
  is_bird_content: boolean;
  species_name?: string;
  location_name?: string;
  images?: File[];
  audio?: File;
}

export interface CreateDiscussionResponse {
  success: boolean;
  discussion_id: number;
  message: string;
}

export async function createGroupDiscussion(
  slug: string,
  data: CreateGroupDiscussionData
): Promise<CreateDiscussionResponse> {
  const formData = new FormData();
  formData.append('post_type', data.post_type);
  formData.append('is_bird_content', String(data.is_bird_content));

  if (data.title) formData.append('title', data.title);
  if (data.content) formData.append('content', data.content);

  // Bird content fields
  if (data.is_bird_content) {
    if (data.species_name) formData.append('species_name', data.species_name);
    if (data.location_name) formData.append('location_name', data.location_name);
  }

  // Attach images
  if (data.images && data.images.length > 0) {
    for (const image of data.images) {
      formData.append('images', image);
    }
  }

  // Attach audio
  if (data.audio) {
    formData.append('audio', data.audio);
  }

  return api.post(`social/groups/${slug}/discussions`, { body: formData }).json<CreateDiscussionResponse>();
}

// Delete a discussion post (author or group admin; backend soft-deletes)
export async function deleteGroupDiscussion(
  discussionId: number
): Promise<{ success: boolean; message: string }> {
  return api.delete(`social/discussions/${discussionId}`).json();
}

// Legacy function for backward compatibility (simple text-only posts)
export async function createGroupPost(
  slug: string,
  data: { content: string; identification_id?: number }
): Promise<CreateDiscussionResponse> {
  return createGroupDiscussion(slug, {
    post_type: 'discussion',
    content: data.content,
    is_bird_content: false,
  });
}

// Share an existing sighting to a group
export interface ShareSightingToGroupResponse {
  success: boolean;
  post_id: number;
  message: string;
}

export async function shareSightingToGroup(
  slug: string,
  sightingId: number,
  caption?: string
): Promise<ShareSightingToGroupResponse> {
  const formData = new FormData();
  if (caption) formData.append('caption', caption);

  return api.post(`social/groups/${slug}/share-sighting/${sightingId}`, { body: formData }).json<ShareSightingToGroupResponse>();
}

/**
 * Convert a sighting-type GroupPost into the shape the feed PostCard expects.
 * Only valid when post.item_type === 'sighting' — caller must check first.
 *
 * The backend's combined-feed query mirrors the feed's column list, so most
 * fields map 1:1. Anything optional in Sighting that the group view doesn't
 * carry yet (equipment, media array, etc) defaults to undefined/empty.
 */
export function groupPostToSighting(post: GroupPost): Sighting {
  return {
    id: post.id,
    public_id: post.public_id ?? String(post.id),
    caption: post.caption ?? post.content ?? null,
    visibility: (post.visibility ?? 'public') as Sighting['visibility'],
    is_rare: post.is_rare ?? false,
    is_life_bird: post.is_life_bird ?? false,
    comment_count: post.comment_count,
    created_at: post.created_at,
    observed_at: post.observed_at ?? undefined,
    time_ago: post.time_ago ?? '',
    location_name: post.location_name,
    display_lat: post.display_lat ?? null,
    display_lon: post.display_lon ?? null,
    location_precision: post.location_precision,
    user_id: post.user_id,
    username: post.username,
    profile_photo_url: post.profile_photo_url,
    common_name: post.common_name ?? post.species_name ?? 'Unknown',
    scientific_name: post.scientific_name ?? null,
    family: post.family ?? null,
    conservation_status: post.conservation_status ?? null,
    identification_id: post.identification_id ?? 0,
    image_path: post.image_path ?? '',
    confidence_score: post.confidence_score ?? 0,
    exif_data: (post.exif_data as Sighting['exif_data']) ?? null,
    has_original: post.has_original,
    original_format: post.original_format ?? null,
    rotation_degrees: post.rotation_degrees,
    audio_path: post.audio_path,
    love_count: post.love_count,
    seen_too_count: post.seen_too_count,
    view_count: post.view_count ?? 0,
    user_loved: post.user_loved,
    user_seen_too: post.user_seen_too,
    shared_groups: post.shared_groups ?? [],
  };
}

export function getGroupTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    regional: 'Regional',
    species_focus: 'Species Focus',
    skill_level: 'Skill Level',
    general: 'General',
  };
  return labels[type] || type;
}

export function getPrivacyLabel(privacy: string): string {
  const labels: Record<string, string> = {
    public: 'Public',
    private: 'Private',
    invite_only: 'Invite Only',
  };
  return labels[privacy] || privacy;
}

export interface CreateGroupData {
  name: string;
  description: string;
  group_type: 'regional' | 'interest' | 'species' | 'conservation';
  privacy?: 'public' | 'private';
  join_policy?: 'open' | 'approval_required' | 'invite_only';
  region_name?: string;
}

export interface CreateGroupResponse {
  success: boolean;
  group_id: number;
  slug: string;
  message: string;
}

export async function createGroup(data: CreateGroupData): Promise<CreateGroupResponse> {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('description', data.description);
  formData.append('group_type', data.group_type);
  if (data.privacy) formData.append('privacy', data.privacy);
  if (data.join_policy) formData.append('join_policy', data.join_policy);
  if (data.region_name) formData.append('region_name', data.region_name);

  return api.post('social/groups/create', { body: formData }).json<CreateGroupResponse>();
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  privacy?: 'public' | 'private';
  join_policy?: 'open' | 'approval_required' | 'invite_only';
  region_name?: string;
}

export async function updateGroup(slug: string, data: UpdateGroupData): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  if (data.name) formData.append('name', data.name);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.privacy) formData.append('privacy', data.privacy);
  if (data.join_policy) formData.append('join_policy', data.join_policy);
  if (data.region_name !== undefined) formData.append('region_name', data.region_name);

  return api.put(`social/groups/${slug}`, { body: formData }).json();
}

export async function deleteGroup(slug: string): Promise<{ success: boolean; message: string }> {
  return api.delete(`social/groups/${slug}`).json();
}

export async function inviteToGroup(
  slug: string,
  userId: number
): Promise<{ success: boolean; message: string }> {
  return api.post(`social/groups/${slug}/invite`, { json: { user_id: userId } }).json();
}
