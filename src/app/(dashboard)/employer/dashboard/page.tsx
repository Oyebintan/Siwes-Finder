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

  if (!session || session.user.role !== "employer") {
    redirect("/login");
  }

  await connectToDatabase();
  const jobsCount = await Job.countDocuments({ postedBy: session!.user.id });
  const applicantsCount = await Application.countDocuments({ employer: session!.user.id });
  const unreviewedCount = await Application.countDocuments({ employer: session!.user.id, status: 'Pending' });
  const activeJobs = await Job.find({ postedBy: session!.user.id }).sort({ createdAt: -1 }).limit(5);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Organization Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your job postings and review student applications.</p>
        </div>
        <Link href="/employer/post-job" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:shadow-lg transition-all">
          Post New Job
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-cyan-500/50 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"><Building2 className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Active Postings</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-500 dark:from-cyan-400 dark:to-blue-300">
            {jobsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-blue-500/50 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Users className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Total Applicants</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">
            {applicantsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-500/50 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Unreviewed Apps</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-300">
            {unreviewedCount}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Recent Placements</h3>
        {activeJobs.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">No active placements</h4>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">You haven't posted any SIWES/IT roles yet. Create your first opening to start receiving applications from students.</p>
            <Link href="/employer/post-job" className="px-6 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold text-gray-700 dark:text-gray-200 transition-colors">
              Create a posting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <div key={job._id.toString()} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{job.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{job.location}</p>
                </div>
                <Link href={`/employer/applications`} className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors">
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