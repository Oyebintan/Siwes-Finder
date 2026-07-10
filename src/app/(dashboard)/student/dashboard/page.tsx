import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Application from "@/models/Application";
import User from "@/models/User";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, CheckCircle2, UploadCloud, Building2, type LucideIcon } from "lucide-react";

type RecommendedJob = {
  _id: { toString(): string };
  title: string;
  location: string;
  duration: string;
  employerId?: { name?: string; companyName?: string; avatarUrl?: string };
};

type RecentApp = {
  _id: { toString(): string };
  status: string;
  job?: { title?: string; employerId?: { name?: string; companyName?: string } };
};

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-warning-bg text-warning',
  Accepted: 'bg-success-bg text-success',
  Rejected: 'bg-error-bg text-error',
};
const STATUS_LABEL: Record<string, string> = {
  Pending: 'Under review',
  Accepted: 'Accepted',
  Rejected: 'Not selected',
};

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');

  await connectToDatabase();

  const userId = session.user.id;

  // Match the browse feed's visibility rules: only active jobs from verified
  // employers count as "open" or get recommended, so cards never link to a
  // listing the details page would hide (404).
  const approvedEmployerIds = await User.find({
    role: 'employer',
    verificationStatus: 'approved',
  }).distinct('_id');
  const visibleJobFilter = { isActive: true, employerId: { $in: approvedEmployerIds } };

  const [availableJobsCount, applicationsCount, pendingCount, acceptedCount, user, recentApps, recommended] = await Promise.all([
    Job.countDocuments(visibleJobFilter),
    Application.countDocuments({ student: userId }),
    Application.countDocuments({ student: userId, status: 'Pending' }),
    Application.countDocuments({ student: userId, status: 'Accepted' }),
    User.findById(userId).select('name university courseOfStudy resumeUrl skills'),
    Application.find({ student: userId })
      .populate({ path: 'job', select: 'title employerId', populate: { path: 'employerId', select: 'companyName name' } })
      .sort({ createdAt: -1 })
      .limit(3),
    Job.find(visibleJobFilter).populate('employerId', 'companyName name avatarUrl').sort({ createdAt: -1 }).limit(2),
  ]);

  const hasAcademic = Boolean(user?.university && user?.courseOfStudy);
  const hasResume = Boolean(user?.resumeUrl);
  const hasSkills = Boolean(user?.skills && user.skills.length > 0);
  const hasApplied = applicationsCount > 0;
  const completedSteps = [hasAcademic, hasResume, hasSkills, hasApplied].filter(Boolean).length;
  const progressPct = completedSteps * 25;

  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em] mb-1">Welcome back, {firstName} 👋</h1>
        <div className="text-sm text-muted">Here&apos;s where your SIWES search stands today.</div>
      </div>

      {/* Hero progress banner */}
      <div className="relative overflow-hidden rounded-[18px] p-6 sm:p-7 animate-gradient-flow bg-gradient-to-br from-primary-500 via-secondary-500 to-[#17307A] dark:from-primary-500 dark:via-secondary-600 dark:to-secondary-900">
        <div className="pointer-events-none absolute -top-16 -right-10 w-[220px] h-[220px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="min-w-[200px]">
            <div className="font-display font-bold text-[16px] text-white mb-1">Profile completion</div>
            <div className="text-[13.5px] text-white/80 max-w-[420px]">
              {hasApplied
                ? `${applicationsCount} application${applicationsCount === 1 ? '' : 's'} submitted. ${!hasResume ? 'Add a resume to boost your match score.' : 'Keep your profile fresh to stay competitive.'}`
                : 'Complete your profile and submit your first application.'}
            </div>
          </div>
          <span className="font-display font-extrabold text-[30px] text-white leading-none shrink-0">{progressPct}%</span>
        </div>

        <div className="relative h-2 rounded-full bg-white/20 overflow-hidden mb-5">
          <div className="h-full rounded-full bg-white transition-[width] duration-700 ease-out" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Link href="/student/jobs" className="text-[13.5px] font-bold text-primary-600 bg-white px-4 py-2.5 rounded-lg whitespace-nowrap hover:brightness-95 transition-all flex items-center justify-center gap-1.5">
            <Search className="w-4 h-4" /> Find opportunities
          </Link>
          <Link href="/student/profile" className="text-[13.5px] font-bold text-white bg-white/[0.14] px-4 py-2.5 rounded-lg whitespace-nowrap hover:bg-white/[0.2] transition-colors flex items-center justify-center">
            Complete profile →
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <Kpi value={applicationsCount} label="Applications sent" />
        <Kpi value={pendingCount} label="Under review" tone="warning" />
        <Kpi value={acceptedCount} label="Offers received" tone="success" />
        <Kpi value={availableJobsCount} label="Open opportunities" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <QuickAction href="/student/jobs" icon={Search} label="Search opportunities" tint="primary" />
        <QuickAction href="/student/applications" icon={CheckCircle2} label="Track applications" tint="accent" />
        <QuickAction href="/student/profile" icon={UploadCloud} label="Upload resume" tint="warning" />
      </div>

      {/* Recommended */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display font-bold text-[17px]">Recommended for you</div>
          <Link href="/student/jobs" className="text-[13.5px] font-bold">See all →</Link>
        </div>
        {recommended.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-8 text-center text-sm text-muted">No opportunities available yet — check back soon.</div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {recommended.map((job: RecommendedJob) => (
              <Link key={job._id.toString()} href={`/student/jobs/${job._id}`} className="bg-surface-1 rounded-[14px] p-5 border border-surface-border hover:border-primary-500 transition-colors">
                <div className="flex items-center gap-2.5 mb-3.5">
                  {job.employerId?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={job.employerId.avatarUrl} alt="" className="w-9 h-9 rounded-[9px] object-cover bg-surface-2" />
                  ) : (
                    <div className="w-9 h-9 rounded-[9px] bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center font-display font-extrabold text-primary-500 dark:text-primary-400 text-[12px]">
                      {initials(job.employerId?.companyName || job.employerId?.name)}
                    </div>
                  )}
                  <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full bg-success-bg text-success">● Verified</span>
                </div>
                <div className="font-display font-bold text-[15px] mb-1">{job.title}</div>
                <div className="text-[12.5px] text-muted">{job.employerId?.companyName || job.employerId?.name} · {job.location} · {job.duration}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent applications */}
      <div>
        <div className="font-display font-bold text-[17px] mb-4">Recent applications</div>
        {recentApps.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-primary-500 dark:text-primary-400" />
            </div>
            <p className="text-muted font-medium">You haven&apos;t applied to any placements yet.</p>
            <Link href="/student/jobs" className="text-primary-500 dark:text-primary-400 font-bold mt-2 inline-block">Browse opportunities →</Link>
          </div>
        ) : (
          <div className="bg-surface-1 rounded-[14px] border border-surface-border overflow-hidden">
            {recentApps.map((app: RecentApp, i: number) => (
              <div key={app._id.toString()} className={`flex items-center gap-3 px-5 py-4 flex-wrap ${i < recentApps.length - 1 ? 'border-b border-surface-border' : ''}`}>
                <div className="flex-1 text-sm font-semibold">
                  {app.job?.title || 'Untitled role'} — {app.job?.employerId?.companyName || app.job?.employerId?.name || 'Unknown company'}
                </div>
                <span className={`text-[11.5px] font-bold px-3 py-1 rounded-full ${STATUS_STYLE[app.status] || 'bg-surface-2 text-muted'}`}>
                  {STATUS_LABEL[app.status] || app.status}
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
    <div className="relative overflow-hidden glass-card bg-surface-1 rounded-[14px] p-4">
      <div className="card-shine animate-card-shine" />
      <div className={`relative font-mono font-bold text-[22px] ${color}`}>{value}</div>
      <div className="relative text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, tint }: { href: string; icon: LucideIcon; label: string; tint: 'primary' | 'accent' | 'warning' }) {
  const tintClasses = {
    primary: 'bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400',
    accent: 'bg-accent-500/10 text-accent-500',
    warning: 'bg-warning-bg text-warning',
  }[tint];
  return (
    <Link href={href} className="bg-surface-1 border border-surface-border rounded-[14px] p-[18px] flex items-center gap-3 hover:border-primary-500/40 transition-colors">
      <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 ${tintClasses}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="text-[13.5px] font-bold">{label}</div>
    </Link>
  );
}
