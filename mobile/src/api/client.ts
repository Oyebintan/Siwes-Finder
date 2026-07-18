import { getToken } from './authStorage';

// The deployed API origin. Release builds get this from eas.json's
// production profile `env` (which is committed, so it always reaches
// EAS's build servers -- a CI-written .env does NOT: the root .gitignore
// excludes .env* and eas build skips gitignored files when uploading).
// Local dev (`expo start`) reads mobile/.env, falling back to
// 10.0.2.2:3000 -- the Android emulator's alias for the host machine's
// localhost; use your machine's LAN IP in .env for a physical device.
const DEV_FALLBACK_URL = 'http://10.0.2.2:3000';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEV_FALLBACK_URL;

// A release build running on the emulator-only fallback is a build
// misconfiguration, not a network problem -- every request would fail
// with a misleading "check your connection" otherwise. Say what's
// actually wrong (this exact silent failure shipped in early builds).
const misconfiguredBuild = !__DEV__ && API_BASE_URL === DEV_FALLBACK_URL;

export type SessionUser = {
  id: string;
  role: 'student' | 'employer' | 'school' | 'admin' | 'super_admin' | 'unassigned';
  email?: string | null;
  name?: string | null;
  emailVerified?: boolean;
};

export class ApiError extends Error {
  status: number;
  // Set for a handful of routes that need the client to branch on the
  // specific rejection, not just show the message -- currently only
  // 'EMAIL_NOT_VERIFIED' (see POST /api/applications, POST /api/jobs).
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Every authenticated call goes through here so the bearer token is
// attached consistently -- mirrors the web's single connectToDatabase()/
// requireSession() choke points: one place to get auth right, everywhere.
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (misconfiguredBuild) {
    throw new ApiError(
      0,
      'This app version was built without a server address. Please download the latest version from the SIWES Finder website.'
    );
  }
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.code);
  }
  return data as T;
}

export async function login(email: string, password: string): Promise<{ token: string; user: SessionUser }> {
  return apiFetch('/api/mobile/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

// The client runs the OAuth flow on-device (see api/useGoogleAuth.ts) and
// exchanges it for a Google ID token itself -- this only ever sends that
// token, never a client secret.
export async function googleSignIn(idToken: string): Promise<{ token: string; user: SessionUser }> {
  return apiFetch('/api/mobile/google-signin', { method: 'POST', body: JSON.stringify({ idToken }) });
}

// First-time "how will you use this platform?" picker for a brand-new
// Google sign-in (role starts 'unassigned'). Mirrors the web's /onboarding
// -> POST /api/auth/role.
export async function setRole(role: 'student' | 'employer'): Promise<{ message: string; role: string }> {
  return apiFetch('/api/auth/role', { method: 'POST', body: JSON.stringify({ role }) });
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

// Email-ownership verification -- same OTP pattern as password reset, sent
// automatically on registration. Both endpoints are unauthenticated.
export async function verifyEmail(email: string, otp: string): Promise<{ message: string }> {
  return apiFetch('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, otp }) });
}

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  return apiFetch('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
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
  // Optional in the type even though new postings require it server-side --
  // jobs created before this field existed may still lack it in the DB.
  department?: string;
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
  emailVerified?: boolean;
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
// POST /api/jobs (same route GET /api/jobs above already uses to fetch an
// employer's own postings, branched server-side by role) -- this is the
// one write path the employer's mobile client didn't have until the
// redesign's Employer Dashboard added a "+ Post a job" CTA. Mirrors the
// web post-job wizard's exact field set (src/app/(dashboard)/employer/
// post-job/page.tsx) so both clients hit the same validation.
export type JobPostInput = {
  title: string;
  location: string;
  type: 'On-site' | 'Remote' | 'Hybrid';
  duration: string;
  department: string;
  stipend?: string;
  description: string;
  requirements: string[];
  applicationMethod: 'platform' | 'email' | 'external';
  applicationEmail?: string;
  applicationUrl?: string;
  applicationDeadline?: string;
  maxApplicants?: number;
};

export async function createJob(input: JobPostInput): Promise<{ message: string; job: Job }> {
  return apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(input) });
}

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
