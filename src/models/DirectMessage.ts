import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const DirectMessageSchema: Schema = new Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// A 1:1 thread is always queried by the pair, ordered chronologically.
DirectMessageSchema.index({ from: 1, to: 1, createdAt: 1 });

export default mongoose.models.DirectMessage || mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema);
