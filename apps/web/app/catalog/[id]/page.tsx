import type { Metadata } from 'next';
import DatasetDetailView from '../../../components/catalog/DatasetDetailView';
import { getSampleDataset } from '../../../components/catalog/sample-data';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const dataset = getSampleDataset(id);
  if (!dataset) return { title: 'Dataset not found' };
  return {
    title: dataset.title,
    description: dataset.description,
  };
}

export default async function DatasetDetailPage({ params }: Props) {
  const { id } = await params;
  // Sample data resolves on the server; publisher drafts live in the client
  // (localStorage) and are resolved by DatasetDetailView.
  return <DatasetDetailView id={id} />;
}
