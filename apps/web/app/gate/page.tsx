import type { Metadata } from 'next';
import { Suspense } from 'react';
import GateClient from './GateClient';

export const metadata: Metadata = {
  title: 'Connect wallet',
  description: 'Connect your Aptos wallet to access the Meris app and dataset marketplace.',
  robots: { index: false, follow: false },
};

export default function GatePage() {
  return (
    <Suspense>
      <GateClient />
    </Suspense>
  );
}
