import type { Metadata } from 'next';
import GateClient from './GateClient';

export const metadata: Metadata = {
  title: 'Connect wallet',
  description: 'Connect your Aptos wallet to access the Meris dataset market.',
  robots: { index: false, follow: false },
};

export default function GatePage() {
  return <GateClient />;
}
