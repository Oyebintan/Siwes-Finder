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
          <h1 className="text-3xl font-extrabold tracking-tight">Organization Dashboard</h1>
          <p className="text-foreground/60 mt-1">Manage your job postings and review student applications.</p>
        </div>
        <Link href="/employer/post-job" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
          Post New Job
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500"><Building2 className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground/80">Active Postings</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300">
            {jobsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><Users className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground/80">Total Applicants</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
            {applicantsCount}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground/80">Unreviewed Apps</h3>
          </div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300">
            {unreviewedCount}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold">Your Recent Placements</h3>
        {activeJobs.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white/5 border border-white/10 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-foreground/30" />
            </div>
            <h4 className="text-lg font-bold mb-2">No active placements</h4>
            <p className="text-foreground/60 max-w-md mb-6">You haven't posted any SIWES/IT roles yet. Create your first opening to start receiving applications from students.</p>
            <Link href="/employer/post-job" className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition-colors">
              Create a posting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <div key={job._id.toString()} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg">{job.title}</h4>
                  <p className="text-sm text-foreground/60">{job.location}</p>
                </div>
                <Link href={`/employer/applications`} className="px-4 py-2 text-sm font-bold bg-blue-600 rounded-xl text-white">
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
