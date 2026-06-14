import { api, API_BASE } from './client';

// Species option from text identification
export interface TextSpeciesOption {
  species: string;
  confidence: number;
  reasoning: string | null;
}

// Text identification result
export interface TextIdentificationResult {
  options: TextSpeciesOption[];
  species: string;
  confidence: number;
  reasoning: string | null;
  description: string;
  location_name: string | null;
  created_at: string;
}

export interface TextIdentificationRequest {
  description: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
}

/**
 * Submit a text description for bird identification
 */
export async function identifyFromText(
  request: TextIdentificationRequest
): Promise<TextIdentificationResult> {
  const token = localStorage.getItem('birdbook-auth')
    ? JSON.parse(localStorage.getItem('birdbook-auth')!).state?.accessToken
    : null;

  const response = await fetch(
    `${API_BASE}/identify/text`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Text identification failed' }));
    throw new Error(error.detail || 'Text identification failed');
  }

  return response.json();
}

/**
 * Get confidence level display info
 */
export function getTextConfidenceLevel(confidence: number): {
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
