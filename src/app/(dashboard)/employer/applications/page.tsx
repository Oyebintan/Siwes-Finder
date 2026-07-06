import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import EmployerApplicationCard from "@/components/EmployerApplicationCard";
import { UserCheck } from "lucide-react";

async function getEmployerApplications(employerId: string) {
  await connectToDatabase();
  const apps = await Application.find({ employer: employerId })
    .populate('job', 'title')
    .populate('student', 'name email university courseOfStudy resumeUrl')
    .sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(apps));
}

export default async function EmployerApplications() {
  const session = await getServerSession(authOptions);
  const applications = await getEmployerApplications(session!.user.id);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Review Applicants</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and review students who applied to your IT placements.</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl">
          <UserCheck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No applicants yet</h3>
          <p className="text-gray-500 dark:text-gray-400">When students apply, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map((app: any) => (
            <EmployerApplicationCard key={app._id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}