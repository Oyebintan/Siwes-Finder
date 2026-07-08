'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Users, MessageCircle, Send, GraduationCap, Building2, UserPlus, Check, X } from 'lucide-react';

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

type Peer = { _id: string; name: string; university?: string; courseOfStudy?: string };
type ConnectionEntry = { connectionId: string; peer: Peer };
type DMMessage = { _id: string; text: string; createdAt: string; from: string; to: string };

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const POLL_INTERVAL_MS = 5000;

export default function StudentCommunityPage() {
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const [checkingMembership, setCheckingMembership] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<'chat' | 'directory' | 'messages'>('chat');

  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const lastMessageTimeRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [accepted, setAccepted] = useState<ConnectionEntry[]>([]);
  const [incomingPending, setIncomingPending] = useState<ConnectionEntry[]>([]);
  const [outgoingPending, setOutgoingPending] = useState<ConnectionEntry[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [connectingIds, setConnectingIds] = useState<Record<string, boolean>>({});
  const [respondingIds, setRespondingIds] = useState<Record<string, boolean>>({});

  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [loadingDm, setLoadingDm] = useState(false);
  const [dmDraft, setDmDraft] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const dmLastTimeRef = useRef<string | null>(null);
  const dmEndRef = useRef<HTMLDivElement>(null);

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

  const loadConnections = useCallback(async () => {
    setLoadingConnections(true);
    try {
      const res = await fetch('/api/community/connections');
      if (res.ok) {
        const data = await res.json();
        setAccepted(data.accepted || []);
        setIncomingPending(data.incomingPending || []);
        setOutgoingPending(data.outgoingPending || []);
      }
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  const loadDm = useCallback(async (peerId: string, initial = false) => {
    if (initial) setLoadingDm(true);
    try {
      const params = new URLSearchParams();
      if (!initial && dmLastTimeRef.current) params.set('since', dmLastTimeRef.current);
      const res = await fetch(`/api/community/dm/${peerId}?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: DMMessage[] = data.messages || [];
      if (incoming.length === 0) return;
      dmLastTimeRef.current = incoming[incoming.length - 1].createdAt;
      setDmMessages((prev) => (initial ? incoming : [...prev, ...incoming]));
    } finally {
      if (initial) setLoadingDm(false);
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
          loadConnections();
        }
      } finally {
        setCheckingMembership(false);
      }
    })();
  }, [loadMessages, loadStudents, loadConnections]);

  // Poll for new community chat messages.
  useEffect(() => {
    if (!joined || tab !== 'chat') return;
    const id = setInterval(() => loadMessages(false), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [joined, tab, loadMessages]);

  // Poll for new direct messages in the open thread.
  useEffect(() => {
    if (!joined || tab !== 'messages' || !selectedPeer) return;
    const id = setInterval(() => loadDm(selectedPeer._id, false), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [joined, tab, selectedPeer, loadDm]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch('/api/community/join', { method: 'POST' });
      if (res.ok) {
        setJoined(true);
        loadMessages(true);
        loadStudents();
        loadConnections();
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

  const handleConnect = async (studentId: string) => {
    setConnectingIds((prev) => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch('/api/community/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      if (res.ok) await loadConnections();
    } finally {
      setConnectingIds((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const handleRespond = async (connectionId: string, action: 'accept' | 'decline') => {
    setRespondingIds((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const res = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await loadConnections();
    } finally {
      setRespondingIds((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const openThread = (peer: Peer) => {
    setSelectedPeer(peer);
    setDmMessages([]);
    dmLastTimeRef.current = null;
    loadDm(peer._id, true);
  };

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeer) return;
    const text = dmDraft.trim();
    if (!text) return;
    setDmSending(true);
    try {
      const res = await fetch(`/api/community/dm/${selectedPeer._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        setDmMessages((prev) => [...prev, data.message]);
        dmLastTimeRef.current = data.message.createdAt;
        setDmDraft('');
      }
    } finally {
      setDmSending(false);
    }
  };

  function connectionStatusFor(studentId: string): 'self' | 'connected' | 'outgoing' | 'incoming' | 'none' {
    if (studentId === myId) return 'self';
    if (accepted.some((c) => c.peer._id === studentId)) return 'connected';
    if (outgoingPending.some((c) => c.peer._id === studentId)) return 'outgoing';
    if (incomingPending.some((c) => c.peer._id === studentId)) return 'incoming';
    return 'none';
  }

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

      <div className="flex gap-2 bg-background border border-surface-border rounded-[10px] p-1 w-fit flex-wrap">
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
        <button
          onClick={() => setTab('messages')}
          className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] transition-colors ${tab === 'messages' ? 'bg-surface-1 font-bold shadow-sm' : 'font-semibold text-muted'}`}
        >
          <UserPlus className="w-4 h-4" /> Messages
          {incomingPending.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center">
              {incomingPending.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'chat' && (
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
      )}

      {tab === 'directory' && (
        <div>
          {loadingStudents ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : students.length === 0 ? (
            <div className="bg-surface-1 border border-surface-border rounded-2xl p-14 text-center text-sm text-muted">
              No one else has joined yet — you&apos;re the first!
            </div>
          ) : (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {students.map((s) => {
                const status = connectionStatusFor(s.id);
                return (
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
                    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full mb-3 ${s.isCurrentlyOnSiwes ? 'bg-success-bg text-success' : 'bg-surface-2 text-muted'}`}>
                      <Building2 className="w-3 h-3" /> {s.status}
                    </span>
                    {status === 'self' ? null : status === 'connected' ? (
                      <button
                        onClick={() => { openThread({ _id: s.id, name: s.name }); setTab('messages'); }}
                        className="w-full text-[12.5px] font-bold px-3 py-2 rounded-lg bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400 hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Message
                      </button>
                    ) : status === 'outgoing' ? (
                      <div className="w-full text-[12.5px] font-semibold px-3 py-2 rounded-lg bg-surface-2 text-muted text-center">Request sent</div>
                    ) : status === 'incoming' ? (
                      <button onClick={() => setTab('messages')} className="w-full text-[12.5px] font-semibold px-3 py-2 rounded-lg bg-warning-bg text-warning text-center hover:brightness-110 transition-all">
                        Wants to connect — respond
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(s.id)}
                        disabled={connectingIds[s.id]}
                        className="w-full text-[12.5px] font-bold px-3 py-2 rounded-lg border-[1.5px] border-surface-border hover:border-primary-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {connectingIds[s.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div className="grid gap-4 sm:grid-cols-[280px_1fr] h-[560px]">
          <div className="bg-surface-1 border border-surface-border rounded-2xl overflow-y-auto p-3">
            {incomingPending.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] font-bold text-muted uppercase tracking-wide px-2 mb-1.5">Requests</div>
                <div className="space-y-1.5">
                  {incomingPending.map((c) => (
                    <div key={c.connectionId} className="p-2.5 rounded-lg bg-warning-bg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center font-display font-bold text-[10px] text-primary-500 dark:text-primary-400 shrink-0">
                          {initials(c.peer.name)}
                        </div>
                        <span className="text-[13px] font-bold truncate">{c.peer.name}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRespond(c.connectionId, 'accept')}
                          disabled={respondingIds[c.connectionId]}
                          className="flex-1 text-[11.5px] font-bold px-2 py-1.5 rounded-md bg-success text-white hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleRespond(c.connectionId, 'decline')}
                          disabled={respondingIds[c.connectionId]}
                          className="flex-1 text-[11.5px] font-bold px-2 py-1.5 rounded-md bg-surface-2 text-muted hover:bg-surface-border disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-[11px] font-bold text-muted uppercase tracking-wide px-2 mb-1.5">Connections</div>
            {loadingConnections ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
            ) : accepted.length === 0 ? (
              <div className="text-[12.5px] text-muted px-2 py-4">No connections yet — connect with someone from the Directory tab.</div>
            ) : (
              <div className="space-y-1">
                {accepted.map((c) => (
                  <button
                    key={c.connectionId}
                    onClick={() => openThread(c.peer)}
                    className={`w-full text-left flex items-center gap-2 p-2.5 rounded-lg transition-colors ${selectedPeer?._id === c.peer._id ? 'bg-primary-500/10 dark:bg-primary-400/15' : 'hover:bg-surface-2'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-500 dark:bg-primary-400 text-white flex items-center justify-center font-display font-bold text-[10px] shrink-0">
                      {initials(c.peer.name)}
                    </div>
                    <span className="text-[13px] font-semibold truncate">{c.peer.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-1 border border-surface-border rounded-2xl flex flex-col overflow-hidden">
            {!selectedPeer ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted px-6 text-center">
                Select a connection to start chatting privately.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 p-4 border-b border-surface-border">
                  <div className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-400 text-white flex items-center justify-center font-display font-bold text-[11px] shrink-0">
                    {initials(selectedPeer.name)}
                  </div>
                  <span className="font-display font-bold text-[14px]">{selectedPeer.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {loadingDm ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                  ) : dmMessages.length === 0 ? (
                    <div className="text-center text-sm text-muted py-10">No messages yet — say hello 👋</div>
                  ) : (
                    dmMessages.map((m) => {
                      const mine = m.from === myId;
                      return (
                        <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[14px] ${mine ? 'bg-primary-500 dark:bg-primary-400 text-white rounded-br-sm' : 'bg-surface-2 rounded-bl-sm'}`}>
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            <span className={`text-[10px] block mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={dmEndRef} />
                </div>
                <form onSubmit={handleSendDm} className="flex gap-2 p-4 border-t border-surface-border">
                  <input
                    value={dmDraft}
                    onChange={(e) => setDmDraft(e.target.value)}
                    placeholder={`Message ${selectedPeer.name.split(' ')[0]}…`}
                    maxLength={1000}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-background text-[14px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={dmSending || !dmDraft.trim()}
                    className="px-4 py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center"
                  >
                    {dmSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
