import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXTAUTH_URL || 'https://siwes-finder-eight.vercel.app';

// Only the public, always-on pages. Job listings live behind auth today;
// if public job pages ever ship, they should be generated into this list
// from the database.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/login`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
