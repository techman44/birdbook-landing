'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, MapPin, Globe, Users, Lock, Loader2, Search, Check } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shareSighting, type ShareSightingRequest } from '@/lib/api/social';
import { getGroups, type BirdingGroup } from '@/lib/api/groups';
import { searchLocation, type LocationResult } from '@/lib/api/identification';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { toast } from 'sonner';

interface SightingData {
  identification_id: number;
  common_name: string;
  scientific_name?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
}

interface ShareToFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  sighting: SightingData | null;
}

export function ShareToFeedModal({ isOpen, onClose, sighting }: ShareToFeedModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const speciesName = sighting?.common_name || 'this bird';
  const defaultCaption = speciesName !== 'Unknown'
    ? `Just spotted a ${speciesName}!`
    : 'Check out this bird I spotted!';

  const [caption, setCaption] = useState(defaultCaption);
  // "Share to feed" is the user-facing primary toggle. When ON, visibility
  // can be public or followers-only; when OFF, the sighting is created as
  // private and only the selected groups (if any) will see it.
  const [shareToFeed, setShareToFeed] = useState(true);
  const [feedVisibility, setFeedVisibility] = useState<'public' | 'followers'>('public');
  const [shareExactLocation, setShareExactLocation] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  // Location editing
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [customLatitude, setCustomLatitude] = useState('');
  const [customLongitude, setCustomLongitude] = useState('');

  // Fetch user's groups
  const { data: groupsData } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => getGroups({ filter: 'my_groups', per_page: 50 }),
    enabled: isOpen,
  });

  // Reset form when sighting changes
  useEffect(() => {
    if (sighting) {
      const name = sighting.common_name || 'Unknown';
      setCaption(name !== 'Unknown' ? `Just spotted a ${name}!` : 'Check out this bird I spotted!');
      setShareToFeed(true);
      setFeedVisibility('public');
      setShareExactLocation(false);
      setSelectedGroups([]);
      setEditingLocation(false);
      setCustomLocationName(sighting.location_name || '');
      setCustomLatitude(sighting.latitude?.toString() || '');
      setCustomLongitude(sighting.longitude?.toString() || '');
    }
  }, [sighting]);

  const shareMutation = useMutation({
    mutationFn: (data: ShareSightingRequest) => shareSighting(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['my-birds'] });
      const isLifeBird = result.sighting?.is_life_bird ?? false;
      toast.success(isLifeBird ? 'Life bird shared to feed!' : 'Sighting shared to feed!');
      onClose();
      router.push('/feed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to share sighting');
    },
  });

  const handleLocationSearch = async () => {
    if (locationSearch.length < 3) return;
    setIsSearchingLocation(true);
    try {
      const results = await searchLocation(locationSearch);
      setLocationResults(results);
    } catch {
      toast.error('Location search failed');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectLocation = (result: LocationResult) => {
    setCustomLocationName(result.display_name);
    setCustomLatitude(result.lat);
    setCustomLongitude(result.lon);
    setLocationResults([]);
    setLocationSearch('');
  };

  const toggleGroup = (groupId: number) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleShare = () => {
    if (!sighting) return;

    const lat = editingLocation ? parseFloat(customLatitude) : sighting.latitude;
    const lon = editingLocation ? parseFloat(customLongitude) : sighting.longitude;
    const locationName = editingLocation ? customLocationName : sighting.location_name;

    // Feed off + no groups = nothing actually shared. Block this case.
    const data: ShareSightingRequest = {
      identification_id: sighting.identification_id,
      caption: caption || defaultCaption,
      visibility: shareToFeed ? feedVisibility : 'private',
      share_exact_location: shareExactLocation,
    };

    if (lat && !isNaN(lat)) data.exact_lat = lat;
    if (lon && !isNaN(lon)) data.exact_lon = lon;
    if (locationName) data.location_name = locationName;
    if (selectedGroups.length > 0) {
      data.group_ids = selectedGroups.join(',');
    }

    shareMutation.mutate(data);
  };

  const groupOnly = !shareToFeed && selectedGroups.length > 0;
  const nothingSelected = !shareToFeed && selectedGroups.length === 0;

  // Visibility options when "Share to feed" is on. Private is no longer in
  // this list because it lives on the top-level toggle ("Share to feed = off").
  const feedVisibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Everyone can see' },
    { value: 'followers', label: 'Followers', icon: Users, description: 'Only followers' },
  ];

  const hasLocation = sighting?.latitude && sighting?.longitude;
  const myGroups = groupsData?.groups || [];

  if (!sighting) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-emerald-600" />
            Share to Feed
          </DialogTitle>
          <DialogDescription>
            Share your {speciesName} sighting with the BirdBook community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption to your sighting..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/500
            </p>
          </div>

          {/* Share to feed */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-to-feed-toggle" className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  Share to feed
                </Label>
                <p className="text-xs text-muted-foreground">
                  {shareToFeed
                    ? 'Visible in the public/following feed.'
                    : 'Kept private — only you and selected groups will see it.'}
                </p>
              </div>
              <Switch
                id="share-to-feed-toggle"
                checked={shareToFeed}
                onCheckedChange={setShareToFeed}
              />
            </div>

            {shareToFeed && (
              <Select value={feedVisibility} onValueChange={(v) => setFeedVisibility(v as typeof feedVisibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {feedVisibilityOptions.map((option) => (
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
            )}
          </div>

          {/* Location Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Location
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingLocation(!editingLocation)}
                className="text-xs"
              >
                {editingLocation ? 'Cancel Edit' : 'Edit Location'}
              </Button>
            </div>

            {!editingLocation ? (
              <p className="text-sm text-muted-foreground">
                {sighting.location_name || (hasLocation ? 'GPS coordinates available' : 'No location set')}
              </p>
            ) : (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                {/* Location Search */}
                <div className="space-y-2">
                  <Label className="text-xs">Search Location</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for a place..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleLocationSearch}
                      disabled={isSearchingLocation || locationSearch.length < 3}
                    >
                      {isSearchingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {locationResults.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                    {locationResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectLocation(result)}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-emerald-50 rounded transition-colors"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Location Name */}
                <div className="space-y-1">
                  <Label className="text-xs">Location Name</Label>
                  <Input
                    placeholder="e.g. Centennial Park, Sydney"
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="-33.8688"
                      value={customLatitude}
                      onChange={(e) => setCustomLatitude(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="151.2093"
                      value={customLongitude}
                      onChange={(e) => setCustomLongitude(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Location Privacy Toggle */}
            {(hasLocation || (customLatitude && customLongitude)) && (
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="location-toggle" className="text-sm">
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
          </div>

          {/* Share to Groups */}
          {myGroups.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
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
                        <Check className="h-4 w-4 text-emerald-600" />
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

          {/* Validation hint */}
          {nothingSelected && (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Turn on &ldquo;Share to feed&rdquo; or pick at least one group — otherwise nothing is being shared.</span>
            </div>
          )}

          {/* Error message */}
          {shareMutation.isError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {shareMutation.error instanceof Error
                ? shareMutation.error.message
                : 'Failed to share sighting'}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={shareMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareMutation.isPending || nothingSelected}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {shareMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                {groupOnly ? 'Share to Groups Only' : 'Share Sighting'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
