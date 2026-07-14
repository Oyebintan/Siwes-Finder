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

// Every notification email below interpolates user-controlled data (names,
// job titles, company names) into an HTML string sent verbatim via Resend.
// Without escaping, e.g. a job title of `<img src=x onerror=...>` would
// render as live HTML in the recipient's email client -- escape anything
// that didn't originate as a literal string in this file.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

export async function sendEmailVerificationOtpEmail(to: string, otp: string): Promise<void> {
  await send(
    to,
    'Verify your SIWES Finder email address',
    `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Confirm it's you</h2>
        <p style="color: #555;">Use this code to verify your email address. It expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; margin: 20px 0; background: #f4f4f5; border-radius: 12px;">${otp}</div>
        <p style="color: #888; font-size: 13px;">If you didn't create a SIWES Finder account, you can safely ignore this email.</p>
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
  const name = escapeHtml(studentName);
  const title = escapeHtml(jobTitle);
  await send(
    to,
    accepted ? `You got the placement: ${jobTitle} 🎉` : `Update on your application: ${jobTitle}`,
    layout(
      accepted ? 'Congratulations!' : 'Application update',
      `<p style="color: #555;">Hi ${name},</p>
       <p style="color: #555;">${
         accepted
           ? `Great news — your application for <strong>${title}</strong> was <strong>accepted</strong>. Once your placement starts, remember to keep your e-Logbook up to date.`
           : `Your application for <strong>${title}</strong> was not selected this time. Don't be discouraged — new verified placements open every week.`
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
  const name = escapeHtml(studentName);
  const day = escapeHtml(dayOfWeek);
  await send(
    to,
    'Logbook entry approved ✓',
    layout(
      'Logbook entry approved',
      `<p style="color: #555;">Hi ${name},</p>
       <p style="color: #555;">Your logbook entry for <strong>Week ${weekNumber} · ${day}</strong> was approved by your employer.</p>`,
      { label: 'Open your e-Logbook', path: '/student/logbook' }
    )
  );
}

export async function sendNewJobAlertEmail(
  to: string,
  studentName: string,
  companyLabel: string,
  jobTitle: string,
  jobId: string
): Promise<void> {
  const name = escapeHtml(studentName);
  const company = escapeHtml(companyLabel);
  const title = escapeHtml(jobTitle);
  await send(
    to,
    `${companyLabel} just posted: ${jobTitle}`,
    layout(
      'New opportunity from a company you follow',
      `<p style="color: #555;">Hi ${name},</p>
       <p style="color: #555;"><strong>${company}</strong> just posted a new opportunity: <strong>${title}</strong>.</p>`,
      { label: 'View opportunity', path: `/student/jobs/${jobId}` }
    )
  );
}

export async function sendNewMessageEmail(
  to: string,
  recipientName: string,
  senderName: string,
  jobTitle: string,
  recipientRole: 'student' | 'employer'
): Promise<void> {
  const recipient = escapeHtml(recipientName);
  const sender = escapeHtml(senderName);
  const title = escapeHtml(jobTitle);
  await send(
    to,
    `New message from ${senderName}`,
    layout(
      'You have a new message',
      `<p style="color: #555;">Hi ${recipient},</p>
       <p style="color: #555;"><strong>${sender}</strong> sent you a message about <strong>${title}</strong>.</p>`,
      { label: 'View conversation', path: recipientRole === 'employer' ? '/employer/applications' : '/student/applications' }
    )
  );
}

export async function sendJobTakedownEmail(
  to: string,
  companyLabel: string,
  jobTitle: string
): Promise<void> {
  const company = escapeHtml(companyLabel);
  const title = escapeHtml(jobTitle);
  await send(
    to,
    `Your listing was removed: ${jobTitle}`,
    layout(
      'Listing removed by our moderation team',
      `<p style="color: #555;">Hi ${company},</p>
       <p style="color: #555;">Your opportunity <strong>${title}</strong> was removed from SIWES Finder by our moderation team, along with its pending applications. This usually means the listing didn't meet our posting guidelines.</p>
       <p style="color: #555;">If you believe this was a mistake, reply to this email and we'll take another look.</p>`,
      { label: 'Post a new opportunity', path: '/employer/post-job' }
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
  const name = escapeHtml(accountName);
  const reason = rejectionReason ? escapeHtml(rejectionReason) : undefined;
  await send(
    to,
    approved ? 'Your SIWES Finder account is verified ✓' : 'Your SIWES Finder verification needs attention',
    layout(
      approved ? 'Verification approved' : 'Verification not approved',
      `<p style="color: #555;">Hi ${name},</p>
       <p style="color: #555;">${
         approved
           ? accountRole === 'school'
             ? `Your ${noun} account has been verified by our admin team. Your students' records — placements, applications, and logbooks — are now unlocked.`
             : `Your ${noun} account has been verified by our admin team. Your opportunities are now publicly visible to students.`
           : `Your ${noun} verification was not approved.${reason ? ` Reason: <strong>${reason}</strong>.` : ''} You can update your details and resubmit at any time.`
       }</p>`,
      approved
        ? { label: 'Go to your dashboard', path: accountRole === 'school' ? '/school/dashboard' : '/employer/dashboard' }
        : { label: 'Review your submission', path: accountRole === 'school' ? '/school/profile' : '/employer/verification' }
    )
  );
}
