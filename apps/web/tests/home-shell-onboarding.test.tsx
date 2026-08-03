import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../components/dashboard/WorkspaceFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="workspace-frame">{children}</div>,
}));

import HomeShell from '../components/dashboard/HomeShell';


describe('HomeShell onboarding integration', () => {
  const profile = { username: 'rival', discord: '', x: '' };

  it('does not flash returning or first-run content before storage resolves', () => {
    const html = renderToStaticMarkup(<HomeShell address="0xabc" profile={profile} />);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('Own the data path.');
    expect(html).not.toContain('Welcome back, @rival.');
  });

  it('keeps the WorkspaceFrame mounted while onboarding resolves', () => {
    const html = renderToStaticMarkup(<HomeShell address="0xabc" profile={profile} />);
    expect(html).toContain('data-testid="workspace-frame"');
  });
});
