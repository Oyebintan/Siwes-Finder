// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('@/lib/adminEmails', () => ({ resolvePrivilegedRole: vi.fn() }));

import { findOrCreateGoogleUser } from '@/lib/googleAuth';
import { resolvePrivilegedRole } from '@/lib/adminEmails';
import User from '@/models/User';

describe('findOrCreateGoogleUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new unassigned user on first Google sign-in', async () => {
    (resolvePrivilegedRole as any).mockReturnValue(null);
    (User.findOne as any).mockResolvedValue(null);
    (User.create as any).mockResolvedValue({ _id: 'u1', email: 'ada@example.com', role: 'unassigned' });

    const user = await findOrCreateGoogleUser({ email: 'ada@example.com', name: 'Ada' });

    expect(User.create).toHaveBeenCalledWith({ name: 'Ada', email: 'ada@example.com', role: 'unassigned' });
    expect(user.role).toBe('unassigned');
  });

  it('creates a brand-new signup straight into an allowlisted admin role', async () => {
    (resolvePrivilegedRole as any).mockReturnValue('admin');
    (User.findOne as any).mockResolvedValue(null);
    (User.create as any).mockResolvedValue({ _id: 'u1', email: 'admin@example.com', role: 'admin' });

    await findOrCreateGoogleUser({ email: 'admin@example.com', name: 'Admin' });

    expect(User.create).toHaveBeenCalledWith({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  });

  it('returns the existing user unchanged when not allowlisted', async () => {
    (resolvePrivilegedRole as any).mockReturnValue(null);
    const existing = { _id: 'u1', email: 'ada@example.com', role: 'student', save: vi.fn() };
    (User.findOne as any).mockResolvedValue(existing);

    const user = await findOrCreateGoogleUser({ email: 'ada@example.com', name: 'Ada' });

    expect(user).toBe(existing);
    expect(existing.save).not.toHaveBeenCalled();
  });

  it('promotes an existing account to admin on sign-in when newly allowlisted', async () => {
    (resolvePrivilegedRole as any).mockReturnValue('admin');
    const existing = { _id: 'u1', email: 'ada@example.com', role: 'student', save: vi.fn() };
    (User.findOne as any).mockResolvedValue(existing);

    const user = await findOrCreateGoogleUser({ email: 'ada@example.com', name: 'Ada' });

    expect(user.role).toBe('admin');
    expect(existing.save).toHaveBeenCalled();
  });

  it('never downgrades an existing super_admin', async () => {
    (resolvePrivilegedRole as any).mockReturnValue(null);
    const existing = { _id: 'u1', email: 'root@example.com', role: 'super_admin', save: vi.fn() };
    (User.findOne as any).mockResolvedValue(existing);

    const user = await findOrCreateGoogleUser({ email: 'root@example.com', name: 'Root' });

    expect(user.role).toBe('super_admin');
    expect(existing.save).not.toHaveBeenCalled();
  });
});
