'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, MapPin, Globe, Users, Lock, Loader2, Check, Mic } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shareAudioSighting, type ShareAudioSightingRequest } from '@/lib/api/social';
import { getGroups, type BirdingGroup } from '@/lib/api/groups';
import { type AudioIdentificationResult, type AudioPrediction } from '@/lib/api/audio-identification';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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

interface AudioShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AudioIdentificationResult;
  location?: { lat: number; lon: number; name?: string } | null;
}

export function AudioShareModal({ isOpen, onClose, result, location }: AudioShareModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Get unique species from detections
  const uniqueSpecies = Array.from(
    new Set(result.detections.map((d: AudioPrediction) => d.common_name))
  );
  const speciesText = uniqueSpecies.length === 1
    ? uniqueSpecies[0]
    : `${uniqueSpecies.length} different species`;

  const defaultCaption = uniqueSpecies.length === 1
    ? `Listen to this ${uniqueSpecies[0]}!`
    : `Recorded ${uniqueSpecies.length} different bird calls!`;

  const [caption, setCaption] = useState(defaultCaption);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [shareExactLocation, setShareExactLocation] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  // Fetch user's groups
  const { data: groupsData } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => getGroups({ filter: 'my_groups', per_page: 50 }),
    enabled: isOpen,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCaption(defaultCaption);
      setVisibility('public');
      setShareExactLocation(false);
      setSelectedGroups([]);
    }
  }, [isOpen, defaultCaption]);

  const shareMutation = useMutation({
    mutationFn: (data: ShareAudioSightingRequest) => shareAudioSighting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['audio-history'] });
      toast.success(selectedGroups.length > 0
        ? `Shared to feed and ${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}!`
        : 'Audio sighting shared to feed!');
      onClose();
      router.push('/feed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to share audio sighting');
    },
  });

  const toggleGroup = (groupId: number) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleShare = () => {
    const data: ShareAudioSightingRequest = {
      audio_identification_id: result.id,
      caption: caption || defaultCaption,
      visibility,
      share_exact_location: shareExactLocation,
    };

    if (location) {
      data.exact_lat = location.lat;
      data.exact_lon = location.lon;
      if (location.name) {
        data.location_name = location.name;
      }
    }

    if (selectedGroups.length > 0) {
      data.group_ids = selectedGroups.join(',');
    }

    shareMutation.mutate(data);
  };

  const myGroups = groupsData?.groups || [];

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Everyone can see' },
    { value: 'followers', label: 'Followers', icon: Users, description: 'Only followers' },
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            Share Audio Recording
          </DialogTitle>
          <DialogDescription>
            Share your bird audio recording with the BirdBook community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Species detected summary */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-700 mb-2">
              Detected in this recording:
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueSpecies.map((species, idx) => (
                <Badge key={idx} variant="outline" className="bg-white">
                  {species}
                </Badge>
              ))}
            </div>
            {result.duration_seconds && (
              <p className="text-xs text-blue-600 mt-2">
                Duration: {result.duration_seconds.toFixed(1)} seconds
              </p>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption to your recording..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/500
            </p>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Who can see this?</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                      <span className="text-muted-foreground text-xs">
                        - {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location sharing */}
          {location && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="location-toggle" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Share exact location
                </Label>
                <p className="text-xs text-muted-foreground">
                  {shareExactLocation
                    ? 'Your exact GPS coordinates will be shared'
                    : 'Location will be approximate (±500m for privacy)'}
                </p>
              </div>
              <Switch
                id="location-toggle"
                checked={shareExactLocation}
                onCheckedChange={setShareExactLocation}
              />
            </div>
          )}

          {/* Share to Groups */}
          {myGroups.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Share to Groups
              </Label>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-2">
                  {myGroups.map((group: BirdingGroup) => (
                    <div
                      key={group.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <Label
                        htmlFor={`group-${group.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {group.name}
                      </Label>
                      {selectedGroups.includes(group.id) && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selectedGroups.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sharing to {selectedGroups.length} group{selectedGroups.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {shareMutation.isError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {shareMutation.error instanceof Error
                ? shareMutation.error.message
                : 'Failed to share audio recording'}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={shareMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {shareMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share Recording
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
