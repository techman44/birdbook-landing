'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionText } from '@/components/MentionText';
import { MentionTextarea } from '@/components/feed/MentionTextarea';
import { buildImageUrl } from '@/lib/api/client';
import {
  getEventComments,
  addEventComment,
  deleteEventComment,
  type EventComment,
} from '@/lib/api/events';

interface EventDiscussionProps {
  eventId: number;
  isAuthenticated: boolean;
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return '';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/**
 * Chat-lite discussion thread for an event. Attendees and organizers can
 * post; everyone who can see the event can read.
 */
export function EventDiscussion({ eventId, isAuthenticated }: EventDiscussionProps) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  const queryKey = ['event-comments', eventId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getEventComments(eventId),
    enabled: isAuthenticated && !!eventId,
    refetchInterval: 15000,
  });

  const comments = data?.comments ?? [];
  const canPost = data?.can_post ?? false;
  const participants = Array.from(new Set(comments.map((c) => c.username)));

  const addMutation = useMutation({
    mutationFn: (content: string) => addEventComment(eventId, content),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteEventComment(eventId, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newComment.trim() && !addMutation.isPending) {
      addMutation.mutate(newComment.trim());
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-600" />
          Event Discussion
          {data && data.total > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({data.total})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">Sign in to view the discussion.</p>
        ) : isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet.{' '}
            {canPost ? 'Start the conversation!' : 'RSVP to join the conversation.'}
          </p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {comments.map((comment: EventComment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {comment.profile_photo_url ? (
                    <AvatarImage
                      src={buildImageUrl(comment.profile_photo_url)}
                      alt={comment.username}
                    />
                  ) : null}
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                    {getInitials(comment.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {comment.display_name || `@${comment.username}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                    {comment.is_own && (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(comment.id)}
                        disabled={deleteMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-opacity"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                    <MentionText text={comment.content} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAuthenticated && canPost && (
          <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              participants={participants}
              placeholder="Message the group..."
              disabled={addMutation.isPending}
              maxLength={1000}
              onSubmit={handleSubmit}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || addMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}

        {isAuthenticated && !canPost && !isLoading && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Only attendees and organizers can post. RSVP to join the conversation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
