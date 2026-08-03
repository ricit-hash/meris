import MarketplaceDetailRoute from '../../../marketplace/[id]/MarketplaceDetailRoute';

type AppMarketplaceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string | string[] }>;
};

export default async function AppMarketplaceDetailPage({ params, searchParams }: AppMarketplaceDetailPageProps) {
  const { id } = await params;
  const query: { from?: string | string[] } = searchParams ? await searchParams : {};
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  return <MarketplaceDetailRoute id={id} from={from} />;
}
