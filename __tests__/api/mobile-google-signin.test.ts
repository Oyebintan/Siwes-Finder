// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(function OAuth2ClientMock(this: any) {
    this.verifyIdToken = verifyIdToken;
  }),
}));
vi.mock('@/lib/googleAuth', () => ({ findOrCreateGoogleUser: vi.fn() }));
vi.mock('@/lib/mobileAuth', () => ({ issueMobileToken: vi.fn() }));
// rateLimitGuard (called before verifyIdToken) reaches into
// checkRateLimit -> connectToDatabase() -- mock it out so that real path
// never attempts a live MongoDB connection, same as mobile-login.test.ts.
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));

import { POST } from '@/app/api/mobile/google-signin/route';
import { findOrCreateGoogleUser } from '@/lib/googleAuth';
import { issueMobileToken } from '@/lib/mobileAuth';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/mobile/google-signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/mobile/google-signin', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('is disabled (503) when no Google client ID is configured for any platform', async () => {
    delete process.env.GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.GOOGLE_IOS_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    const res = await POST(makeRequest({ idToken: 'token' }));
    expect(res.status).toBe(503);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects a request missing the ID token', async () => {
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client-id';

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects a token that fails Google verification', async () => {
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client-id';
    verifyIdToken.mockRejectedValue(new Error('invalid signature'));

    const res = await POST(makeRequest({ idToken: 'bad-token' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/invalid google sign-in/i);
    expect(findOrCreateGoogleUser).not.toHaveBeenCalled();
  });

  it('rejects a verified token whose email Google has not itself verified', async () => {
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client-id';
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'ada@example.com', email_verified: false, name: 'Ada' }),
    });

    const res = await POST(makeRequest({ idToken: 'token' }));
    expect(res.status).toBe(401);
    expect(findOrCreateGoogleUser).not.toHaveBeenCalled();
  });

  it('verifies against every configured platform client ID', async () => {
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client-id';
    process.env.GOOGLE_IOS_CLIENT_ID = 'ios-client-id';
    process.env.GOOGLE_CLIENT_ID = 'web-client-id';
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'ada@example.com', email_verified: true, name: 'Ada' }),
    });
    (findOrCreateGoogleUser as any).mockResolvedValue({
      _id: { toString: () => 'u1' },
      email: 'ada@example.com',
      name: 'Ada',
      role: 'student',
      emailVerified: true,
    });
    (issueMobileToken as any).mockResolvedValue('signed-jwt');

    await POST(makeRequest({ idToken: 'good-token' }));

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'good-token',
      audience: ['android-client-id', 'ios-client-id', 'web-client-id'],
    });
  });

  it('issues a bearer token and finds-or-creates the user on success', async () => {
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client-id';
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'ada@example.com', email_verified: true, name: 'Ada' }),
    });
    (findOrCreateGoogleUser as any).mockResolvedValue({
      _id: { toString: () => 'u1' },
      email: 'ada@example.com',
      name: 'Ada',
      role: 'unassigned',
      emailVerified: false,
    });
    (issueMobileToken as any).mockResolvedValue('signed-jwt');

    const res = await POST(makeRequest({ idToken: 'good-token' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(findOrCreateGoogleUser).toHaveBeenCalledWith({ email: 'ada@example.com', name: 'Ada' });
    expect(data.token).toBe('signed-jwt');
    expect(data.user).toEqual({
      id: 'u1',
      role: 'unassigned',
      email: 'ada@example.com',
      name: 'Ada',
      // Verification is switched off by default, so a brand-new (unverified)
      // Google account is still reported as verified -- same rule
      // /api/mobile/login applies.
      emailVerified: true,
    });
  });
});
