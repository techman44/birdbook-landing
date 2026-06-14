import { api } from './client';

export interface BirdingEvent {
  id: number;
  public_id: string;
  title: string;
  slug: string;
  description: string | null;
  event_type: 'field_trip' | 'workshop' | 'meetup' | 'competition' | 'online' | 'bird_count' | 'guided_tour' | 'conservation' | 'other';
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lon: number | null;
  start_date: string;
  end_date: string | null;
  timezone: string | null;
  is_all_day: boolean;
  is_online: boolean;
  online_link: string | null;
  max_attendees: number | null;
  attendee_count: number;
  interested_count: number;
  registration_required: boolean;
  visibility: 'public' | 'private' | 'group_only';
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  cover_photo_url: string | null;
  organizer_id: number;
  organizer_username: string;
  organizer_display_name: string | null;
  group_id: number | null;
  group_name: string | null;
  group_slug: string | null;
  is_organizer: boolean;
  is_attending: boolean;
  my_status: 'going' | 'interested' | null;
  created_at: string;
  // Detail-only fields
  attendees_preview?: EventAttendee[];
  payments_enabled?: boolean;
}

export interface EventAttendee {
  user_id: number;
  status: 'going' | 'interested';
  registered_at: string | null;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
}

export interface EventsListResponse {
  events: BirdingEvent[];
  page: number;
  has_more: boolean;
}

export type EventFilter = 'upcoming' | 'my_events' | 'past' | 'nearby';

export async function getEvents(params?: {
  filter?: EventFilter;
  search?: string;
  event_type?: string;
  page?: number;
  per_page?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
}): Promise<EventsListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.filter) searchParams.set('filter', params.filter);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.event_type) searchParams.set('event_type', params.event_type);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.per_page) searchParams.set('per_page', String(params.per_page));
  if (params?.lat) searchParams.set('lat', String(params.lat));
  if (params?.lng) searchParams.set('lng', String(params.lng));
  if (params?.radius_km) searchParams.set('radius_km', String(params.radius_km));

  const query = searchParams.toString();
  return api.get(`social/events/list${query ? `?${query}` : ''}`).json<EventsListResponse>();
}

export async function getEventDetail(identifier: string): Promise<BirdingEvent> {
  // The backend endpoint supports slug, public_id, and numeric ID
  return api.get(`social/events/${identifier}`).json<BirdingEvent>();
}

// Legacy function for backward compatibility with numeric IDs
export async function getEventDetailById(eventId: number): Promise<BirdingEvent> {
  return api.get(`social/events/${eventId}`).json<BirdingEvent>();
}

// Get event by public_id (preferred for URLs)
export async function getEventByPublicId(publicId: string): Promise<BirdingEvent> {
  return api.get(`social/events/${publicId}`).json<BirdingEvent>();
}

export type RsvpStatus = 'going' | 'interested' | 'not_going';

// Backend expects a form field `status` on POST /rsvp ('going' | 'interested'
// | 'not_going'); 'not_going' removes the RSVP.
export async function rsvpEvent(
  eventId: number,
  status: RsvpStatus = 'going'
): Promise<{ success: boolean; status: RsvpStatus; message: string }> {
  const formData = new FormData();
  formData.append('status', status);
  return api.post(`social/events/${eventId}/rsvp`, { body: formData }).json();
}

export async function cancelRsvp(
  eventId: number
): Promise<{ success: boolean; status: RsvpStatus; message: string }> {
  return rsvpEvent(eventId, 'not_going');
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    field_trip: 'Field Trip',
    workshop: 'Workshop',
    meetup: 'Meetup',
    competition: 'Competition',
    online: 'Online Event',
    bird_count: 'Bird Count',
    guided_tour: 'Guided Tour',
    conservation: 'Conservation',
    other: 'Other',
  };
  return labels[type] || type;
}

export function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    field_trip: 'bg-emerald-100 text-emerald-700',
    workshop: 'bg-blue-100 text-blue-700',
    meetup: 'bg-purple-100 text-purple-700',
    competition: 'bg-amber-100 text-amber-700',
    online: 'bg-cyan-100 text-cyan-700',
    bird_count: 'bg-orange-100 text-orange-700',
    guided_tour: 'bg-teal-100 text-teal-700',
    conservation: 'bg-lime-100 text-lime-700',
    other: 'bg-gray-100 text-gray-700',
  };
  return colors[type] || colors.other;
}

