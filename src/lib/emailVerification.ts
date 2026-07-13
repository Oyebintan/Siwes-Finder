// Email-ownership verification (signup OTP codes) is opt-in via env.
//
// Why off by default: outbound email uses Resend's shared sandbox sender
// (onboarding@resend.dev), which only delivers to the Resend account
// owner's own address -- until a custom domain is verified on the Resend
// account (and RESEND_FROM_EMAIL points at it), real users would never
// receive their codes and signup would dead-end at /verify-email.
//
// To turn the whole flow back on, set REQUIRE_EMAIL_VERIFICATION=true in
// the deployment env. Every gate (apply, post-job), the post-signup
// redirect, and the reminder banners key off this one switch -- no code
// changes needed.
export function isEmailVerificationRequired(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
}
