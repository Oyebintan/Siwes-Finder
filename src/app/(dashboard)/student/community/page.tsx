'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Users, GraduationCap, Building2 } from 'lucide-react';

type DirectoryStudent = {
  id: string;
  name: string;
  university: string | null;
  courseOfStudy: string | null;
  isCurrentlyOnSiwes: boolean;
  status: string;
};

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.005c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.16 0 4.19.84 5.71 2.37a8.03 8.03 0 0 1 2.36 5.72c0 4.46-3.63 8.09-8.08 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.17-3.12.82.83-3.04-.19-.31a8.02 8.02 0 0 1-1.24-4.3c0-4.46 3.63-8.09 8.09-8.09zm-4.38 3.9c-.16-.36-.34-.37-.5-.37-.13 0-.28-.01-.42-.01a.8.8 0 0 0-.59.28c-.2.22-.78.76-.78 1.85 0 1.09.8 2.14.91 2.29.11.15 1.55 2.5 3.83 3.4 1.9.75 2.28.6 2.69.56.42-.04 1.36-.55 1.55-1.09.19-.53.19-.98.13-1.08-.06-.1-.21-.15-.43-.26-.23-.11-1.36-.67-1.57-.75-.21-.08-.36-.11-.51.11-.15.22-.59.75-.72.9-.13.15-.27.17-.5.06-.23-.11-.96-.36-1.83-1.13-.68-.6-1.14-1.35-1.27-1.57-.13-.22-.01-.34.1-.45.1-.1.23-.27.34-.4.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.4-.06-.1-.5-1.24-.7-1.7z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.9 4.1c.3-1.4-1-2.4-2.3-1.9L2.4 9.4c-1.4.5-1.4 2.5 0 3l4.2 1.4 1.6 5.1c.3.9 1.4 1.1 2.1.4l2.4-2.3 4.4 3.3c1 .8 2.5.2 2.7-1L21.9 4.1zM8.8 13.6l-1-3.3L17 6.5l-8.2 7.1zm1.5 1.3 1.5-1.3 1.7 1.3-1.7 3.3-1.5-3.3z" />
    </svg>
  );
}

export default function StudentCommunityPage() {
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/community/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // Check membership once on mount, then kick off the initial load directly
  // (not via a `joined`-keyed effect) so state updates don't cascade.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/community/students');
        const isJoined = res.status !== 403;
        setJoined(isJoined);
        if (isJoined) loadStudents();
      } finally {
        setCheckingMembership(false);
      }
    })();
  }, [loadStudents]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch('/api/community/join', { method: 'POST' });
      if (res.ok) {
        setJoined(true);
        loadStudents();
      }
    } finally {
      setJoining(false);
    }
  };

  if (checkingMembership) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (!joined) {
    return (
      <div className="max-w-[560px] mx-auto text-center py-16 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-primary-500 dark:text-primary-400" />
        </div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em] mb-2">You don&apos;t get to do SIWES alone</h1>
        <p className="text-sm text-muted mb-7">
          Join the SIWES Finder community to see who&apos;s doing their placement right now — which company, and whether
          they&apos;re still searching — plus get access to our WhatsApp and Telegram groups.
        </p>
        <button
          onClick={handleJoin}
          disabled={joining}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {joining && <Loader2 className="w-4 h-4 animate-spin" />}
          Join the community
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Community</h1>
        <p className="text-sm text-muted mt-1">Connect with other students doing SIWES right now.</p>
      </div>

      <div className="bg-surface-1 border border-surface-border rounded-2xl p-6">
        <div className="font-display font-bold text-[15px] mb-1">Join the group chat</div>
        <p className="text-[13.5px] text-muted mb-4">Swap tips, ask questions, and keep up with other students on WhatsApp or Telegram.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-lg bg-[#25D366] text-white font-bold hover:brightness-105 transition-all"
          >
            <WhatsAppIcon className="w-5 h-5" /> Join WhatsApp Group
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-lg bg-[#229ED9] text-white font-bold hover:brightness-105 transition-all"
          >
            <TelegramIcon className="w-5 h-5" /> Join Telegram Group
          </button>
        </div>
      </div>

      <div>
        <div className="font-display font-bold text-[17px] mb-4">Directory ({students.length})</div>
        {loadingStudents ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
        ) : students.length === 0 ? (
          <div className="bg-surface-1 border border-surface-border rounded-2xl p-14 text-center text-sm text-muted">
            No one else has joined yet — you&apos;re the first!
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {students.map((s) => (
              <div key={s.id} className="bg-surface-1 border border-surface-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500 dark:bg-primary-400 text-white flex items-center justify-center font-display font-bold text-[13px] shrink-0">
                    {initials(s.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-[15px] truncate">{s.name}</div>
                    {s.university && (
                      <div className="text-[12px] text-muted truncate flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 shrink-0" /> {s.university}{s.courseOfStudy ? ` · ${s.courseOfStudy}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full ${s.isCurrentlyOnSiwes ? 'bg-success-bg text-success' : 'bg-surface-2 text-muted'}`}>
                  <Building2 className="w-3 h-3" /> {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
