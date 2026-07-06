import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
          <h1 className="text-3xl font-extrabold tracking-tight">Job Board</h1>
          <p className="text-foreground/60 mt-1">Discover and apply for SIWES placements across Nigeria.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input 
            type="text" 
            placeholder="Search roles..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-all text-sm"
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
          <Building2 className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No jobs posted yet</h3>
          <p className="text-foreground/60">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job: any) => (
            <div key={job._id} className="group bg-white/5 border border-white/10 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold group-hover:text-blue-500 transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-foreground/60">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                    <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.type}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.duration}</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-bold">
                  Active
                </div>
              </div>

              <p className="text-sm text-foreground/70 line-clamp-2 mb-6">
                {job.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="font-semibold">{job.stipend !== 'Unpaid' ? job.stipend : <span className="text-foreground/40 font-normal">Unpaid</span>}</span>
                <Link 
                  href={`/student/jobs/${job._id}`}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-blue-600 text-sm font-bold transition-all hover:text-white"
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
