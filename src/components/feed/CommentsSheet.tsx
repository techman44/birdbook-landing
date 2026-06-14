'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Send, Loader2, Reply, MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionText } from '@/components/MentionText';
import {
  getComments,
  addComment,
  getDiscussionComments,
  addDiscussionComment,
  updateComment,
  deleteComment,
  updateDiscussionComment,
  deleteDiscussionComment,
  type Comment,
  type Sighting
} from '@/lib/api/social';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/lib/stores/auth-store';
import { buildImageUrl } from '@/lib/api/client';
import { MentionTextarea } from './MentionTextarea';

export type CommentTargetKind = 'sighting' | 'discussion';

export interface CommentTarget {
  kind: CommentTargetKind;
  id: number;
}

interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Provide either `sighting` (legacy/feed) or `target` (generic). */
  sighting?: Sighting;
  target?: CommentTarget;
  /**
   * Inline mode renders the comments INSIDE the post card (Facebook-style)
   * instead of a full-width bottom sheet overlay.
   */
  inline?: boolean;
  /** Group context for @mention suggestions (members ranked first). */
  groupSlug?: string | null;
}

const POLLING_INTERVAL = 10000;

// Collect usernames already in the thread (for @mention ranking)
function collectParticipants(commentList: Comment[], acc: Set<string>): Set<string> {
  for (const comment of commentList) {
    acc.add(comment.username);
    if (comment.replies) collectParticipants(comment.replies, acc);
  }
  return acc;
}

// Total comment count including nested replies
function countAllComments(commentList: Comment[]): number {
  return commentList.reduce(
    (count, comment) => count + 1 + (comment.replies ? countAllComments(comment.replies) : 0),
    0
  );
}

export function CommentsSheet({
  isOpen,
  onClose,
  sighting,
  target,
  inline = false,
  groupSlug,
}: CommentsSheetProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const resolved: CommentTarget = target ?? { kind: 'sighting', id: sighting!.id };
  const queryKey = ['comments', resolved.kind, resolved.id] as const;
  const isDiscussion = resolved.kind === 'discussion';

  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      isDiscussion ? getDiscussionComments(resolved.id) : getComments(resolved.id),
    enabled: isOpen,
    refetchInterval: isOpen ? POLLING_INTERVAL : false,
  });

  const totalCount = countAllComments(comments);

  const addCommentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) =>
      isDiscussion
        ? addDiscussionComment(resolved.id, content, parentId)
        : addComment(resolved.id, content, parentId),
    onSuccess: () => {
      setNewComment('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    },
  });

  const participants = Array.from(collectParticipants(comments, new Set<string>()));

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate({
        content: newComment.trim(),
        parentId: replyingTo?.id,
      });
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  if (!isOpen) return null;

  const commentsList = (
    <>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No comments yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to comment!
          </p>
        </div>
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            target={resolved}
            currentUserId={user?.id}
            onReply={handleReply}
            depth={0}
          />
        ))
      )}
    </>
  );

  const replyIndicator = replyingTo && (
    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t flex items-center justify-between">
      <span className="text-sm text-emerald-700 dark:text-emerald-300">
        Replying to @{replyingTo.username}
      </span>
      <button
        onClick={cancelReply}
        className="text-sm text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
      >
        Cancel
      </button>
    </div>
  );

  const commentForm = (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50 dark:bg-gray-800">
      <div className="flex gap-2">
        <MentionTextarea
          value={newComment}
          onChange={setNewComment}
          participants={participants}
          groupSlug={groupSlug}
          placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Add a comment...'}
          disabled={addCommentMutation.isPending}
          maxLength={500}
          onSubmit={handleSubmit}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newComment.trim() || addCommentMutation.isPending}
        >
          {addCommentMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {newComment.length}/500
      </p>
    </form>
  );

  if (inline) {
    // Inline panel: expands inside the post card (constrained to the card's
    // width), Facebook-style — no overlay, no full-width sheet.
    return (
      <div className="w-full max-w-full border-t bg-white dark:bg-gray-900 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold text-sm">Comments ({totalCount})</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Hide comments"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">{commentsList}</div>
        {replyIndicator}
        {commentForm}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl',
          'animate-in slide-in-from-bottom duration-300',
          'max-h-[85vh] flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">
            Comments ({totalCount})
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">{commentsList}</div>

        {replyIndicator}

        {commentForm}
      </div>
    </>
  );
}

interface CommentItemProps {
  comment: Comment;
  target: CommentTarget;
  currentUserId?: number;
  onReply: (comment: Comment) => void;
  depth: number;
}

function CommentItem({ comment, target, currentUserId, onReply, depth }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const isOwner = currentUserId === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 2; // Maximum nesting level
  // Both sighting and discussion comments now have edit/delete endpoints.
  const isDiscussion = target.kind === 'discussion';
  const canEditOrDelete = isOwner;
  const queryKey = ['comments', target.kind, target.id] as const;

  const updateMutation = useMutation({
    mutationFn: (content: string) =>
      isDiscussion
        ? updateDiscussionComment(comment.id, content)
        : updateComment(comment.id, content),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      isDiscussion ? deleteDiscussionComment(comment.id) : deleteComment(comment.id),
    onSuccess: () => {
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    },
  });

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      updateMutation.mutate(editContent.trim());
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className={cn('space-y-3', depth > 0 && 'ml-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700')}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          {comment.profile_photo_url ? (
            <AvatarImage src={buildImageUrl(comment.profile_photo_url)} alt={comment.username} />
          ) : null}
          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
            {getInitials(comment.username)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">@{comment.username}</span>
            <span className="text-xs text-muted-foreground">{comment.time_ago}</span>
            {comment.is_edited && (
              <span className="text-xs text-muted-foreground italic">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm"
                maxLength={isDiscussion ? 1000 : 500}
                disabled={updateMutation.isPending}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending || !editContent.trim()}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
              <MentionText text={comment.content} />
            </p>
          )}

          {/* Action buttons */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              {depth < maxDepth && (
                <button
                  onClick={() => onReply(comment)}
                  className="text-xs text-muted-foreground hover:text-emerald-600 flex items-center gap-1 transition-colors"
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </button>
              )}

              {hasReplies && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-xs text-muted-foreground hover:text-emerald-600 flex items-center gap-1 transition-colors"
                >
                  {showReplies ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  )}
                </button>
              )}

              {canEditOrDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {hasReplies && showReplies && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              target={target}
              currentUserId={currentUserId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your comment will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
