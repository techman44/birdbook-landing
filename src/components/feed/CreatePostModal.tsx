'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Mic,
  MessageSquare,
  MapPin,
  Bird,
  Upload,
  Loader2,
  Check,
  ChevronLeft,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/stores/auth-store';
import {
  extractExif,
  uploadImage,
  reverseGeocode,
  type ExifData,
  type IdentificationResult,
  type UploadOptions,
  getIdentificationStatus,
} from '@/lib/api/identification';
import { shareSighting } from '@/lib/api/social';
import { useMultiBird, getDetections } from '@/lib/hooks/useIdentify';
import { LocationPicker } from '@/components/identify/LocationPicker';
import { AIOptionsSelector } from '@/components/identify/AIOptionsSelector';
import { BirdIndicators } from '@/components/identify/BirdIndicators';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type PostType = 'discussion' | 'photo' | 'audio';
type Step = 'type' | 'content' | 'location' | 'processing' | 'result';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<Step>('type');
  const [postType, setPostType] = useState<PostType | null>(null);

  // Content state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');

  // Location state
  const [location, setLocation] = useState<{ lat: number; lon: number; name?: string } | null>(null);

  // Species state (for discussion/manual entry)
  const [speciesName, setSpeciesName] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Result state
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  // Multi-bird detection: tap a numbered chip on the photo to identify that bird
  const resultImgRef = useRef<HTMLImageElement>(null);
  const detections = getDetections(result);
  const multiBird = useMultiBird({
    identificationId: result?.id,
    detections,
    modelResults: result?.model_results,
  });
  const [regionOptionIdx, setRegionOptionIdx] = useState(0);
  useEffect(() => setRegionOptionIdx(0), [multiBird.selectedBird]);

  // Reset all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('type');
        setPostType(null);
        setTitle('');
        setDescription('');
        setPhotoFile(null);
        setPhotoPreview(null);
        setExifData(null);
        setAudioFile(null);
        setAudioFileName('');
        setLocation(null);
        setSpeciesName('');
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage('');
        setResult(null);
        setError(null);
        setSelectedOption(0);
        multiBird.reset();
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle photo selection
  const handlePhotoSelect = useCallback(async (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);

    // Extract EXIF data
    try {
      const exif = await extractExif(file);
      setExifData(exif);

      // Auto-populate location from EXIF if available
      if (exif.latitude && exif.longitude) {
        const locationName = await reverseGeocode(exif.latitude, exif.longitude);
        setLocation({
          lat: exif.latitude,
          lon: exif.longitude,
          name: locationName,
        });
      }
    } catch (e) {
      console.error('EXIF extraction failed:', e);
    }
  }, []);

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoSelect(file);
    }
  };

  // Handle audio selection
  const handleAudioSelect = useCallback((file: File) => {
    setAudioFile(file);
    setAudioFileName(file.name);
    setError(null);
  }, []);

  const handleAudioInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAudioSelect(file);
    }
  };

  // Clear photo
  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setExifData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clear audio
  const clearAudio = () => {
    setAudioFile(null);
    setAudioFileName('');
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  // Navigation
  const goBack = () => {
    if (step === 'content') {
      setStep('type');
    } else if (step === 'location') {
      setStep('content');
    } else if (step === 'result') {
      setStep('location');
    }
  };

  const canProceedFromContent = () => {
    if (postType === 'photo') {
      return !!photoFile;
    }
    if (postType === 'audio') {
      return !!audioFile && description.trim().length > 0;
    }
    if (postType === 'discussion') {
      return title.trim().length > 0 && description.trim().length > 0;
    }
    return false;
  };

  // Submit photo identification
  const submitPhotoIdentification = async () => {
    if (!photoFile) return;

    setIsProcessing(true);
    setStep('processing');
    setProgress(10);
    setStatusMessage('Uploading image...');
    setError(null);

    try {
      const options: UploadOptions = {
        aiMode: 'n8n_ai',
      };

      if (location) {
        options.latitude = location.lat;
        options.longitude = location.lon;
        options.locationName = location.name;
      }

      if (exifData?.camera_body) {
        options.cameraBody = exifData.camera_body;
      }
      if (exifData?.lens) {
        options.lens = exifData.lens;
      }

      setProgress(30);
      setStatusMessage('Analyzing image...');

      const uploadResult = await uploadImage(photoFile, options);

      // Poll for status if not complete
      if (uploadResult.status === 'analyzing' || uploadResult.status === 'verifying') {
        setProgress(50);
        setStatusMessage('AI verification in progress...');

        let attempts = 0;
        const maxAttempts = 60;

        const pollStatus = async (): Promise<IdentificationResult> => {
          attempts++;
          const statusResult = await getIdentificationStatus(uploadResult.id);

          if (statusResult.status === 'complete') {
            return statusResult;
          } else if (statusResult.status === 'failed') {
            throw new Error(statusResult.status_message || 'Identification failed');
          } else if (attempts >= maxAttempts) {
            throw new Error('Identification timed out');
          }

          setProgress(50 + Math.min(40, attempts * 2));
          setStatusMessage(statusResult.status_message || 'AI verification in progress...');

          await new Promise((resolve) => setTimeout(resolve, 3000));
          return pollStatus();
        };

        const finalResult = await pollStatus();
        setResult(finalResult);
        setProgress(100);
        setStep('result');
      } else if (uploadResult.status === 'complete') {
        setResult(uploadResult);
        setProgress(100);
        setStep('result');
      } else {
        throw new Error('Unexpected status: ' + uploadResult.status);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Identification failed');
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit audio identification
  const submitAudioIdentification = async () => {
    if (!audioFile || !accessToken) return;

    setIsProcessing(true);
    setStep('processing');
    setProgress(10);
    setStatusMessage('Uploading audio...');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', audioFile);

      if (location) {
        formData.append('latitude', location.lat.toString());
        formData.append('longitude', location.lon.toString());
      }

      setProgress(30);
      setStatusMessage('Analyzing bird call...');

      const { API_BASE } = await import('@/lib/api/client');
      const response = await fetch(`${API_BASE}/identify/audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Audio identification failed' }));
        throw new Error(err.detail || 'Audio identification failed');
      }

      const audioResult = await response.json();

      setProgress(100);

      // Convert audio result to identification-like result for sharing
      setResult({
        id: audioResult.id,
        status: 'complete',
        species: audioResult.predicted_common_name || 'Unknown',
        consensus_species: audioResult.predicted_common_name,
        consensus_confidence: audioResult.confidence,
        confidence: audioResult.confidence,
        options: audioResult.detections?.map((d: { common_name: string; confidence: number; scientific_name?: string }) => ({
          species: d.common_name,
          confidence: d.confidence,
          reasoning: d.scientific_name || '',
        })) || [],
        image_path: audioResult.file_path,
        created_at: audioResult.created_at,
        latitude: location?.lat,
        longitude: location?.lon,
        location_name: location?.name,
      } as IdentificationResult);

      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audio identification failed');
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  // Share to feed
  const shareToFeed = async () => {
    if (!result) return;

    setIsSharing(true);
    try {
      await shareSighting({
        identification_id: result.id,
        caption: description || title,
        visibility: 'public',
        exact_lat: location?.lat,
        exact_lon: location?.lon,
        location_name: location?.name,
      });

      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['my-birds'] });
      toast.success('Post shared to feed!');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to share post');
    } finally {
      setIsSharing(false);
    }
  };

  // Get options for AI results
  const getOptions = () => {
    if (!result) return [];

    if (result.options && result.options.length > 0) {
      return result.options;
    }

    if (result.model_results && result.model_results.length > 0) {
      return result.model_results.map((mr) => ({
        species: mr.top_prediction,
        confidence: mr.confidence,
        reasoning: mr.reasoning || `Identified by ${mr.model || 'AI'}`,
      }));
    }

    if (result.consensus_species || result.species) {
      return [{
        species: result.consensus_species || result.species || 'Unknown',
        confidence: result.consensus_confidence || result.confidence || 0,
        reasoning: result.reasoning || '',
      }];
    }

    return [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'max-h-[90vh] overflow-y-auto',
          // Widen the dialog on desktop for the photo identification result view
          step === 'result' && !error && result && photoPreview
            ? 'sm:max-w-3xl'
            : 'sm:max-w-lg'
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'type' && step !== 'processing' && (
              <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {step === 'type' && 'Create a Post'}
              {step === 'content' && postType === 'discussion' && 'Discussion'}
              {step === 'content' && postType === 'photo' && 'Photo Post'}
              {step === 'content' && postType === 'audio' && 'Bird Call'}
              {step === 'location' && 'Add Location'}
              {step === 'processing' && 'Processing...'}
              {step === 'result' && (error ? 'Error' : 'Bird Identified!')}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Step: Choose Post Type */}
        {step === 'type' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              What would you like to share?
            </p>

            <div className="space-y-3">
              {/* Discussion */}
              <button
                type="button"
                onClick={() => {
                  setPostType('discussion');
                  setStep('content');
                }}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                )}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Discussion</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Share thoughts, questions, or observations about birds
                  </p>
                </div>
              </button>

              {/* Photo */}
              <button
                type="button"
                onClick={() => {
                  setPostType('photo');
                  setStep('content');
                }}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                )}
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Camera className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Photo</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a bird photo for AI identification
                  </p>
                </div>
              </button>

              {/* Bird Call */}
              <button
                type="button"
                onClick={() => {
                  setPostType('audio');
                  setStep('content');
                }}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                )}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mic className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Bird Call</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload an audio recording for identification
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step: Content Entry */}
        {step === 'content' && (
          <div className="space-y-4 py-4">
            {/* Discussion Content */}
            {postType === 'discussion' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your post a title..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share your thoughts, questions, or observations..."
                    className="mt-1 min-h-[120px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Species (optional)</label>
                  <Input
                    value={speciesName}
                    onChange={(e) => setSpeciesName(e.target.value)}
                    placeholder="e.g., Australian Magpie"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Photo Content */}
            {postType === 'photo' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.raw,.arw,.cr2,.cr3,.dng,.nef,.orf,.raf,.rw2"
                  onChange={handlePhotoInputChange}
                  className="hidden"
                />

                {!photoPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Click to upload photo</p>
                        <p className="text-sm text-gray-500 mt-1">
                          JPG, PNG, WebP, or RAW formats
                        </p>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full max-h-[200px] object-contain rounded-lg border"
                    />
                    <button
                      onClick={clearPhoto}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {exifData && (exifData.latitude || exifData.camera_body) && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-sm">
                        <div className="flex items-center text-emerald-700">
                          <Check className="w-4 h-4 mr-2" />
                          EXIF data extracted
                        </div>
                        {exifData.camera_body && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Camera: {exifData.camera_body}
                            {exifData.lens && ` + ${exifData.lens}`}
                          </p>
                        )}
                        {exifData.latitude && exifData.longitude && (
                          <p className="text-xs text-emerald-600 mt-1">
                            GPS location detected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Caption (optional)</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a caption to your photo..."
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Audio Content */}
            {postType === 'audio' && (
              <>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
                  onChange={handleAudioInputChange}
                  className="hidden"
                />

                {!audioFile ? (
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mic className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Click to upload audio file</p>
                        <p className="text-sm text-gray-500 mt-1">
                          MP3, WAV, FLAC, OGG, M4A, AAC
                        </p>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mic className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 truncate max-w-[200px]">
                            {audioFileName}
                          </p>
                          <p className="text-xs text-gray-500">Audio file selected</p>
                        </div>
                      </div>
                      <button
                        onClick={clearAudio}
                        className="p-1.5 hover:bg-blue-100 rounded-full"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this bird call..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Species (if known)</label>
                  <Input
                    value={speciesName}
                    onChange={(e) => setSpeciesName(e.target.value)}
                    placeholder="e.g., Australian Magpie"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <Button
              onClick={() => setStep('location')}
              disabled={!canProceedFromContent()}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step: Location */}
        {step === 'location' && (
          <div className="space-y-4 py-4">
            <LocationPicker
              initialLocation={location}
              onLocationChange={setLocation}
              exifHasGps={!!(exifData?.latitude && exifData?.longitude)}
            />

            <div className="flex gap-3">
              {postType === 'discussion' ? (
                <Button
                  onClick={shareToFeed}
                  disabled={isSharing}
                  className="flex-1 gap-2"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Post Discussion
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={postType === 'photo' ? submitPhotoIdentification : submitAudioIdentification}
                  className="flex-1 gap-2"
                >
                  <Bird className="w-4 h-4" />
                  {postType === 'photo' ? 'Identify Bird' : 'Analyze Audio'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <p className="font-medium text-gray-700">{statusMessage}</p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && (
          <div className="space-y-4 py-4">
            {error ? (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Identification Failed</h3>
                <p className="text-gray-600 text-center mb-4">{error}</p>
                <Button onClick={() => setStep('location')}>Try Again</Button>
              </div>
            ) : result ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    {postType === 'photo' ? 'Bird Identified!' : 'Audio Analyzed!'}
                  </h3>
                </div>

                <div
                  className={cn(
                    'space-y-4',
                    // Two-column layout on desktop: image left, results right
                    photoPreview && 'sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 sm:items-start'
                  )}
                >
                  {photoPreview && (
                    <div className="relative rounded-xl overflow-hidden bg-gray-100">
                      <img
                        ref={resultImgRef}
                        src={photoPreview}
                        alt="Your photo"
                        className="w-full h-40 sm:h-auto sm:max-h-[420px] object-contain"
                      />
                      {multiBird.isMultiBird && (
                        <BirdIndicators
                          imageRef={resultImgRef}
                          detections={detections}
                          selectedIndex={multiBird.selectedBird}
                          loadingIndex={multiBird.loadingBird}
                          identifiedIndexes={multiBird.identifiedIndexes}
                          onSelect={multiBird.selectBird}
                        />
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    {multiBird.isMultiBird && (
                      <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                        {detections.length} birds spotted in this photo — tap a
                        number on the photo to identify each one.
                      </p>
                    )}
                    {multiBird.regionError && (
                      <p className="text-sm text-red-600">{multiBird.regionError}</p>
                    )}
                    {multiBird.isMultiBird && multiBird.selectedBird > 0 ? (
                      multiBird.regionResults[multiBird.selectedBird] ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700">
                            Bird {multiBird.selectedBird + 1}
                          </p>
                          <AIOptionsSelector
                            options={multiBird.regionResults[multiBird.selectedBird].options}
                            selectedIndex={regionOptionIdx}
                            onSelect={setRegionOptionIdx}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-600 py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Identifying bird {multiBird.selectedBird + 1}...
                        </div>
                      )
                    ) : (
                      <div className="space-y-2">
                        {multiBird.isMultiBird && (
                          <p className="text-sm font-semibold text-gray-700">Bird 1</p>
                        )}
                        <AIOptionsSelector
                          options={getOptions()}
                          selectedIndex={selectedOption}
                          onSelect={setSelectedOption}
                        />
                      </div>
                    )}

                    {location?.name && (
                      <div className="flex items-center justify-center text-sm text-gray-600 gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{location.name}</span>
                      </div>
                    )}

                    <Button
                      onClick={shareToFeed}
                      disabled={isSharing}
                      className="w-full gap-2"
                    >
                      {isSharing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sharing...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          Share to Feed
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={onClose}
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
