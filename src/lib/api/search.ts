import { api } from './client';

export interface SearchSpecies {
  id: number;
  common_name: string;
  scientific_name: string;
  family: string | null;
  species_code: string | null;
  /** How this species matched: keyword (ILIKE) or semantic (embedding). */
  matched_by?: 'keyword' | 'semantic';
}

export interface SearchUser {
  id: number;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
}

export interface SearchSighting {
  id: number;
  public_id: string | null;
  common_name: string;
  caption: string | null;
  username: string;
  image_path: string | null;
  created_at: string | null;
}

export interface SearchEquipment {
  id: number;
  brand: string;
  model: string;
  full_name: string;
  equipment_type: string;
  product_image_url: string | null;
}

export interface SearchGroup {
  id: number;
  name: string;
  slug: string;
  member_count: number;
}

export interface SearchEvent {
  id: number;
  title: string;
  slug: string;
  public_id: string | null;
  location_name: string | null;
  start_date: string | null;
}

export interface GlobalSearchResults {
  query: string;
  species: SearchSpecies[];
  users: SearchUser[];
  sightings: SearchSighting[];
  // Optional so the UI tolerates an older backend without these groups.
  equipment?: SearchEquipment[];
  groups?: SearchGroup[];
  events?: SearchEvent[];
}

export async function globalSearch(q: string): Promise<GlobalSearchResults> {
  return api.get('search', { searchParams: { q } }).json();
}
