import type { UserProfile } from './types';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

function getGatewayUrl(): string {
  const url = import.meta.env.VITE_GATEWAY_URL?.replace(/\/$/, '');
  if (!url) {
    throw new Error('Missing VITE_GATEWAY_URL');
  }
  return url;
}

async function extractErrorMessage(res: Response): Promise<string> {
  let detail = res.statusText;
  try {
    const body = (await res.json()) as {
      message?: string;
      details?: { issues?: { path: string; message: string }[] };
    };
    if (body.details?.issues?.length) {
      detail = body.details.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    } else if (typeof body.message === 'string') {
      detail = body.message;
    }
  } catch {
    /* ignore */
  }
  return detail || `Request failed (${res.status})`;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getGatewayUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function getGatewayBaseUrl(): string | null {
  try {
    return getGatewayUrl();
  } catch {
    return null;
  }
}

export function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthSession> {
  return postJson('/api/auth/register', input);
}

export function loginUser(input: { email: string; password: string }): Promise<AuthSession> {
  return postJson('/api/auth/login', input);
}

export function refreshSession(refreshToken: string): Promise<AuthSession> {
  return postJson('/api/auth/refresh', { refreshToken });
}

export function loginWithGoogle(idToken: string): Promise<AuthSession> {
  return postJson('/api/auth/google', { idToken });
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return postJson('/api/auth/forgot-password', { email });
}

export function resetPassword(input: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<void> {
  return postJson('/api/auth/reset-password', input);
}
