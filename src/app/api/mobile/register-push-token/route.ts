import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';
import { isValidExpoPushToken } from '@/lib/push';

// Called by the mobile app once it has notification permission and an Expo
// push token. Requires a bearer token (or cookie, for consistency with
// every other requireSession route), even though only the mobile app is
// expected to ever call this.
export async function POST(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token || typeof token !== 'string' || !isValidExpoPushToken(token)) {
      return NextResponse.json({ error: 'A valid Expo push token is required.' }, { status: 400 });
    }

    await connectToDatabase();
    await User.findByIdAndUpdate(session.user.id, { expoPushToken: token });

    return NextResponse.json({ message: 'Push token registered' }, { status: 200 });
  } catch (error) {
    console.error('Register push token error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
