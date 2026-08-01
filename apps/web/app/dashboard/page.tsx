import type { Metadata } from 'next';
import DashboardRoute from './DashboardRoute';

export const metadata: Metadata = {
  title: 'Publisher dashboard',
  description: 'Your Meris publisher workspace: drafts, connected blobs, and listings.',
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardRoute />;
}
