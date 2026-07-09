// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Application', () => ({
  default: { create: vi.fn(), findOne: vi.fn(), find: vi.fn() },
}));
vi.mock('@/models/Job', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));

import { GET, POST } from '@/app/api/applications/route';
import { getServerSession } from 'next-auth/next';
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

const completeStudent = { university: 'UNILAG', courseOfStudy: 'CS', resumeUrl: 'http://x/resume.pdf' };

describe('POST /api/applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const res = await POST(makePostRequest({ jobId: 'job1' }));
    expect(res.status).toBe(401);
  });

  it('rejects a request missing jobId', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects an incomplete student profile', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue({ university: 'UNILAG' });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/complete your profile/i);
    expect(Application.create).not.toHaveBeenCalled();
  });

  it('404s when the job does not exist', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    (Job.findById as any).mockResolvedValue(null);

    const res = await POST(makePostRequest({ jobId: 'missing-job' }));
    expect(res.status).toBe(404);
  });

  it('rejects a duplicate application (pre-check)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    (Job.findById as any).mockResolvedValue({ _id: 'job1', employerId: 'emp1', isActive: true, applicantCount: 0 });
    (Application.findOne as any).mockResolvedValue({ _id: 'existing' });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already applied/i);
  });

  it('translates a duplicate-key race (E11000) into the same friendly message', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    (Job.findById as any).mockResolvedValue({ _id: 'job1', employerId: 'emp1', isActive: true, applicantCount: 0 });
    (Application.findOne as any).mockResolvedValue(null);
    (Application.create as any).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already applied/i);
  });

  it('rejects applying to a job that is no longer open (inactive)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    (Job.findById as any).mockResolvedValue({ _id: 'job1', employerId: 'emp1', isActive: false, applicantCount: 0 });

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/no longer accepting applications/i);
    expect(Application.create).not.toHaveBeenCalled();
  });

  it('rejects applying to a job whose application deadline has passed, and persists the auto-close', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    const job: any = {
      _id: 'job1',
      employerId: 'emp1',
      isActive: true,
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
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    const job: any = { _id: 'job1', employerId: 'emp1', isActive: true, applicantCount: 0, save: vi.fn().mockResolvedValue(undefined) };
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
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockResolvedValue(completeStudent);
    const job: any = {
      _id: 'job1',
      employerId: 'emp1',
      isActive: true,
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
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns the invalid-role error for a session with no recognized role', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const res = await GET();
    expect(res.status).toBe(400);
  });

  it("returns the student's own applications, populated with job + employer", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'app1' }]);
    const populate = vi.fn().mockReturnValue({ sort });
    (Application.find as any).mockReturnValue({ populate });

    const res = await GET();
    const data = await res.json();

    expect(Application.find).toHaveBeenCalledWith({ student: 'stu1' });
    expect(data).toEqual([{ _id: 'app1' }]);
  });
});
