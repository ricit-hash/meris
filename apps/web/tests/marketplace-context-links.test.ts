import { describe, expect, it } from 'vitest';
import { buildDatasetDetailHref } from '../components/catalog/AppDatasetCard';

describe('marketplace detail link context', () => {
  it('encodes the originating app Marketplace href once', () => {
    expect(buildDatasetDetailHref('/app/marketplace', 'm-1', '/app/marketplace?q=events&cat=Public')).toBe('/app/marketplace/m-1?from=%2Fapp%2Fmarketplace%3Fq%3Devents%26cat%3DPublic');
  });

  it('does not append context to public links or without context', () => {
    expect(buildDatasetDetailHref('/catalog', 'm-1')).toBe('/catalog/m-1');
    expect(buildDatasetDetailHref('/catalog', 'm-1', '/catalog?q=events')).toBe('/catalog/m-1');
  });
});
