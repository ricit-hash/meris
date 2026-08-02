import type { Metadata } from 'next';
import AnalysisRoute from './AnalysisRoute';

export const metadata: Metadata = {
  title: 'Analysis — Meris',
  description: 'Publisher performance and dataset health inside Meris.',
  robots: { index: false, follow: false },
};

export default function AnalysisPage() {
  return <AnalysisRoute />;
}
