'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Comment } from '../../lib/discussion';

export default function DiscussionSection({ manifestId }: { manifestId: string }) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/discussions?manifestId=${encodeURIComponent(manifestId)}`);
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { comments?: Comment[] };
        if (cancelled || !Array.isArray(data.comments)) return;
        setComments(data.comments);
      } catch {
        // ignore — comments are best-effort
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manifestId]);

  async function post() {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    setError('');
    try {
      const { getConnectedWallet, signMessageDetailed } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) {
        router.push('/gate');
        return;
      }
      const expiry = Date.now() + 120_000;
      const signed = await signMessageDetailed(`meris:discussion:${manifestId}:${expiry}`);
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifestId,
          text: trimmed,
          publicKeyHex: wallet.publicKey,
          signature: signed.signature,
          fullMessage: signed.fullMessage,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Comment failed.');
        return;
      }
      const data = (await res.json()) as { comment?: Comment };
      const c = data.comment;
      if (c) setComments((prev) => [...prev, c]);
      setText('');
    } catch {
      setError('Comment failed — check the server.');
    } finally {
      setPosting(false);
    }
  }

  function shortAddress(a: string): string {
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }

  return (
    <div className="mt-14">
      <p className="ref-label">DISCUSSION</p>
      <div className="mt-4 max-w-[44rem]">
        {!loaded ? (
          <p className="text-[12px] text-[#666]">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-[13px] leading-6 text-[#666]">
            No comments yet — ask the publisher about the data.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-[#262626] bg-[#171717] px-4 py-3">
                <p className="flex items-baseline gap-2 text-[12px]">
                  <span className="font-medium text-[#a7a7a7]">
                    {c.username ? `@${c.username}` : shortAddress(c.author)}
                  </span>
                  <span className="text-[11px] text-[#666]">
                    {new Date(c.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[#e5e5e5]">{c.text}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[#666]">Add a comment</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ask about schema, quality, or licensing…"
              className="mt-2 w-full resize-none rounded-xl border border-[#303030] bg-[#101010] px-4 py-3 text-[13px] leading-5 text-[#ededed] outline-none placeholder:text-[#555] focus:border-[#4a4a4a]"
            />
          </label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void post()}
              disabled={posting || text.trim().length === 0}
              className="appearance-none rounded-xl bg-[#f2f2f2] px-5 py-2.5 text-[13px] font-medium text-[#222] transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {posting ? 'Posting…' : 'Post comment'}
            </button>
            {error ? <p className="text-[12px] leading-5 text-[#e06c5b]">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
