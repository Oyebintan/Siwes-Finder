import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Link from "next/link";
import { MapPin, Briefcase, Clock, Building2, ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import ApplyButton from "@/components/ApplyButton";

async function getJob(id: string) {
  try {
    await connectToDatabase();
    const job = await Job.findById(id);
    if (!job) return null;
    return JSON.parse(JSON.stringify(job));
  } catch (error) {
    return null;
  }
}

export default async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <Link href="/student/jobs" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-6 font-medium">
          <ChevronLeft className="w-4 h-4" /> Back to Job Board
        </Link>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mb-6 border border-cyan-100 dark:border-cyan-800/50">
                <Building2 className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800"><MapPin className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800"><Briefcase className="w-4 h-4" /> {job.type}</span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800"><Clock className="w-4 h-4" /> {job.duration}</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 min-w-[200px] text-center shrink-0">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Monthly Stipend</p>
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                {job.stipend}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
              Job Description
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="w-1.5 h-6 bg-cyan-500 rounded-full inline-block"></span>
              Requirements
            </h2>
            <ul className="space-y-3">
              {job.requirements.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 border border-cyan-100 dark:border-cyan-800/50">
                    {idx + 1}
                  </div>
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-100 dark:border-blue-800/50 rounded-3xl p-6 sticky top-24">
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Ready to apply?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Make sure your profile and IT letter are updated before applying.</p>

            <ApplyButton jobId={job._id.toString()} />
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">Applications open</p>
          </div>
        </div>
      </div>
    </div>
  );
}