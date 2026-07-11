// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn(), findByIdAndUpdate: vi.fn() } }));

import { GET, PUT } from '@/app/api/profile/route';
import { requireSession } from '@/lib/mobileAuth';
import User from '@/models/User';

function makeGetRequest() {
  return new Request('http://localhost/api/profile');
}

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

  it('rejects unauthenticated requests (no cookie session, no bearer token)', async () => {
    (requireSession as any).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('404s when the user record is gone', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue(null);
    (User.findById as any).mockReturnValue({ select });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(404);
  });

  it("returns the caller's own profile from a cookie session", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ name: 'Ada' });
    (User.findById as any).mockReturnValue({ select });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe('Ada');
  });

  it("also serves a mobile bearer-token caller (requireSession is the single entry point for both)", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ name: 'Ada' });
    (User.findById as any).mockReturnValue({ select });

    const req = new Request('http://localhost/api/profile', {
      headers: { Authorization: 'Bearer mobile-token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(requireSession).toHaveBeenCalledWith(req);
  });
});

describe('PUT /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockUpdateResult(user: unknown) {
    (User.findByIdAndUpdate as any).mockReturnValue({ select: vi.fn().mockResolvedValue(user) });
  }

  it('rejects unauthenticated requests (no cookie session, no bearer token)', async () => {
    (requireSession as any).mockResolvedValue(null);
    const res = await PUT(makePutRequest({ university: 'UNILAG' }));
    expect(res.status).toBe(401);
  });

  it('404s when the user record is gone', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue(null);
    (User.findById as any).mockReturnValue({ select });

    const res = await PUT(makePutRequest({ university: 'UNILAG' }));
    expect(res.status).toBe(404);
  });

  it('only writes fields present in the request body (step-by-step wizard saves)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ university: 'UNILAG', courseOfStudy: 'CS', resumeUrl: undefined });
    (User.findById as any).mockReturnValue({ select });
    mockUpdateResult({ _id: 'u1' });

    await PUT(makePutRequest({ phone: '+2348000000000' }));

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { phone: '+2348000000000', isProfileComplete: false } },
      { new: true }
    );
  });

  it('marks isProfileComplete true once university, course, and resume are all present', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ university: 'UNILAG', courseOfStudy: 'CS', resumeUrl: undefined });
    (User.findById as any).mockReturnValue({ select });
    mockUpdateResult({ _id: 'u1' });

    await PUT(makePutRequest({ resumeLink: 'https://x/resume.pdf' }));

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { resumeUrl: 'https://x/resume.pdf', isProfileComplete: true } },
      { new: true }
    );
  });

  it('trims the name and drops an all-whitespace name update', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ university: undefined, courseOfStudy: undefined, resumeUrl: undefined });
    (User.findById as any).mockReturnValue({ select });
    mockUpdateResult({ _id: 'u1' });

    await PUT(makePutRequest({ name: '   ' }));

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { isProfileComplete: false } },
      { new: true }
    );
  });

  it("also accepts a mobile bearer-token caller and never leaks the password hash", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const select = vi.fn().mockResolvedValue({ university: 'UNILAG', courseOfStudy: 'CS', resumeUrl: 'https://x/r.pdf' });
    (User.findById as any).mockReturnValue({ select });
    const updateSelect = vi.fn().mockResolvedValue({ _id: 'u1', name: 'Ada' });
    (User.findByIdAndUpdate as any).mockReturnValue({ select: updateSelect });

    const req = new Request('http://localhost/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mobile-token' },
      body: JSON.stringify({ phone: '+2348000000000' }),
    });
    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(requireSession).toHaveBeenCalledWith(req);
    expect(data.user.password).toBeUndefined();
    expect(updateSelect).toHaveBeenCalledWith(expect.stringContaining('name'));
    expect(updateSelect.mock.calls[0][0]).not.toMatch(/password/);
  });
});
