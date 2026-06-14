import { api } from './client';

export type NotificationType =
  | 'new_follower'
  | 'comment'
  | 'reaction'
  | 'mention'
  | 'rare_bird_nearby'
  | 'achievement';

export type NotificationLinkType = 'sighting' | 'profile' | 'comment';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  link_type: NotificationLinkType | null;
  link_id: number | null;
  actor_id: number | null;
  actor_username: string | null;
  actor_profile_photo_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(params: {
  page?: number;
  limit?: number;
  unread_only?: boolean;
} = {}): Promise<{
  page: number;
  limit: number;
  notifications: Notification[];
  has_more: boolean;
}> {
  return api
    .get('notifications', {
      searchParams: params as Record<string, string | number | boolean>,
    })
    .json();
}

export async function getNotificationUnreadCount(): Promise<{ unread_count: number }> {
  return api.get('notifications/unread-count').json();
}

export async function markNotificationRead(id: number): Promise<{ success: boolean }> {
  return api.patch(`notifications/${id}/read`).json();
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return api.post('notifications/read-all').json();
}

export async function deleteNotification(id: number): Promise<{ success: boolean }> {
  return api.delete(`notifications/${id}`).json();
}

/** Where to navigate when the notification is clicked. */
export function notificationHref(n: Notification): string {
  if (n.link_type === 'sighting' && n.link_id != null) {
    return `/sighting/${n.link_id}`;
  }
  if (n.link_type === 'profile' && n.actor_username) {
    return `/profile/${n.actor_username}`;
  }
  if (n.link_type === 'comment' && n.link_id != null) {
    // Comments live inside sightings; the comment id alone isn't enough
    // for direct linking. Fall back to the actor's profile.
    return n.actor_username ? `/profile/${n.actor_username}` : '/notifications';
  }
  return '/notifications';
}
