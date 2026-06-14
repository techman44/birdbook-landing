import { publicApi, api, API_BASE } from './client';
import { useAuthStore } from '../stores/auth-store';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  username: string;
  expires_in: number;
}

interface RegisterResponse {
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await publicApi.post('auth/login', {
    json: { username, password },
  }).json<LoginResponse>();

  // After login, fetch full profile to get is_admin etc
  const profile = await getProfileWithToken(response.access_token);

  // Store tokens with user info
  useAuthStore.getState().setTokens(
    response.access_token,
    response.refresh_token,
    {
      id: profile.id,
      username: response.username,
      email: profile.email,
      display_name: profile.display_name,
      is_admin: profile.is_admin || false,
    }
  );

  return response;
}

export async function getProfileWithToken(token: string) {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.json();
}

export async function register(
  username: string,
  email: string,
  password: string,
  inviteCode?: string
): Promise<RegisterResponse> {
  return publicApi.post('auth/register', {
    json: {
      username,
      email,
      password,
      invite_code: inviteCode,
      terms_accepted: true, // Required by backend - user implicitly accepts by registering
    },
  }).json<RegisterResponse>();
}

export async function logout(): Promise<void> {
  try {
    await api.post('auth/logout');
  } catch {
    // Ignore logout errors
  } finally {
    useAuthStore.getState().logout();
  }
}

export async function getProfile() {
  return api.get('auth/me').json();
}

export function getGoogleAuthUrl(): string {
  return `${API_BASE}/auth/google/login`;
}

export async function validateInviteCode(code: string): Promise<{ valid: boolean; message?: string }> {
  try {
    const response = await publicApi.get(`invite/validate/${code}`).json<{ valid: boolean; message?: string }>();
    return response;
  } catch {
    return { valid: false, message: 'Invalid invite code' };
  }
}
