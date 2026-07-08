import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Job from "@/models/Job";
import Link from "next/link";
import { ShieldCheck, ShieldX } from "lucide-react";
import { redirect } from "next/navigation";

type PendingCompany = { _id: { toString(): string }; name: string; companyName?: string; createdAt: string | Date };
type RecentJob = {
  _id: { toString(): string };
  title: string;
  isActive: boolean;
  employerId?: { name?: string; companyName?: string };
};

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/login");

  await connectToDatabase();
  const [studentsCount, companiesCount, pendingCount, activeListingsCount, pendingCompanies, recentJobs] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "employer" }),
    User.countDocuments({ role: "employer", verificationStatus: "pending" }),
    Job.countDocuments({ isActive: true }),
    User.find({ role: 'employer', verificationStatus: 'pending' }).select('name companyName createdAt').sort({ createdAt: -1 }).limit(2),
    Job.find({}).populate('employerId', 'companyName name').sort({ createdAt: -1 }).limit(3),
  ]);

  function initials(name?: string) {
    if (!name) return '??';
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Platform overview</h1>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <Kpi value={studentsCount} label="Registered students" />
        <Kpi value={companiesCount} label="Registered companies" />
        <Kpi value={pendingCount} label="Pending verifications" tone="warning" />
        <Kpi value={activeListingsCount} label="Active listings" />
      </div>

      <div>
        <div className="font-display font-bold text-[17px] mb-4">Company verification queue</div>
        {pendingCompanies.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-8 text-center text-sm text-muted">No companies awaiting review.</div>
        ) : (
          <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
            {pendingCompanies.map((c: PendingCompany, i: number) => (
              <div key={c._id.toString()} className={`flex items-center gap-3.5 px-5 py-4 flex-wrap ${i < pendingCompanies.length - 1 ? 'border-b border-surface-border' : ''}`}>
                <div className="w-[34px] h-[34px] rounded-[9px] bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center font-display font-extrabold text-primary-500 dark:text-primary-400 text-xs shrink-0">
                  {initials(c.companyName || c.name)}
                </div>
                <div className="flex-1 text-sm font-bold min-w-[160px]">{c.companyName || c.name}</div>
                <div className="w-[140px] text-[13px] text-muted">Submitted {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <Link href="/admin/companies" className="text-[12.5px] font-bold px-3.5 py-1.5 rounded-lg bg-success text-[#032E1A]">Review</Link>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/companies" className="inline-block mt-2 text-[13.5px] font-bold text-primary-500 dark:text-primary-400">See full queue →</Link>
      </div>

      <div>
        <div className="font-display font-bold text-[17px] mb-4">Recent listings</div>
        {recentJobs.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-8 text-center text-sm text-muted">No listings yet.</div>
        ) : (
          <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
            {recentJobs.map((j: RecentJob, i: number) => (
              <div key={j._id.toString()} className={`flex items-center gap-3 px-5 py-4 flex-wrap ${i < recentJobs.length - 1 ? 'border-b border-surface-border' : ''}`}>
                <div className="flex-1 text-sm font-semibold min-w-[160px]">{j.title} <span className="text-muted font-normal">— {j.employerId?.companyName || j.employerId?.name || 'Unknown'}</span></div>
                <span className={`text-[11.5px] font-bold px-3 py-1 rounded-full flex items-center gap-1 ${j.isActive ? 'bg-success-bg text-success' : 'bg-surface-2 text-muted'}`}>
                  {j.isActive ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />} {j.isActive ? 'Live' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/jobs" className="inline-block mt-2 text-[13.5px] font-bold text-primary-500 dark:text-primary-400">See all listings →</Link>
      </div>
    </div>
  );
}

function Kpi({ value, label, tone }: { value: number; label: string; tone?: 'warning' }) {
  const color = tone === 'warning' ? 'text-warning' : 'text-foreground';
  return (
    <div className="glass-card bg-surface-1 rounded-[14px] p-5">
      <div className={`font-mono font-bold text-[26px] ${color}`}>{value}</div>
      <div className="text-[12.5px] text-muted mt-1">{label}</div>
    </div>
  );
}
