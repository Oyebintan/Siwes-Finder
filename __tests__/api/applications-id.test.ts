// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Application', () => ({ default: { findOneAndUpdate: vi.fn() } }));
vi.mock('@/models/Job', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn() }));

import { PUT } from '@/app/api/applications/[id]/route';
import { requireSession } from '@/lib/mobileAuth';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/push';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/applications/app1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Default: no push token registered, so the push branch is a no-op unless a
// test explicitly overrides it.
function mockNoPushToken() {
  (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
}

describe('PUT /api/applications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoPushToken();
  });

  it('rejects non-employer sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const req = makeRequest({ status: 'Accepted' });
    const res = await PUT(req, { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it('rejects an invalid status', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await PUT(makeRequest({ status: 'Pending' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(400);
    expect(Application.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('404s when the application does not belong to this employer', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.findOneAndUpdate as any).mockResolvedValue(null);

    const res = await PUT(makeRequest({ status: 'Accepted' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(404);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('accepts an application scoped to the owning employer', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.findOneAndUpdate as any).mockResolvedValue({
      _id: 'app1',
      status: 'Accepted',
      student: 'stu1',
      job: 'job1',
    });

    const res = await PUT(makeRequest({ status: 'Accepted' }), { params: Promise.resolve({ id: 'app1' }) });

    expect(res.status).toBe(200);
    expect(Application.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'app1', employer: 'emp1' },
      { status: 'Accepted' },
      { new: true }
    );
  });

  it('sends a push notification when the student has a registered token', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.findOneAndUpdate as any).mockResolvedValue({
      _id: { toString: () => 'app1' },
      status: 'Accepted',
      student: 'stu1',
      job: 'job1',
    });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ expoPushToken: 'ExponentPushToken[xxx]' }) });
    (Job.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ title: 'Frontend Intern' }) });

    const res = await PUT(makeRequest({ status: 'Accepted' }), { params: Promise.resolve({ id: 'app1' }) });

    expect(res.status).toBe(200);
    expect(sendPushNotification).toHaveBeenCalledWith(
      'ExponentPushToken[xxx]',
      expect.stringMatching(/accepted/i),
      expect.stringContaining('Frontend Intern'),
      { type: 'application-status', applicationId: 'app1' }
    );
  });

  it('skips the push silently when the student has no registered token', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.findOneAndUpdate as any).mockResolvedValue({
      _id: 'app1',
      status: 'Rejected',
      student: 'stu1',
      job: 'job1',
    });

    const res = await PUT(makeRequest({ status: 'Rejected' }), { params: Promise.resolve({ id: 'app1' }) });

    expect(res.status).toBe(200);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('still returns the successful status update even if sending the push fails', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.findOneAndUpdate as any).mockResolvedValue({
      _id: 'app1',
      status: 'Accepted',
      student: 'stu1',
      job: 'job1',
    });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ expoPushToken: 'ExponentPushToken[xxx]' }) });
    (Job.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ title: 'Frontend Intern' }) });
    (sendPushNotification as any).mockRejectedValue(new Error('DeviceNotRegistered'));

    const res = await PUT(makeRequest({ status: 'Accepted' }), { params: Promise.resolve({ id: 'app1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('Accepted');
  });
});
