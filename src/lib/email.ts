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

export async function sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
  const resend = getClient();
  // resend.dev's shared sending domain works out of the box with no DNS
  // setup; swap in a verified custom domain via RESEND_FROM_EMAIL once one
  // is configured on the Resend account.
  const from = process.env.RESEND_FROM_EMAIL || 'SIWES Finder <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Your SIWES Finder password reset code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Reset your password</h2>
        <p style="color: #555;">Use this code to finish resetting your SIWES Finder password. It expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; margin: 20px 0; background: #f4f4f5; border-radius: 12px;">${otp}</div>
        <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email via Resend.');
  }
}
