import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Application from "@/models/Application";
import Link from "next/link";
import { Briefcase, FileText, CheckCircle, XCircle } from "lucide-react";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  await connectToDatabase();
  const availableJobsCount = await Job.countDocuments();
  const applicationsCount = await Application.countDocuments({ student: session!.user.id });
  const acceptedCount = await Application.countDocuments({ student: session!.user.id, status: 'Accepted' });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {session?.user?.name}</h1>
          <p className="text-foreground/60 mt-1">Here is an overview of your SIWES placement journey.</p>
        </div>
        <Link href="/student/jobs" className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
          Find Placements
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><Briefcase className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground/80">Available IT Slots</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {availableJobsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground/80">My Applications</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300">
            {applicationsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500"><CheckCircle className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground/80">Offers Received</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300">
            {acceptedCount}
          </p>
        </div>
      </div>

      {/* Profile Reminder & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold">Recent Applications</h3>
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-center">
            <FileText className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <p className="text-foreground/60 font-medium">You haven't applied to any IT placements yet.</p>
            <Link href="/student/jobs" className="text-blue-500 hover:text-blue-400 font-semibold mt-2 inline-block">
              Browse available roles &rarr;
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold">Profile Status</h3>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Basic Info</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">University Details</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">IT Letter / Resume</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link href="/profile" className="w-full inline-flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors">
                Complete Profile
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
