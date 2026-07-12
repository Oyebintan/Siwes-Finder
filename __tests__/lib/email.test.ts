import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'email_1' }, error: null });

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('email.ts HTML escaping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.RESEND_API_KEY = 'test-key';
  });

  it('escapes an attacker-controlled job title before embedding it in the HTML body', async () => {
    const { sendApplicationDecisionEmail } = await import('@/lib/email');
    const maliciousTitle = '<img src=x onerror=alert(1)>';

    await sendApplicationDecisionEmail('student@example.com', 'Ada', maliciousTitle, 'Accepted');

    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes an attacker-controlled student name', async () => {
    const { sendApplicationDecisionEmail } = await import('@/lib/email');
    const maliciousName = '<script>alert(document.cookie)</script>';

    await sendApplicationDecisionEmail('student@example.com', maliciousName, 'Frontend Intern', 'Rejected');

    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).not.toContain('<script>alert(document.cookie)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes a malicious sender name in the new-message email', async () => {
    const { sendNewMessageEmail } = await import('@/lib/email');

    await sendNewMessageEmail(
      'recipient@example.com',
      'Recipient',
      '<a href="javascript:alert(1)">click</a>',
      'Frontend Intern',
      'employer'
    );

    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).not.toContain('<a href="javascript:alert(1)">');
  });

  it('escapes a malicious rejection reason', async () => {
    const { sendVerificationDecisionEmail } = await import('@/lib/email');

    await sendVerificationDecisionEmail(
      'employer@example.com',
      'Acme Ltd',
      'employer',
      'rejected',
      '<img src=x onerror=alert(1)>'
    );

    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('still renders normal, benign names and titles correctly', async () => {
    const { sendApplicationDecisionEmail } = await import('@/lib/email');

    await sendApplicationDecisionEmail('student@example.com', "O'Brien & Co.", 'Frontend Intern', 'Accepted');

    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).toContain('O&#39;Brien &amp; Co.');
  });
});
