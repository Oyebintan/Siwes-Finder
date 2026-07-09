import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'student' | 'employer' | 'admin' | 'super_admin' | 'unassigned';
export type VerificationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional because Google users won't have one
  role: UserRole;
  // Student Specific
  university?: string;
  courseOfStudy?: string;
  level?: string;
  skills?: string[];
  phone?: string;
  resumeUrl?: string;
  siwesStartDate?: Date;
  siwesDuration?: string;
  preferredState?: string;
  isProfileComplete?: boolean;
  savedJobs?: mongoose.Types.ObjectId[];
  communityJoined?: boolean;
  // Employer / Company Specific
  companyName?: string;
  industry?: string;
  companyDescription?: string;
  // Company verification (CAC-based admin approval workflow)
  cacNumber?: string;
  officialEmail?: string;
  verificationDocumentUrl?: string;
  verificationStatus: VerificationStatus;
  verificationRejectionReason?: string;
  verificationReviewedAt?: Date;
  // Password-reset OTP. The code itself is never stored -- only its bcrypt
  // hash -- so a database read alone can't be used to reset someone's
  // password. See src/app/api/auth/forgot-password and reset-password.
  resetOtpHash?: string;
  resetOtpExpires?: Date;
  resetOtpAttempts?: number;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ['student', 'employer', 'admin', 'super_admin', 'unassigned'], default: 'unassigned' },

    // Student fields
    university: { type: String },
    courseOfStudy: { type: String },
    level: { type: String },
    skills: { type: [String], default: [] },
    phone: { type: String },
    resumeUrl: { type: String },
    siwesStartDate: { type: Date },
    siwesDuration: { type: String },
    preferredState: { type: String },
    isProfileComplete: { type: Boolean, default: false },
    savedJobs: { type: [Schema.Types.ObjectId], ref: 'Job', default: [] },
    // Opt-in flag for the student Community directory/chat -- students must
    // explicitly join before appearing to peers or being able to post.
    communityJoined: { type: Boolean, default: false },

    // Employer / Company fields
    companyName: { type: String },
    industry: { type: String },
    companyDescription: { type: String },

    // Company verification workflow. Employers start 'unsubmitted'; once they
    // submit CAC details + document they move to 'pending' for admin review.
    // Only 'approved' employers have publicly visible opportunities.
    cacNumber: { type: String },
    officialEmail: { type: String },
    verificationDocumentUrl: { type: String },
    verificationStatus: {
      type: String,
      enum: ['unsubmitted', 'pending', 'approved', 'rejected'],
      default: 'unsubmitted',
    },
    verificationRejectionReason: { type: String },
    verificationReviewedAt: { type: Date },

    resetOtpHash: { type: String },
    resetOtpExpires: { type: Date },
    resetOtpAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Admin verification queue: list employers by status quickly.
UserSchema.index({ role: 1, verificationStatus: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
