import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import Link from "next/link";
import { Building2, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";

async function getApplications(studentId: string) {
  await connectToDatabase();
  const apps = await Application.find({ student: studentId })
    .populate('job', 'title location companyName')
    .sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(apps));
}

export default async function StudentApplications() {
  const session = await getServerSession(authOptions);
  const applications = await getApplications(session!.user.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">My Applications</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track the status of your SIWES placement requests.</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No applications yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't applied to any IT placements yet.</p>
          <Link href="/student/jobs" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => (
            <div key={app._id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-blue-500/50 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{app.job.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {app.job.location}</span>
                  <span>Applied on {new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {app.status === 'Pending' && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50 font-bold text-sm">
                    <Clock className="w-4 h-4" /> Pending Review
                  </span>
                )}
                {app.status === 'Accepted' && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" /> Accepted
                  </span>
                )}
                {app.status === 'Rejected' && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 font-bold text-sm">
                    <XCircle className="w-4 h-4" /> Rejected
                  </span>
                )}
                <Link href={`/student/jobs/${app.job._id}`} className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  View Job
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}