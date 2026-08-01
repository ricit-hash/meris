import type { Metadata } from 'next';
import { Suspense } from 'react';
import PurchasesRoute from './PurchasesRoute';

export const metadata: Metadata = {
  title: 'Purchases — Meris',
  description: 'Your purchased dataset slices on Meris, with download access.',
};

export default function PurchasesPage() {
  return (
    <Suspense>
      <PurchasesRoute />
    </Suspense>
  );
}
