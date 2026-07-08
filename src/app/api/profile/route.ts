import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).select(
    'university courseOfStudy level skills resumeUrl siwesStartDate siwesDuration preferredState isProfileComplete'
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { university, course, resumeLink, level, skills, siwesStartDate, siwesDuration, preferredState } = body;

    await connectToDatabase();

    const existing = await User.findById(session.user.id).select('university courseOfStudy resumeUrl');
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only overwrite fields that were actually sent, so the wizard can save
    // progress step-by-step without clobbering fields from other steps.
    const update: Record<string, unknown> = {};
    if (university !== undefined) update.university = university;
    if (course !== undefined) update.courseOfStudy = course;
    if (resumeLink !== undefined) update.resumeUrl = resumeLink;
    if (level !== undefined) update.level = level;
    if (Array.isArray(skills)) update.skills = skills;
    if (siwesStartDate !== undefined) update.siwesStartDate = siwesStartDate;
    if (siwesDuration !== undefined) update.siwesDuration = siwesDuration;
    if (preferredState !== undefined) update.preferredState = preferredState;

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
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Profile updated successfully', user: updatedUser },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}