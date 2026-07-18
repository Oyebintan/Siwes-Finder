import User from '@/models/User';
import { connectToDatabase } from './mongodb';
import { resolvePrivilegedRole } from './adminEmails';

export type GoogleProfile = {
  email: string;
  name?: string | null;
};

// Finds the user for a Google-authenticated email, creating one if this is
// their first sign-in. Shared between the web OAuth callback (next-auth's
// signIn, src/lib/auth.ts) and the mobile ID-token route
// (api/mobile/google-signin) so both paths land on the same account instead
// of silently forking into two half-provisioned users for one email.
export async function findOrCreateGoogleUser(profile: GoogleProfile) {
  await connectToDatabase();

  const existingUser = await User.findOne({ email: profile.email });
  if (!existingUser) {
    return User.create({
      name: profile.name,
      email: profile.email,
      role: resolvePrivilegedRole(profile.email) ?? 'unassigned',
    });
  }

  // Promote allowlisted emails to admin/super_admin on sign-in.
  const privilegedRole = resolvePrivilegedRole(existingUser.email);
  if (privilegedRole && existingUser.role !== privilegedRole) {
    existingUser.role = privilegedRole;
    await existingUser.save();
  }
  return existingUser;
}
