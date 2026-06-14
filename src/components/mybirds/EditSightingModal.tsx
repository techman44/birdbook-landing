'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { MapPin, Camera, Loader2, Search, Bird, EyeOff, RotateCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  updateIdentificationMetadata,
  searchLocation,
  getIdentificationDetail,
  type LocationResult,
  type MetadataUpdate
} from '@/lib/api/identification';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';
import { buildImageUrl } from '@/lib/api/client';

interface SightingData {
  identification_id: number;
  common_name: string;
  scientific_name?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  exif_data?: {
    camera_body?: string;
    lens?: string;
    focal_length?: string;
    aperture?: string;
    iso?: string;
    shutter_speed?: string;
    date_taken?: string;
  };
  encyclopedia_opt_out?: boolean;
  rotation_degrees?: number;
  image_path?: string;
}

interface EditSightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sighting: SightingData | null;
}

export function EditSightingModal({ isOpen, onClose, sighting }: EditSightingModalProps) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  // Fetch full details when modal opens
  const { data: fullSighting, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['sighting-detail-edit', sighting?.identification_id],
    queryFn: () => getIdentificationDetail(sighting!.identification_id),
    enabled: isOpen && !!sighting?.identification_id,
    staleTime: 0, // Always fetch fresh data for editing
  });

  // Location fields
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Camera fields
  const [cameraBody, setCameraBody] = useState('');
  const [lens, setLens] = useState('');
  const [focalLength, setFocalLength] = useState('');
  const [aperture, setAperture] = useState('');
  const [iso, setIso] = useState('');
  const [shutterSpeed, setShutterSpeed] = useState('');
  const [dateTaken, setDateTaken] = useState('');

  // Privacy
  const [encyclopediaOptOut, setEncyclopediaOptOut] = useState(false);

  // Image rotation (0, 90, 180, 270)
  const [rotationDegrees, setRotationDegrees] = useState(0);

  // Track original values for comparison
  const [originalValues, setOriginalValues] = useState<{
    location_name?: string;
    latitude?: number;
    longitude?: number;
    exif_data?: SightingData['exif_data'];
    encyclopedia_opt_out?: boolean;
    rotation_degrees?: number;
  }>({});

  // Reset form when fullSighting data loads
  useEffect(() => {
    if (fullSighting) {
      // Location
      setLocationName(fullSighting.location_name || '');
      setLatitude(fullSighting.latitude?.toString() || '');
      setLongitude(fullSighting.longitude?.toString() || '');
      setLocationSearch('');
      setLocationResults([]);

      // Camera/EXIF
      setCameraBody(fullSighting.exif_data?.camera_body || '');
      setLens(fullSighting.exif_data?.lens || '');
      setFocalLength(fullSighting.exif_data?.focal_length || '');
      setAperture(fullSighting.exif_data?.aperture || '');
      setIso(fullSighting.exif_data?.iso || '');
      setShutterSpeed(fullSighting.exif_data?.shutter_speed || '');
      setDateTaken(fullSighting.exif_data?.date_taken || '');

      // Privacy
      setEncyclopediaOptOut(fullSighting.encyclopedia_opt_out || false);

      // Image rotation
      setRotationDegrees(fullSighting.rotation_degrees || 0);

      // Store original values for comparison
      setOriginalValues({
        location_name: fullSighting.location_name,
        latitude: fullSighting.latitude,
        longitude: fullSighting.longitude,
        exif_data: fullSighting.exif_data,
        encyclopedia_opt_out: fullSighting.encyclopedia_opt_out,
        rotation_degrees: fullSighting.rotation_degrees,
      });
    }
  }, [fullSighting]);

  // Handler to rotate image 90 degrees clockwise
  const handleRotate = () => {
    setRotationDegrees((prev) => (prev + 90) % 360 as 0 | 90 | 180 | 270);
  };

  const updateMutation = useMutation({
    mutationFn: (data: MetadataUpdate) =>
      updateIdentificationMetadata(sighting!.identification_id, data),
    onSuccess: (result) => {
      // Invalidate all relevant queries so changes appear everywhere
      queryClient.invalidateQueries({ queryKey: ['my-birds'] });
      queryClient.invalidateQueries({ queryKey: ['bird-detail', sighting?.identification_id] });
      queryClient.invalidateQueries({ queryKey: ['sighting-detail-edit', sighting?.identification_id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['sightings'] });
      queryClient.invalidateQueries({ queryKey: ['encyclopedia'] });
      toast.success(`Updated: ${result.updated_fields.join(', ')}`);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update sighting');
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
    setLocationName(result.display_name);
    setLatitude(result.lat);
    setLongitude(result.lon);
    setLocationResults([]);
    setLocationSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sighting) return;

    const updates: MetadataUpdate = {};

    // Compare and include only changed values (using originalValues from fetched data)
    // Location
    const newLat = latitude ? parseFloat(latitude) : undefined;
    const newLon = longitude ? parseFloat(longitude) : undefined;

    if (locationName !== (originalValues.location_name || '')) {
      updates.location_name = locationName || undefined;
    }
    if (newLat !== originalValues.latitude && newLat !== undefined && !isNaN(newLat)) {
      updates.latitude = newLat;
    }
    if (newLon !== originalValues.longitude && newLon !== undefined && !isNaN(newLon)) {
      updates.longitude = newLon;
    }

    // Camera data
    if (cameraBody !== (originalValues.exif_data?.camera_body || '')) {
      updates.camera_body = cameraBody || undefined;
    }
    if (lens !== (originalValues.exif_data?.lens || '')) {
      updates.lens = lens || undefined;
    }
    if (focalLength !== (originalValues.exif_data?.focal_length || '')) {
      updates.focal_length = focalLength || undefined;
    }
    if (aperture !== (originalValues.exif_data?.aperture || '')) {
      updates.aperture = aperture || undefined;
    }
    if (iso !== (originalValues.exif_data?.iso || '')) {
      updates.iso = iso || undefined;
    }
    if (shutterSpeed !== (originalValues.exif_data?.shutter_speed || '')) {
      updates.shutter_speed = shutterSpeed || undefined;
    }
    if (dateTaken !== (originalValues.exif_data?.date_taken || '')) {
      updates.date_taken = dateTaken || undefined;
    }

    // Privacy
    if (encyclopediaOptOut !== (originalValues.encyclopedia_opt_out || false)) {
      updates.encyclopedia_opt_out = encyclopediaOptOut;
    }

    // Image rotation
    if (rotationDegrees !== (originalValues.rotation_degrees || 0)) {
      updates.rotation_degrees = rotationDegrees;
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bird className="h-5 w-5 text-emerald-600" />
            Edit Sighting
          </DialogTitle>
          <DialogDescription>
            Update details for your {sighting.common_name} sighting
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-32 h-32 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="w-24 h-8" />
                <Skeleton className="w-20 h-4" />
              </div>
            </div>
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-20" />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Rotation Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4 text-emerald-600" />
              Image Rotation
            </div>

            <div className="flex items-center gap-4">
              {/* Image Preview - show preview with CSS rotation for what it will look like */}
              <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {sighting.image_path ? (
                <img
                  src={buildImageUrl(sighting.image_path)}
                  alt={sighting.common_name}
                  className="max-w-full max-h-full object-contain transition-transform duration-300"
                  style={{ transform: `rotate(${rotationDegrees}deg)` }}
                />
                ) : (
                  <div className="animate-pulse h-full w-full bg-gray-200" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                  className="flex items-center gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  Rotate 90°
                </Button>
                <p className="text-xs text-muted-foreground">
                  Current rotation: {rotationDegrees}°
                </p>
                {rotationDegrees !== (originalValues.rotation_degrees || 0) && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Rotation changed
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Location
            </div>

            {/* Location Search */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Search for a location</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search for a place..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLocationSearch())}
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
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-emerald-50 rounded transition-colors"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}

            {/* Location Name */}
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                placeholder="e.g. Centennial Park, Sydney"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="-33.8688"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="151.2093"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Camera Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Camera className="h-4 w-4 text-emerald-600" />
              Camera & Settings
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camera-body">Camera Body</Label>
                <Input
                  id="camera-body"
                  placeholder="e.g. Canon EOS R5"
                  value={cameraBody}
                  onChange={(e) => setCameraBody(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lens">Lens</Label>
                <Input
                  id="lens"
                  placeholder="e.g. RF 100-500mm F4.5-7.1"
                  value={lens}
                  onChange={(e) => setLens(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="focal-length" className="text-xs">Focal Length</Label>
                <Input
                  id="focal-length"
                  placeholder="500mm"
                  value={focalLength}
                  onChange={(e) => setFocalLength(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aperture" className="text-xs">Aperture</Label>
                <Input
                  id="aperture"
                  placeholder="f/7.1"
                  value={aperture}
                  onChange={(e) => setAperture(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shutter" className="text-xs">Shutter</Label>
                <Input
                  id="shutter"
                  placeholder="1/2000"
                  value={shutterSpeed}
                  onChange={(e) => setShutterSpeed(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iso" className="text-xs">ISO</Label>
                <Input
                  id="iso"
                  placeholder="800"
                  value={iso}
                  onChange={(e) => setIso(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-taken">Date Taken</Label>
              <Input
                id="date-taken"
                placeholder="e.g. 2024-01-15 14:30"
                value={dateTaken}
                onChange={(e) => setDateTaken(e.target.value)}
              />
            </div>
          </div>

          {/* Privacy Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <EyeOff className="h-4 w-4 text-emerald-600" />
              Privacy
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="encyclopedia-opt-out" className="cursor-pointer">
                  Hide from Encyclopedia
                </Label>
                <p className="text-xs text-muted-foreground">
                  {encyclopediaOptOut
                    ? 'Photo hidden from community gallery'
                    : 'Photo visible in community gallery'}
                </p>
              </div>
              <Switch
                id="encyclopedia-opt-out"
                checked={encyclopediaOptOut}
                onCheckedChange={setEncyclopediaOptOut}
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
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
