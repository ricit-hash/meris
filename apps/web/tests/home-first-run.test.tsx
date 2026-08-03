import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HomeFirstRun from '../components/dashboard/HomeFirstRun';

describe('HomeFirstRun', () => {
  it('renders the approved orientation and canonical actions', () => {
    const html = renderToStaticMarkup(<HomeFirstRun address="0xabc" onComplete={vi.fn()} />);
    expect(html).toContain('Welcome to Meris');
    expect(html).toContain('Own the data path.');
    expect(html).toContain('href="/app/marketplace"');
    expect(html).toContain('Explore datasets');
    expect(html).toContain('href="/app/publish"');
    expect(html).toContain('Publish a dataset');
    expect(html).toContain('Find a dataset');
    expect(html).toContain('Preview schema and delivery terms');
    expect(html).toContain('Request access or download');
    expect(html).toContain('Skip for now');
  });

  it('renders a keyboard-accessible skip button', () => {
    const html = renderToStaticMarkup(<HomeFirstRun address="0xabc" onComplete={vi.fn()} />);
    expect(html).toMatch(/<button[^>]+type="button"[^>]*>Skip for now<\/button>/);
  });
});
