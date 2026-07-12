import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import { type EmployerApplication } from "@/components/EmployerApplicationCard";
import EmployerApplicationsBoard from "@/components/EmployerApplicationsBoard";
import { redirect } from "next/navigation";

async function getEmployerApplications(employerId: string): Promise<EmployerApplication[]> {
  await connectToDatabase();
  const apps = await Application.find({ employer: employerId })
    .populate('job', 'title')
    .populate('student', 'name email university courseOfStudy resumeUrl')
    .sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(apps));
}

export default async function EmployerApplications() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'employer') redirect('/login');

  const applications = await getEmployerApplications(session.user.id);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Review Applicants</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and review students who applied to your IT placements.</p>
      </div>

      <EmployerApplicationsBoard applications={applications} />
    </div>
  );
}
