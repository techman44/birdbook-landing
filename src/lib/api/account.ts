import { api, API_BASE } from './client';
import { useAuthStore } from '../stores/auth-store';

// Profile types
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  profile_photo_url?: string;
  email_verified: boolean;
  is_public: boolean;
  is_admin: boolean;
  created_at: string;
  last_login_at?: string;
  follower_count: number;
  following_count: number;
  sighting_count: number;
  life_list_count: number;
  show_email: boolean;
  show_location: boolean;
  show_life_list: boolean;
  email_notifications: boolean;
  actual_species_count?: number;
  actual_sighting_count?: number;
  achievement_count?: number;
  groups_created?: number;
  groups_joined?: number;
  recent_achievements?: Array<{
    code: string;
    name: string;
    description: string;
    icon_url?: string;
    earned_at: string;
  }>;
}

export interface ProfileUpdate {
  username?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  email?: string;
  show_email?: boolean;
  show_location?: boolean;
  show_life_list?: boolean;
  email_notifications?: boolean;
}

export interface UserSettings {
  email_notifications: boolean;
  show_email: boolean;
  show_location: boolean;
  show_life_list: boolean;
  is_public: boolean;
  email_verified: boolean;
  agreed_to_terms: boolean;
  agreed_to_privacy: boolean;
  agreed_terms_version?: string;
  agreed_privacy_version?: string;
}

// API functions
export async function getProfile(): Promise<UserProfile> {
  return api.get('account/profile').json<UserProfile>();
}

export async function updateProfile(data: ProfileUpdate): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const token = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_BASE}/account/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Update failed' }));
    throw new Error(error.detail || 'Update failed');
  }

  return response.json();
}

export async function getSettings(): Promise<UserSettings> {
  return api.get('account/settings').json<UserSettings>();
}

export async function updateSettings(
  data: { email_notifications?: boolean; is_public?: boolean }
): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();

  if (data.email_notifications !== undefined) {
    formData.append('email_notifications', String(data.email_notifications));
  }
  if (data.is_public !== undefined) {
    formData.append('is_public', String(data.is_public));
  }

  const token = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_BASE}/account/settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Update failed' }));
    throw new Error(error.detail || 'Update failed');
  }

  return response.json();
}

export async function uploadAvatar(file: File): Promise<{ success: boolean; avatar_url: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_BASE}/account/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

export interface DashboardData {
  stats: {
    total_species: number;
    total_sightings: number;
    sightings_this_week: number;
    photos_contributed: number;
    achievements_earned: number;
    following_count: number;
    follower_count: number;
    groups_joined: number;
  };
  recent_sightings: Array<{
    id: number;
    caption?: string;
    created_at: string;
    is_rare: boolean;
    is_life_bird: boolean;
    common_name: string;
    scientific_name?: string;
    image_path?: string;
  }>;
  life_list_preview: Array<{
    id: number;
    common_name: string;
    scientific_name?: string;
    first_seen_at: string;
    total_sightings: number;
  }>;
  recent_achievements: Array<{
    name: string;
    description: string;
    icon_url?: string;
    earned_at: string;
  }>;
}

export async function getDashboard(): Promise<DashboardData> {
  return api.get('account/dashboard').json<DashboardData>();
}

// Equipment types
export interface Equipment {
  id: number;
  equipment_type: string;
  brand: string;
  model: string;
  full_name: string;
  specs?: Record<string, unknown>;
  msrp_usd?: number;
  product_image_url?: string;
  release_year?: number;
  owned?: boolean;
}

export interface UserEquipment extends Equipment {
  user_equipment_id: number;
  equipment_id: number;
  is_favorite: boolean;
  acquired_date?: string;
  notes?: string;
}

export interface UserEquipmentResponse {
  equipment: UserEquipment[];
  grouped: Record<string, UserEquipment[]>;
  total: number;
}

export interface EquipmentSearchResponse {
  equipment: Equipment[];
  total: number;
  filters: {
    brands: string[];
    types: string[];
  };
}

// Equipment API functions
export async function getUserEquipment(): Promise<UserEquipmentResponse> {
  return api.get('account/equipment').json<UserEquipmentResponse>();
}

export async function addEquipment(
  equipmentId: number,
  isFavorite: boolean = false,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const params = new URLSearchParams();
  params.set('is_favorite', String(isFavorite));
  if (notes) params.set('notes', notes);

  return api.post(`account/equipment/${equipmentId}?${params}`).json();
}

export async function removeEquipment(userEquipmentId: number): Promise<{ success: boolean; message: string }> {
  return api.delete(`account/equipment/${userEquipmentId}`).json();
}

export async function toggleFavoriteEquipment(
  userEquipmentId: number
): Promise<{ success: boolean; is_favorite: boolean }> {
  return api.put(`account/equipment/${userEquipmentId}/favorite`).json();
}

export async function searchEquipment(
  query?: string,
  equipmentType?: string,
  brand?: string,
  limit: number = 50
): Promise<EquipmentSearchResponse> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (equipmentType) params.set('equipment_type', equipmentType);
  if (brand) params.set('brand', brand);
  params.set('limit', String(limit));

  return api.get(`account/equipment/search?${params}`).json<EquipmentSearchResponse>();
}
