import { api } from './client';

export interface TrendingSpecies {
  species_name: string;
  common_name: string;
  sighting_count: number;
  image_url: string | null;
}

export interface TopPhotographer {
  user_id: number;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
  sighting_count: number;
  species_count: number;
}

export interface RecommendedGroup {
  id: number;
  name: string;
  slug: string;
  public_id: string;
  member_count: number;
  group_type: string;
  description: string | null;
}

export interface UpcomingEvent {
  id: number;
  public_id: string;
  title: string;
  event_type: string;
  start_datetime: string;
  location_name: string | null;
  current_attendees: number;
}

export interface SidebarStats {
  trending_species: TrendingSpecies[];
  top_photographers: TopPhotographer[];
  recommended_groups: RecommendedGroup[];
  upcoming_events: UpcomingEvent[];
  total_sightings: number;
  total_species: number;
  total_users: number;
}

export async function getSidebarStats(): Promise<SidebarStats> {
  return api.get('social/stats/sidebar').json<SidebarStats>();
}
