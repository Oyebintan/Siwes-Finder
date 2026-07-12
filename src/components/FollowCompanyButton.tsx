'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';

// "Follow this company" toggle for the job details page. When followed, the
// student gets a best-effort email/push alert (see POST /api/jobs) whenever
// this employer posts a new opportunity.
export default function FollowCompanyButton({ employerId }: { employerId: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/companies/${employerId}/follow`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setFollowing(Boolean(data?.following));
      })
      .catch(() => { if (!cancelled) setFollowing(false); });
    return () => { cancelled = true; };
  }, [employerId]);

  const toggle = async () => {
    if (toggling || following === null) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/companies/${employerId}/follow`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFollowing(Boolean(data.following));
      }
    } catch {
      // Leave the current state; the user can retry.
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={toggling || following === null}
      aria-pressed={following === true}
      className={`bg-surface-1 border-[1.5px] px-5 py-3 rounded-lg text-[14.5px] font-bold flex items-center gap-2 h-fit transition-colors disabled:opacity-60 ${
        following
          ? 'border-primary-500 text-primary-500 dark:border-primary-400 dark:text-primary-400'
          : 'border-surface-border'
      }`}
    >
      {toggling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Bell className={`w-4 h-4 ${following ? 'fill-current' : ''}`} />
      )}
      {following ? 'Following' : 'Follow company'}
    </button>
  );
}
