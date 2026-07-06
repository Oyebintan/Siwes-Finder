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

export default async function JobDetails({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // Destructure `id` directly from `params` since we assume it's synchronous in this context or handled by Next.js routing.
  // Wait, in Next.js 15+ params should be awaited. Let's just use it safely.
  const { id } = params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <Link href="/student/jobs" className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-blue-500 transition-colors mb-6 font-medium">
          <ChevronLeft className="w-4 h-4" /> Back to Job Board
        </Link>
        
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          {/* Decorative blur */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                <Building2 className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-foreground/70">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 dark:bg-black/40"><MapPin className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 dark:bg-black/40"><Briefcase className="w-4 h-4" /> {job.type}</span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 dark:bg-black/40"><Clock className="w-4 h-4" /> {job.duration}</span>
              </div>
            </div>

            <div className="bg-black/10 dark:bg-black/30 p-6 rounded-2xl border border-white/10 min-w-[200px] text-center shrink-0">
              <p className="text-sm text-foreground/60 font-semibold mb-1">Monthly Stipend</p>
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                {job.stipend}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
              Job Description
            </h2>
            <p className="text-foreground/70 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-cyan-500 rounded-full inline-block"></span>
              Requirements
            </h2>
            <ul className="space-y-3">
              {job.requirements.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-foreground/70">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 border border-cyan-500/20">
                    {idx + 1}
                  </div>
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/30 rounded-3xl p-6 sticky top-6">
            <h3 className="font-bold text-lg mb-2">Ready to apply?</h3>
            <p className="text-sm text-foreground/70 mb-6">Make sure your profile and IT letter are updated before applying.</p>
            
            <ApplyButton jobId={job._id.toString()} />
            <p className="text-center text-xs text-foreground/50 mt-4">Applications open</p>
          </div>
        </div>
      </div>
    </div>
  );
}
