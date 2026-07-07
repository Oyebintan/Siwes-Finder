import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Application from "@/models/Application";
import Link from "next/link";
import { Building2, Users, FileText, Briefcase } from "lucide-react";
import { redirect } from "next/navigation";

export default async function EmployerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "employer") redirect("/login");

  await connectToDatabase();

  const [jobsCount, applicantsCount, unreviewedCount, activeJobs] = await Promise.all([
    Job.countDocuments({ employerId: session.user.id }),
    Application.countDocuments({ employer: session.user.id }),
    Application.countDocuments({ employer: session.user.id, status: 'Pending' }),
    Job.find({ employerId: session.user.id }).sort({ createdAt: -1 }).limit(5),
  ]);

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Organization Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your job postings and review student applications.</p>
        </div>
        <Link href="/employer/post-job" className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-700 to-brand-400 text-white font-bold shadow-lg shadow-brand-900/30 hover:shadow-xl hover:brightness-110 hover:-translate-y-0.5 transition-all">
          Post New Job
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Building2} label="Active Postings" value={jobsCount} />
        <StatCard icon={Users} label="Total Applicants" value={applicantsCount} />
        <StatCard icon={FileText} label="Unreviewed Apps" value={unreviewedCount} />
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Recent Placements</h3>
        {activeJobs.length === 0 ? (
          <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border shadow-sm text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-5">
              <Briefcase className="w-8 h-8 text-brand-500 dark:text-brand-300" />
            </div>
            <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">No active placements</h4>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">You haven't posted any SIWES/IT roles yet. Create your first opening to start receiving applications from students.</p>
            <Link href="/employer/post-job" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-700 to-brand-400 text-white font-bold hover:brightness-110 transition-all">
              Create a posting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <div key={job._id.toString()} className="p-6 rounded-2xl bg-surface-1 border border-surface-border shadow-sm flex justify-between items-center hover:border-brand-400/40 transition-all">
                <div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{job.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{job.location}</p>
                </div>
                <Link href="/employer/applications" className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-brand-700 to-brand-400 rounded-xl text-white hover:brightness-110 transition-all">
                  View Applicants
                </Link>
              </div>
            ))}
          </div>
        )}
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