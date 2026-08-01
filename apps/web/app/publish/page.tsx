import type { Metadata } from 'next';
import PublishRoute from './PublishRoute';

export const metadata: Metadata = {
  title: 'Publish a dataset',
  description: 'Create a dataset manifest pointing at a Shelby blob, priced in ShelbyUSD or free.',
  robots: { index: false, follow: false },
};

export default function PublishPage() {
  return <PublishRoute />;
}
