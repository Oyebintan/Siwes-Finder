import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import { LayoutDashboard, UserCircle, Briefcase, FileText, LogOut } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isStudent = session.user.role === "student";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Dashboard Top Navigation (Liquid Glassy) */}
      <nav className="sticky top-4 z-50 mx-auto w-[95%] max-w-7xl flex items-center justify-between px-4 py-3 md:px-6 md:py-3 backdrop-blur-2xl bg-white/10 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300">
        <div className="flex items-center gap-2 md:gap-3">
          <Image
            src="/logo.png"
            alt="SIWES Finder Logo"
            width={32}
            height={32}
            className="w-8 h-8 md:w-10 md:h-10 rounded-xl"
          />
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-400 dark:from-blue-400 dark:to-cyan-200">
            {isStudent ? "Student Portal" : "Employer Portal"}
          </h1>
        </div>

        {/* Dashboard Links */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href={isStudent ? "/student/dashboard" : "/employer/dashboard"} className="flex flex-col items-center text-foreground/70 hover:text-blue-500 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Dashboard</span>
          </Link>
          
          {isStudent ? (
            <>
              <Link href="/student/jobs" className="flex flex-col items-center text-foreground/70 hover:text-blue-500 transition-colors">
                <Briefcase className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1">Find IT</span>
              </Link>
              <Link href="/student/applications" className="flex flex-col items-center text-foreground/70 hover:text-blue-500 transition-colors">
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1">Applications</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/employer/post-job" className="flex flex-col items-center text-foreground/70 hover:text-blue-500 transition-colors">
                <Briefcase className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1">Post Job</span>
              </Link>
              <Link href="/employer/applications" className="flex flex-col items-center text-foreground/70 hover:text-blue-500 transition-colors">
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-1">Review</span>
              </Link>
            </>
          )}

          <Link href="/profile" className="flex flex-col items-center text-foreground/70 hover:text-blue-500 transition-colors">
            <UserCircle className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Profile</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pt-10">
        {children}
      </main>
    </div>
  );
}
