import MarketplaceDetailRoute from '../../../marketplace/[id]/MarketplaceDetailRoute';
export default function AppMarketplaceDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { from?: string } }) { return <MarketplaceDetailRoute id={params.id} from={searchParams?.from} />; }
