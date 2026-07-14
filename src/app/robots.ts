import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXTAUTH_URL || 'https://siwes-finder-eight.vercel.app';

// Everything under a session (dashboards, API) is useless or harmful in a
// search index; the public marketing/auth pages are what should rank.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/student/', '/employer/', '/school/', '/admin/', '/login-redirect'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
