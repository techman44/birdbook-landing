import { api } from './client';
import type { Sighting } from './social';

/**
 * Public User Profile
 * This represents the publicly visible profile of a user
 */
export interface PublicUserProfile {
  id: number;
  username: string;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  sighting_count: number;
  life_list_count: number;
  follower_count: number;
  following_count: number;
  rare_sightings_count: number;
  species_this_month: number;
  latest_life_bird: string | null;
  created_at: string;
  member_since: string;
  is_following: boolean;
  follows_you: boolean;
  equipment: Record<string, EquipmentItem[]>;
  equipment_count: number;
  // Legacy text fields for backwards compatibility
  camera_bodies?: string | null;
  lenses?: string | null;
  tripods?: string | null;
  extenders?: string | null;
  other_gear?: string | null;
}

export interface EquipmentItem {
  equipment_id: number;
  equipment_type: string;
  brand: string;
  model: string;
  full_name: string;
  specs?: Record<string, unknown>;
  is_favorite: boolean;
}

export interface FollowUser {
  id: number;
  username: string;
  profile_photo_url: string | null;
  bio: string | null;
  sighting_count: number;
  life_list_count: number;
  follower_count: number;
  following_count: number;
  followed_at: string;
  is_following: boolean;
}

export interface FollowListResponse {
  page: number;
  limit: number;
  followers?: FollowUser[];
  following?: FollowUser[];
  has_more: boolean;
}

export interface LifeListEntry {
  id: number;
  species_id: number;
  common_name: string;
  scientific_name: string;
  family?: string;
  conservation_status?: string;
  first_seen_at: string;
  last_seen_at: string;
  total_sightings: number;
  first_sighting_id?: number;
  image_path?: string;
}

export interface LifeListResponse {
  page: number;
  limit: number;
  species: LifeListEntry[];
  total_species: number;
  has_more: boolean;
}

export interface UserAchievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon_url?: string;
  category: string;
  tier: string;
  earned_at: string;
  progress?: number;
}

export interface UserAchievementsResponse {
  achievements: UserAchievement[];
  total: number;
}

// ============================================================================
// Profile API Functions
// ============================================================================

/**
 * Get a user's public profile by username
 */
export async function getUserProfile(username: string): Promise<PublicUserProfile> {
  return api.get(`social/users/${username}/profile`).json<PublicUserProfile>();
}

/**
 * Follow a user
 */
export async function followUser(username: string): Promise<{ success: boolean; message: string }> {
  return api.post(`social/users/${username}/follow`).json<{ success: boolean; message: string }>();
}

/**
 * Unfollow a user
 */
export async function unfollowUser(username: string): Promise<{ success: boolean; message: string }> {
  return api.delete(`social/users/${username}/unfollow`).json<{ success: boolean; message: string }>();
}

/**
 * Get a user's followers
 */
export async function getUserFollowers(
  username: string,
  page: number = 1,
  limit: number = 20
): Promise<FollowListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  return api.get(`social/users/${username}/followers?${params}`).json<FollowListResponse>();
}

/**
 * Get users that a user is following
 */
export async function getUserFollowing(
  username: string,
  page: number = 1,
  limit: number = 20
): Promise<FollowListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  return api.get(`social/users/${username}/following?${params}`).json<FollowListResponse>();
}

/**
 * Get a user's sightings/posts for their profile
 */
export async function getUserSightings(
  username: string,
  page: number = 1,
  limit: number = 12
): Promise<{ page: number; limit: number; sightings: Sighting[]; has_more: boolean }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    username
  });
  return api.get(`social/feed?${params}`).json();
}

/**
 * Get a user's life list
 */
export async function getUserLifeList(
  username: string,
  page: number = 1,
  limit: number = 20
): Promise<LifeListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  return api.get(`social/users/${username}/life-list?${params}`).json<LifeListResponse>();
}

/**
 * Get a user's achievements
 */
export async function getUserAchievements(username: string): Promise<UserAchievementsResponse> {
  return api.get(`social/users/${username}/achievements`).json<UserAchievementsResponse>();
}

// ============================================================================
// User Discovery API
// ============================================================================

export type DiscoverSortBy = 'most_active' | 'recently_joined' | 'top_birders' | 'rare_spotters' | 'nearby' | 'suggested';

export interface DiscoverUser {
  id: number;
  username: string;
  profile_photo_url: string | null;
  bio: string | null;
  location: string | null;
  sighting_count: number;
  life_list_count: number;
  follower_count: number;
  following_count: number;
  camera_bodies: string | null;
  lenses: string | null;
  created_at: string;
  is_following: boolean;
  rare_sightings_count: number;
  member_since: string;
}

export interface DiscoverUsersParams {
  page?: number;
  limit?: number;
  sort_by?: DiscoverSortBy;
  search?: string;
}

export interface DiscoverUsersResponse {
  page: number;
  limit: number;
  sort_by: string;
  users: DiscoverUser[];
  has_more: boolean;
}

/**
 * Discover users with various sorting options
 */
export async function discoverUsers(params: DiscoverUsersParams = {}): Promise<DiscoverUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params.search) searchParams.set('search', params.search);

  const queryString = searchParams.toString();
  const url = queryString ? `social/users/discover?${queryString}` : 'social/users/discover';
  return api.get(url).json<DiscoverUsersResponse>();
}
