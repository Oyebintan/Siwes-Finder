import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityMessage extends Document {
  student: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const CommunityMessageSchema: Schema = new Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// The chat feed reads newest-first (or a recent slice), always scoped by time.
CommunityMessageSchema.index({ createdAt: -1 });

export default mongoose.models.CommunityMessage ||
  mongoose.model<ICommunityMessage>('CommunityMessage', CommunityMessageSchema);
