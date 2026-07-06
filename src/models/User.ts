import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional because Google users won't have one
  role: 'student' | 'employer' | 'unassigned'; // Added 'unassigned' for new Google sign-ups
  // Student Specific
  university?: string;
  courseOfStudy?: string;
  level?: string;
  skills?: string[];
  resumeUrl?: string;
  // Employer Specific
  companyName?: string;
  industry?: string;
  companyDescription?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ['student', 'employer', 'unassigned'], default: 'unassigned' },
    
    // Student fields
    university: { type: String },
    courseOfStudy: { type: String },
    level: { type: String },
    skills: { type: [String], default: [] },
    resumeUrl: { type: String },
    
    // Employer fields
    companyName: { type: String },
    industry: { type: String },
    companyDescription: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
