import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Meris — Range-based access to shared datasets',
    template: '%s — Meris',
  },
  description: 'Discover, verify, preview, and deliver AI-ready and Web3 datasets through Shelby range access.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'Meris — Request the range, not the archive',
    description: 'Discover verifiable datasets and pay for the precise byte window you need through Shelby range delivery.',
    url: '/',
    siteName: 'Meris',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meris — Request the range, not the archive',
    description: 'Discover verifiable datasets and pay for the precise byte window you need through Shelby range delivery.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
