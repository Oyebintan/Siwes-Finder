import { describe, expect, it } from 'vitest';
import { isAdminRole } from '@/lib/roles';

describe('isAdminRole', () => {
  it('accepts admin and super_admin', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('super_admin')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isAdminRole('employer')).toBe(false);
    expect(isAdminRole('student')).toBe(false);
    expect(isAdminRole('unassigned')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});
