import type { Metadata } from 'next';
import MarketplaceDetailRoute from './MarketplaceDetailRoute';

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Dataset — Meris Marketplace',
  description: 'Inspect a dataset and request the records you need inside Meris.',
  robots: { index: false, follow: false },
};

export default async function MarketplaceDetailPage({ params }: Props) {
  const { id } = await params;
  return <MarketplaceDetailRoute id={id} />;
}
