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

export default mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
