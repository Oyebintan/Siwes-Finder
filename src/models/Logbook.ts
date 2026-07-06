import mongoose, { Schema, Document } from 'mongoose';

export interface ILogbook extends Document {
  studentId: mongoose.Types.ObjectId;
  employerId: mongoose.Types.ObjectId;
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: Date;
}

const LogbookSchema = new Schema<ILogbook>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    weekNumber: { type: Number, required: true },
    dayOfWeek: { type: String, required: true },
    activityDescription: { type: String, required: true },
    hoursWorked: { type: Number, required: true, default: 8 },
    isApproved: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Logbook || mongoose.model<ILogbook>('Logbook', LogbookSchema);
