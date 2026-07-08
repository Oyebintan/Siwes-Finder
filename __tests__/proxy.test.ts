// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));

import { proxy } from '@/proxy';
import { getToken } from 'next-auth/jwt';

function makeRequest(path: string) {
  return new NextRequest(new URL(path, 'http://localhost'));
}

describe('proxy (role-gated dashboard routes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated visitors to login with a callbackUrl', async () => {
    (getToken as any).mockResolvedValue(null);

    const res = await proxy(makeRequest('/student/dashboard'));

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe('/student/dashboard');
  });

  it('lets a matching role through', async () => {
    (getToken as any).mockResolvedValue({ role: 'student' });

    const res = await proxy(makeRequest('/student/dashboard'));

    expect(res.headers.get('location')).toBeNull();
  });

  it("bounces a mismatched role to that role's own home", async () => {
    (getToken as any).mockResolvedValue({ role: 'student' });

    const res = await proxy(makeRequest('/admin/dashboard'));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/student/dashboard');
  });

  it("sends an unassigned role to onboarding when it doesn't match", async () => {
    (getToken as any).mockResolvedValue({ role: 'unassigned' });

    const res = await proxy(makeRequest('/employer/dashboard'));

    expect(new URL(res.headers.get('location')!).pathname).toBe('/onboarding');
  });

  it('leaves non-gated routes alone even without a required role match', async () => {
    (getToken as any).mockResolvedValue({ role: 'student' });

    const res = await proxy(makeRequest('/some-other-path'));

    expect(res.headers.get('location')).toBeNull();
  });
});
