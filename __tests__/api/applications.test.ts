// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Application', () => ({
  default: { create: vi.fn(), findOne: vi.fn(), find: vi.fn() },
}));
vi.mock('@/models/Job', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));

import { GET, POST } from '@/app/api/applications/route';
import { requireSession } from '@/lib/mobileAuth';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest() {
  return new Request('http://localhost/api/applications');
}

const completeStudent = { university: 'UNILAG', courseOfStudy: 'CS', resumeUrl: 'http://x/resume.pdf', emailVerified: true };
const approvedEmployer = { verificationStatus: 'approved' };
const visibleJob = { _id: 'job1', employerId: 'emp1', isActive: true, applicationMethod: 'platform' };

describe('POST /api/applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const req = makePostRequest({ jobId: 'job1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it('rejects a request missing jobId', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects a student who has not verified their email (verification on)', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    try {
      (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
      (User.findById as any).mockResolvedValue({ ...completeStudent, emailVerified: false });

      const res = await POST(makePostRequest({ jobId: 'job1' }));
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toMatch(/verify your email/i);
      expect(data.code).toBe('EMAIL_NOT_VERIFIED');
      expect(Application.create).not.toHaveBeenCalled();
    } finally {
      delete process.env.REQUIRE_EMAIL_VERIFICATION;
    }
  });

  it('skips the email gate when verification is switched off (the default)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    // An unverified account sails past the email gate and hits the next
    // check (incomplete profile) instead of EMAIL_NOT_VERIFIED.
    (User.findById as any).mockResolvedValue({ university: 'UNILAG', emailVerified: false });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/complete your profile/i);
  });

  it('rejects an incomplete student profile', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue({ university: 'UNILAG', emailVerified: true });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/complete your profile/i);
    expect(Application.create).not.toHaveBeenCalled();
  });

  it('404s when the job does not exist', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    (Job.findById as any).mockResolvedValue(null);

    const res = await POST(makePostRequest({ jobId: 'missing-job' }));
    expect(res.status).toBe(404);
  });

  it("hides an unverified employer's job (404, matching the browse feed)", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce({ verificationStatus: 'pending' });
    (Job.findById as any).mockResolvedValue(visibleJob);

    const res = await POST(makePostRequest({ jobId: 'job1' }));

    expect(res.status).toBe(404);
    expect(Application.create).not.toHaveBeenCalled();
  });

  it('rejects in-app applications to email/external jobs', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce(approvedEmployer);
    (Job.findById as any).mockResolvedValue({ ...visibleJob, applicationMethod: 'email' });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/outside the platform/i);
    expect(Application.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate application (pre-check)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce(approvedEmployer);
    (Job.findById as any).mockResolvedValue({ ...visibleJob, applicantCount: 0 });
    (Application.findOne as any).mockResolvedValue({ _id: 'existing' });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already applied/i);
  });

  it('translates a duplicate-key race (E11000) into the same friendly message', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce(approvedEmployer);
    (Job.findById as any).mockResolvedValue({ ...visibleJob, applicantCount: 0 });
    (Application.findOne as any).mockResolvedValue(null);
    (Application.create as any).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already applied/i);
  });

  it('rejects applying to a job that is no longer open (inactive)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce(approvedEmployer);
    (Job.findById as any).mockResolvedValue({ ...visibleJob, isActive: false, applicantCount: 0 });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/no longer accepting applications/i);
    expect(Application.create).not.toHaveBeenCalled();
  });

  it('rejects applying to a job whose application deadline has passed, and persists the auto-close', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce(approvedEmployer);
    const job: any = {
      ...visibleJob,
      applicantCount: 0,
      applicationDeadline: new Date('2000-01-01'),
      save: vi.fn().mockResolvedValue(undefined),
    };
    (Job.findById as any).mockResolvedValue(job);

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/no longer accepting applications/i);
    expect(job.isActive).toBe(false);
    expect(job.save).toHaveBeenCalled();
  });

  it('creates the application on success', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce(approvedEmployer);
    const job: any = { ...visibleJob, applicantCount: 0, save: vi.fn().mockResolvedValue(undefined) };
    (Job.findById as any).mockResolvedValue(job);
    (Application.findOne as any).mockResolvedValue(null);
    (Application.create as any).mockResolvedValue({ _id: 'app1', status: 'Pending' });

    const res = await POST(makePostRequest({ jobId: 'job1' }));

    expect(res.status).toBe(201);
    expect(Application.create).toHaveBeenCalledWith({
      job: 'job1',
      student: 'stu1',
      employer: 'emp1',
      status: 'Pending',
    });
    expect(job.applicantCount).toBe(1);
    expect(job.save).toHaveBeenCalled();
  });

  it('auto-closes the job when this application fills the last available slot', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any)
      .mockResolvedValueOnce(completeStudent)
      .mockResolvedValueOnce(approvedEmployer);
    const job: any = {
      ...visibleJob,
      applicantCount: 4,
      maxApplicants: 5,
      save: vi.fn().mockResolvedValue(undefined),
    };
    (Job.findById as any).mockResolvedValue(job);
    (Application.findOne as any).mockResolvedValue(null);
    (Application.create as any).mockResolvedValue({ _id: 'app1', status: 'Pending' });

    const res = await POST(makePostRequest({ jobId: 'job1' }));

    expect(res.status).toBe(201);
    expect(job.applicantCount).toBe(5);
    expect(job.isActive).toBe(false);
    expect(job.save).toHaveBeenCalled();
  });
});

describe('GET /api/applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (requireSession as any).mockResolvedValue(null);
    const req = makeGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it('returns the invalid-role error for a session with no recognized role', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it("returns the student's own applications, populated with job + employer", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'app1' }]);
    const populate = vi.fn().mockReturnValue({ sort });
    (Application.find as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(Application.find).toHaveBeenCalledWith({ student: 'stu1' });
    expect(data).toEqual([{ _id: 'app1' }]);
  });
});
