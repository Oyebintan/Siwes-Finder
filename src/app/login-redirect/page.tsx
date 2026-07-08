'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.role === 'student') {
        router.replace('/student/dashboard');
      } else if (session?.user?.role === 'employer') {
        router.replace('/employer/dashboard');
      } else if (session?.user?.role === 'admin' || session?.user?.role === 'super_admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-white/60 font-medium animate-pulse">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
