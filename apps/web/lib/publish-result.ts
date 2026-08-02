export type ManifestPublishResponse = {
  manifest?: unknown;
  error?: string;
};

export function getManifestPublishError(status: number, body: ManifestPublishResponse): string | null {
  if (status >= 200 && status < 300 && body.manifest) return null;
  return body.error || `Publishing failed (HTTP ${status}).`;
}
