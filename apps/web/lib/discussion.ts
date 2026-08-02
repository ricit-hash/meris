/**
 * Dataset discussions stored as Shelby blobs — one blob per manifest
 * (`discussion-{manifestId}.json`), registered on-chain like every other blob.
 * The server relays writes (wallet-signature-gated) and merges concurrent
 * appends; the content itself lives in Shelby storage, not a database.
 */

export type Comment = {
  id: string;
  /** Wallet address of the comment author. */
  author: string;
  /** Username snapshot at comment time (best-effort). */
  username?: string;
  text: string;
  createdAt: number;
};

export type Discussion = {
  manifestId: string;
  comments: Comment[];
  updatedAt: number;
};

const MAX_COMMENT_LENGTH = 500;
const MAX_COMMENTS_PER_BLOB = 200;

export function discussionBlobName(manifestId: string): string {
  return `discussion-${manifestId.trim()}.json`;
}

export function isValidCommentText(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_COMMENT_LENGTH;
}

export function buildDiscussionBlob(discussion: Discussion): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(discussion, null, 2));
}

export function parseDiscussionBlob(bytes: Uint8Array): Discussion | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Discussion>;
    const comments = Array.isArray(parsed.comments)
      ? (parsed.comments as Comment[]).filter(
          (c) => typeof c?.id === 'string' && typeof c?.text === 'string' && typeof c?.author === 'string',
        )
      : [];
    return {
      manifestId: typeof parsed.manifestId === 'string' ? parsed.manifestId : '',
      comments,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Prune oldest comments to keep the blob small. */
export function trimComments(comments: Comment[]): Comment[] {
  return comments.length > MAX_COMMENTS_PER_BLOB
    ? comments.slice(comments.length - MAX_COMMENTS_PER_BLOB)
    : comments;
}
