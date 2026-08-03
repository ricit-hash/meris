import { describe, expect, it } from 'vitest';
import { workspaceNavigation } from '../lib/workspace-navigation';

describe('workspace navigation', () => {
  it('uses Home as the universal first page and separates exploration from publishing', () => {
    expect(workspaceNavigation[0].items[0]).toEqual({ href: '/app', label: 'Home' });
    expect(workspaceNavigation.find((group) => group.heading === 'EXPLORE')?.items).toEqual([{ href: '/app/marketplace', label: 'Marketplace' }]);
    expect(workspaceNavigation.find((group) => group.heading === 'LIBRARY')?.items).toEqual([{ href: '/app/purchases', label: 'Purchases' }]);
    expect(workspaceNavigation.find((group) => group.heading === 'PUBLISH')?.items).toEqual([{ href: '/app/analysis', label: 'Analytics' }, { href: '/app/listings', label: 'Listings' }, { href: '/app/publish', label: 'Publish' }]);
  });
});
