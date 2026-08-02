import type { Metadata } from 'next';
import DashboardRoute from './DashboardRoute';

export const metadata: Metadata = {
  title: 'Home — Meris',
    description: 'Your Meris workspace for exploring datasets and publishing listings.',
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardRoute />;
}
