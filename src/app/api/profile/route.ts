import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';

// Fields safe to return to the client -- excludes password (hash) and other
// internal-only fields (resetOtpHash/resetOtpExpires).
const SAFE_PROFILE_FIELDS =
  'name email phone avatarUrl university faculty courseOfStudy level skills resumeUrl siwesStartDate siwesDuration preferredState isProfileComplete';

// GET accepts both the web's cookie session and the mobile app's bearer
// token (requireSession checks cookie first, falls back to
// Authorization: Bearer) -- it's the first route retrofitted this way, as
// the Phase 0 proof that a route can serve both clients. See MOBILE_APP.md.
export async function GET(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).select(SAFE_PROFILE_FIELDS);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  try {
    const session = await requireSession(req);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { university, faculty, course, resumeLink, level, skills, siwesStartDate, siwesDuration, preferredState, name, phone, avatarUrl } = body;

    await connectToDatabase();

    const existing = await User.findById(session.user.id).select('university courseOfStudy resumeUrl');
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only overwrite fields that were actually sent, so the wizard can save
    // progress step-by-step without clobbering fields from other steps.
    const update: Record<string, unknown> = {};
    if (university !== undefined) update.university = university;
    if (faculty !== undefined) update.faculty = faculty;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (course !== undefined) update.courseOfStudy = course;
    if (resumeLink !== undefined) update.resumeUrl = resumeLink;
    if (level !== undefined) update.level = level;
    if (Array.isArray(skills)) update.skills = skills;
    if (siwesStartDate !== undefined) update.siwesStartDate = siwesStartDate;
    if (siwesDuration !== undefined) update.siwesDuration = siwesDuration;
    if (preferredState !== undefined) update.preferredState = preferredState;
    if (name !== undefined && String(name).trim()) update.name = String(name).trim();
    if (phone !== undefined) update.phone = phone;

    const finalUniversity = university !== undefined ? university : existing.university;
    const finalCourse = course !== undefined ? course : existing.courseOfStudy;
    const finalResume = resumeLink !== undefined ? resumeLink : existing.resumeUrl;
    update.isProfileComplete = Boolean(finalUniversity && finalCourse && finalResume);

    // Field names here must match the User schema exactly (courseOfStudy / resumeUrl),
    // otherwise Mongoose silently drops them and nothing is actually saved.
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: update },
      { new: true }
    ).select(SAFE_PROFILE_FIELDS);

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Profile updated successfully', user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}