// Event creation types and function
export interface CreateEventData {
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  is_all_day?: boolean;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lon?: number;
  is_online?: boolean;
  online_link?: string;
  max_attendees?: number;
  registration_required?: boolean;
  visibility?: 'public' | 'private' | 'group_only';
  group_id?: number;
}

export interface CreateEventResponse {
  success: boolean;
  event_id: number;
  slug: string;
  public_id?: string;
  message: string;
}

export async function createEvent(data: CreateEventData): Promise<CreateEventResponse> {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('event_type', data.event_type);
  formData.append('start_date', data.start_date);
  
  if (data.description) formData.append('description', data.description);
  if (data.end_date) formData.append('end_date', data.end_date);
  if (data.is_all_day !== undefined) formData.append('is_all_day', String(data.is_all_day));
  if (data.location_name) formData.append('location_name', data.location_name);
  if (data.location_address) formData.append('location_address', data.location_address);
  if (data.location_lat !== undefined) formData.append('location_lat', String(data.location_lat));
  if (data.location_lon !== undefined) formData.append('location_lon', String(data.location_lon));
  if (data.is_online !== undefined) formData.append('is_online', String(data.is_online));
  if (data.online_link) formData.append('online_link', data.online_link);
  if (data.max_attendees !== undefined) formData.append('max_attendees', String(data.max_attendees));
  if (data.registration_required !== undefined) formData.append('registration_required', String(data.registration_required));
  if (data.visibility) formData.append('visibility', data.visibility);
  if (data.group_id !== undefined) formData.append('group_id', String(data.group_id));

  return api.post('social/events/create', { body: formData }).json<CreateEventResponse>();
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  event_type?: string;
  start_date?: string;
  end_date?: string;
  is_all_day?: boolean;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lon?: number;
  is_online?: boolean;
  online_link?: string;
  max_attendees?: number;
  registration_required?: boolean;
  visibility?: 'public' | 'private' | 'group_only';
  status?: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  cancellation_reason?: string;
}

export async function updateEvent(eventId: number, data: UpdateEventData): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  
  if (data.title) formData.append('title', data.title);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.event_type) formData.append('event_type', data.event_type);
  if (data.start_date) formData.append('start_date', data.start_date);
  if (data.end_date) formData.append('end_date', data.end_date);
  if (data.is_all_day !== undefined) formData.append('is_all_day', String(data.is_all_day));
  if (data.location_name !== undefined) formData.append('location_name', data.location_name);
  if (data.location_address !== undefined) formData.append('location_address', data.location_address);
  if (data.location_lat !== undefined) formData.append('location_lat', String(data.location_lat));
  if (data.location_lon !== undefined) formData.append('location_lon', String(data.location_lon));
  if (data.is_online !== undefined) formData.append('is_online', String(data.is_online));
  if (data.online_link !== undefined) formData.append('online_link', data.online_link);
  if (data.max_attendees !== undefined) formData.append('max_attendees', String(data.max_attendees));
  if (data.registration_required !== undefined) formData.append('registration_required', String(data.registration_required));
  if (data.visibility) formData.append('visibility', data.visibility);
  if (data.status) formData.append('status', data.status);
  if (data.cancellation_reason) formData.append('cancellation_reason', data.cancellation_reason);

  return api.put(`social/events/${eventId}`, { body: formData }).json();
}

export async function deleteEvent(eventId: number): Promise<{ success: boolean; message: string }> {
  return api.delete(`social/events/${eventId}`).json();
}

// ============================================================================
// Event discussion (comments)
// ============================================================================

export interface EventComment {
  id: number;
  event_id: number;
  user_id: number;
  content: string;
  created_at: string | null;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
  is_own: boolean;
}

export interface EventCommentsResponse {
  comments: EventComment[];
  total: number;
  page: number;
  has_more: boolean;
  can_post: boolean;
}

export async function getEventComments(
  eventId: number | string,
  page = 1,
  limit = 50
): Promise<EventCommentsResponse> {
  return api
    .get(`social/events/${eventId}/comments?page=${page}&limit=${limit}`)
    .json<EventCommentsResponse>();
}

export async function addEventComment(
  eventId: number | string,
  content: string
): Promise<{ success: boolean; comment: EventComment }> {
  const formData = new FormData();
  formData.append('content', content);
  return api.post(`social/events/${eventId}/comments`, { body: formData }).json();
}

export async function deleteEventComment(
  eventId: number | string,
  commentId: number
): Promise<{ success: boolean; message: string }> {
  return api.delete(`social/events/${eventId}/comments/${commentId}`).json();
}
