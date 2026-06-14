'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MapPin, Star, Bird, Eye, Users, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Sighting, updateSighting, type UpdateSightingRequest } from '@/lib/api/social';
import { toast } from 'sonner';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  sighting: Sighting | null;
}

export function EditPostModal({ isOpen, onClose, sighting }: EditPostModalProps) {
  const queryClient = useQueryClient();

  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isRare, setIsRare] = useState(false);
  const [isLifeBird, setIsLifeBird] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');

  // Reset form when sighting changes
  useEffect(() => {
    if (sighting) {
      setCaption(sighting.caption || '');
      setLocationName(sighting.location_name || '');
      setIsRare(sighting.is_rare || false);
      setIsLifeBird(sighting.is_life_bird || false);
      setVisibility(sighting.visibility || 'public');
    }
  }, [sighting]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSightingRequest) => updateSighting(sighting!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-sightings'] });
      toast.success('Post updated successfully');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update post');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sighting) return;

    const updates: UpdateSightingRequest = {};

    // Only include changed fields
    if (caption !== (sighting.caption || '')) {
      updates.caption = caption || null;
    }
    if (locationName !== (sighting.location_name || '')) {
      updates.location_name = locationName || null;
    }
    if (isRare !== sighting.is_rare) {
      updates.is_rare = isRare;
    }
    if (isLifeBird !== sighting.is_life_bird) {
      updates.is_life_bird = isLifeBird;
    }
    if (visibility !== sighting.visibility) {
      updates.visibility = visibility;
    }

    // Check if anything changed
    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      onClose();
      return;
    }

    updateMutation.mutate(updates);
  };

  if (!sighting) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bird className="h-5 w-5 text-emerald-600" />
            Edit Sighting
          </DialogTitle>
          <DialogDescription>
            Edit your {sighting.common_name} sighting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Location Name
            </Label>
            <Input
              id="location"
              placeholder="e.g. Royal National Park, NSW"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-600" />
              Visibility
            </Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>Public - Everyone can see</span>
                  </div>
                </SelectItem>
                <SelectItem value="followers">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Followers - Only followers</span>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Private - Only you</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Flags */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <Label htmlFor="rare" className="cursor-pointer">Mark as Rare Sighting</Label>
              </div>
              <Switch
                id="rare"
                checked={isRare}
                onCheckedChange={setIsRare}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bird className="h-4 w-4 text-purple-500" />
                <Label htmlFor="lifebird" className="cursor-pointer">Mark as Life Bird</Label>
              </div>
              <Switch
                id="lifebird"
                checked={isLifeBird}
                onCheckedChange={setIsLifeBird}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
