// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

// ADMIN_EMAILS/SUPER_ADMIN_EMAILS are read from process.env once at module
// scope (real deployments only ever set these at process start), so each
// case here resets the module registry and re-imports after setting the
// env var it wants to exercise.
async function resolveWithEnv(env: Record<string, string | undefined>, email: string | null) {
  const originalEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  const { resolvePrivilegedRole } = await import('@/lib/adminEmails');
  const result = resolvePrivilegedRole(email);
  process.env = originalEnv;
  return result;
}

describe('resolvePrivilegedRole', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('returns null for an email on neither allowlist', async () => {
    const role = await resolveWithEnv({ ADMIN_EMAILS: 'admin@example.com' }, 'nobody@example.com');
    expect(role).toBeNull();
  });

  it('matches an admin email case-insensitively', async () => {
    const role = await resolveWithEnv({ ADMIN_EMAILS: 'Admin@Example.com' }, 'admin@example.com');
    expect(role).toBe('admin');
  });

  it('matches an admin email from a comma-separated list with surrounding whitespace', async () => {
    const role = await resolveWithEnv({ ADMIN_EMAILS: ' a@x.com , admin@example.com ' }, 'admin@example.com');
    expect(role).toBe('admin');
  });

  it('gives super_admin priority over a plain admin match for the same email', async () => {
    const role = await resolveWithEnv(
      { ADMIN_EMAILS: 'root@example.com', SUPER_ADMIN_EMAILS: 'root@example.com' },
      'root@example.com'
    );
    expect(role).toBe('super_admin');
  });

  it('returns null when the allowlist env vars are unset', async () => {
    const role = await resolveWithEnv({ ADMIN_EMAILS: undefined, SUPER_ADMIN_EMAILS: undefined }, 'anyone@example.com');
    expect(role).toBeNull();
  });
});
