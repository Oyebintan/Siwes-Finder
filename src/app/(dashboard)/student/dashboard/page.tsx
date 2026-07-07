import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Application from "@/models/Application";
import User from "@/models/User";
import Link from "next/link";
import { Briefcase, FileText, CheckCircle, XCircle } from "lucide-react";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();

  // Run every query concurrently instead of sequentially — this alone can cut
  // page load time by 2-3x on a cold connection to a distant Atlas region.
  const [availableJobsCount, applicationsCount, acceptedCount, user] = await Promise.all([
    Job.countDocuments({ isActive: true }),
    Application.countDocuments({ student: session!.user.id }),
    Application.countDocuments({ student: session!.user.id, status: 'Accepted' }),
    User.findById(session!.user.id).select('university courseOfStudy resumeUrl'),
  ]);

  const hasUniversity = Boolean(user?.university);
  const hasResume = Boolean(user?.resumeUrl);

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Welcome, {session?.user?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is an overview of your SIWES placement journey.</p>
        </div>
        <Link href="/student/jobs" className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-700 to-brand-400 text-white font-bold shadow-lg shadow-brand-900/30 hover:shadow-xl hover:brightness-110 hover:-translate-y-0.5 transition-all">
          Find Placements
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Briefcase} label="Available IT Slots" value={availableJobsCount} />
        <StatCard icon={FileText} label="My Applications" value={applicationsCount} />
        <StatCard icon={CheckCircle} label="Offers Received" value={acceptedCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Applications</h3>
          <div className="p-10 rounded-3xl bg-surface-1 border border-surface-border shadow-sm dark:shadow-[0_0_0_1px_rgba(94,158,240,0.06)] text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-7 h-7 text-brand-500 dark:text-brand-300" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {applicationsCount === 0 ? "You haven't applied to any IT placements yet." : `You have ${applicationsCount} active application${applicationsCount === 1 ? '' : 's'}.`}
            </p>
            <Link href="/student/applications" className="text-brand-600 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-bold mt-3 inline-block">
              View all applications &rarr;
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Status</h3>
          <div className="p-6 rounded-3xl bg-surface-1 border border-surface-border shadow-sm flex flex-col gap-1">
            <ChecklistRow label="Basic Info" done />
            <ChecklistRow label="University Details" done={hasUniversity} />
            <ChecklistRow label="IT Letter / Resume" done={hasResume} />
            <Link href="/student/profile" className="mt-5 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-700 to-brand-400 text-white text-sm font-bold hover:brightness-110 transition-all">
              Complete Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="p-6 rounded-2xl bg-surface-1 border border-surface-border shadow-sm hover:border-brand-400/40 hover:shadow-md dark:hover:shadow-[0_0_24px_-8px_rgba(94,158,240,0.35)] transition-all">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <Icon className="w-5 h-5 text-brand-600 dark:text-brand-300" />
        </div>
        <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400">{label}</h3>
      </div>
      <p className="text-4xl font-extrabold text-brand-600 dark:text-brand-200">
        {value}
      </p>
    </div>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {done ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500/80" />}
    </div>
  );
}