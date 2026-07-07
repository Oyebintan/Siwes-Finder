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
  } catch {
    return null;
  }
}

export default async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <Link href="/student/jobs" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors mb-6 font-medium">
          <ChevronLeft className="w-4 h-4" /> Back to Job Board
        </Link>

        <div className="bg-surface-1 border border-surface-border shadow-sm rounded-3xl p-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="w-16 h-16 bg-brand-50 dark:bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-100 dark:border-brand-500/20">
                <Building2 className="w-8 h-8 text-brand-600 dark:text-brand-300" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-surface-2"><MapPin className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-surface-2"><Briefcase className="w-4 h-4" /> {job.type}</span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-surface-2"><Clock className="w-4 h-4" /> {job.duration}</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-surface-2 p-6 rounded-2xl border border-gray-100 dark:border-surface-border min-w-[200px] text-center shrink-0">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Monthly Stipend</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-200">
                {job.stipend || 'Unpaid'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-surface-1 border border-surface-border shadow-sm rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="w-1.5 h-6 bg-brand-500 rounded-full inline-block"></span>
              Job Description
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </section>

          <section className="bg-surface-1 border border-surface-border shadow-sm rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="w-1.5 h-6 bg-brand-300 rounded-full inline-block"></span>
              Requirements
            </h2>
            <ul className="space-y-3">
              {job.requirements.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 border border-brand-100 dark:border-brand-500/20">
                    {idx + 1}
                  </div>
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-1 border border-brand-400/20 rounded-3xl p-6 sticky top-24 shadow-sm">
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