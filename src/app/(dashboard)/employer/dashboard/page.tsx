import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Briefcase, Users, Eye, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function EmployerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "employer") {
    redirect("/login");
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employer Dashboard</h2>
          <p className="text-foreground/60 mt-1">Manage your active SIWES openings and review student applications.</p>
        </div>
        <Link 
          href="/employer/post-job" 
          className="inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl hover:shadow-[0_0_20px_rgba(0,100,255,0.4)]"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Post New Placement
        </Link>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Active Roles</p>
            <h3 className="text-2xl font-bold">0</h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Total Applicants</p>
            <h3 className="text-2xl font-bold">0</h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Pending Reviews</p>
            <h3 className="text-2xl font-bold">0</h3>
          </div>
        </div>
      </div>

      {/* Active Jobs List */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold">Your Active Placements</h3>
        <div className="p-12 rounded-3xl bg-white/5 border border-white/10 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-foreground/30" />
          </div>
          <h4 className="text-lg font-bold mb-2">No active placements</h4>
          <p className="text-foreground/60 max-w-md mb-6">You haven't posted any SIWES/IT roles yet. Create your first opening to start receiving applications from students.</p>
          <Link href="/employer/post-job" className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition-colors">
            Post a Role Now
          </Link>
        </div>
      </div>

    </div>
  );
}
