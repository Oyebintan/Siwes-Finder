// Restored endpoint, kept callable for API compatibility. It is deliberately
// just an alias of /api/auth/role so the two can never drift apart again:
// that handler only accepts student/employer and only while the account is
// still 'unassigned', so a direct POST here can never downgrade an existing
// role (most importantly admin/super_admin).
export { POST } from '../role/route';
