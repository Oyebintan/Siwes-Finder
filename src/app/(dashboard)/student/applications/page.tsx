import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import Link from "next/link";
import { Building2, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";

async function getApplications(studentId: string) {
  await connectToDatabase();
  const apps = await Application.find({ student: studentId })
    .populate('job', 'title location companyName')
    .sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(apps));
}

export default async function StudentApplications() {
  const session = await getServerSession(authOptions);
  const applications = await getApplications(session!.user.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My Applications</h1>
        <p className="text-foreground/60 mt-1">Track the status of your SIWES placement requests.</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
          <Building2 className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No applications yet</h3>
          <p className="text-foreground/60 mb-6">You haven't applied to any IT placements yet.</p>
          <Link href="/student/jobs" className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => (
            <div key={app._id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-blue-500/50">
              <div>
                <h3 className="text-xl font-bold mb-2">{app.job.title}</h3>
                <div className="flex items-center gap-4 text-sm text-foreground/60">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {app.job.location}</span>
                  <span>Applied on {new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {app.status === 'Pending' && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold text-sm">
                    <Clock className="w-4 h-4" /> Pending Review
                  </span>
                )}
                {app.status === 'Accepted' && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" /> Accepted
                  </span>
                )}
                {app.status === 'Rejected' && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-sm">
                    <XCircle className="w-4 h-4" /> Rejected
                  </span>
                )}
                <Link href={`/student/jobs/${app.job._id}`} className="px-4 py-2 text-sm font-bold text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl">
                  View Job
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
