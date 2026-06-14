'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  MapPin,
  Eye,
  MoreHorizontal,
  Share2,
  Bird,
  Camera,
  Calendar,
  Users,
  Pencil,
  Trash2,
  Image as ImageIcon,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { cn, formatShutterSpeed } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { type Sighting } from '@/lib/api/social';
import { buildImageUrl, getApiBase } from '@/lib/api/client';
import { useToggleReaction } from '@/lib/hooks/useFeed';
import { updateIdentificationMetadata, type BirdDetection } from '@/lib/api/identification';
import { useMultiBird } from '@/lib/hooks/useIdentify';
import { BirdIndicators } from '@/components/identify/BirdIndicators';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImageLightbox } from './ImageLightbox';
import { CommentsSheet } from './CommentsSheet';
import { ConservationBadge } from './ConservationBadge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PostCardProps {
  sighting: Sighting;
  onEdit?: (sighting: Sighting) => void;
  onDelete?: (sighting: Sighting) => void;
  /** Group context (slug) for @mention suggestions in comments. */
  groupSlug?: string | null;
}

export function PostCard({ sighting, onEdit, onDelete, groupSlug }: PostCardProps) {
  const { accessToken, user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toggleReaction = useToggleReaction();
  const [imageError, setImageError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Used to force image refresh after rotation
  const imgRef = useRef<HTMLImageElement>(null);

  // Multi-bird detection overlay (same UX as the identify page): when the
  // sighting carries ≥2 detected birds, show numbered indicators on the photo
  // and let the viewer tap a chip to identify that bird via the region API.
  const detections: BirdDetection[] = sighting.detections?.detections ?? [];
  const multiBird = useMultiBird({
    identificationId: sighting.identification_id,
    detections,
  });
  const selectedRegion =
    multiBird.selectedBird > 0
      ? multiBird.regionResults[multiBird.selectedBird]
      : null;

  // Get rotation for CSS transform
  const rotationDegrees = sighting.rotation_degrees || 0;

  // Use direct image path instead of API endpoint for better reliability through proxies/tunnels
  // Apply rotation via CSS transform instead of server-side processing
  const imageUrl = sighting.image_path ? buildImageUrl(sighting.image_path) : null;

  // Audio sightings (bird calls) carry no image — render an audio player instead.
  const rawAudioUrl = sighting.audio_url || sighting.audio_path || null;
  const audioUrl = rawAudioUrl ? buildImageUrl(rawAudioUrl) : null;
  const isAudioPost = sighting.media_type === 'audio' || (!imageUrl && !!audioUrl);

  // Unique bird species detected in an audio recording (BirdNET returns one entry
  // per time segment; collapse to distinct species keeping the best confidence).
  const audioSpecies = (() => {
    const preds = sighting.audio_predictions;
    if (!preds?.length) return [] as { name: string; confidence: number }[];
    const best = new Map<string, number>();
    for (const p of preds) {
      const name = (p.common_name || p.scientific_name || '').trim();
      if (!name) continue;
      const c = p.confidence ?? 0;
      if (!best.has(name) || c > best.get(name)!) best.set(name, c);
    }
    return [...best.entries()]
      .map(([name, confidence]) => ({ name, confidence }))
      .sort((a, b) => b.confidence - a.confidence);
  })();

  // Check if current user owns this post
  const isOwnPost = user?.username === sighting.username;

  const handleLove = () => {
    toggleReaction.mutate({
      kind: 'sighting',
      id: sighting.id,
      reactionType: 'love',
      isReacted: sighting.user_loved,
    });
  };

  const handleImageClick = () => {
    setLightboxOpen(true);
  };

  const handleRotate = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't open lightbox
    if (isRotating) return;

    setIsRotating(true);
    try {
      const currentRotation = sighting.rotation_degrees || 0;
      const newRotation = ((currentRotation + 90) % 360) as 0 | 90 | 180 | 270;

      await updateIdentificationMetadata(sighting.identification_id, {
        rotation_degrees: newRotation
      });

      // Update the sighting object locally for immediate feedback
      sighting.rotation_degrees = newRotation;

      // Force image to reload from server with new rotation
      setImageKey(prev => prev + 1);

      // Invalidate queries to refresh other views
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['my-birds'] });
      queryClient.invalidateQueries({ queryKey: ['sightings'] });

      toast.success('Image rotated');
    } catch (error) {
      toast.error('Failed to rotate image');
    } finally {
      setIsRotating(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${sighting.common_name} sighting by @${sighting.username}`,
          text: sighting.caption || `Check out this ${sighting.common_name} sighting!`,
          url: `${window.location.origin}/sighting/${sighting.public_id}`,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(`${window.location.origin}/sighting/${sighting.public_id}`);
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const confidencePercent = Math.round((sighting.confidence_score || 0) * 100);

  // Generate encyclopedia link from species name
  const encyclopediaSlug = sighting.common_name
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Check if we have any EXIF data to display
  const exif = sighting.exif_data;
  const hasExifData = exif && (
    exif.camera_body || exif.camera_model || exif.lens || exif.lens_model ||
    exif.focal_length || exif.aperture || exif.shutter_speed || exif.iso
  );

  // Get camera display name
  const cameraName = (exif?.camera_body || exif?.camera_model ||
    (exif?.camera_make && exif?.camera_model ? `${exif.camera_make} ${exif.camera_model}` : null)) as string | null;

  // Get lens display name
  const lensName = (exif?.lens || exif?.lens_model ||
    (exif?.lens_make && exif?.lens_model ? `${exif.lens_make} ${exif.lens_model}` : null)) as string | null;

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${sighting.username}`}>
                <Avatar className="h-10 w-10">
                  {sighting.profile_photo_url ? (
                    <img
                      src={buildImageUrl(sighting.profile_photo_url)}
                      alt={sighting.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {getInitials(sighting.username)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Link>
              <div>
                <Link href={`/profile/${sighting.username}`}>
                  <p className="font-semibold text-sm hover:text-emerald-600 transition-colors">
                    @{sighting.username}
                  </p>
                </Link>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{sighting.time_ago}</span>
                  {sighting.location_name && (
                    <>
                      <span>•</span>
                      <MapPin className="h-3 w-3 text-emerald-500" />
                      <span className="hover:text-emerald-600 cursor-pointer">
                        {sighting.location_name}
                      </span>
                    </>
                  )}
                </p>
                {/* Shared to Groups */}
                {sighting.shared_groups && sighting.shared_groups.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>Shared to </span>
                    {sighting.shared_groups.map((group, index) => (
                      <span key={group.id}>
                        <Link
                          href={group.slug ? `/groups/${group.slug}` : `/groups?id=${group.id}`}
                          className="hover:underline font-medium"
                        >
                          {group.name}
                        </Link>
                        {index < sighting.shared_groups.length - 1 && ', '}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Rare/Life Bird Badges */}
              {sighting.is_rare && (
                <Badge variant="destructive" className="text-xs">
                  ⭐ Rare
                </Badge>
              )}
              {sighting.is_life_bird && (
                <Badge className="bg-purple-100 text-purple-600 text-xs">
                  🎉 Life Bird
                </Badge>
              )}

              {/* Post Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  {isOwnPost && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit?.(sighting)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Post
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(sighting)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Post
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Photo with Species Overlay (Desktop) — or audio player for bird-call posts */}
        <div
          className={cn("relative bg-gray-100 group", !isAudioPost && "cursor-pointer")}
          onClick={isAudioPost ? undefined : handleImageClick}
        >
          {isAudioPost ? (
            <div className="w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 to-sky-50 px-4 py-10">
              <div className="flex items-center gap-2 text-emerald-700">
                <Bird className="h-10 w-10" />
                <span className="text-sm font-medium">
                  {audioSpecies.length > 0
                    ? `${audioSpecies.length} ${audioSpecies.length === 1 ? 'species' : 'species'} detected in this recording`
                    : 'Bird call recording'}
                </span>
              </div>
              {audioUrl ? (
                <audio
                  controls
                  src={audioUrl}
                  className="w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  Your browser does not support audio playback.
                </audio>
              ) : (
                <p className="text-sm text-gray-500">Audio unavailable</p>
              )}
              {audioSpecies.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {audioSpecies.map((sp) => {
                    const slug = sp.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '');
                    return (
                      <Link
                        key={sp.name}
                        href={`/encyclopedia/${slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-white hover:border-emerald-400 transition-colors"
                      >
                        <Bird className="h-3.5 w-3.5" />
                        {sp.name}
                        <span className="text-emerald-500">
                          {Math.round((sp.confidence || 0) * 100)}%
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : !imageError && imageUrl ? (
            <img
              ref={imgRef}
              src={imageUrl}
              alt={sighting.common_name}
              className="w-full object-contain hover:opacity-95 transition-opacity"
              style={{ maxHeight: '600px', transform: rotationDegrees ? `rotate(${rotationDegrees}deg)` : undefined }}
              onError={() => setImageError(true)}
            />
          ) : !imageUrl ? (
            <div className="w-full aspect-video flex items-center justify-center bg-gray-100">
              <div className="animate-pulse">
                <Bird className="h-16 w-16 text-gray-300" />
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square flex items-center justify-center bg-gray-100">
              <Bird className="h-16 w-16 text-gray-300" />
            </div>
          )}

          {/* Multi-bird indicators — pulsing dots + numbered chips over the photo.
              Tapping a chip identifies that bird via the region API. */}
          {!isAudioPost && !imageError && imageUrl && multiBird.isMultiBird && (
            <BirdIndicators
              imageRef={imgRef}
              detections={detections}
              selectedIndex={multiBird.selectedBird}
              loadingIndex={multiBird.loadingBird}
              identifiedIndexes={multiBird.identifiedIndexes}
              onSelect={multiBird.selectBird}
            />
          )}

          {/* Rotation button - only shown to post owner on hover (photo posts only) */}
          {isOwnPost && !isAudioPost && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-none"
              onClick={handleRotate}
              disabled={isRotating}
            >
              <RotateCw className={cn("h-4 w-4", isRotating && "animate-spin")} />
              <span className="sr-only">Rotate image</span>
            </Button>
          )}

          {/* Desktop: Species Info Overlay on Image (photos only — on audio posts
              this gradient sat over the <audio> controls and blocked play) */}
          <div className={cn(
            "hidden sm:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4",
            isAudioPost && "sm:hidden"
          )}>
            <div className="flex items-end justify-between">
              <div className="text-white">
                <Link
                  href={`/encyclopedia/${encyclopediaSlug}`}
                  className="text-lg font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {sighting.common_name}
                </Link>
                <p className="text-sm italic opacity-90">
                  {sighting.scientific_name || 'Species not identified'}
                </p>
                {sighting.family && (
                  <p className="text-xs opacity-80">{sighting.family}</p>
                )}
                {/* Conservation Status & Confidence */}
                <div className="flex items-center gap-2 mt-1">
                  {sighting.conservation_status && (
                    <ConservationBadge status={sighting.conservation_status} className="bg-white/20" />
                  )}
                  {confidencePercent > 0 && (
                    <span className="text-xs opacity-80">
                      🤖 {confidencePercent}% confidence
                    </span>
                  )}
                </div>
              </div>
              {/* Correct Identification Button */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/sighting/${sighting.public_id}`);
                }}
              >
                ✏️ Correct
              </Button>
            </div>
          </div>
        </div>

        {/* Multi-bird: hint + per-bird identification result for the tapped chip */}
        {!isAudioPost && multiBird.isMultiBird && (
          <div className="px-4 py-2 bg-emerald-50/60 border-b border-emerald-100">
            <p className="text-xs text-emerald-700">
              {detections.length} birds spotted — tap a number on the photo to identify each one.
            </p>
            {multiBird.loadingBird != null && (
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Identifying bird {multiBird.loadingBird + 1}...
              </div>
            )}
            {selectedRegion && (
              <p className="mt-1 text-sm">
                <span className="font-semibold text-emerald-800">
                  Bird {multiBird.selectedBird + 1}:
                </span>{' '}
                {selectedRegion.species}
                {selectedRegion.confidence > 0 && (
                  <span className="text-xs text-gray-500">
                    {' '}({Math.round(selectedRegion.confidence * 100)}%)
                  </span>
                )}
              </p>
            )}
            {multiBird.regionError && (
              <p className="mt-1 text-xs text-red-600">{multiBird.regionError}</p>
            )}
          </div>
        )}

        {/* Mobile: Species Info Below Photo */}
        <div className="sm:hidden bg-white border-b border-gray-100 p-3">
          <div className="flex items-start justify-between">
            <div>
              <Link
                href={`/encyclopedia/${encyclopediaSlug}`}
                className="text-lg font-semibold text-gray-900 hover:text-emerald-600"
              >
                {sighting.common_name}
              </Link>
              <p className="text-sm italic text-gray-500">
                {sighting.scientific_name || 'Species not identified'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {confidencePercent > 0 && (
                <span className="text-xs text-gray-500">
                  🤖 {confidencePercent}%
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-emerald-600 text-sm h-8 px-2"
              >
                ✏️
              </Button>
            </div>
          </div>
          {/* Conservation Status */}
          <div className="flex items-center gap-2 mt-2">
            {sighting.conservation_status && (
              <ConservationBadge status={sighting.conservation_status} />
            )}
            {sighting.family && (
              <span className="text-xs text-gray-500">{sighting.family}</span>
            )}
          </div>
        </div>

        {/* Caption */}
        {sighting.caption && (
          <div className="px-4 py-3">
            <p className="text-sm">{sighting.caption}</p>
          </div>
        )}

        {/* Camera Gear & EXIF Data */}
        <div className="px-4 pb-3 border-t border-gray-100">
          {/* Camera Row */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <Camera className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {/* Camera Body */}
              {cameraName ? (
                (() => {
                  const cameraEquipment = sighting.equipment?.find(
                    (e) => e.equipment_type === 'camera_body' || e.equipment_type.startsWith('camera_body_')
                  );
                  return (
                    <Link
                      href={cameraEquipment?.id ? `/gear/${cameraEquipment.id}` : `/gear?search=${encodeURIComponent(cameraName)}`}
                      className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {cameraName}
                    </Link>
                  );
                })()
              ) : (
                <span className="italic text-gray-400">Camera not listed</span>
              )}
              {/* Lens */}
              {lensName ? (
                (() => {
                  const lensEquipment = sighting.equipment?.find((e) => e.equipment_type === 'lens');
                  return (
                    <Link
                      href={lensEquipment?.id ? `/gear/${lensEquipment.id}` : `/gear?search=${encodeURIComponent(lensName)}`}
                      className="text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {lensName}
                    </Link>
                  );
                })()
              ) : (
                <span className="italic text-gray-400">Lens not listed</span>
              )}
              {/* Settings */}
              {hasExifData && (
                <div className="flex items-center gap-2 text-gray-500">
                  {exif?.focal_length && <span>{exif.focal_length}</span>}
                  {exif?.aperture && <span>{exif.aperture}</span>}
                  {exif?.shutter_speed && <span>{formatShutterSpeed(exif.shutter_speed)}</span>}
                  {exif?.iso && <span>ISO {exif.iso}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Photo Taken Date */}
          {exif?.date_taken && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="text-gray-600">Photo taken: {exif.date_taken}</span>
            </div>
          )}

          {/* Location Row - Prominent Display */}
          {sighting.location_name && (
            <div className="flex items-center mt-2 text-sm">
              <Link
                href={sighting.display_lat && sighting.display_lon
                  ? `/maps?lat=${sighting.display_lat}&lon=${sighting.display_lon}`
                  : '#'}
                className="flex items-center text-emerald-600 hover:text-emerald-700 transition-colors group"
              >
                <MapPin className="h-5 w-5 mr-1.5 text-emerald-500" />
                <span className="font-medium group-hover:underline">
                  {sighting.location_name}
                </span>
              </Link>
            </div>
          )}

          {/* Original Quality Badge */}
          {sighting.has_original && sighting.original_format && (
            <div className="mt-1.5 flex items-center gap-1 text-xs">
              <Badge className="bg-emerald-100 text-emerald-700 font-medium">
                <ImageIcon className="h-3 w-3 mr-1" />
                Original {sighting.original_format.toUpperCase()} Available
              </Badge>
            </div>
          )}
        </div>

        {/* Reactions Summary */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex gap-4">
              {sighting.love_count > 0 && (
                <span>❤️ {sighting.love_count}</span>
              )}
              {sighting.view_count > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {sighting.view_count}
                </span>
              )}
            </div>
            {sighting.comment_count > 0 && (
              <span>{sighting.comment_count} comments</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <CardContent className="border-t px-4 py-2">
          <div className="flex justify-around">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLove}
              disabled={toggleReaction.isPending}
              className={cn(
                'flex-1 gap-2 hover:bg-gray-50',
                sighting.user_loved && 'text-red-600 hover:text-red-700'
              )}
            >
              <Heart
                className={cn('h-5 w-5', sighting.user_loved && 'fill-current')}
              />
              <span>Love</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 hover:bg-gray-50"
              onClick={() => setCommentsOpen((open) => !open)}
            >
              <MessageCircle className="h-5 w-5" />
              <span>Comment</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex-1 gap-2 hover:bg-gray-50 text-gray-500 hover:text-blue-600"
            >
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </Button>
          </div>
        </CardContent>

        {/* Inline comments — expands inside the card, constrained to its width */}
        <CommentsSheet
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          sighting={sighting}
          inline
          groupSlug={groupSlug ?? sighting.shared_groups?.[0]?.slug ?? null}
        />
      </Card>

      {/* Image lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={imageUrl}
        alt={sighting.common_name}
        sighting={sighting}
        onRotate={() => setImageKey(prev => prev + 1)}
      />
    </>
  );
}
