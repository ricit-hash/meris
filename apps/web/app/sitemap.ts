import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://aletheia.market';
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/mechanism`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
