import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  job: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  employer: mongoose.Types.ObjectId;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  },
  { timestamps: true }
);

// A student can only apply to a given job once. This is the real guard against
// duplicate applications (the app-level check is racy under concurrent requests).
ApplicationSchema.index({ job: 1, student: 1 }, { unique: true });

// Support the dashboard list queries, which filter by owner and sort by newest.
ApplicationSchema.index({ student: 1, createdAt: -1 });
ApplicationSchema.index({ employer: 1, createdAt: -1 });

export default mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
