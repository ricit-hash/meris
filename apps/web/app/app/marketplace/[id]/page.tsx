import MarketplaceDetailRoute from '../../../marketplace/[id]/MarketplaceDetailRoute';
export default function AppMarketplaceDetailPage({ params }: { params: { id: string } }) { return <MarketplaceDetailRoute id={params.id} />; }
