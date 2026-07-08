'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Users, MessageCircle, Send, GraduationCap, Building2 } from 'lucide-react';

type DirectoryStudent = {
  id: string;
  name: string;
  university: string | null;
  courseOfStudy: string | null;
  isCurrentlyOnSiwes: boolean;
  status: string;
};

type ChatMessage = {
  _id: string;
  text: string;
  createdAt: string;
  student: { _id: string; name: string } | null;
};

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const POLL_INTERVAL_MS = 5000;

export default function StudentCommunityPage() {
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<'chat' | 'directory'>('chat');

  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const lastMessageTimeRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const loadMessages = useCallback(async (initial = false) => {
    if (initial) setLoadingMessages(true);
    try {
      const params = new URLSearchParams();
      if (!initial && lastMessageTimeRef.current) params.set('since', lastMessageTimeRef.current);
      const res = await fetch(`/api/community/messages?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: ChatMessage[] = data.messages || [];
      if (incoming.length === 0) return;

      lastMessageTimeRef.current = incoming[incoming.length - 1].createdAt;
      setMessages((prev) => (initial ? incoming : [...prev, ...incoming]));
    } finally {
      if (initial) setLoadingMessages(false);
    }
  }, []);

  // Check membership once on mount, then kick off the initial loads directly
  // (not via a `joined`-keyed effect) so state updates don't cascade.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/community/messages');
        const isJoined = res.status !== 403;
        setJoined(isJoined);
        if (isJoined) {
          loadMessages(true);
          loadStudents();
        }
      } finally {
        setCheckingMembership(false);
      }
    })();
  }, [loadMessages, loadStudents]);

  // Poll for new chat messages.
  useEffect(() => {
    if (!joined || tab !== 'chat') return;
    const id = setInterval(() => loadMessages(false), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [joined, tab, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch('/api/community/join', { method: 'POST' });
      if (res.ok) {
        setJoined(true);
        loadMessages(true);
        loadStudents();
      }
    } finally {
      setJoining(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        lastMessageTimeRef.current = data.message.createdAt;
        setDraft('');
      }
    } finally {
      setSending(false);
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
          Join the SIWES Finder community to connect with other students doing their placements right now — see who&apos;s at
          which company, swap tips, and chat about the process.
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

      <div className="flex gap-2 bg-background border border-surface-border rounded-[10px] p-1 w-fit">
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] transition-colors ${tab === 'chat' ? 'bg-surface-1 font-bold shadow-sm' : 'font-semibold text-muted'}`}
        >
          <MessageCircle className="w-4 h-4" /> Chat
        </button>
        <button
          onClick={() => setTab('directory')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] transition-colors ${tab === 'directory' ? 'bg-surface-1 font-bold shadow-sm' : 'font-semibold text-muted'}`}
        >
          <Users className="w-4 h-4" /> Directory ({students.length})
        </button>
      </div>

      {tab === 'chat' ? (
        <div className="bg-surface-1 border border-surface-border rounded-2xl flex flex-col h-[560px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loadingMessages ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-muted py-10">No messages yet — be the first to say hi 👋</div>
            ) : (
              messages.map((m) => (
                <div key={m._id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center font-display font-bold text-[11px] text-primary-500 dark:text-primary-400 shrink-0">
                    {initials(m.student?.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-bold">{m.student?.name || 'A student'}</span>
                      <span className="text-[11px] text-muted">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[14px] text-foreground/90 whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-surface-border">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say something to the community…"
              maxLength={1000}
              className="flex-1 px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-background text-[14px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="px-4 py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      ) : (
        <div>
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
      )}
    </div>
  );
}
