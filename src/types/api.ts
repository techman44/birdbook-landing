// User types
export interface User {
  id: number;
  username: string;
  email?: string;
  display_name?: string;
  is_admin: boolean;
  bio?: string;
  location?: string;
  created_at: string;
}

// Bird identification types
export interface BirdIdentification {
  id: number;
  user_id: number;
  species_id: number;
  species_name: string;
  common_name: string;
  scientific_name: string;
  confidence: number;
  image_path: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  notes?: string;
  created_at: string;
  is_shared: boolean;
}

// Species types
export interface Species {
  id: number;
  common_name: string;
  scientific_name: string;
  family?: string;
  description?: string;
  habitat?: string;
  diet?: string;
  conservation_status?: string;
  image_url?: string;
}

// Social types
export interface FeedItem {
  id: number;
  sighting_id: number;
  user_id: number;
  username: string;
  display_name?: string;
  species_name: string;
  common_name: string;
  scientific_name: string;
  confidence: number;
  location_name?: string;
  notes?: string;
  created_at: string;
  shared_at: string;
  reaction_counts: Record<string, number>;
  user_reaction?: string;
  comment_count: number;
}

export interface FeedResponse {
  items: FeedItem[];
  page: number;
  limit: number;
  has_more: boolean;
  total: number;
}

export interface Comment {
  id: number;
  user_id: number;
  username: string;
  display_name?: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface Reaction {
  id: number;
  user_id: number;
  reaction_type: string;
  created_at: string;
}

// Equipment types
export interface CameraEquipment {
  id: number;
  make: string;
  model: string;
  type: string;
}

// API response types
export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  has_more: boolean;
  total?: number;
}
