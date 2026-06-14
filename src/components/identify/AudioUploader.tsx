'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, Mic, Volume2, X, Loader2, Square, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}

export function AudioUploader({
  onFileSelect,
  disabled = false,
  accept = 'audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,.aiff',
}: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isRecording) {
      setIsDragging(true);
    }
  }, [disabled, isRecording]);

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

      if (disabled || isRecording) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/') || isAudioFile(file.name)) {
          handleFile(file);
        }
      }
    },
    [disabled, isRecording]
  );

  const handleFile = (file: File) => {
    // Cleanup previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setCurrentTime(0);
    setIsPlaying(false);

    onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !isRecording) {
      fileInputRef.current?.click();
    }
  };

  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setCurrentTime(0);
    setAudioDuration(0);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isAudioFile = (filename: string): boolean => {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.aiff', '.opus'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return audioExtensions.includes(ext);
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const fileName = `bird-recording-${Date.now()}.${mediaRecorder.mimeType.includes('webm') ? 'webm' : 'm4a'}`;
        const file = new File([audioBlob], fileName, { type: mediaRecorder.mimeType });
        handleFile(file);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Audio playback functions
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Drop zone / Recording area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : isRecording
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!audioFile && !isRecording ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isRecording}
        />

        {isRecording ? (
          /* Recording state */
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-red-100 rounded-full animate-pulse">
              <Mic className="h-8 w-8 text-red-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">Recording...</p>
              <p className="text-2xl font-mono text-red-600 mt-2">
                {formatTime(recordingDuration)}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                stopRecording();
              }}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
            <p className="text-xs text-gray-500">
              Tip: Record at least 5-10 seconds for best results
            </p>
          </div>
        ) : audioFile ? (
          /* Audio preview */
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-full max-w-md bg-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayback();
                  }}
                  className="flex-shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-100"
                      style={{
                        width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {audioFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearAudio();
              }}
              className="text-gray-500 hover:text-gray-700 gap-2"
            >
              <X className="h-4 w-4" />
              Remove and choose different file
            </Button>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                {isDragging ? 'Drop your audio here' : 'Drag & drop bird audio'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse, or record below
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Supports MP3, WAV, M4A, OGG, FLAC, and other audio formats
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          onClick={handleClick}
          disabled={disabled || isRecording}
          className="gap-2"
        >
          <Volume2 className="h-4 w-4" />
          Choose Audio File
        </Button>
        <Button
          variant={isRecording ? 'destructive' : 'outline'}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className="gap-2"
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Record
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-gray-500">
        For best results, record clear bird calls or songs for 5-30 seconds
      </p>
    </div>
  );
}
