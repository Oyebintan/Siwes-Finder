// Admins are provisioned by email allowlist (there is no public admin signup).
// Set ADMIN_EMAILS="a@x.com,b@y.com" in the environment. Matching users are
// promoted to the 'admin' role the next time they sign in. SUPER_ADMIN_EMAILS
// works the same way but promotes to 'super_admin', which outranks 'admin'
// (e.g. a plain admin can't delete a super_admin's account).
//
// Shared by both sign-in paths (web credentials/Google via next-auth,
// mobile credentials/Google via the bearer-token routes) so the allowlist
// is read and applied identically no matter which client signed in.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

function isSuperAdminEmail(email?: string | null): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

// Resolves the allowlist-driven role for an email, or null if it isn't on
// either list. Super admin takes priority over plain admin.
export function resolvePrivilegedRole(email?: string | null): "super_admin" | "admin" | null {
  if (isSuperAdminEmail(email)) return "super_admin";
  if (isAdminEmail(email)) return "admin";
  return null;
}
