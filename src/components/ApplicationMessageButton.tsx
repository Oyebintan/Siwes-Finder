'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageCircle, Loader2, X, Send } from 'lucide-react';

type ThreadMessage = {
  _id: string;
  senderRole: 'student' | 'employer';
  body: string;
  createdAt: string;
  sender?: { name?: string };
};

// Self-contained "Message" button + modal thread, reused on both the
// employer applicant card and the student applications list -- the only
// thing that differs between the two call sites is the label.
export default function ApplicationMessageButton({
  applicationId,
  label = 'Message',
  unreadCount = 0,
}: {
  applicationId: string;
  label?: string;
  // Server-computed at page render (src/lib/unreadMessages.ts). Opening
  // the thread marks messages read server-side, so closing the modal
  // refreshes the page data to clear the badge.
  unreadCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    setOpen(false);
    if (unreadCount > 0) router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-xl bg-primary-500/10 dark:bg-primary-400/15 text-primary-600 dark:text-primary-300 hover:bg-primary-500/20 dark:hover:bg-primary-400/25 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <MessageCircle className="w-4 h-4" /> {label}
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`}
            className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 dark:bg-primary-400 text-white text-[11px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && <MessageThreadModal applicationId={applicationId} onClose={handleClose} />}
    </>
  );
}

const POLL_INTERVAL_MS = 8000;

function MessageThreadModal({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
  const { data: session } = useSession();
  const viewerRole = session?.user?.role;

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchThread = async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchThread();
    const interval = setInterval(fetchThread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md h-[560px] max-h-[85vh] bg-surface-1 border border-surface-border rounded-2xl flex flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
          <div className="font-display font-bold text-[15px]">Messages</div>
          <button type="button" onClick={onClose} className="p-1 -m-1 text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center text-[13px] text-muted py-10">No messages yet. Say hello 👋</div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderRole === viewerRole;
              return (
                <div key={m._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-[1.5] whitespace-pre-wrap break-words ${
                      isMine
                        ? 'bg-primary-500 dark:bg-primary-400 text-white rounded-br-sm'
                        : 'bg-surface-2 text-foreground rounded-bl-sm'
                    }`}
                  >
                    {m.body}
                    <div className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-muted'}`}>
                      {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && <div className="px-5 py-2 text-[12.5px] text-error shrink-0">{error}</div>}

        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-surface-border shrink-0">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            maxLength={2000}
            className="flex-1 px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-background text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="p-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white disabled:opacity-50 transition-all shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
