import { NextResponse } from 'next/server';
import {
  getShelbyClient,
  getShelbyAccount,
  isShelbyConfigured,
} from '../../../lib/shelby';
import {
  discussionBlobName,
  isValidCommentText,
  buildDiscussionBlob,
  parseDiscussionBlob,
  trimComments,
  type Discussion,
  type Comment,
} from '../../../lib/discussion';
import { getManifest } from '../../../lib/manifest-store';
import { recoverPublisherAddress } from '../../../lib/wallet-auth';
import { checkRateLimit, clientIp } from '../../../lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMMENTS_PER_ADDRESS = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type ShelbyClient = NonNullable<ReturnType<typeof getShelbyClient>>;
type ShelbyAccount = NonNullable<ReturnType<typeof getShelbyAccount>>;

// In-process mutex: comments are appended via read-merge-write on a single
// blob, so concurrent posts must serialize (single Render instance).
let writeChain: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => {});
  return run;
}

async function readDiscussion(client: ShelbyClient, account: ShelbyAccount, name: string): Promise<Discussion> {
  try {
    const metadata = await client.coordination.getBlobMetadata({ account: account.accountAddress, name: name as never });
    if (!metadata) return { manifestId: '', comments: [], updatedAt: Date.now() };
    const blob = await client.download({ account: account.accountAddress, blobName: name });
    const chunks: Uint8Array[] = [];
    const reader = blob.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return parseDiscussionBlob(Buffer.concat(chunks.map((c) => Buffer.from(c)))) ?? { manifestId: '', comments: [], updatedAt: Date.now() };
  } catch {
    return { manifestId: '', comments: [], updatedAt: Date.now() };
  }
}

async function bestEffortUsername(client: ShelbyClient, account: ShelbyAccount, wallet: string): Promise<string | undefined> {
  try {
    const name = `profile-${wallet}.json`;
    const metadata = await client.coordination.getBlobMetadata({ account: account.accountAddress, name: name as never });
    if (!metadata) return undefined;
    const blob = await client.download({ account: account.accountAddress, blobName: name });
    const chunks: Uint8Array[] = [];
    const reader = blob.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const parsed = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))))) as { username?: string };
    return typeof parsed.username === 'string' ? parsed.username : undefined;
  } catch {
    return undefined;
  }
}

/** GET ?manifestId= — read a dataset's discussion blob from Shelby. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const manifestId = url.searchParams.get('manifestId') ?? '';
  if (!manifestId.startsWith('m-')) {
    return NextResponse.json({ error: 'manifestId is required.' }, { status: 400 });
  }
  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }
  const account = getShelbyAccount();
  const client = getShelbyClient();
  if (!account || !client) {
    return NextResponse.json({ error: 'Shelby client failed to initialize.' }, { status: 503 });
  }
  const discussion = await readDiscussion(client, account, discussionBlobName(manifestId));
  return NextResponse.json({ found: discussion.comments.length > 0, comments: discussion.comments });
}

/** POST — append a wallet-signed comment to the discussion blob. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const b = body as {
    manifestId?: unknown;
    text?: unknown;
    publicKeyHex?: unknown;
    signature?: unknown;
    fullMessage?: unknown;
  };
  if (typeof b.manifestId !== 'string' || !b.manifestId.startsWith('m-')) {
    return NextResponse.json({ error: 'manifestId is required.' }, { status: 400 });
  }
  if (typeof b.text !== 'string' || !isValidCommentText(b.text)) {
    return NextResponse.json(
      { error: 'comment must be 1-500 characters.' },
      { status: 400 },
    );
  }
  if (!getManifest(b.manifestId)) {
    return NextResponse.json({ error: 'Manifest not found.' }, { status: 404 });
  }
  if (!isShelbyConfigured()) {
    return NextResponse.json(
      { error: 'Shelby is not configured. Add SHELBY_API_KEY to the server environment.' },
      { status: 503 },
    );
  }
  const account = getShelbyAccount();
  const client = getShelbyClient();
  if (!account || !client) {
    return NextResponse.json({ error: 'Shelby client failed to initialize.' }, { status: 503 });
  }

  // Wallet-proof: comment authorship is bound to the signing wallet.
  const verified = recoverPublisherAddress({
    action: 'discussion',
    context: b.manifestId,
    publicKeyHex: typeof b.publicKeyHex === 'string' ? b.publicKeyHex : '',
    signature: typeof b.signature === 'string' ? b.signature : '',
    fullMessage: typeof b.fullMessage === 'string' ? b.fullMessage : '',
  });
  if (!verified.ok || !verified.address) {
    return NextResponse.json(
      { error: `Commenting requires a wallet signature (${verified.reason ?? 'invalid signature'}).` },
      { status: 401 },
    );
  }
  if (!checkRateLimit(`comment:ip:${clientIp(request)}`, COMMENTS_PER_ADDRESS, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many comments — try again later.' }, { status: 429 });
  }

  const manifestId = b.manifestId;
  const name = discussionBlobName(manifestId);
  const text = b.text.trim();
  const author = verified.address;

  try {
    const comment = await withWriteLock(async (): Promise<Comment> => {
      const discussion = await readDiscussion(client, account, name);
      const username = await bestEffortUsername(client, account, author);
      const comment: Comment = {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        author,
        ...(username ? { username } : {}),
        text,
        createdAt: Date.now(),
      };
      discussion.comments = trimComments([...discussion.comments, comment]);
      discussion.updatedAt = comment.createdAt;
      discussion.manifestId = manifestId;
      const blobData = buildDiscussionBlob(discussion);
      const expirationMicros = Date.now() * 1000 + 365 * 24 * 60 * 60 * 1_000_000;
      await client.upload({ blobData, signer: account, blobName: name, expirationMicros });
      return comment;
    });
    return NextResponse.json({ ok: true, comment }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Shelby error';
    return NextResponse.json({ error: `Comment failed: ${message}` }, { status: 502 });
  }
}
