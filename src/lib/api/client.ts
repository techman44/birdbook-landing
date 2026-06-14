import ky, { type KyInstance } from 'ky';
import { useAuthStore } from '../stores/auth-store';

// Dynamic API URL determination
// - For localhost/LAN access: uses port 9994 directly
// - For remote/proxied access: uses same origin (Next.js API proxy)
export function getApiBase(): string {
  // Check for explicit env override first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Server-side rendering or build time - use localhost
  if (typeof window === 'undefined') {
    return 'http://localhost:9994/api';
  }

  // Client-side: determine if we're on local network or remote
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Local/LAN access - can reach port 9994 directly
  const isLocalAccess =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.2') ||
    hostname.startsWith('172.30.') ||
    hostname.startsWith('172.31.');

  if (isLocalAccess) {
    // Direct backend access for local/LAN
    return `${protocol}//${hostname}:9994/api`;
  }

  // Production access (birdbook.net) - use same origin with /api path
  // Other remote access - use same origin (for custom deployments with proxy)
  return `${protocol}//${window.location.host}/api`;
}

// Static files base URL (without /api prefix)
// Used for /uploads and /static endpoints
function getStaticBase(): string {
  // Server-side rendering or build time - use localhost
  if (typeof window === 'undefined') {
    return 'http://localhost:9994';
  }

  // Client-side: determine if we're on local network or remote
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Local/LAN access - can reach port 9994 directly
  const isLocalAccess =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.2') ||
    hostname.startsWith('172.30.') ||
    hostname.startsWith('172.31.');

  if (isLocalAccess) {
    // Direct backend access for local/LAN
    return `${protocol}//${hostname}:9994`;
  }

  // Production and other remote access - use same origin
  return `${protocol}//${window.location.host}`;
}

export const API_BASE = getApiBase();
export const STATIC_BASE = getStaticBase();

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      logout();
      return false;
    }

    const data = await response.json();
    const user = useAuthStore.getState().user;

    if (user) {
      setTokens(data.access_token, data.refresh_token || refreshToken, user);
    }

    return true;
  } catch {
    logout();
    return false;
  }
}

export const api: KyInstance = ky.create({
  prefixUrl: API_BASE,
  timeout: 60000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry the original request with new token
            const token = useAuthStore.getState().accessToken;
            if (token) {
              request.headers.set('Authorization', `Bearer ${token}`);
            }
            return ky(request, options);
          }
          // If refresh failed, redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return response;
      },
    ],
  },
});

// Helper for public endpoints (no auth needed)
export const publicApi: KyInstance = ky.create({
  prefixUrl: API_BASE,
  timeout: 60000,
});

// Get image URL with token - returns null if token not available
export function getImageUrl(identificationId: number): string | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  return `${API_BASE}/identify/image/${identificationId}?token=${token}`;
}

// Get species image URL
export function getSpeciesImageUrl(speciesId: number): string {
  return `${API_BASE}/encyclopedia/species/${speciesId}/image`;
}

// Build image URL from a backend-provided path.
//
// The backend now always emits one of two shapes:
//   - Absolute URLs (external avatars from OAuth providers) → passthrough.
//   - `/api/media/...` (optionally with `?t=<signed>`) → prepend the host.
//
// IMPORTANT: getStaticBase() must be called per-invocation for SSR safety.
export function buildImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;

  const staticBase = getStaticBase();
  const path = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${staticBase}/${path}`;
}
