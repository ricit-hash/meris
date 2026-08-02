import type { Metadata } from 'next';
import { Suspense } from 'react';
import MarketplaceRoute from './MarketplaceRoute';

export const metadata: Metadata = {
  title: 'Marketplace — Meris',
  description: 'Explore datasets inside the Meris workspace.',
  robots: { index: false, follow: false },
};

export default function MarketplacePage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><MarketplaceRoute /></Suspense>;
}
