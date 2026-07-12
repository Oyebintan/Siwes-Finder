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

// Password reset reuses the website's public OTP flow (10-minute code sent
// by email). Both endpoints are unauthenticated by design.
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
  return apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) });
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
  // Only present for a student caller who has listed at least one skill --
  // see src/lib/match.ts on the web side. Omitted (not zero) otherwise.
  matchScore?: number;
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
  sort?: 'newest' | 'oldest' | 'match';
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

export type LogbookEntry = {
  _id: string;
  studentId: string;
  employerId: string;
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type LogbookEntryDraft = {
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
};

export async function createLogbookEntry(entry: LogbookEntryDraft): Promise<LogbookEntry> {
  return apiFetch('/api/logbook', { method: 'POST', body: JSON.stringify(entry) });
}

export async function listLogbookEntries(): Promise<LogbookEntry[]> {
  return apiFetch('/api/logbook');
}

export async function registerPushToken(token: string): Promise<{ message: string }> {
  return apiFetch('/api/mobile/register-push-token', { method: 'POST', body: JSON.stringify({ token }) });
}

// A student following a company gets a best-effort email/push alert
// whenever that employer posts a new opportunity -- see POST /api/jobs.
export async function getFollowStatus(employerId: string): Promise<{ following: boolean }> {
  return apiFetch(`/api/companies/${employerId}/follow`);
}

export async function toggleFollowCompany(employerId: string): Promise<{ following: boolean }> {
  return apiFetch(`/api/companies/${employerId}/follow`, { method: 'POST' });
}

// A lightweight thread per application -- restricted server-side to that
// application's student and employer. Shared by both roles' screens.
export type ThreadMessage = {
  _id: string;
  senderRole: 'student' | 'employer';
  body: string;
  createdAt: string;
  sender?: { name?: string };
};

export async function listMessages(applicationId: string): Promise<{ messages: ThreadMessage[] }> {
  return apiFetch(`/api/applications/${applicationId}/messages`);
}

export async function sendMessage(applicationId: string, body: string): Promise<{ message: ThreadMessage }> {
  return apiFetch(`/api/applications/${applicationId}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
}

// -- Employer --------------------------------------------------------------
// GET /api/applications branches by role server-side; for an employer
// caller it returns this shape (job title only, populated applicant
// details) rather than the student shape `Application` above.
export type EmployerApplication = {
  _id: string;
  job: { _id: string; title: string } | null;
  student: {
    _id: string;
    name: string;
    email: string;
    university?: string;
    courseOfStudy?: string;
    resumeUrl?: string;
  } | null;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  updatedAt: string;
};

export async function listEmployerApplications(): Promise<EmployerApplication[]> {
  return apiFetch('/api/applications');
}

export async function updateApplicationStatus(
  id: string,
  status: 'Accepted' | 'Rejected'
): Promise<EmployerApplication> {
  return apiFetch(`/api/applications/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
}

export async function bulkUpdateApplications(
  ids: string[],
  status: 'Accepted' | 'Rejected'
): Promise<{ modifiedCount: number }> {
  return apiFetch('/api/applications/bulk', { method: 'PATCH', body: JSON.stringify({ ids, status }) });
}

// GET /api/logbook's employer branch, similarly a different shape from the
// student one above -- studentId comes back populated, not a bare id.
export type EmployerLogbookEntry = {
  _id: string;
  studentId: { _id: string; name: string; email: string };
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: string;
};

export async function listEmployerLogbookEntries(): Promise<EmployerLogbookEntry[]> {
  return apiFetch('/api/logbook');
}

export async function approveLogbookEntry(id: string): Promise<EmployerLogbookEntry> {
  return apiFetch(`/api/logbook/${id}`, { method: 'PUT' });
}

// -- School (read-only) -----------------------------------------------------
export type SchoolStudent = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  faculty?: string;
  department: string;
  level?: string;
  isProfileComplete?: boolean;
  placedAt: string | null;
  applicationCount: number;
  logbookEntries: number;
  logbookApproved: number;
};

export async function getSchoolStudents(): Promise<{ students: SchoolStudent[]; school: string }> {
  return apiFetch('/api/school/students');
}

export type SchoolStudentDetail = {
  student: Profile;
  applications: {
    _id: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
    createdAt: string;
    job: { title: string; location: string } | null;
    employer: { companyName?: string; name?: string } | null;
  }[];
  logbook: LogbookEntry[];
};

export async function getSchoolStudentDetail(id: string): Promise<SchoolStudentDetail> {
  return apiFetch(`/api/school/students/${id}`);
}

export type SchoolLogbookEntry = {
  _id: string;
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: string;
  studentId: string;
  studentName: string;
  department: string;
  faculty?: string;
};

export async function getSchoolLogbooks(
  params: { department?: string; status?: 'approved' | 'pending' } = {}
): Promise<{ entries: SchoolLogbookEntry[]; departments: string[] }> {
  const qs = new URLSearchParams();
  if (params.department) qs.set('department', params.department);
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiFetch(`/api/school/logbooks${query ? `?${query}` : ''}`);
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
