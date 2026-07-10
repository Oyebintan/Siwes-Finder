import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Schools see student records (logbooks, applications), so a school account
// must be admin-approved before any of its data endpoints work. Returns the
// school user document, or a { status, error } rejection.
export async function requireApprovedSchool(): Promise<
  { school: { _id: unknown; name: string } } | { status: number; error: string }
> {
  const session = await getServerSession(authOptions);
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
