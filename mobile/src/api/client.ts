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

export async function register(
  name: string,
  email: string,
  password: string,
  role: 'student' | 'employer' | 'school'
): Promise<{ message: string }> {
  return apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
}

export type Employer = {
  _id: string;
  name?: string;
  companyName?: string;
  industry?: string;
  avatarUrl?: string;
  verificationStatus?: string;
};

export type Job = {
  _id: string;
  title: string;
  location: string;
  type: 'On-site' | 'Remote' | 'Hybrid';
  duration: string;
  requirements: string[];
  description: string;
  stipend?: string;
  isActive: boolean;
  applicationDeadline?: string;
  maxApplicants?: number;
  applicantCount: number;
  applicationMethod: 'platform' | 'email' | 'external';
  applicationEmail?: string;
  applicationUrl?: string;
  employerId: Employer;
  createdAt: string;
  updatedAt: string;
};

export type Application = {
  _id: string;
  job: { _id: string; title: string; location: string; employerId: { _id: string; companyName?: string } } | null;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  _id: string;
  name: string;
  email: string;
  role: SessionUser['role'];
  phone?: string;
  avatarUrl?: string;
  university?: string;
  faculty?: string;
  courseOfStudy?: string;
  level?: string;
  skills?: string[];
  resumeUrl?: string;
  siwesStartDate?: string;
  siwesDuration?: string;
  preferredState?: string;
  isProfileComplete?: boolean;
};

export async function getProfile(): Promise<Profile> {
  return apiFetch('/api/profile');
}

export type ProfileUpdate = Partial<{
  name: string;
  phone: string;
  university: string;
  faculty: string;
  course: string;
  level: string;
  skills: string[];
  resumeLink: string;
  avatarUrl: string;
  siwesStartDate: string;
  siwesDuration: string;
  preferredState: string;
}>;

export async function updateProfile(update: ProfileUpdate): Promise<{ message: string; user: Profile }> {
  return apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(update) });
}

export type JobSearchParams = {
  q?: string;
  type?: 'On-site' | 'Remote' | 'Hybrid';
  location?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
};

export async function listJobs(
  params: JobSearchParams = {}
): Promise<{ jobs: Job[]; total: number; page: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.type) qs.set('type', params.type);
  if (params.location) qs.set('location', params.location);
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch(`/api/jobs${query ? `?${query}` : ''}`);
}

export async function getJob(id: string): Promise<{ job: Job }> {
  return apiFetch(`/api/jobs/${id}`);
}

export async function applyToJob(jobId: string): Promise<Application> {
  return apiFetch('/api/applications', { method: 'POST', body: JSON.stringify({ jobId }) });
}

export async function listApplications(): Promise<Application[]> {
  return apiFetch('/api/applications');
}

export async function listSavedJobIds(): Promise<{ ids: string[] }> {
  return apiFetch('/api/saved-jobs?ids=1');
}

export async function listSavedJobs(): Promise<{ jobs: Job[]; ids: string[] }> {
  return apiFetch('/api/saved-jobs');
}

export async function toggleSavedJob(jobId: string): Promise<{ saved: boolean }> {
  return apiFetch('/api/saved-jobs', { method: 'POST', body: JSON.stringify({ jobId }) });
}

// Bypasses apiFetch: multipart bodies need the browser/RN runtime to set its
// own Content-Type (with the boundary), so the JSON header apiFetch always
// sets would break the upload.
export async function uploadFile(
  file: { uri: string; name: string; type: string },
  kind: 'avatar' | 'resume'
): Promise<{ url: string }> {
  const token = await getToken();
  const form = new FormData();
  // React Native's fetch accepts this { uri, name, type } shape for a file
  // field even though it isn't a real Blob/File at the JS type level.
  form.append('file', file as unknown as Blob);
  form.append('type', kind);

  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: form, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error || `Upload failed (${res.status})`);
  }
  return data;
}

export { apiFetch, API_BASE_URL };
