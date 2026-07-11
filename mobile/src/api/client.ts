import { getToken } from './authStorage';

// Set in mobile/.env (see .env.example): the deployed API origin. Falls
// back to a LAN-reachable localhost URL for `expo start` against a local
// `npm run dev` -- 10.0.2.2 is the Android emulator's alias for the host
// machine's localhost; iOS Simulator can use localhost directly, so this
// default only really targets Android. Override via .env for a physical
// device on the same Wi-Fi (use your machine's LAN IP).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export type SessionUser = {
  id: string;
  role: 'student' | 'employer' | 'school' | 'admin' | 'super_admin' | 'unassigned';
  email?: string | null;
  name?: string | null;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Every authenticated call goes through here so the bearer token is
// attached consistently -- mirrors the web's single connectToDatabase()/
// requireSession() choke points: one place to get auth right, everywhere.
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function login(email: string, password: string): Promise<{ token: string; user: SessionUser }> {
  return apiFetch('/api/mobile/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function getProfile(): Promise<{ name: string; email: string } & Record<string, unknown>> {
  return apiFetch('/api/profile');
}

export { apiFetch, API_BASE_URL };
