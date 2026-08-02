/**
 * CSRF defense for browser-sendable endpoints (multipart uploads are a CORS
 * "simple request" that bypasses preflight). Requests without an Origin header
 * (curl, servers) are allowed — auth + rate limits cover those paths.
 */
export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return true;

  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  // Local development.
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
    return true;
  }

  // The configured public origin (single canonical deployment).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (new URL(appUrl).hostname.toLowerCase() === host) return true;
    } catch {
      // fall through to reject
    }
  }

  return false;
}
