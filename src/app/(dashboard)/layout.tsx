'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, LogOut, LayoutDashboard, Briefcase, FileText, User, BookOpen, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session.user.role === 'unassigned') router.push('/onboarding');
  }, [status, session, router]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-accent-500" /></div>;
  }
  if (!session || session.user.role === 'unassigned') return null;

  const isStudent = session.user.role === 'student';
  const navLinks = isStudent ? [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Find Jobs', href: '/student/jobs', icon: Briefcase },
    { name: 'Applications', href: '/student/applications', icon: FileText },
    { name: 'e-Logbook', href: '/student/logbook', icon: BookOpen },
    { name: 'Profile', href: '/student/profile', icon: User },
  ] : [
    { name: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard },
    { name: 'Post Job', href: '/employer/post-job', icon: Briefcase },
    { name: 'Applicants', href: '/employer/applications', icon: FileText },
    { name: 'Logbooks', href: '/employer/logbook', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen relative font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-surface border-b border-gray-200/60 dark:border-white/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent-800 to-accent-400 text-xl tracking-tight">
              SIWES Finder
            </Link>

            <div className="hidden md:flex items-center gap-1 h-full">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-4 h-16 text-sm font-bold transition-colors ${isActive ? 'text-accent-700 dark:text-accent-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                    {isActive && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-accent-600 to-accent-300" />}
                  </Link>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-4 border-l border-gray-200 dark:border-white/10 pl-4 ml-2">
              <ThemeToggle />
              <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Sign Out">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass-surface border-b border-gray-200/60 dark:border-white/5">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-bold ${isActive ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                );
              })}
              <button onClick={() => signOut({ callbackUrl: '/' })} className="flex w-full items-center gap-3 px-3 py-3 rounded-md text-base font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        {children}
      </main>
    </div>
  );
}
