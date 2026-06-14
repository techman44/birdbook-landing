'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Bird,
  Camera,
  MapPin,
  Calendar,
  Image as ImageIcon,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Download
} from 'lucide-react';
import { cn, formatShutterSpeed } from '@/lib/utils';
import { type Sighting, recordSightingView } from '@/lib/api/social';
import { updateIdentificationMetadata } from '@/lib/api/identification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConservationBadge } from './ConservationBadge';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  alt: string;
  sighting?: Sighting;
  onRotate?: () => void; // Callback to refresh parent component after rotation
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;

export function ImageLightbox({ isOpen, onClose, imageUrl, alt, sighting, onRotate }: ImageLightboxProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Check if current user owns this sighting
  const isOwnSighting = sighting && user?.username === sighting.username;

  // Handle rotation
  const handleRotate = async () => {
    if (!sighting || isRotating) return;

    setIsRotating(true);
    try {
      const currentRotation = sighting.rotation_degrees || 0;
      const newRotation = ((currentRotation + 90) % 360) as 0 | 90 | 180 | 270;

      await updateIdentificationMetadata(sighting.identification_id, {
        rotation_degrees: newRotation
      });

      // Update the sighting object locally
      sighting.rotation_degrees = newRotation;

      // Force image refresh
      setImageKey(prev => prev + 1);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['my-birds'] });
      queryClient.invalidateQueries({ queryKey: ['sightings'] });

      // Call parent callback if provided
      onRotate?.();

      toast.success('Image rotated');
    } catch (error) {
      toast.error('Failed to rotate image');
    } finally {
      setIsRotating(false);
    }
  };

  // Get the current image URL with version key for cache busting
  const currentImageUrl = imageUrl
    ? (imageKey > 0
      ? (imageUrl.includes('?') ? `${imageUrl}&v=${imageKey}` : `${imageUrl}?v=${imageKey}`)
      : imageUrl)
    : null;

  // Reset state when lightbox opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      document.body.style.overflow = 'hidden';

      // Track view when lightbox opens (if we have a sighting)
      // Per UNIFIED_MEDIA_PIPELINE.md Section 13 - View Tracking
      if (sighting?.id) {
        recordSightingView(sighting.id, 'lightbox').catch(() => {
          // Silently fail - view tracking is non-critical
        });
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, sighting?.id]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - ZOOM_STEP, MIN_SCALE);
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle mouse wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale((prevScale) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale + delta));
        if (newScale <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return newScale;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [scale, position]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const container = containerRef.current;
    const image = imageRef.current;
    if (container && image) {
      const containerRect = container.getBoundingClientRect();
      const imageWidth = image.naturalWidth;
      const imageHeight = image.naturalHeight;
      const scaledWidth = (imageWidth * scale);
      const scaledHeight = (imageHeight * scale);
      const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
      const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);

      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    } else {
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle double click to zoom
  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      setScale(2);
    } else {
      handleReset();
    }
  }, [scale, handleReset]);

  if (!isOpen) return null;

  const exif = sighting?.exif_data;
  const cameraName = (exif?.camera_body || exif?.camera_model ||
    (exif?.camera_make && exif?.camera_model ? `${exif.camera_make} ${exif.camera_model}` : null)) as string | null;
  const lensName = (exif?.lens || exif?.lens_model ||
    (exif?.lens_make && exif?.lens_model ? `${exif.lens_make} ${exif.lens_model}` : null)) as string | null;

  const confidencePercent = sighting ? Math.round((sighting.confidence_score || 0) * 100) : 0;

  const encyclopediaSlug = sighting?.common_name
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'bg-black/95 animate-in fade-in duration-200'
      )}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header with zoom controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white text-sm font-medium truncate max-w-[50%]">
          {alt}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-white/70 text-sm mr-2">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            disabled={scale <= MIN_SCALE}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            disabled={scale >= MAX_SCALE}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            title="Reset zoom"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          {/* Rotate image button - only for own sightings */}
          {isOwnSighting && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); handleRotate(); }}
              disabled={isRotating}
              title="Rotate image 90°"
            >
              <RotateCw className={cn("h-5 w-5", isRotating && "animate-spin")} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Main container - image + details panel */}
      <div
        className="flex flex-col lg:flex-row gap-4 h-full pt-16 pb-4 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image container with zoom */}
        <div
          ref={containerRef}
          className={cn(
            "relative flex-1 flex items-center justify-center overflow-hidden rounded-lg",
            scale > 1 ? "cursor-grab" : "cursor-zoom-in",
            isDragging && "cursor-grabbing"
          )}
          onClick={(e) => {
            if (scale <= 1) {
              onClose();
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onDoubleClick={handleDoubleClick}
        >
          {(!imageLoaded || !currentImageUrl) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-white/30 border-t-white rounded-full" />
            </div>
          )}
          {currentImageUrl && (
          <img
            ref={imageRef}
            src={currentImageUrl}
            alt={alt}
            className={cn(
              "max-w-full max-h-[75vh] lg:max-h-[80vh] object-contain select-none transition-opacity",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})${sighting?.rotation_degrees ? ` rotate(${sighting.rotation_degrees}deg)` : ''}`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
            draggable={false}
          />
          )}
          <div className="hidden w-64 h-64 flex items-center justify-center bg-gray-800 rounded-lg">
            <Bird className="h-24 w-24 text-gray-600" />
          </div>
        </div>

        {/* Details panel */}
        {sighting && (
          <div className="lg:w-80 bg-gray-900 rounded-lg p-4 overflow-y-auto max-h-[40vh] lg:max-h-[85vh] text-white">
            {/* Species Info */}
            <div className="mb-4">
              <Link
                href={`/encyclopedia/${encyclopediaSlug}`}
                className="text-xl font-bold hover:text-emerald-400 transition-colors flex items-center gap-2"
              >
                {sighting.common_name}
                <ExternalLink className="h-4 w-4 opacity-50" />
              </Link>
              <p className="text-sm text-gray-400 italic">
                {sighting.scientific_name || 'Species not identified'}
              </p>
              {sighting.family && (
                <p className="text-xs text-gray-500 mt-1">{sighting.family}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {sighting.conservation_status && (
                  <ConservationBadge status={sighting.conservation_status} />
                )}
                {confidencePercent > 0 && (
                  <Badge className="bg-gray-700 text-gray-200 text-xs">
                    🤖 {confidencePercent}% confidence
                  </Badge>
                )}
                {sighting.is_rare && (
                  <Badge className="bg-red-900 text-red-200 text-xs">⭐ Rare</Badge>
                )}
                {sighting.is_life_bird && (
                  <Badge className="bg-purple-900 text-purple-200 text-xs">🎉 Life Bird</Badge>
                )}
              </div>
            </div>

            {/* Photographer */}
            <div className="border-t border-gray-700 pt-3 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Photographer</p>
              <Link
                href={`/profile/${sighting.username}`}
                className="text-emerald-400 hover:underline"
              >
                @{sighting.username}
              </Link>
              <p className="text-xs text-gray-500 mt-1">{sighting.time_ago}</p>
            </div>

            {/* Location */}
            {sighting.location_name && (
              <div className="border-t border-gray-700 pt-3 mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location
                </p>
                <Link
                  href={sighting.display_lat && sighting.display_lon
                    ? `/maps?lat=${sighting.display_lat}&lon=${sighting.display_lon}`
                    : '#'}
                  className="text-emerald-400 hover:underline"
                >
                  {sighting.location_name}
                </Link>
              </div>
            )}

            {/* Camera & EXIF */}
            <div className="border-t border-gray-700 pt-3 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Camera Settings
              </p>

              <div className="space-y-2 text-sm">
                {/* Camera - stacked for long names */}
                <div>
                  <span className="text-gray-400 text-xs">Camera</span>
                  {cameraName ? (
                    (() => {
                      const cameraEquipment = sighting.equipment?.find(
                        (e) => e.equipment_type === 'camera_body' || e.equipment_type.startsWith('camera_body_')
                      );
                      return cameraEquipment?.id ? (
                        <Link
                          href={`/gear/${cameraEquipment.id}`}
                          className="block text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {cameraName}
                        </Link>
                      ) : (
                        <Link
                          href={`/gear?search=${encodeURIComponent(cameraName)}`}
                          className="block text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {cameraName}
                        </Link>
                      );
                    })()
                  ) : (
                    <p className="text-gray-600 italic">Not listed</p>
                  )}
                </div>
                {/* Lens - stacked for long names */}
                <div>
                  <span className="text-gray-400 text-xs">Lens</span>
                  {lensName ? (
                    (() => {
                      const lensEquipment = sighting.equipment?.find(
                        (e) => e.equipment_type === 'lens'
                      );
                      return lensEquipment?.id ? (
                        <Link
                          href={`/gear/${lensEquipment.id}`}
                          className="block text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {lensName}
                        </Link>
                      ) : (
                        <Link
                          href={`/gear?search=${encodeURIComponent(lensName)}`}
                          className="block text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {lensName}
                        </Link>
                      );
                    })()
                  ) : (
                    <p className="text-gray-600 italic">Not listed</p>
                  )}
                </div>
                {/* Compact settings in a grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                  {exif?.focal_length && (
                    <div>
                      <span className="text-gray-400 text-xs">Focal Length</span>
                      <p className="text-white">{exif.focal_length}</p>
                    </div>
                  )}
                  {exif?.aperture && (
                    <div>
                      <span className="text-gray-400 text-xs">Aperture</span>
                      <p className="text-white">{exif.aperture}</p>
                    </div>
                  )}
                  {exif?.shutter_speed && (
                    <div>
                      <span className="text-gray-400 text-xs">Shutter</span>
                      <p className="text-white">{formatShutterSpeed(exif.shutter_speed)}</p>
                    </div>
                  )}
                  {exif?.iso && (
                    <div>
                      <span className="text-gray-400 text-xs">ISO</span>
                      <p className="text-white">{exif.iso}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo Date */}
            {exif?.date_taken && (
              <div className="border-t border-gray-700 pt-3 mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Photo Taken
                </p>
                <p className="text-sm">{exif.date_taken}</p>
              </div>
            )}

            {/* Original Available */}
            {sighting.has_original && sighting.original_format && (
              <div className="border-t border-gray-700 pt-3 mb-3">
                <Badge className="bg-emerald-900 text-emerald-200">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Original {sighting.original_format.toUpperCase()} Available
                </Badge>
              </div>
            )}

            {/* Caption */}
            {sighting.caption && (
              <div className="border-t border-gray-700 pt-3 mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Caption</p>
                <p className="text-sm text-gray-300">{sighting.caption}</p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-700 pt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent border-gray-600 text-white hover:bg-gray-800"
                asChild
              >
                <Link href={`/encyclopedia/${encyclopediaSlug}`}>
                  View Species
                </Link>
              </Button>
              {sighting.has_original && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Simple alt text (fallback when no sighting data) */}
      {!sighting && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full">
          <p className="text-white text-sm">{alt}</p>
        </div>
      )}
    </div>
  );
}
