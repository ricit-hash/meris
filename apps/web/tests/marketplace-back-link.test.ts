import { describe, expect, it } from 'vitest';
import { getDatasetBackHref } from '../components/catalog/DatasetDetailView';

describe('dataset detail back href', () => {
  it('keeps valid app Marketplace context', () => {
    expect(getDatasetBackHref(true, '/app/marketplace?q=events&cat=Public')).toBe('/app/marketplace?q=events&cat=Public');
  });

  it('rejects cross-surface and external context', () => {
    expect(getDatasetBackHref(true, '/catalog?q=events')).toBe('/app/marketplace');
    expect(getDatasetBackHref(true, 'https://evil.example/app/marketplace?q=events')).toBe('/app/marketplace');
    expect(getDatasetBackHref(false, '/app/marketplace?q=events')).toBe('/catalog');
  });
});
