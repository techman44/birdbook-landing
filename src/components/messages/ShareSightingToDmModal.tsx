'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Send, Users } from 'lucide-react';
import { toast } from 'sonner';

import { listConversations, sendMessage } from '@/lib/api/messages';
import { buildImageUrl } from '@/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ShareSightingToDmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sightingId: number;
  sightingName?: string;
}

/**
 * Two-step share: pick a conversation, then send. Sends an optional caption
 * + attached_sighting_id; the recipient sees the sighting card inline.
 *
 * Limited to existing conversations for now. To DM someone you've never
 * messaged, start a conversation from their profile first.
 */
export function ShareSightingToDmModal({
  open,
  onOpenChange,
  sightingId,
  sightingName,
}: ShareSightingToDmModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setCaption('');
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', 'inbox-for-share'],
    queryFn: () => listConversations({ limit: 30 }),
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      sendMessage(selectedId!, caption.trim(), { attached_sighting_id: sightingId }),
    onSuccess: () => {
      toast.success('Sighting shared');
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not share'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            Share {sightingName ? <span className="italic">{sightingName}</span> : 'sighting'} via DM
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
          {isLoading && (
            <p className="p-3 text-sm text-muted-foreground">Loading conversations…</p>
          )}
          {!isLoading && (data?.conversations.length ?? 0) === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No conversations yet. Open a profile and click Message to start one.
            </p>
          )}
          {data?.conversations.map((c) => {
            const first = c.other_participants[0];
            const isSelected = selectedId === c.id;
            const label = c.is_group
              ? c.title || c.other_participants.map((p) => p.username).slice(0, 3).join(', ') || 'Group'
              : first?.display_name || first?.username || 'Unknown';
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-2 flex items-center gap-2 hover:bg-muted/50 ${
                  isSelected ? 'bg-emerald-50' : ''
                }`}
              >
                {c.is_group ? (
                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                ) : (
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={buildImageUrl(first?.profile_photo_url || '')} alt={first?.username} />
                    <AvatarFallback>
                      {(first?.display_name || first?.username || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm truncate">{label}</span>
              </button>
            );
          })}
        </div>

        <Textarea
          placeholder="Add a note (optional)…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          className="resize-none"
          maxLength={4000}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={selectedId == null || sendMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
