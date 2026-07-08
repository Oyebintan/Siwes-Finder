// @vitest-environment node
import { describe, expect, it } from 'vitest';
import User from '@/models/User';

describe('User model', () => {
  it('requires name and email', async () => {
    const user = new User({});
    await expect(user.validate()).rejects.toMatchObject({
      errors: { name: expect.anything(), email: expect.anything() },
    });
  });

  it('defaults role to unassigned and verificationStatus to unsubmitted', async () => {
    const user = new User({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(user.role).toBe('unassigned');
    expect(user.verificationStatus).toBe('unsubmitted');
    expect(user.isProfileComplete).toBe(false);
    await expect(user.validate()).resolves.toBeUndefined();
  });

  it('accepts the super_admin role', async () => {
    const user = new User({ name: 'Ada', email: 'ada@example.com', role: 'super_admin' });
    await expect(user.validate()).resolves.toBeUndefined();
  });

  it('rejects an invalid role', async () => {
    const user = new User({ name: 'Ada', email: 'ada@example.com', role: 'superadmin' });
    await expect(user.validate()).rejects.toMatchObject({
      errors: { role: expect.anything() },
    });
  });

  it('rejects an invalid verificationStatus', async () => {
    const user = new User({
      name: 'Ada',
      email: 'ada@example.com',
      verificationStatus: 'not-a-status',
    });
    await expect(user.validate()).rejects.toMatchObject({
      errors: { verificationStatus: expect.anything() },
    });
  });

  it('accepts a full student profile', async () => {
    const user = new User({
      name: 'Ada',
      email: 'ada@example.com',
      role: 'student',
      university: 'UNILAG',
      courseOfStudy: 'Computer Science',
      skills: ['React', 'Node'],
    });
    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.skills).toEqual(['React', 'Node']);
  });
});
