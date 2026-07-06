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
  const availableJobsCount = await Job.countDocuments();
  const applicationsCount = await Application.countDocuments({ student: session!.user.id });
  const acceptedCount = await Application.countDocuments({ student: session!.user.id, status: 'Accepted' });
  const user = await User.findById(session!.user.id).select('university courseOfStudy resumeUrl');

  const hasUniversity = Boolean(user?.university);
  const hasResume = Boolean(user?.resumeUrl);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Welcome, {session?.user?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is an overview of your SIWES placement journey.</p>
        </div>
        <Link href="/student/jobs" className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-lg transition-all">
          Find Placements
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-blue-500/50 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Briefcase className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Available IT Slots</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
            {availableJobsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-cyan-500/50 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">My Applications</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-500 dark:from-cyan-400 dark:to-indigo-300">
            {applicationsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-500/50 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><CheckCircle className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Offers Received</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-300">
            {acceptedCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Applications</h3>
          <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {applicationsCount === 0 ? "You haven't applied to any IT placements yet." : `You have ${applicationsCount} active application${applicationsCount === 1 ? '' : 's'}.`}
            </p>
            <Link href="/student/applications" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-semibold mt-2 inline-block">
              View all applications &rarr;
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Status</h3>
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Basic Info</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">University Details</span>
              {hasUniversity ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">IT Letter / Resume</span>
              {hasResume ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Link href="/student/profile" className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors">
                Complete Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}