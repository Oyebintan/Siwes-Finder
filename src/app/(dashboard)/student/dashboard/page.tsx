import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Briefcase, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "student") {
    redirect("/login");
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {session.user.name?.split(' ')[0]}!</h2>
          <p className="text-foreground/60 mt-1">Here is an overview of your SIWES/IT placement journey.</p>
        </div>
        <Link 
          href="/student/jobs" 
          className="inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-500 shadow-lg hover:shadow-blue-500/25"
        >
          Find New IT Placements
        </Link>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Total Applications</p>
            <h3 className="text-2xl font-bold">0</h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Pending Review</p>
            <h3 className="text-2xl font-bold">0</h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Accepted</p>
            <h3 className="text-2xl font-bold">0</h3>
          </div>
        </div>
      </div>

      {/* Profile Reminder & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold">Recent Applications</h3>
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-center">
            <FileText className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <p className="text-foreground/60 font-medium">You haven't applied to any IT placements yet.</p>
            <Link href="/student/jobs" className="text-blue-500 hover:text-blue-400 font-semibold mt-2 inline-block">
              Browse available roles &rarr;
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold">Profile Status</h3>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Basic Info</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">University Details</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">IT Letter / Resume</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link href="/profile" className="w-full inline-flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors">
                Complete Profile
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
