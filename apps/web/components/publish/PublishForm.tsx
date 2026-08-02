'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MerisWordmark from '../brand/MerisWordmark';
import { addDataset, type DatasetCategory } from '../../lib/datasets';
import { getProfile } from '../../lib/profile';
import { getManifestPublishError } from '../../lib/publish-result';

type Props = {
  address: string;
  username: string;
};

export default function PublishForm({ address, username }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DatasetCategory | ''>('');
  const [format, setFormat] = useState('');
  const [license, setLicense] = useState('');
  const [price, setPrice] = useState('0');
  const [free, setFree] = useState(true);
  const [blobPath, setBlobPath] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [records, setRecords] = useState('');
  const [kind, setKind] = useState<'range' | 'file'>('range');
  const [error, setError] = useState('');
  const [verify, setVerify] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedAt, setUploadedAt] = useState<number | undefined>(undefined);
  const [expiryDays, setExpiryDays] = useState(90);
  const [expiresAt, setExpiresAt] = useState<number | undefined>(undefined);

  async function handleUpload() {
    if (!file) {
      setVerify('fail');
      setVerifyMsg('Choose a file first.');
      return;
    }
    setUploading(true);
    setVerify('checking');
    setVerifyMsg('');
    try {
      const { getConnectedWallet, signMessageDetailed, verifySignedMessageLocally } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) {
        router.push('/gate');
        return;
      }
      const safeName = name.trim().replace(/\s+/g, '-').toLowerCase() || 'dataset';
      const blobName = `${safeName}/${file.name}`;
      // Wallet-proof: signs meris:upload:{blobName}:{expiry} so the server can
      // gate who gets to spend its Shelby gas on this blob.
      const expiry = Date.now() + 120_000;
      const signed = await signMessageDetailed(`meris:upload:${blobName}:${expiry}`);
      if (!verifySignedMessageLocally(wallet.publicKey, signed.signature, signed.fullMessage)) {
        throw new Error('Wallet returned a signature that does not verify against its fullMessage. Reconnect Petra and try again.');
      }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('blobName', blobName);
      fd.append('publicKeyHex', wallet.publicKey);
      fd.append('signature', signed.signature);
      fd.append('fullMessage', signed.fullMessage);
      fd.append('expiryDays', String(expiryDays));
      const res = await fetch('/api/blobs/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as {
        ok?: boolean;
        blobPath?: string;
        size?: string;
        expiresAt?: number;
        error?: string;
        sigInfo?: {
          sigLength?: number;
          sigPrefix?: string;
          fullMessageLength?: number;
          fullMessagePrefix?: string;
          fullMessageSuffix?: string;
          publicKeyLength?: number;
          publicKeyPrefix?: string;
          derivedAddress?: string;
        };
      };
      if (res.ok && data.ok && data.blobPath) {
        setBlobPath(data.blobPath);
        setFileSize(data.size ?? '');
        setVerify('ok');
        setUploadedAt(Date.now());
        if (typeof data.expiresAt === 'number') setExpiresAt(data.expiresAt);
        setVerifyMsg(`Uploaded to Shelby · ${data.size ?? ''}`);
      } else if (res.status === 503) {
        setVerify('fail');
        setVerifyMsg('Shelby not configured — file will be saved as a local draft.');
      } else {
        setVerify('fail');
        const diagnostic = data.sigInfo
          ? ` [sig ${data.sigInfo.sigLength ?? '?'}:${data.sigInfo.sigPrefix ?? '?'} · key ${data.sigInfo.publicKeyLength ?? '?'}:${data.sigInfo.publicKeyPrefix ?? '?'} → ${data.sigInfo.derivedAddress ?? '?'} · msg ${data.sigInfo.fullMessageLength ?? '?'}:${data.sigInfo.fullMessagePrefix ?? '?'}…${data.sigInfo.fullMessageSuffix ?? '?'}]`
          : '';
        setVerifyMsg(`${data.error ?? 'Upload failed.'}${diagnostic}`);
      }
    } catch (err) {
      setVerify('fail');
      setVerifyMsg(err instanceof Error ? err.message : 'Upload failed — check the server.');
    } finally {
      setUploading(false);
    }
  }

  async function verifyBlob() {
    if (!blobPath.trim()) {
      setVerify('fail');
      setVerifyMsg('Enter a blob path first.');
      return;
    }
    setVerify('checking');
    setVerifyMsg('');
    try {
      const res = await fetch('/api/blobs/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobPath }),
      });
      const data = (await res.json()) as { found?: boolean; size?: string; sizeBytes?: number; error?: string };
      if (res.ok && data.found) {
        setVerify('ok');
        setVerifyMsg(`Verified on Shelby · ${data.size}`);
        if (!fileSize) setFileSize(data.size ?? '');
      } else if (res.status === 503) {
        setVerify('fail');
        setVerifyMsg('Shelby not configured — draft will be saved as a local preview.');
      } else {
        setVerify('fail');
        setVerifyMsg(data.error ?? 'Blob not found.');
      }
    } catch {
      setVerify('fail');
      setVerifyMsg('Verify failed — check the server.');
    }
  }

  const inputClass =
    'w-full rounded-[12px] border border-[#303030] bg-[#0a0a0a] px-4 py-3 text-[14px] text-[#ededed] outline-none transition-colors placeholder:text-[#555] focus:border-[#7bafa0]';
  const labelClass = 'text-[11px] font-medium uppercase tracking-[0.1em] text-[#888]';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = free ? 0 : Math.max(0, Number(price) || 0);
    if (name.trim().length < 3) {
      setError('Dataset name needs at least 3 characters.');
      return;
    }
    if (!category) {
      setError('Select a category.');
      return;
    }
    if (!format.trim()) {
      setError('Enter the file format (CSV, JSONL, Parquet).');
      return;
    }
    if (!blobPath.trim()) {
      setError('Enter the Shelby blob path. The dataset must already live in storage.');
      return;
    }
    const recordsNum = Number(records) || 0;
    if (kind === 'range' && recordsNum < 1) {
      setError('Enter the total record count so buyers can pick a slice.');
      return;
    }
    setError('');

    const publisher = getProfile()?.username ?? 'publisher';
    const draftDataset = {
      id: `draft-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      format: format.trim(),
      license: license.trim() || 'Not specified',
      priceShelbyUSD: priceNum,
      blobPath: blobPath.trim(),
      fileSize: fileSize.trim() || '—',
      records: kind === 'range' ? recordsNum : 0,
      kind,
      createdAt: Date.now(),
    };

    // Persist locally only as an explicit fallback if the server publish fails.
    // A successful server manifest is the source of truth for a live listing.
    try {
      const { getConnectedWallet, signMessageDetailed } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) {
        addDataset(draftDataset);
        router.push('/gate');
        return;
      }
      // Wallet-proof: signs meris:publish:{blobPath}:{expiry}; the server
      // derives the publisher address from the signature, never from this body.
      const expiry = Date.now() + 120_000;
      const signed = await signMessageDetailed(`meris:publish:${blobPath.trim()}:${expiry}`);
      const response = await fetch('/api/manifests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          format: format.trim(),
          license: license.trim() || 'Not specified',
          priceShelbyUSD: priceNum,
          kind,
          blobPath: blobPath.trim(),
          fileSize: fileSize.trim() || '—',
          records: kind === 'range' ? recordsNum : 0,
          publisher,
          publicKeyHex: wallet.publicKey,
          signature: signed.signature,
          fullMessage: signed.fullMessage,
          uploadedAt,
          expiresAt: expiresAt ?? Date.now() + expiryDays * 86_400_000,
        }),
      });
      const body = (await response.json()) as { manifest?: unknown; error?: string };
      const publishError = getManifestPublishError(response.status, body);
      if (publishError) {
        addDataset(draftDataset);
        setError(`Saved as draft, but not published: ${publishError}`);
        return;
      }
    } catch (err) {
      addDataset(draftDataset);
      setError(`Saved as draft, but not published: ${err instanceof Error ? err.message : 'publish request failed'}`);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[15rem] shrink-0 flex-col border-r border-[#262626] bg-[#101010] lg:flex">
          <div className="px-6 pb-2 pt-6">
            <MerisWordmark tone="dark" className="!text-[1.15rem]" />
          </div>
          <nav className="flex flex-col gap-1 p-3">
            <a href="/dashboard" className="rounded-[10px] px-3 py-2.5 text-[14px] no-underline text-[#999] hover:bg-[#171717] hover:text-white">Dashboard</a>
            <a href="/catalog" className="rounded-[10px] px-3 py-2.5 text-[14px] no-underline text-[#999] hover:bg-[#171717] hover:text-white">Marketplace</a>
            <a href="/publish" className="rounded-[10px] bg-[#1d1d1d] px-3 py-2.5 text-[14px] font-medium no-underline text-white">Publish</a>
          </nav>
          <div className="mt-auto flex flex-col gap-4 p-4">
            <div className="rounded-[12px] border border-[#303030] bg-[#171717] p-4">
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#7bafa0]">
                <i className="h-[5px] w-[5px] rounded-full bg-[#7bafa0]" />
                Wallet connected
              </p>
              <p className="mt-3 break-all text-[12px] tabular-nums leading-5 text-[#999]">
                {address.slice(0, 8)}…{address.slice(-6)}
              </p>
              <p className="mt-1 text-[12px] text-[#666]">@{username}</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#262626] px-6 md:px-10">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#666]">Publisher workspace</span>
              <span className="text-[#2b2b2b]">/</span>
              <span className="text-[13px] font-medium text-[#e5e5e5]">Publish</span>
            </div>
            <a href="/dashboard" className="rounded-[12px] border border-[#ededed]/20 px-5 py-2 text-[13px] font-medium text-[#a7a7a7] no-underline hover:text-white">
              Cancel
            </a>
          </header>

          <main className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="mx-auto max-w-[52rem]">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#666]">New listing</p>
              <h1 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-light leading-[1.02] tracking-[-0.04em] text-[#ededed]">
                Publish a dataset.
              </h1>
              <p className="mt-3 max-w-[56ch] text-sm leading-6 text-[#999]">
                The manifest lives on Meris; the blob stays in your Shelby storage. Buyers request a byte range — never the whole archive.
              </p>

              <form onSubmit={submit} className="mt-10 grid gap-8" noValidate>
                <section className="rounded-[16px] border border-[#303030] bg-[#171717] p-6 md:p-7">
                  <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-[#e5e5e5]">01 · Dataset details</h2>
                  <div className="mt-6 grid gap-5">
                    <label className="block">
                      <span className={labelClass}>Name *</span>
                      <input className={`mt-2 ${inputClass}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent execution traces" autoFocus />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Description</span>
                      <textarea className={`mt-2 min-h-28 resize-none ${inputClass}`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Labeled agent traces: task, tool calls, and outcome fields." />
                    </label>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelClass}>Category *</span>
                        <select className={`mt-2 ${inputClass}`} value={category} onChange={(e) => setCategory(e.target.value as DatasetCategory | '')}>
                          <option value="">Select category</option>
                          <option>AI-ready</option>
                          <option>Web3</option>
                          <option>Research</option>
                          <option>Agent</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className={labelClass}>Format *</span>
                        <input className={`mt-2 ${inputClass}`} value={format} onChange={(e) => setFormat(e.target.value)} placeholder="CSV, JSONL, Parquet" />
                      </label>
                    </div>
                    <div>
                      <span className={labelClass}>Delivery *</span>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setKind('range')}
                          className={`appearance-none rounded-[12px] border px-4 py-3 text-left transition-colors ${kind === 'range' ? 'border-[#7bafa0] bg-[#7bafa0]/10' : 'border-[#303030] hover:border-[#4a4a4a]'}`}
                        >
                          <span className="block text-[13px] font-medium text-[#e5e5e5]">Range-ready</span>
                          <span className="mt-1 block text-[11px] leading-4 text-[#888]">Dataset — buyers pick a slice of records</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setKind('file')}
                          className={`appearance-none rounded-[12px] border px-4 py-3 text-left transition-colors ${kind === 'file' ? 'border-[#7bafa0] bg-[#7bafa0]/10' : 'border-[#303030] hover:border-[#4a4a4a]'}`}
                        >
                          <span className="block text-[13px] font-medium text-[#e5e5e5]">Full file</span>
                          <span className="mt-1 block text-[11px] leading-4 text-[#888]">Config / prompt / SOUL.md — sold whole</span>
                        </button>
                      </div>
                    </div>
                    <label className="block">
                      <span className={labelClass}>License</span>
                      <input className={`mt-2 ${inputClass}`} value={license} onChange={(e) => setLicense(e.target.value)} placeholder="CC BY 4.0" />
                    </label>
                  </div>
                </section>

                <section className="rounded-[16px] border border-[#303030] bg-[#171717] p-6 md:p-7">
                  <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-[#e5e5e5]">02 · Shelby storage</h2>
                  <p className="mt-3 text-[13px] leading-6 text-[#888]">
                    The blob must already exist in your Shelby storage account. Meris records the pointer and the range boundary — it never copies the file.
                  </p>
                  <div className="mt-6 grid gap-5">
                    <label className="block">
                      <span className={labelClass}>File (upload to Shelby)</span>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="file"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                          className="w-full text-[13px] text-[#888] file:mr-4 file:rounded-[10px] file:border file:border-[#303030] file:bg-[#0a0a0a] file:px-4 file:py-2.5 file:text-[13px] file:text-[#e5e5e5] file:transition-colors file:hover:border-[#4a4a4a]"
                        />
                        <button
                          type="button"
                          onClick={() => void handleUpload()}
                          disabled={uploading || verify === 'checking'}
                          className="shrink-0 appearance-none rounded-[12px] border border-[#303030] px-4 py-3 text-[13px] font-medium text-[#a7a7a7] transition-colors hover:border-[#4a4a4a] hover:text-white disabled:opacity-50"
                        >
                          {uploading ? 'Uploading…' : 'Upload to Shelby'}
                        </button>
                      </div>
                    </label>
                    <label className="block">
                      <span className={labelClass}>Blob path *</span>
                      <div className="mt-2 flex gap-2">
                        <input className={`font-mono text-[13px] ${inputClass}`} value={blobPath} onChange={(e) => { setBlobPath(e.target.value); setVerify('idle'); setVerifyMsg(''); }} placeholder="shelby://0x-account/datasets/agent-traces.jsonl" />
                        <button
                          type="button"
                          onClick={() => void verifyBlob()}
                          disabled={verify === 'checking'}
                          className="shrink-0 appearance-none rounded-[12px] border border-[#303030] px-4 py-3 text-[13px] font-medium text-[#a7a7a7] transition-colors hover:border-[#4a4a4a] hover:text-white disabled:opacity-50"
                        >
                          {verify === 'checking' ? 'Verifying…' : 'Verify on Shelby'}
                        </button>
                      </div>
                      {verifyMsg ? (
                        <span className={`mt-2 block text-[12px] ${verify === 'ok' ? 'text-[#7bafa0]' : 'text-[#e06c5b]'}`}>
                          {verifyMsg}
                        </span>
                      ) : null}
                    </label>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelClass}>File size</span>
                        <input className={`mt-2 ${inputClass}`} value={fileSize} onChange={(e) => setFileSize(e.target.value)} placeholder="86 MB" />
                      </label>
                      {kind === 'range' ? (
                        <label className="block">
                          <span className={labelClass}>Total records *</span>
                          <input type="number" min="1" className={`mt-2 ${inputClass}`} value={records} onChange={(e) => setRecords(e.target.value)} placeholder="150000" />
                        </label>
                      ) : null}
                      <label className="block">
                        <span className={labelClass}>Blob expires</span>
                        <select
                          className={`mt-2 ${inputClass}`}
                          value={expiryDays}
                          onChange={(e) => {
                            const days = Number(e.target.value);
                            setExpiryDays(Number.isFinite(days) ? days : 90);
                            setExpiresAt(undefined);
                          }}
                        >
                          <option value={7}>7 days</option>
                          <option value={30}>30 days</option>
                          <option value={90}>90 days</option>
                          <option value={180}>180 days</option>
                          <option value={365}>1 year</option>
                        </select>
                      </label>
                    </div>
                    <p className="text-[12px] leading-5 text-[#666]">
                      {kind === 'range'
                        ? 'Buyers pick a slice of records. The total sets the maximum and drives the proportional price.'
                        : 'Config files are sold whole — buyers get the complete file, no slicing.'}
                    </p>
                  </div>
                </section>

                <section className="rounded-[16px] border border-[#303030] bg-[#171717] p-6 md:p-7">
                  <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-[#e5e5e5]">03 · Price</h2>
                  <p className="mt-3 text-[13px] leading-6 text-[#888]">
                    Price per range request, in ShelbyUSD. Free listings still require a connected wallet to preview.
                  </p>
                  <div className="mt-6 flex flex-wrap items-end gap-5">
                    <label className="block sm:max-w-[14rem]">
                      <span className={labelClass}>Price (ShelbyUSD) *</span>
                      <div className="relative mt-2">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-[#666]">sUSD</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={`${inputClass} pl-14 disabled:opacity-40`}
                          value={free ? '' : price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0.00"
                          disabled={free}
                        />
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 pb-3">
                      <input
                        type="checkbox"
                        checked={free}
                        onChange={(e) => setFree(e.target.checked)}
                        className="h-4 w-4 accent-[#7bafa0]"
                      />
                      <span className="text-[14px] text-[#e5e5e5]">Free listing</span>
                    </label>
                  </div>
                  {free ? (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#3a4a42] bg-[#7bafa0]/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[#7bafa0]">
                      <i className="h-[5px] w-[5px] rounded-full bg-[#7bafa0]" />
                      Free · range-ready
                    </p>
                  ) : null}
                </section>

                {error ? (
                  <p className="rounded-[12px] border border-red-300/15 bg-red-950/20 px-4 py-3 text-[13px] text-red-100/80" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-4 pb-8">
                  <p className="text-[12px] leading-5 text-[#666]">
                    This saves a local draft. Publishing to the live market comes with the backend.
                  </p>
                  <button
                    type="submit"
                    className="shrink-0 appearance-none rounded-[12px] border-0 bg-[#f2f2f2] px-7 py-3 text-[14px] font-medium text-[#222] transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97]"
                  >
                    Save draft
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
