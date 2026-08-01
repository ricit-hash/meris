import type { Metadata } from 'next';
import CatalogPage from '../../components/catalog/CatalogPage';

export const metadata: Metadata = {
  title: 'Dataset catalog',
  description:
    'Public manifests, range-ready blobs on Shelby. Request a byte window, not the archive.',
};

export default function CatalogRoute() {
  return <CatalogPage />;
}
