import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import Logbook from '@/models/Logbook';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/push';

const STREAK_REMINDER_DAYS = 2;

function isStale(date: Date | undefined, thresholdMs: number): boolean {
  if (!date) return false;
  return Date.now() - date.getTime() >= thresholdMs;
}

// POST, triggered daily by a scheduled GitHub Action (see
// .github/workflows/logbook-streak-reminders.yml) -- there's no user
// session on a cron-fired request, so this route is gated by a shared
// secret (CRON_SECRET, set identically in the GitHub Actions secret and
// the Vercel env var) instead of requireSession.
//
// Reminds students who have an active (Accepted) placement but haven't
// logged an entry in STREAK_REMINDER_DAYS -- using their placement's
// acceptance date as the reference when they've never logged at all, so a
// placement that started yesterday doesn't immediately nag.
export async function POST(req: Request) {
  // Trimmed on both sides: a stray trailing newline picked up when the
  // secret was copy-pasted into GitHub Actions or Vercel's env var UI
  // (both are easy to do with a generated hex string) would otherwise
  // make an otherwise-correct secret fail this comparison.
  const secret = process.env.CRON_SECRET?.trim();
  const provided = req.headers.get('x-cron-secret')?.trim();
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const placements = await Application.find({ status: 'Accepted' }).select('student updatedAt');
    if (placements.length === 0) {
      return NextResponse.json({ reminded: 0 }, { status: 200 });
    }

    const studentIds = placements.map((p) => p.student);
    const placedSince = new Map(placements.map((p) => [String(p.student), p.updatedAt as Date]));

    const lastLogged = await Logbook.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      { $group: { _id: '$studentId', lastDate: { $max: '$date' } } },
    ]);
    const lastLoggedByStudent = new Map(
      lastLogged.map((l: { _id: unknown; lastDate: Date }) => [String(l._id), l.lastDate])
    );

    const thresholdMs = STREAK_REMINDER_DAYS * 24 * 60 * 60 * 1000;
    const dueStudentIds = [...new Set(studentIds.map(String))].filter((id) => {
      const reference = lastLoggedByStudent.get(id) ?? placedSince.get(id);
      return isStale(reference, thresholdMs);
    });

    if (dueStudentIds.length === 0) {
      return NextResponse.json({ reminded: 0 }, { status: 200 });
    }

    const students = await User.find({ _id: { $in: dueStudentIds } }).select('expoPushToken');

    let reminded = 0;
    await Promise.allSettled(
      students.map(async (student) => {
        if (!student.expoPushToken) return;
        try {
          await sendPushNotification(
            student.expoPushToken,
            'Keep your logbook streak going 🔥',
            "You haven't logged your SIWES hours in a couple of days — add today's entry to stay on track.",
            { type: 'logbook-streak-reminder' }
          );
          reminded++;
        } catch (pushError) {
          console.error('Failed to send logbook streak reminder:', pushError);
        }
      })
    );

    return NextResponse.json({ reminded }, { status: 200 });
  } catch (error) {
    console.error('Logbook streak reminders error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
