import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Link from "next/link";
import { Bookmark, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import ApplyButton from "@/components/ApplyButton";

const METHOD_LABEL: Record<string, string> = {
  platform: 'In-app',
  email: 'By email',
  external: 'External link',
};

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

type RelatedJob = { _id: string; title: string; location: string; employerId?: { companyName?: string; name?: string } };

async function getJob(id: string) {
  try {
    await connectToDatabase();
    const job = await Job.findById(id).populate('employerId', 'name companyName industry verificationStatus');
    if (!job) return null;

    const employer = job.employerId as unknown as { verificationStatus?: string } | null;
    if (!job.isActive || employer?.verificationStatus !== 'approved') return null;

    const related = await Job.find({
      isActive: true,
      _id: { $ne: job._id },
    }).populate({ path: 'employerId', match: { verificationStatus: 'approved' }, select: 'name companyName verificationStatus' })
      .sort({ createdAt: -1 })
      .limit(6);

    const relatedVisible = related.filter((r) => r.employerId).slice(0, 2);

    return { job: JSON.parse(JSON.stringify(job)), related: JSON.parse(JSON.stringify(relatedVisible)) };
  } catch {
    return null;
  }
}

export default async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getJob(id);
  if (!data) notFound();
  const { job, related } = data;
  const companyName = job.employerId?.companyName || job.employerId?.name || 'Company';

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-fade-in-up">
      <Link href="/student/jobs" className="inline-flex text-[13.5px] font-semibold text-muted">
        ← Back to opportunities
      </Link>

      <div className="bg-surface-1 rounded-[20px] border border-surface-border p-8">
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center font-display font-extrabold text-primary-500 dark:text-primary-400 text-base shrink-0">
            {initials(companyName)}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-display font-extrabold text-[22px] tracking-[-0.02em]">{job.title}</div>
            <div className="text-sm text-muted mt-1">{companyName} · {job.location} · {job.duration}</div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-success-bg text-success whitespace-nowrap">● Verified company</span>
        </div>
        <div className="flex gap-3 flex-wrap items-stretch">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <ApplyButton
              jobId={job._id}
              applicationMethod={job.applicationMethod}
              applicationEmail={job.applicationEmail}
              applicationUrl={job.applicationUrl}
              jobTitle={job.title}
            />
          </div>
          <button className="bg-surface-1 border-[1.5px] border-surface-border px-5 py-3 rounded-lg text-[14.5px] font-bold flex items-center gap-2 h-fit">
            <Bookmark className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:[grid-template-columns:1.6fr_1fr]">
        <div className="flex flex-col gap-6 min-w-0">
          <section className="bg-surface-1 rounded-2xl border border-surface-border p-7">
            <div className="font-display font-bold text-base mb-3">Description</div>
            <div className="text-[14.5px] text-muted leading-[1.7] whitespace-pre-wrap">{job.description}</div>
          </section>

          <section className="bg-surface-1 rounded-2xl border border-surface-border p-7">
            <div className="font-display font-bold text-base mb-3.5">Requirements</div>
            <div className="flex flex-col gap-2.5">
              {(job.requirements || []).map((req: string, idx: number) => (
                <div key={idx} className="flex gap-2.5 text-sm text-muted">
                  <span className="text-success">✓</span> {req}
                </div>
              ))}
            </div>
          </section>

          {related.length > 0 && (
            <section className="bg-surface-1 rounded-2xl border border-surface-border p-7">
              <div className="font-display font-bold text-base mb-3.5">Related opportunities</div>
              <div className="flex flex-col gap-px bg-surface-border rounded-xl overflow-hidden">
                {related.map((r: RelatedJob) => (
                  <Link key={r._id} href={`/student/jobs/${r._id}`} className="bg-surface-1 px-4 py-3.5 flex justify-between gap-3 text-sm">
                    <span className="font-semibold">{r.title} — {r.employerId?.companyName || r.employerId?.name}</span>
                    <span className="text-muted whitespace-nowrap">{r.location}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-[22px]">
            <div className="font-display font-bold text-sm mb-4">Overview</div>
            <div className="flex flex-col gap-3.5 text-[13.5px]">
              {job.employerId?.industry && <OverviewRow label="Industry" value={job.employerId.industry} />}
              <OverviewRow label="Location" value={job.location} />
              <OverviewRow label="Duration" value={job.duration} />
              <OverviewRow label="Application method" value={METHOD_LABEL[job.applicationMethod] || 'In-app'} />
              {job.stipend && <OverviewRow label="Stipend" value={job.stipend} />}
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary-500 to-[#17307A] dark:from-primary-400 dark:to-[#4B3FD8] rounded-2xl p-[22px] text-white">
            <ShieldCheck className="w-6 h-6 mb-2" />
            <div className="font-display font-bold text-[15px] mb-1">Verified by our admin team</div>
            <div className="text-[13px] text-white/80">This company submitted CAC registration details and was manually approved before this listing went live.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
