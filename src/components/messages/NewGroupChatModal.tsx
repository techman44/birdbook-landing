'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { createGroupConversation, startConversation } from '@/lib/api/messages';
import { discoverUsers } from '@/lib/api/profiles';
import { buildImageUrl } from '@/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface NewGroupChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PickedUser {
  id: number;
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
}

export function NewGroupChatModal({ open, onOpenChange }: NewGroupChatModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<PickedUser[]>([]);

  // Reset state every time the modal closes so a re-open starts fresh.
  useEffect(() => {
    if (!open) {
      setTitle('');
      setSearch('');
      setPicked([]);
    }
  }, [open]);

  // Debounce the search by a tiny amount via tanstack-query's natural
  // batching — the URL changes on every keystroke but the API request
  // is cheap and the user picker is rarely typed quickly.
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['messages', 'user-search', search],
    queryFn: () => discoverUsers({ search, limit: 10 }),
    enabled: open && search.trim().length >= 1,
  });

  const toggleUser = (u: PickedUser) => {
    setPicked((prev) =>
      prev.some((p) => p.id === u.id)
        ? prev.filter((p) => p.id !== u.id)
        : [...prev, u],
    );
  };

  const createMutation = useMutation({
    // One person picked = a direct message, not a group chat. startConversation
    // is idempotent (reuses the existing 1:1 thread); the group endpoint would
    // mint a new is_group conversation every time.
    mutationFn: () =>
      picked.length === 1
        ? startConversation(picked[0].id)
        : createGroupConversation(picked.map((p) => p.id), title.trim() || undefined),
    onSuccess: (result) => {
      onOpenChange(false);
      router.push(`/messages/${result.conversation_id}`);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create group'),
  });

  const canSubmit = picked.length >= 1 && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Group name (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />

          {/* Picked-chips row */}
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {picked.map((u) => (
                <Badge
                  key={u.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {u.display_name || u.username}
                  <button
                    type="button"
                    onClick={() => toggleUser(u)}
                    className="hover:text-red-600"
                    aria-label={`Remove ${u.username}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search birders to add…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Results list */}
          <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
            {isFetching && (
              <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}
            {!isFetching && search && searchData?.users.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">No matches.</div>
            )}
            {searchData?.users.map((u) => {
              const isPicked = picked.some((p) => p.id === u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  className="w-full text-left p-2 hover:bg-muted/50 flex items-center gap-2"
                  onClick={() =>
                    toggleUser({
                      id: u.id,
                      username: u.username,
                      display_name: null,
                      profile_photo_url: u.profile_photo_url ?? null,
                    })
                  }
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={buildImageUrl(u.profile_photo_url || '')} alt={u.username} />
                    <AvatarFallback>{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">@{u.username}</div>
                    {u.bio && (
                      <div className="text-xs text-muted-foreground truncate">{u.bio}</div>
                    )}
                  </div>
                  {isPicked && <Check className="h-4 w-4 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
