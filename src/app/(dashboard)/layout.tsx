'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Loader2, LogOut, LayoutDashboard, Briefcase, FileText, User, BookOpen,
  Menu, X, Search, ShieldCheck, Users, Plus, Building2, MessageCircle, type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { isAdminRole } from '@/lib/roles';

type NavItem = { name: string; href: string; icon: LucideIcon };

const STUDENT_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Browse Opportunities', href: '/student/jobs', icon: Search },
  { name: 'Applications', href: '/student/applications', icon: FileText },
  { name: 'e-Logbook', href: '/student/logbook', icon: BookOpen },
  { name: 'Community', href: '/student/community', icon: MessageCircle },
  { name: 'Profile', href: '/student/profile', icon: User },
];

const EMPLOYER_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard },
  { name: 'Post opportunity', href: '/employer/post-job', icon: Plus },
  { name: 'Manage opportunities', href: '/employer/dashboard', icon: Briefcase },
  { name: 'Applicants', href: '/employer/applications', icon: Users },
  { name: 'Student logbooks', href: '/employer/logbook', icon: BookOpen },
  { name: 'Company profile', href: '/employer/verification', icon: Building2 },
];

const ADMIN_NAV: NavItem[] = [
  { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Company verification', href: '/admin/companies', icon: ShieldCheck },
  { name: 'User management', href: '/admin/users', icon: Users },
  { name: 'Opportunity moderation', href: '/admin/jobs', icon: Briefcase },
];

const SCHOOL_NAV: NavItem[] = [
  { name: 'Overview', href: '/school/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/school/students', icon: Users },
  { name: 'Logbooks', href: '/school/logbooks', icon: BookOpen },
  { name: 'Institution profile', href: '/school/profile', icon: Building2 },
];

function initials(name?: string | null) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [subline, setSubline] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [emailVerified, setEmailVerified] = useState<boolean>(true);

  const role = session?.user?.role;

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && role === 'unassigned') router.push('/onboarding');
  }, [status, role, router]);

  useEffect(() => {
    // Close the mobile drawer on every route change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    // /api/profile serves every role; it's where the avatar/logo lives.
    fetch('/api/profile').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.avatarUrl) setAvatarUrl(d.avatarUrl);
      if (role === 'student' && d?.university) setSubline(d.university);
      if (d && typeof d.emailVerified === 'boolean') setEmailVerified(d.emailVerified);
    }).catch(() => {});
    if (role === 'employer') {
      fetch('/api/companies/verification').then((r) => (r.ok ? r.json() : null)).then((d) => {
        if (d?.verification?.companyName) setSubline(d.verification.companyName);
      }).catch(() => {});
    }
  }, [role]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>;
  }
  if (!session || role === 'unassigned') return null;

  const isAdmin = isAdminRole(role);
  const isEmployer = role === 'employer';
  const isSchool = role === 'school';
  const navItems = isAdmin ? ADMIN_NAV : isEmployer ? EMPLOYER_NAV : isSchool ? SCHOOL_NAV : STUDENT_NAV;
  const accentActive = isEmployer ? 'text-accent-500' : isAdmin ? 'text-white' : 'text-primary-500 dark:text-primary-400';
  const accentActiveBg = isEmployer ? 'bg-accent-500/10' : isAdmin ? 'bg-primary-500' : 'bg-primary-500/10 dark:bg-primary-400/15';

  const SidebarContent = (
    <div className={`flex flex-col h-full px-4 py-6 ${isAdmin ? 'bg-[#0B1220]' : 'bg-surface-1'}`}>
      <div className="flex items-center justify-between px-2 mb-8">
        <Link href="/" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 64 64" aria-hidden>
            <circle cx="22" cy="42" r="10" className="fill-primary-500 dark:fill-primary-400" />
            <circle cx="42" cy="22" r="10" className="fill-primary-500 dark:fill-primary-400" opacity={isAdmin ? 0.5 : 0.4} />
          </svg>
          <span className={`font-display font-extrabold text-[15px] ${isAdmin ? 'text-white' : 'text-foreground'}`}>
            SIWES Finder{isAdmin && <span className="text-[#8B93A3] font-semibold"> Admin</span>}
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? `${accentActiveBg} ${accentActive} font-bold`
                  : isAdmin
                    ? 'text-[#9AA2B4] hover:bg-white/[0.08] font-semibold'
                    : 'text-muted hover:bg-surface-2 font-semibold'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto flex items-center gap-2.5 p-3 rounded-[10px] ${isAdmin ? 'bg-white/[0.05]' : 'bg-background'}`}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className={`w-[34px] h-[34px] object-cover shrink-0 ${isEmployer ? 'rounded-[9px]' : 'rounded-full'}`}
          />
        ) : (
          <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center font-display font-bold text-[13px] shrink-0 ${
            isEmployer ? 'bg-accent-500 text-[#032E1A] rounded-[9px]' : 'bg-primary-500 dark:bg-primary-400 text-white'
          }`}>
            {initials(session.user?.name)}
          </div>
        )}
        <div className="min-w-0">
          <div className={`text-[13px] font-bold truncate ${isAdmin ? 'text-white' : 'text-foreground'}`}>{session.user?.name}</div>
          {isEmployer ? (
            <div className="text-[11.5px] font-semibold text-success truncate">{subline ? `● ${subline}` : '● Verified'}</div>
          ) : (
            <div className={`text-[11.5px] truncate ${isAdmin ? 'text-[#8B93A3]' : 'text-muted'}`}>
              {isAdmin ? (role === 'super_admin' ? 'Super admin' : 'Admin') : isSchool ? 'Institution' : subline || ' '}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className={`flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-sm font-semibold transition-colors ${
          isAdmin ? 'text-[#9AA2B4] hover:bg-white/[0.08]' : 'text-muted hover:bg-surface-2'
        }`}
      >
        <LogOut className="w-[18px] h-[18px]" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background bg-dots text-foreground">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-[240px] shrink-0 border-r border-surface-border sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* MOBILE TOP BAR */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3.5 border-b ${isAdmin ? 'bg-[#0B1220] border-white/10' : 'glass-surface border-surface-border'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className={`w-8 h-8 rounded-lg border-[1.5px] flex items-center justify-center ${isAdmin ? 'border-white/20 text-white' : 'border-surface-border text-foreground'}`}>
            <Menu className="w-4 h-4" />
          </button>
          <span className={`font-display font-extrabold text-[15px] ${isAdmin ? 'text-white' : 'text-foreground'}`}>SIWES Finder</span>
        </div>
        <ThemeToggle />
      </div>

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="md:hidden fixed inset-0 z-40 bg-black/40" />
          <div className="md:hidden fixed top-0 left-0 bottom-0 w-[240px] z-50 shadow-2xl">
            <div className="relative h-full">
              <button onClick={() => setDrawerOpen(false)} className={`absolute top-6 right-3 w-7 h-7 rounded-lg flex items-center justify-center ${isAdmin ? 'text-white' : 'text-foreground'}`}>
                <X className="w-4 h-4" />
              </button>
              {SidebarContent}
            </div>
          </div>
        </>
      )}

      <main className="flex-1 px-5 sm:px-8 lg:px-12 pt-20 md:pt-10 pb-12 max-w-[1120px] mx-auto w-full">
        {(role === 'student' || role === 'employer') && !emailVerified && session.user?.email ? (
          <EmailVerificationBanner email={session.user.email} role={role} />
        ) : null}
        {children}
      </main>
    </div>
  );
}
