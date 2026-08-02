import { describe, expect, it } from 'vitest';
import { getManifestPublishError } from '../lib/publish-result';

describe('getManifestPublishError', () => {
  it('accepts a successful manifest response', () => {
    expect(getManifestPublishError(201, { manifest: { id: 'm-1' } })).toBeNull();
  });

  it('surfaces an API error instead of treating the draft as published', () => {
    expect(getManifestPublishError(401, { error: 'Publishing requires a wallet signature.' }))
      .toBe('Publishing requires a wallet signature.');
  });

  it('returns a useful fallback for an empty failed response', () => {
    expect(getManifestPublishError(503, {})).toBe('Publishing failed (HTTP 503).');
  });
});
