import mongoose, { Schema, Document } from 'mongoose';

// A lightweight message thread attached to one Application -- the student
// and the employer on that application are the only two parties who can
// ever read or post into it (enforced in the API route, not here).
export interface IMessage extends Document {
  application: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderRole: 'student' | 'employer';
  body: string;
  read: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['student', 'employer'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    // Flipped true when the other party fetches the thread -- see
    // GET /api/applications/[id]/messages.
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Thread fetch: every message for one application, oldest first.
MessageSchema.index({ application: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
