// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Application', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/Message', () => ({
  default: { find: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findById: vi.fn() },
}));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendNewMessageEmail: vi.fn() }));

import { GET, POST } from '@/app/api/applications/[id]/messages/route';
import { requireSession } from '@/lib/mobileAuth';
import Application from '@/models/Application';
import Message from '@/models/Message';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/push';
import { sendNewMessageEmail } from '@/lib/email';

function makeGetRequest() {
  return new Request('http://localhost/api/applications/app1/messages');
}

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/applications/app1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockApplication(overrides: Partial<{ student: string; employer: string; job: { title: string } }> = {}) {
  const application = {
    student: 'stu1',
    employer: 'emp1',
    job: { title: 'Frontend Intern' },
    ...overrides,
  };
  (Application.findById as any).mockReturnValue({ populate: vi.fn().mockResolvedValue(application) });
  return application;
}

describe('GET /api/applications/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (requireSession as any).mockResolvedValue(null);
    const res = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(401);
  });

  it('404s when the application does not exist', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (Application.findById as any).mockReturnValue({ populate: vi.fn().mockResolvedValue(null) });

    const res = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(404);
  });

  it("404s when the caller isn't a party to the application", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'someone-else', role: 'student' } });
    mockApplication();

    const res = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(404);
  });

  it('returns the thread and marks the other party\'s messages read', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockApplication();
    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockResolvedValue([{ _id: 'm1', body: 'Hi', senderRole: 'employer' }]);
    (Message.find as any).mockReturnValue({ populate, sort });
    (Message.updateMany as any).mockResolvedValue({});

    const res = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'app1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.messages).toEqual([{ _id: 'm1', body: 'Hi', senderRole: 'employer' }]);
    expect(Message.updateMany).toHaveBeenCalledWith(
      { application: 'app1', senderRole: { $ne: 'student' }, read: false },
      { read: true }
    );
  });

  it('authorizes the employer party the same way', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    mockApplication();
    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockResolvedValue([]);
    (Message.find as any).mockReturnValue({ populate, sort });
    (Message.updateMany as any).mockResolvedValue({});

    const res = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/applications/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (requireSession as any).mockResolvedValue(null);
    const res = await POST(makePostRequest({ body: 'hi' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(401);
  });

  it("404s when the caller isn't a party to the application", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'someone-else', role: 'employer' } });
    mockApplication();

    const res = await POST(makePostRequest({ body: 'hi' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(404);
  });

  it('rejects an empty message', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockApplication();

    const res = await POST(makePostRequest({ body: '   ' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(400);
    expect(Message.create).not.toHaveBeenCalled();
  });

  it('rejects a message over 2000 characters', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockApplication();

    const res = await POST(makePostRequest({ body: 'x'.repeat(2001) }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(400);
    expect(Message.create).not.toHaveBeenCalled();
  });

  it('creates the message and best-effort notifies the other party by push and email', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockApplication();
    (Message.create as any).mockResolvedValue({ _id: 'm1' });
    (Message.findById as any).mockReturnValue({
      populate: vi.fn().mockResolvedValue({ _id: 'm1', body: 'Hello', senderRole: 'student' }),
    });
    (User.findById as any).mockImplementation((id: string) => ({
      select: vi.fn().mockResolvedValue(
        id === 'emp1'
          ? { email: 'employer@example.com', name: 'Acme HR', expoPushToken: 'tok-emp' }
          : { name: 'Ada' }
      ),
    }));

    const res = await POST(makePostRequest({ body: 'Hello' }), { params: Promise.resolve({ id: 'app1' }) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(Message.create).toHaveBeenCalledWith({
      application: 'app1',
      sender: 'stu1',
      senderRole: 'student',
      body: 'Hello',
    });
    expect(sendPushNotification).toHaveBeenCalledWith(
      'tok-emp',
      expect.stringContaining('Ada'),
      expect.any(String),
      expect.objectContaining({ type: 'new-message', applicationId: 'app1' })
    );
    expect(sendNewMessageEmail).toHaveBeenCalledWith(
      'employer@example.com',
      'Acme HR',
      'Ada',
      'Frontend Intern',
      'employer'
    );
    expect(data.message).toEqual({ _id: 'm1', body: 'Hello', senderRole: 'student' });
  });

  it('never fails the send when the notification lookup throws', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockApplication();
    (Message.create as any).mockResolvedValue({ _id: 'm1' });
    (Message.findById as any).mockReturnValue({
      populate: vi.fn().mockResolvedValue({ _id: 'm1', body: 'Hello', senderRole: 'student' }),
    });
    (User.findById as any).mockImplementation(() => {
      throw new Error('DB unavailable');
    });

    const res = await POST(makePostRequest({ body: 'Hello' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(201);
  });
});
