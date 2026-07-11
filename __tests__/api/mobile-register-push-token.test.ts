// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findByIdAndUpdate: vi.fn() } }));
vi.mock('@/lib/push', () => ({ isValidExpoPushToken: vi.fn() }));

import { POST } from '@/app/api/mobile/register-push-token/route';
import { requireSession } from '@/lib/mobileAuth';
import User from '@/models/User';
import { isValidExpoPushToken } from '@/lib/push';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/mobile/register-push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

describe('POST /api/mobile/register-push-token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (requireSession as any).mockResolvedValue(null);
    const req = makeRequest({ token: VALID_TOKEN });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it('rejects a missing token', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a malformed token', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (isValidExpoPushToken as any).mockReturnValue(false);

    const res = await POST(makeRequest({ token: 'not-a-real-token' }));
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('saves a valid token to the caller\'s user record', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (isValidExpoPushToken as any).mockReturnValue(true);
    (User.findByIdAndUpdate as any).mockResolvedValue({ _id: 'u1' });

    const res = await POST(makeRequest({ token: VALID_TOKEN }));

    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { expoPushToken: VALID_TOKEN });
  });
});
