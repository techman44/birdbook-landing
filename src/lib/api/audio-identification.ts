import { api, API_BASE } from './client';

// Audio prediction from BirdNET
export interface AudioPrediction {
  common_name: string;
  scientific_name: string | null;
  confidence: number;
  start_time: number | null;
  end_time: number | null;
}

// Audio identification result
export interface AudioIdentificationResult {
  id: number;
  status: 'processing' | 'completed' | 'failed';
  status_message: string | null;
  detections: AudioPrediction[];
  predicted_common_name: string | null;
  predicted_scientific_name: string | null;
  confidence: number | null;
  bird_detected: boolean;
  duration_seconds: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  file_path: string;
}

export interface AudioUploadOptions {
  latitude?: number;
  longitude?: number;
}

/**
 * Upload an audio file for bird identification
 */
export async function uploadAudio(
  file: File,
  options: AudioUploadOptions = {}
): Promise<AudioIdentificationResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (options.latitude !== undefined) {
    formData.append('latitude', options.latitude.toString());
  }
  if (options.longitude !== undefined) {
    formData.append('longitude', options.longitude.toString());
  }

  // Use fetch directly for FormData
  const token = localStorage.getItem('birdbook-auth')
    ? JSON.parse(localStorage.getItem('birdbook-auth')!).state?.accessToken
    : null;

  const response = await fetch(
    `${API_BASE}/identify/audio`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Audio identification failed' }));
    throw new Error(error.detail || 'Audio identification failed');
  }

  return response.json();
}

/**
 * Get audio identification history
 */
export async function getAudioHistory(
  limit: number = 20,
  offset: number = 0
): Promise<AudioIdentificationResult[]> {
  return api.get(`identify/audio/history?limit=${limit}&offset=${offset}`).json<AudioIdentificationResult[]>();
}

/**
 * Get a specific audio identification
 */
export async function getAudioIdentification(id: number): Promise<AudioIdentificationResult> {
  return api.get(`identify/audio/${id}`).json<AudioIdentificationResult>();
}

/**
 * Delete an audio identification
 */
export async function deleteAudioIdentification(id: number): Promise<void> {
  await api.delete(`identify/audio/${id}`);
}

/**
 * Get confidence level display info
 */
export function getAudioConfidenceLevel(confidence: number): {
  label: string;
  text: string;
  color: string;
  bgColor: string;
} {
  if (confidence >= 0.8) {
    return {
      label: 'HIGH',
      text: 'Strong match',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  } else if (confidence >= 0.5) {
    return {
      label: 'MEDIUM',
      text: 'Possible match',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    };
  } else {
    return {
      label: 'LOW',
      text: 'Weak match',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    };
  }
}
