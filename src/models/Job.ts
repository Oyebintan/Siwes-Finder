import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationMethod = 'platform' | 'email' | 'external';

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
  // How students apply to this placement:
  //  - platform: apply in-app (creates an Application)
  //  - email:    students are directed to applicationEmail
  //  - external: students are redirected to applicationUrl
  applicationMethod: ApplicationMethod;
  applicationEmail?: string;
  applicationUrl?: string;
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

    applicationMethod: {
      type: String,
      enum: ['platform', 'email', 'external'],
      default: 'platform',
      required: true,
    },
    applicationEmail: { type: String },
    applicationUrl: { type: String },
  },
  { timestamps: true }
);

// Employer dashboard (own jobs, newest first) and the public listing feed.
JobSchema.index({ employerId: 1, createdAt: -1 });
JobSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
