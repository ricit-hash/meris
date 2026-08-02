export type GateIntent = 'purchase' | 'publish' | 'app' | 'purchases';

export function parseGateIntent(value: string | null): GateIntent {
  if (value === 'purchase' || value === 'publish' || value === 'purchases') return value;
  return 'app';
}

export function safeGateNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard';
  return value;
}

export function gateCopy(intent: GateIntent): { eyebrow: string; title: string; description: string } {
  if (intent === 'purchase') return { eyebrow: 'Buyer access', title: 'Connect to buy.', description: 'Connect an Aptos wallet to review the order and purchase a dataset slice.' };
  if (intent === 'publish') return { eyebrow: 'Publisher access', title: 'Connect to publish.', description: 'Connect an Aptos wallet to publish dataset metadata and manage your listings.' };
  if (intent === 'purchases') return { eyebrow: 'Buyer workspace', title: 'Connect to view purchases.', description: 'Connect an Aptos wallet to see your purchased slices and download them again.' };
  return { eyebrow: 'Meris app', title: 'Connect to continue.', description: 'Connect an Aptos wallet to buy datasets, download slices, publish listings, and manage purchases.' };
}
