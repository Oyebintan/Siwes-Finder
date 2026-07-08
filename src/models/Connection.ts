import mongoose, { Schema, Document } from 'mongoose';

export type ConnectionStatus = 'pending' | 'accepted';

export interface IConnection extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: ConnectionStatus;
  createdAt: Date;
}

const ConnectionSchema: Schema = new Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true }
);

// One connection per pair -- lookups check both directions before creating.
ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });
ConnectionSchema.index({ recipient: 1, status: 1 });

export default mongoose.models.Connection || mongoose.model<IConnection>('Connection', ConnectionSchema);
