import { api } from './client';

// ---------- types ----------

export interface ConversationParticipant {
  user_id: number;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
  /** Only included on /conversations/{id} (not on inbox list). */
  last_read_at?: string | null;
}

export interface ConversationListItem {
  id: number;
  is_group: boolean;
  title: string | null;
  last_message_at: string;
  last_read_at: string | null;
  last_message: {
    id: number;
    body: string | null;
    sender_id: number;
    created_at: string;
    is_deleted: boolean;
    attachment_type: string | null;
  } | null;
  unread_count: number;
  other_participants: ConversationParticipant[];
}

export interface Conversation {
  id: number;
  is_group: boolean;
  title: string | null;
  created_by: number | null;
  created_at: string;
  last_message_at: string;
  participants: ConversationParticipant[];
}

export interface AttachedSightingCard {
  id: number;
  public_id?: string | null;
  common_name: string | null;
  scientific_name: string | null;
  caption: string | null;
  image_path: string | null;
  is_rare: boolean | null;
  location_name: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username?: string;
  sender_profile_photo_url?: string | null;
  body: string | null;
  attachment_path: string | null;
  attachment_type: 'image' | 'audio' | null;
  attached_sighting_id: number | null;
  attached_sighting: AttachedSightingCard | null;
  reply_to_id: number | null;
  edited_at: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface AttachmentUploadResult {
  attachment_path: string;
  attachment_type: 'image' | 'audio';
  size: number;
}

// ---------- conversations ----------

export async function startConversation(userId: number): Promise<{ conversation_id: number; created: boolean }> {
  return api.post('messages/conversations/start', { json: { user_id: userId } }).json();
}

export async function createGroupConversation(
  participantIds: number[],
  title?: string,
): Promise<{ conversation_id: number; created: boolean }> {
  return api
    .post('messages/conversations/group', {
      json: { participant_ids: participantIds, title },
    })
    .json();
}

export async function updateConversation(
  conversationId: number,
  patch: { title?: string },
): Promise<{ success: boolean }> {
  return api.patch(`messages/conversations/${conversationId}`, { json: patch }).json();
}

export async function addParticipant(
  conversationId: number,
  userId: number,
): Promise<{ success: boolean }> {
  return api
    .post(`messages/conversations/${conversationId}/participants`, {
      json: { user_id: userId },
    })
    .json();
}

export async function removeParticipant(
  conversationId: number,
  userId: number,
): Promise<{ success: boolean }> {
  return api.delete(`messages/conversations/${conversationId}/participants/${userId}`).json();
}

export async function listConversations(params: { page?: number; limit?: number } = {}): Promise<{
  conversations: ConversationListItem[];
  page: number;
  has_more: boolean;
}> {
  return api.get('messages/conversations', { searchParams: params as Record<string, string | number> }).json();
}

export async function getConversation(id: number): Promise<Conversation> {
  return api.get(`messages/conversations/${id}`).json();
}

// ---------- messages ----------

export async function listMessages(
  conversationId: number,
  params: { before_id?: number; after_id?: number; limit?: number } = {},
): Promise<{ messages: Message[]; has_more: boolean }> {
  return api
    .get(`messages/conversations/${conversationId}/messages`, {
      searchParams: params as Record<string, string | number>,
    })
    .json();
}

export async function sendMessage(
  conversationId: number,
  body: string,
  options: {
    attached_sighting_id?: number;
    attachment_path?: string;
    attachment_type?: 'image' | 'audio';
    reply_to_id?: number;
  } = {},
): Promise<Message> {
  return api
    .post(`messages/conversations/${conversationId}/messages`, {
      json: { body, ...options },
    })
    .json();
}

export async function uploadAttachment(
  conversationId: number,
  file: File,
): Promise<AttachmentUploadResult> {
  const form = new FormData();
  form.append('file', file);
  return api
    .post(`messages/conversations/${conversationId}/attachments`, { body: form })
    .json();
}

export async function markConversationRead(conversationId: number): Promise<{ success: boolean }> {
  return api.patch(`messages/conversations/${conversationId}/read`).json();
}

export async function editMessage(messageId: number, body: string): Promise<Message> {
  return api.patch(`messages/messages/${messageId}`, { json: { body } }).json();
}

export async function deleteMessage(messageId: number): Promise<{ success: boolean }> {
  return api.delete(`messages/messages/${messageId}`).json();
}

export async function getUnreadCount(): Promise<{ unread_count: number }> {
  return api.get('messages/unread-count').json();
}

export interface MessageSearchResult {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  body: string;
  created_at: string;
  is_group: boolean;
  title: string | null;
  other_participants: Array<{
    user_id: number;
    username: string;
    display_name: string | null;
  }>;
}

export async function searchMessages(q: string): Promise<{
  query: string;
  results: MessageSearchResult[];
}> {
  return api.get('messages/search', { searchParams: { q } }).json();
}

// ---------- blocks ----------

export async function blockUser(userId: number): Promise<{ success: boolean }> {
  return api.post('messages/blocks', { json: { user_id: userId } }).json();
}

export async function unblockUser(userId: number): Promise<{ success: boolean }> {
  return api.delete(`messages/blocks/${userId}`).json();
}
