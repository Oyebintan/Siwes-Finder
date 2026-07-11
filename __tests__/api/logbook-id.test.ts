// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Logbook', () => ({ default: { findOneAndUpdate: vi.fn() } }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn() }));

import { PUT } from '@/app/api/logbook/[id]/route';
import { requireSession } from '@/lib/mobileAuth';
import Logbook from '@/models/Logbook';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/push';

function makeRequest() {
  return new Request('http://localhost/api/logbook/log1', { method: 'PUT' });
}

function mockNoPushToken() {
  (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
}

describe('PUT /api/logbook/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoPushToken();
  });

  it('rejects non-employer sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const req = makeRequest();
    const res = await PUT(req, { params: Promise.resolve({ id: 'log1' }) });
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it("404s when the log doesn't belong to this employer", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Logbook.findOneAndUpdate as any).mockResolvedValue(null);

    const res = await PUT(makeRequest(), { params: Promise.resolve({ id: 'log1' }) });
    expect(res.status).toBe(404);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('approves an entry scoped to the owning employer', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Logbook.findOneAndUpdate as any).mockResolvedValue({
      _id: 'log1',
      studentId: 'stu1',
      weekNumber: 2,
      dayOfWeek: 'Tuesday',
      isApproved: true,
    });

    const res = await PUT(makeRequest(), { params: Promise.resolve({ id: 'log1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isApproved).toBe(true);
    expect(Logbook.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'log1', employerId: 'emp1' },
      { isApproved: true },
      { new: true }
    );
  });

  it("sends a push to the student when they have a registered token, without leaking it in the response", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Logbook.findOneAndUpdate as any).mockResolvedValue({
      _id: { toString: () => 'log1' },
      studentId: 'stu1',
      weekNumber: 2,
      dayOfWeek: 'Tuesday',
      isApproved: true,
    });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ expoPushToken: 'ExponentPushToken[xxx]' }) });

    const res = await PUT(makeRequest(), { params: Promise.resolve({ id: 'log1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.expoPushToken).toBeUndefined();
    expect(sendPushNotification).toHaveBeenCalledWith(
      'ExponentPushToken[xxx]',
      expect.stringMatching(/approved/i),
      expect.stringContaining('Week 2'),
      { type: 'logbook-approval', logbookId: 'log1' }
    );
  });

  it('still returns the approval even if sending the push fails', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Logbook.findOneAndUpdate as any).mockResolvedValue({
      _id: 'log1',
      studentId: 'stu1',
      weekNumber: 2,
      dayOfWeek: 'Tuesday',
      isApproved: true,
    });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ expoPushToken: 'ExponentPushToken[xxx]' }) });
    (sendPushNotification as any).mockRejectedValue(new Error('DeviceNotRegistered'));

    const res = await PUT(makeRequest(), { params: Promise.resolve({ id: 'log1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isApproved).toBe(true);
  });
});
