import { describe, expect, it } from 'vitest';
import { workspaceNavigation } from '../lib/workspace-navigation';

describe('workspace navigation', () => {
  it('uses Home as the universal first page and separates exploration from publishing', () => {
    expect(workspaceNavigation[0].items[0]).toEqual({ href: '/dashboard', label: 'Home' });
    expect(workspaceNavigation.find((group) => group.heading === 'EXPLORE')?.items).toEqual([{ href: '/marketplace', label: 'Marketplace' }]);
    expect(workspaceNavigation.find((group) => group.heading === 'PUBLISH')?.items.map((item) => item.label)).toEqual(['Analysis', 'Listings', 'Publish']);
  });
});
