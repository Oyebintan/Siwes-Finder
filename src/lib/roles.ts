// Both 'admin' and 'super_admin' get full admin access; 'super_admin' additionally
// outranks 'admin' for actions that shouldn't let one admin knock out another
// (see the admin-user DELETE route).
export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}
