import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Schools see student records (logbooks, applications), so a school account
// must be admin-approved before any of its data endpoints work. Returns the
// school user document, or a { status, error } rejection. Accepts either the
// web's cookie session or the mobile app's bearer token, like every other
// requireSession-based route.
export async function requireApprovedSchool(req: Request): Promise<
  { school: { _id: unknown; name: string } } | { status: number; error: string }
> {
  const session = await requireSession(req);
  if (!session || session.user.role !== 'school') {
    return { status: 401, error: 'Unauthorized' };
  }

  await connectToDatabase();

  const school = await User.findById(session.user.id).select('name verificationStatus');
  if (!school) {
    return { status: 404, error: 'School account not found' };
  }
  if (school.verificationStatus !== 'approved') {
    return {
      status: 403,
      error: 'Your school account is awaiting admin verification. Student records unlock once an admin approves it.',
    };
  }

  return { school };
}

// Students belong to a school when the university they typed matches the
// school account's institution name (case-insensitive).
export function studentsOfSchoolFilter(schoolName: string) {
  return {
    role: 'student',
    university: new RegExp(`^\\s*${escapeRegex(schoolName.trim())}\\s*$`, 'i'),
  };
}
