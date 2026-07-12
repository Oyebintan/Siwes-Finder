import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set.');
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

// resend.dev's shared sending domain works out of the box with no DNS
// setup; swap in a verified custom domain via RESEND_FROM_EMAIL once one
// is configured on the Resend account.
function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'SIWES Finder <onboarding@resend.dev>';
}

const SITE_URL = process.env.NEXTAUTH_URL || 'https://siwes-finder-eight.vercel.app';

async function send(to: string, subject: string, html: string): Promise<void> {
  const resend = getClient();
  const { error } = await resend.emails.send({ from: fromAddress(), to, subject, html });
  if (error) {
    throw new Error(error.message || 'Failed to send email via Resend.');
  }
}

// Shared shell so every notification email reads as the same product.
function layout(heading: string, bodyHtml: string, cta?: { label: string; path: string }): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">${heading}</h2>
      ${bodyHtml}
      ${
        cta
          ? `<a href="${SITE_URL}${cta.path}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2557eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px;">${cta.label}</a>`
          : ''
      }
      <p style="color: #888; font-size: 12px; margin-top: 28px;">You're receiving this because you have a SIWES Finder account.</p>
    </div>
  `;
}

export async function sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
  await send(
    to,
    'Your SIWES Finder password reset code',
    `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Reset your password</h2>
        <p style="color: #555;">Use this code to finish resetting your SIWES Finder password. It expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; margin: 20px 0; background: #f4f4f5; border-radius: 12px;">${otp}</div>
        <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  );
}

// The notification senders below are called as best-effort side effects of
// an already-successful state change (see e.g. PUT /api/applications/[id]):
// callers wrap them in try/catch and swallow failures, same as the push
// notifications -- an email outage must never fail the decision itself.

export async function sendApplicationDecisionEmail(
  to: string,
  studentName: string,
  jobTitle: string,
  status: 'Accepted' | 'Rejected'
): Promise<void> {
  const accepted = status === 'Accepted';
  await send(
    to,
    accepted ? `You got the placement: ${jobTitle} 🎉` : `Update on your application: ${jobTitle}`,
    layout(
      accepted ? 'Congratulations!' : 'Application update',
      `<p style="color: #555;">Hi ${studentName},</p>
       <p style="color: #555;">${
         accepted
           ? `Great news — your application for <strong>${jobTitle}</strong> was <strong>accepted</strong>. Once your placement starts, remember to keep your e-Logbook up to date.`
           : `Your application for <strong>${jobTitle}</strong> was not selected this time. Don't be discouraged — new verified placements open every week.`
       }</p>`,
      accepted
        ? { label: 'View your applications', path: '/student/applications' }
        : { label: 'Browse open placements', path: '/student/jobs' }
    )
  );
}

export async function sendLogbookApprovalEmail(
  to: string,
  studentName: string,
  weekNumber: number,
  dayOfWeek: string
): Promise<void> {
  await send(
    to,
    'Logbook entry approved ✓',
    layout(
      'Logbook entry approved',
      `<p style="color: #555;">Hi ${studentName},</p>
       <p style="color: #555;">Your logbook entry for <strong>Week ${weekNumber} · ${dayOfWeek}</strong> was approved by your employer.</p>`,
      { label: 'Open your e-Logbook', path: '/student/logbook' }
    )
  );
}

export async function sendVerificationDecisionEmail(
  to: string,
  accountName: string,
  accountRole: 'employer' | 'school',
  decision: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const approved = decision === 'approved';
  const noun = accountRole === 'school' ? 'school' : 'company';
  await send(
    to,
    approved ? 'Your SIWES Finder account is verified ✓' : 'Your SIWES Finder verification needs attention',
    layout(
      approved ? 'Verification approved' : 'Verification not approved',
      `<p style="color: #555;">Hi ${accountName},</p>
       <p style="color: #555;">${
         approved
           ? accountRole === 'school'
             ? `Your ${noun} account has been verified by our admin team. Your students' records — placements, applications, and logbooks — are now unlocked.`
             : `Your ${noun} account has been verified by our admin team. Your opportunities are now publicly visible to students.`
           : `Your ${noun} verification was not approved.${rejectionReason ? ` Reason: <strong>${rejectionReason}</strong>.` : ''} You can update your details and resubmit at any time.`
       }</p>`,
      approved
        ? { label: 'Go to your dashboard', path: accountRole === 'school' ? '/school/dashboard' : '/employer/dashboard' }
        : { label: 'Review your submission', path: accountRole === 'school' ? '/school/profile' : '/employer/verification' }
    )
  );
}
