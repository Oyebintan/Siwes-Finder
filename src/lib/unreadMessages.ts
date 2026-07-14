import mongoose from 'mongoose';
import Message from '@/models/Message';

// applicationId -> number of messages the viewer hasn't read yet (i.e.
// sent by the OTHER party and still read: false). One aggregate for a
// whole list page, instead of a query per application row.
export async function unreadCountsByApplication(
  applicationIds: Array<string | mongoose.Types.ObjectId>,
  viewerRole: 'student' | 'employer'
): Promise<Record<string, number>> {
  if (applicationIds.length === 0) return {};
  const otherRole = viewerRole === 'student' ? 'employer' : 'student';
  const rows: Array<{ _id: mongoose.Types.ObjectId; count: number }> = await Message.aggregate([
    {
      $match: {
        application: { $in: applicationIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
        senderRole: otherRole,
        read: false,
      },
    },
    { $group: { _id: '$application', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}
