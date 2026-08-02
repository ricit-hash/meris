'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CatalogNav from '../catalog/CatalogNav';

type Manifest = {
  id: string;
  name: string;
  description: string;
  license: string;
  format: string;
  priceShelbyUSD: number;
  publisherAddress: string;
  publisher: string;
};

export default function EditListingView({ id, address }: { id: string; address: string }) {
  const router = useRouter();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [license, setLicense] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/manifests/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = (await res.json()) as { manifest?: Manifest };
        const m = data.manifest;
        if (!m) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (m.publisherAddress && m.publisherAddress !== address) {
          if (!cancelled) setForbidden(true);
          return;
        }
        if (!cancelled) {
          setManifest(m);
          setDescription(m.description);
          setPrice(m.priceShelbyUSD > 0 ? String(m.priceShelbyUSD) : '');
          setLicense(m.license);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, address]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { getConnectedWallet, signMessageDetailed } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) {
        router.push('/gate');
        return;
      }
      const priceNum = price.trim() === '' ? 0 : Number(price);
      // Ownership proof: wallet signs meris:edit:{id}:{expiry}; the server
      // derives the address from the public key and verifies the signature.
      const expiry = Date.now() + 120_000;
      const signed = await signMessageDetailed(`meris:edit:${id}:${expiry}`);
      const res = await fetch(`/api/manifests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: wallet.address,
          publicKeyHex: wallet.publicKey,
          signature: signed.signature,
          fullMessage: signed.fullMessage,
          description: description.trim(),
          license: license.trim(),
          ...(Number.isFinite(priceNum) ? { priceShelbyUSD: priceNum } : {}),
        }),
      });
      if (res.status === 403) {
        setError('Only the publisher can edit this listing.');
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Save failed.');
        return;
      }
      router.push(`/catalog/${id}`);
    } catch {
      setError('Save failed — check the server.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ref-shell">
      <CatalogNav />
      <main className="px-8 py-14 md:px-12 md:py-16">
        <div className="ref-rail">
          <p className="ref-label">EDIT LISTING</p>
          <div className="max-w-[52ch]">
            {forbidden ? (
              <>
                <h1 className="text-[clamp(2rem,4vw,3rem)] font-light leading-[1] tracking-[-0.05em] text-[#ededed]">
                  Not your listing.
                </h1>
                <p className="mt-4 text-[14px] leading-6 text-[#999]">
                  Only the publisher wallet can edit this listing.
                </p>
                <Link
                  href="/catalog"
                  className="mt-6 inline-block rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] no-underline transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97]"
                >
                  Back to catalog
                </Link>
              </>
            ) : notFound || !manifest ? (
              <>
                <h1 className="text-[clamp(2rem,4vw,3rem)] font-light leading-[1] tracking-[-0.05em] text-[#ededed]">
                  {loaded ? 'Listing not found.' : 'Loading…'}
                </h1>
                <p className="mt-4 text-[14px] leading-6 text-[#999]">
                  {loaded
                    ? 'This listing no longer exists — it may have been delisted.'
                    : 'Fetching the listing from the server.'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[clamp(2rem,4vw,3rem)] font-light leading-[1] tracking-[-0.05em] text-[#ededed]">
                  Edit {manifest.name}.
                </h1>
                <p className="mt-3 font-mono text-[12px] text-[#666]">{manifest.id}</p>
                <form onSubmit={save} className="mt-8 flex flex-col gap-6">
                  <div>
                    <label className="ref-label" htmlFor="edit-desc">
                      DESCRIPTION
                    </label>
                    <textarea
                      id="edit-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="What the dataset contains — task, schema, fields."
                      className="mt-2 w-full rounded-[12px] border border-[#303030] bg-[#171717] px-4 py-3 text-[14px] leading-6 text-[#e5e5e5] placeholder-[#666] outline-none transition-colors focus:border-[#4a4a4a]"
                    />
                  </div>
                  <div>
                    <label className="ref-label" htmlFor="edit-price">
                      PRICE (SHELBYUSD) · 0 = FREE
                    </label>
                    <input
                      id="edit-price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="mt-2 w-full rounded-[12px] border border-[#303030] bg-[#171717] px-4 py-3 font-mono text-[14px] tabular-nums text-[#e5e5e5] placeholder-[#666] outline-none transition-colors focus:border-[#4a4a4a]"
                    />
                  </div>
                  <div>
                    <label className="ref-label" htmlFor="edit-license">
                      LICENSE
                    </label>
                    <input
                      id="edit-license"
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      placeholder="ODbL, CC BY 4.0, custom…"
                      className="mt-2 w-full rounded-[12px] border border-[#303030] bg-[#171717] px-4 py-3 text-[14px] text-[#e5e5e5] placeholder-[#666] outline-none transition-colors focus:border-[#4a4a4a]"
                    />
                  </div>

                  {error ? <p className="text-[13px] leading-5 text-[#e06c5b]">{error}</p> : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="appearance-none rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97] disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <Link
                      href={`/catalog/${id}`}
                      className="rounded-[12px] border border-[#303030] px-6 py-[12px] text-[14px] font-medium text-[#a7a7a7] no-underline transition-colors hover:border-[#4a4a4a] hover:text-white"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
