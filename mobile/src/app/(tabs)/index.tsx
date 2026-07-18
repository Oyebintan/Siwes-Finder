import { Redirect } from 'expo-router';

import { useAuth } from '@/api/AuthContext';

// '/' is where login, signup, verify-email, and profile-setup all land
// (router.replace('/')), and where a cold start opens -- so this route is
// a pure role dispatcher, never a screen of its own. It stays hidden from
// the tab bar (see (tabs)/_layout.tsx) and immediately redirects each role
// to its real landing tab: students to the Home dashboard, employers and
// schools to theirs. (The role !== student/employer/school holding-screen
// case is handled one level up, in (tabs)/_layout.tsx, before Tabs mount --
// this component only ever renders for the three roles Tabs supports.)
export default function HomeTab() {
  const { user } = useAuth();
  if (user?.role === 'employer') return <Redirect href="/employer-dashboard" />;
  if (user?.role === 'school') return <Redirect href="/school-overview" />;
  return <Redirect href="/dashboard" />;
}
