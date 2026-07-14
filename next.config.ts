import type { NextConfig } from "next";

// Baseline security headers on every response. A full Content-Security-Policy
// is deliberately not set yet: Next.js inline runtime scripts and Tailwind's
// inline styles need a nonce-based setup to avoid 'unsafe-inline', which is
// its own project -- tracked in PROJECT_SCOPE.md's gaps.
const securityHeaders = [
  // Browsers must not sniff a response into a different content type
  // (e.g. treating an uploaded file as HTML).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No page on this site has a reason to be iframed -- blocks clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin cross-site, full URL same-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app never uses these device APIs; deny so embedded third-party
  // content can't request them either.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Pin browsers to HTTPS for a year (Vercel always serves HTTPS anyway;
  // this stops protocol-downgrade on first visit after the first load).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
