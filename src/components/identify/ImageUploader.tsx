'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  onCameraClick?: () => void;
  onExifExtracted?: (exifData: ExifData) => void;
  disabled?: boolean;
  accept?: string;
}

interface ExifData {
  camera_body?: string | null;
  lens?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  focal_length?: string | null;
  aperture?: string | null;
  iso?: string | null;
  shutter_speed?: string | null;
}

export function ImageUploader({
  onFileSelect,
  onCameraClick,
  onExifExtracted,
  disabled = false,
  accept = 'image/*,.raw,.arw,.cr2,.cr3,.dng,.nef,.orf,.raf,.rw2',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [rawFileName, setRawFileName] = useState<string>('');
  const [rawFileSize, setRawFileSize] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/') || isRawFile(file.name)) {
          handleFile(file);
        }
      }
    },
    [disabled]
  );

  const handleFile = async (file: File) => {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setRawFileName(file.name);
    setRawFileSize(`${fileSizeMB} MB`);

    // Check if it's a RAW file
    if (isRawFile(file.name)) {
      // RAW file - generate preview server-side
      setPreview(null);
      setIsGeneratingPreview(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('identify/generate-preview', {
          body: formData,
          timeout: 120000, // 2 minute timeout for large RAW files
        }).json<{
          preview_url: string;
          camera_body?: string;
          lens?: string;
          latitude?: number;
          longitude?: number;
          focal_length?: string;
          aperture?: string;
          iso?: string;
          shutter_speed?: string;
          is_raw: boolean;
          file_size_mb: number;
        }>();

        setPreview(response.preview_url);

        // Pass EXIF data to parent if callback provided
        if (onExifExtracted) {
          onExifExtracted({
            camera_body: response.camera_body,
            lens: response.lens,
            latitude: response.latitude,
            longitude: response.longitude,
            focal_length: response.focal_length,
            aperture: response.aperture,
            iso: response.iso,
            shutter_speed: response.shutter_speed,
          });
        }
      } catch (error) {
        console.error('Failed to generate RAW preview:', error);
        // Keep file selected but show error state
      } finally {
        setIsGeneratingPreview(false);
      }
    } else {
      // Standard image - browser can preview directly
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setIsGeneratingPreview(false);
    setRawFileName('');
    setRawFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isRawFile = (filename: string): boolean => {
    const rawExtensions = ['.raw', '.arw', '.cr2', '.cr3', '.dng', '.nef', '.orf', '.raf', '.rw2'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return rawExtensions.includes(ext);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {isGeneratingPreview ? (
          /* RAW file processing loading state */
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-amber-100 rounded-full">
              <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                Processing RAW file...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {rawFileName}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {rawFileSize}
              </p>
            </div>
            <p className="text-xs text-amber-600">
              Large files may take a moment to process
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearPreview();
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Cancel
            </button>
          </div>
        ) : preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg object-contain"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearPreview();
              }}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-100 rounded-full">
                <Upload className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                {isDragging ? 'Drop your image here' : 'Drag & drop your bird photo'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse from your device
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Supports JPG, PNG, WebP, and RAW formats (DNG, ARW, CR2, NEF, etc.)
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          onClick={handleClick}
          disabled={disabled}
          className="gap-2"
        >
          <ImageIcon className="h-4 w-4" />
          Choose Photo
        </Button>
        {onCameraClick && (
          <Button
            variant="outline"
            onClick={onCameraClick}
            disabled={disabled}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>
        )}
      </div>
    </div>
  );
}
