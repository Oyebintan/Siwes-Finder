import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const CHIP_TINTS = [
  'bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400',
  'bg-accent-500/10 text-accent-500',
  'bg-warning-bg text-warning',
  'bg-error-bg text-error',
];

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-warning-bg text-warning',
  Accepted: 'bg-success-bg text-success',
  Rejected: 'bg-error-bg text-error',
};
const STATUS_LABEL: Record<string, string> = {
  Pending: 'Under review',
  Accepted: 'Accepted',
  Rejected: 'Not selected',
};

type StudentApplication = {
  _id: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  updatedAt: string;
  job?: { title?: string; location?: string; employerId?: { companyName?: string; name?: string } };
};

async function getApplications(studentId: string): Promise<StudentApplication[]> {
  await connectToDatabase();
  const apps = await Application.find({ student: studentId })
    .populate({ path: 'job', select: 'title location', populate: { path: 'employerId', select: 'companyName name' } })
    .sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(apps));
}

export default async function StudentApplications() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const applications = await getApplications(session.user.id);

  const total = applications.length;
  const underReview = applications.filter((a) => a.status === 'Pending').length;
  const accepted = applications.filter((a) => a.status === 'Accepted').length;
  const rejected = applications.filter((a) => a.status === 'Rejected').length;

  return (
    <div className="max-w-[900px] mx-auto space-y-8 animate-fade-in-up">
      <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Your applications</h1>

      <div className="flex gap-3 flex-wrap">
        <SummaryTile value={total} label="Submitted" />
        <SummaryTile value={underReview} label="Under review" tone="warning" />
        <SummaryTile value={accepted} label="Accepted" tone="success" />
        <SummaryTile value={rejected} label="Not selected" tone="error" />
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-surface-1 border border-surface-border rounded-[20px]">
          <Building2 className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
          <h3 className="font-display font-bold text-xl mb-2">No applications yet</h3>
          <p className="text-muted mb-6">You haven&apos;t applied to any placements yet.</p>
          <Link href="/student/jobs" className="px-6 py-3 rounded-xl bg-primary-500 dark:bg-primary-400 text-white font-bold hover:brightness-110 transition-all">
            Browse opportunities
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app, i: number) => {
            const companyName = app.job?.employerId?.companyName || app.job?.employerId?.name || 'Unknown company';
            return (
              <div key={app._id} className="bg-surface-1 rounded-2xl border border-surface-border p-6">
                <div className="flex justify-between items-start flex-wrap gap-3 mb-5">
                  <div className="flex gap-3.5">
                    <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center font-display font-extrabold text-[13px] shrink-0 ${CHIP_TINTS[i % CHIP_TINTS.length]}`}>
                      {initials(companyName)}
                    </div>
                    <div>
                      <div className="font-display font-bold text-[15.5px]">{app.job?.title || 'Untitled role'}</div>
                      <div className="text-[13px] text-muted">{companyName} · {app.job?.location}</div>
                    </div>
                  </div>
                  <span className={`text-[11.5px] font-bold px-3 py-1.5 rounded-full ${STATUS_BADGE[app.status] || 'bg-surface-2 text-muted'}`}>
                    {STATUS_LABEL[app.status] || app.status}
                  </span>
                </div>

                {app.status === 'Rejected' ? (
                  <div className="text-[13px] text-muted">
                    {companyName} reviewed your application on {new Date(app.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} and selected another candidate for this cycle.
                  </div>
                ) : (
                  <StepTracker accepted={app.status === 'Accepted'} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ value, label, tone }: { value: number; label: string; tone?: 'warning' | 'success' | 'error' }) {
  const color = tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : tone === 'error' ? 'text-error' : 'text-foreground';
  return (
    <div className="flex-1 min-w-[120px] bg-surface-1 rounded-2xl border border-surface-border p-[18px]">
      <div className={`font-mono font-bold text-[22px] ${color}`}>{value}</div>
      <div className="text-[12.5px] text-muted mt-0.5">{label}</div>
    </div>
  );
}

function StepTracker({ accepted }: { accepted: boolean }) {
  const color = accepted ? 'bg-success' : 'bg-primary-500 dark:bg-primary-400';
  const textColor = accepted ? 'text-success' : 'text-primary-500 dark:text-primary-400';
  return (
    <div className="flex items-center px-2">
      <Step dotClass={color} label="Submitted" labelClass="text-foreground font-semibold" />
      <div className={`flex-[2] h-0.5 ${color}`} />
      <Step dotClass={color} label={accepted ? 'Reviewed' : 'In review'} labelClass={accepted ? 'text-foreground font-semibold' : `${textColor} font-bold`} />
      <div className={`flex-[2] h-0.5 ${accepted ? color : 'bg-surface-border'}`} />
      <Step dotClass={accepted ? color : 'bg-surface-border'} label={accepted ? 'Accepted' : 'Decision'} labelClass={accepted ? `${textColor} font-bold` : 'text-muted font-semibold'} />
    </div>
  );
}

function Step({ dotClass, label, labelClass }: { dotClass: string; label: string; labelClass: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
      <div className={`text-[11.5px] ${labelClass}`}>{label}</div>
    </div>
  );
}
