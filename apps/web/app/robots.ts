import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = 'https://aletheia.market';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/gate', '/profile', '/dashboard', '/publish', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
