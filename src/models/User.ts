import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'student' | 'employer' | 'school' | 'admin' | 'super_admin' | 'unassigned';
export type VerificationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional because Google users won't have one
  role: UserRole;
  // Profile picture (students), company logo (employers) or school crest
  // (schools) — one field, same meaning: the image shown for this account.
  avatarUrl?: string;
  // Student Specific
  university?: string;
  faculty?: string;
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
  // Employer accounts this student follows -- triggers a best-effort
  // email/push alert (see POST /api/jobs) whenever one of them posts a new
  // opportunity.
  followedEmployers?: mongoose.Types.ObjectId[];
  communityJoined?: boolean;
  // Set by the mobile app (POST /api/mobile/register-push-token) after the
  // user grants notification permission. Overwritten on every registration
  // -- this project assumes one active mobile device per account, so a
  // stale token from a previous device is simply replaced, not tracked.
  expoPushToken?: string;
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
  // Email-ownership verification, separate from the employer/school
  // verificationStatus above (that's an admin reviewing the organization;
  // this is confirming the account holder actually controls the email
  // address they signed up with). Same OTP-hash pattern as password reset.
  // See src/app/api/auth/verify-email and resend-verification.
  emailVerified: boolean;
  verifyOtpHash?: string;
  verifyOtpExpires?: Date;
  verifyOtpAttempts?: number;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    // lowercase+trim keep the unique index meaningful: without them
    // "Ada@x.com" and "ada@x.com" are two different accounts, and exact-
    // match login lookups miss depending on how the user typed it that
    // day. Reads go through findUserByEmail (src/lib/userLookup.ts),
    // which also covers pre-normalization documents.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    role: { type: String, enum: ['student', 'employer', 'school', 'admin', 'super_admin', 'unassigned'], default: 'unassigned' },
    avatarUrl: { type: String },

    // Student fields
    university: { type: String },
    faculty: { type: String },
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
    followedEmployers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    // Opt-in flag for the student Community directory/chat -- students must
    // explicitly join before appearing to peers or being able to post.
    communityJoined: { type: Boolean, default: false },
    expoPushToken: { type: String },

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

    emailVerified: { type: Boolean, default: false },
    verifyOtpHash: { type: String },
    verifyOtpExpires: { type: Date },
    verifyOtpAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Admin verification queue: list employers by status quickly.
UserSchema.index({ role: 1, verificationStatus: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
