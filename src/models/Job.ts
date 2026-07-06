import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  employerId: mongoose.Types.ObjectId;
  title: string;
  location: string;
  type: 'On-site' | 'Remote' | 'Hybrid';
  duration: string; // e.g., '6 Months'
  requirements: string[];
  description: string;
  stipend?: string;
  isActive: boolean;
  createdAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, enum: ['On-site', 'Remote', 'Hybrid'], required: true },
    duration: { type: String, required: true },
    requirements: { type: [String], required: true },
    description: { type: String, required: true },
    stipend: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
