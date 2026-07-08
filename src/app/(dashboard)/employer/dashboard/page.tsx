import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Application from "@/models/Application";
import User from "@/models/User";
import Link from "next/link";
import { redirect } from "next/navigation";

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-warning-bg text-warning',
  Accepted: 'bg-success-bg text-success',
  Rejected: 'bg-error-bg text-error',
};

type RecentApplicant = {
  _id: { toString(): string };
  status: string;
  student?: { name?: string };
  job?: { title?: string };
};

export default async function EmployerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "employer") redirect("/login");

  await connectToDatabase();
  const employerId = session.user.id;

  const [employer, activeJobsCount, jobs, applicantsCount, unreviewedCount, recentApplicants] = await Promise.all([
    User.findById(employerId).select('companyName industry verificationStatus'),
    Job.countDocuments({ employerId, isActive: true }),
    Job.find({ employerId }).sort({ createdAt: -1 }).limit(5),
    Application.countDocuments({ employer: employerId }),
    Application.countDocuments({ employer: employerId, status: 'Pending' }),
    Application.find({ employer: employerId })
      .populate('student', 'name')
      .populate('job', 'title')
      .sort({ createdAt: -1 })
      .limit(3),
  ]);

  const jobsWithCounts = await Promise.all(
    jobs.map(async (job) => ({
      job,
      applicantCount: await Application.countDocuments({ job: job._id }),
    }))
  );

  const subtitle = [employer?.companyName, employer?.industry].filter(Boolean).join(' · ');

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em] mb-1">Employer Dashboard</h1>
          <div className="text-sm text-muted">{subtitle || 'Complete your company profile to add more detail here.'}</div>
        </div>
        <Link href="/employer/post-job" className="bg-accent-500 text-[#032E1A] px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-accent-900/20 hover:brightness-105 transition-all">
          + Post opportunity
        </Link>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <Kpi value={activeJobsCount} label="Active opportunities" />
        <Kpi value={applicantsCount} label="Applications received" />
        <Kpi value={unreviewedCount} label="Unreviewed" tone="warning" />
        <Kpi
          value={employer?.verificationStatus === 'approved' ? 'Verified' : employer?.verificationStatus === 'pending' ? 'Pending' : 'Unverified'}
          label="Verification status"
          tone={employer?.verificationStatus === 'approved' ? 'success' : employer?.verificationStatus === 'pending' ? 'warning' : undefined}
        />
      </div>

      <div>
        <div className="font-display font-bold text-[17px] mb-4">Active opportunities</div>
        {jobsWithCounts.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-14 text-center">
            <h4 className="font-display font-bold text-lg mb-2">No opportunities yet</h4>
            <p className="text-muted max-w-md mx-auto mb-5">You haven&apos;t posted any SIWES/IT roles yet. Create your first opening to start receiving applications from students.</p>
            <Link href="/employer/post-job" className="px-6 py-2.5 rounded-xl bg-accent-500 text-[#032E1A] font-bold hover:brightness-105 transition-all">
              Post opportunity
            </Link>
          </div>
        ) : (
          <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
            {jobsWithCounts.map(({ job, applicantCount }, i) => (
              <div key={job._id.toString()} className={`flex items-center gap-4 px-5 py-4 flex-wrap ${i < jobsWithCounts.length - 1 ? 'border-b border-surface-border' : ''}`}>
                <div className="flex-1 text-sm font-bold min-w-[160px]">{job.title}</div>
                <div className="w-[100px] text-[13px] text-muted">{applicantCount} applicant{applicantCount === 1 ? '' : 's'}</div>
                <span className={`text-[11.5px] font-bold px-3 py-1 rounded-full ${job.isActive ? 'bg-success-bg text-success' : 'bg-surface-2 text-muted'}`}>
                  {job.isActive ? 'Open' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="font-display font-bold text-[17px] mb-4">Recent applicants</div>
        {recentApplicants.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-10 text-center text-sm text-muted">No applications yet.</div>
        ) : (
          <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
            {recentApplicants.map((app: RecentApplicant, i: number) => (
              <div key={app._id.toString()} className={`flex items-center gap-3.5 px-5 py-4 flex-wrap ${i < recentApplicants.length - 1 ? 'border-b border-surface-border' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-400 text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
                  {initials(app.student?.name)}
                </div>
                <div className="flex-1 text-sm font-semibold min-w-[160px]">
                  {app.student?.name} <span className="text-muted font-normal">— {app.job?.title}</span>
                </div>
                <span className={`text-[11.5px] font-bold px-3 py-1 rounded-full ${STATUS_STYLE[app.status] || 'bg-surface-2 text-muted'}`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ value, label, tone }: { value: number | string; label: string; tone?: 'warning' | 'success' }) {
  const color = tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-foreground';
  return (
    <div className="glass-card bg-surface-1 rounded-[14px] p-5">
      <div className={`font-mono font-bold text-[26px] ${color}`}>{value}</div>
      <div className="text-[12.5px] text-muted mt-1">{label}</div>
    </div>
  );
}
