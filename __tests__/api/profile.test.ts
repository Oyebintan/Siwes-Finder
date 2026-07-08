// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn(), findByIdAndUpdate: vi.fn() } }));

import { GET, PUT } from '@/app/api/profile/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';

function makePutRequest(body: unknown) {
  return new Request('http://localhost/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('404s when the user record is gone', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue(null);
    (User.findById as any).mockReturnValue({ select });

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns the caller's own profile", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ name: 'Ada' });
    (User.findById as any).mockReturnValue({ select });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe('Ada');
  });
});

describe('PUT /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await PUT(makePutRequest({ university: 'UNILAG' }));
    expect(res.status).toBe(401);
  });

  it('404s when the user record is gone', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue(null);
    (User.findById as any).mockReturnValue({ select });

    const res = await PUT(makePutRequest({ university: 'UNILAG' }));
    expect(res.status).toBe(404);
  });

  it('only writes fields present in the request body (step-by-step wizard saves)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ university: 'UNILAG', courseOfStudy: 'CS', resumeUrl: undefined });
    (User.findById as any).mockReturnValue({ select });
    (User.findByIdAndUpdate as any).mockResolvedValue({ _id: 'u1' });

    await PUT(makePutRequest({ phone: '+2348000000000' }));

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { phone: '+2348000000000', isProfileComplete: false } },
      { new: true }
    );
  });

  it('marks isProfileComplete true once university, course, and resume are all present', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ university: 'UNILAG', courseOfStudy: 'CS', resumeUrl: undefined });
    (User.findById as any).mockReturnValue({ select });
    (User.findByIdAndUpdate as any).mockResolvedValue({ _id: 'u1' });

    await PUT(makePutRequest({ resumeLink: 'https://x/resume.pdf' }));

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { resumeUrl: 'https://x/resume.pdf', isProfileComplete: true } },
      { new: true }
    );
  });

  it('trims the name and drops an all-whitespace name update', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ university: undefined, courseOfStudy: undefined, resumeUrl: undefined });
    (User.findById as any).mockReturnValue({ select });
    (User.findByIdAndUpdate as any).mockResolvedValue({ _id: 'u1' });

    await PUT(makePutRequest({ name: '   ' }));

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { isProfileComplete: false } },
      { new: true }
    );
  });
});
