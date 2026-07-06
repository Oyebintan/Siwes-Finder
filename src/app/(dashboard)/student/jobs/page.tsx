import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Link from "next/link";
import { MapPin, Briefcase, Clock, Building2, Search } from "lucide-react";

async function getJobs() {
  await connectToDatabase();
  const jobs = await Job.find({ status: 'Open' }).sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(jobs));
}

export default async function StudentJobBoard() {
  const session = await getServerSession(authOptions);
  const jobs = await getJobs();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Job Board</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Discover and apply for SIWES placements across Nigeria.</p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white outline-none transition-all text-sm"
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No jobs posted yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job: any) => (
            <div key={job._id} className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-blue-500/50 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                    <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.type}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.duration}</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-full text-xs font-bold shrink-0">
                  Active
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-6">
                {job.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {job.stipend !== 'Unpaid' ? job.stipend : <span className="text-gray-400 dark:text-gray-500 font-normal">Unpaid</span>}
                </span>
                <Link
                  href={`/student/jobs/${job._id}`}
                  className="px-5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-700 dark:text-gray-200 text-sm font-bold transition-all"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}