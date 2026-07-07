import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Job from "@/models/Job";
import Link from "next/link";
import { ShieldCheck, Users, Briefcase, Clock } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/login");

  await connectToDatabase();
  const [pendingCount, approvedCount, usersCount, jobsCount] = await Promise.all([
    User.countDocuments({ role: "employer", verificationStatus: "pending" }),
    User.countDocuments({ role: "employer", verificationStatus: "approved" }),
    User.countDocuments({}),
    Job.countDocuments({}),
  ]);

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Admin Console</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Review companies, manage users, and moderate listings across the platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Clock} label="Pending Review" value={pendingCount} highlight={pendingCount > 0} />
        <StatCard icon={ShieldCheck} label="Verified Companies" value={approvedCount} />
        <StatCard icon={Users} label="Total Users" value={usersCount} />
        <StatCard icon={Briefcase} label="Total Listings" value={jobsCount} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard
          href="/admin/companies"
          icon={ShieldCheck}
          title="Verification Queue"
          desc={pendingCount > 0 ? `${pendingCount} compan${pendingCount === 1 ? "y" : "ies"} awaiting review.` : "No companies awaiting review."}
        />
        <ActionCard href="/admin/users" icon={Users} title="User Management" desc="View, filter, and remove user accounts." />
        <ActionCard href="/admin/jobs" icon={Briefcase} title="Listing Moderation" desc="Review and take down fraudulent postings." />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl bg-surface-1 border shadow-sm transition-all ${highlight ? "border-accent-400/60 shadow-md" : "border-surface-border hover:border-accent-400/40"}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-accent-100 dark:bg-accent-500/10">
          <Icon className="w-5 h-5 text-accent-600 dark:text-accent-300" />
        </div>
        <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400">{label}</h3>
      </div>
      <p className="text-4xl font-extrabold text-accent-600 dark:text-accent-200">{value}</p>
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc }: { href: string; icon: any; title: string; desc: string }) {
  return (
    <Link href={href} className="group p-6 rounded-2xl bg-surface-1 border border-surface-border shadow-sm hover:border-accent-400/40 hover:shadow-md transition-all">
      <div className="p-2.5 rounded-xl bg-accent-100 dark:bg-accent-500/10 w-fit mb-4">
        <Icon className="w-5 h-5 text-accent-600 dark:text-accent-300" />
      </div>
      <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-accent-700 dark:group-hover:text-accent-300 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
    </Link>
  );
}
