'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk';
import { formatShelbyPrice } from './sample-data';

const fmt = new Intl.NumberFormat('en-US');

function parseSize(size: string): number {
  const m = size.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2].toUpperCase();
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[unit] ?? 1;
  return n * mult;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${fmt.format(bytes)} B`;
  if (bytes < 1024 ** 2) return `${fmt.format(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${fmt.format(bytes / 1024 ** 2)} MB`;
  return `${fmt.format(bytes / 1024 ** 3)} GB`;
}

type Props = {
  size: string;
  records: number;
  priceShelbyUSD: number;
  kind: 'range' | 'file';
  blobPath: string;
  /** Set when this listing is a published server manifest (m-*) — required for paid purchases. */
  manifestId?: string;
  /** True when the server has a line index for this blob — slices end exactly on a row boundary. */
  rowIndexed?: boolean;
  /** Lines counted by the server index; caps the request when the declared records exceed them. */
  totalLines?: number;
};

export default function RangeRequest({
  size,
  records,
  priceShelbyUSD,
  kind,
  blobPath,
  manifestId,
  rowIndexed = false,
  totalLines,
}: Props) {
  const router = useRouter();
  const [count, setCount] = useState(() => String(Math.max(1, Math.round(records * 0.1))));
  const [checking, setChecking] = useState(false);
  const [requested, setRequested] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);

  const totalRecords = records;
  const maxRecords = rowIndexed && totalLines ? Math.min(totalRecords, totalLines) : totalRecords;
  const wanted = Math.min(Math.max(1, Number(count) || 0), maxRecords);
  const pct = totalRecords > 0 ? wanted / totalRecords : 0;
  const bytes = Math.round(parseSize(size) * pct);
  const free = priceShelbyUSD === 0;
  /** Proportional price with a 1 sUSD minimum per paid request. */
  const slicePrice = free ? 0 : Math.max(1, priceShelbyUSD * pct);
  const proportional = free ? 0 : priceShelbyUSD * pct;
  const isFile = kind === 'file';

  async function request() {
    setChecking(true);
    try {
      const { getConnectedWallet, signAndSubmitTransaction } = await import('../../lib/wallet/aptos-client');
      const wallet = await getConnectedWallet();
      if (!wallet?.address) {
        router.push('/gate');
        return;
      }
      if (!canStream) {
        setStreamError('Sample listings can\'t be downloaded — streaming needs a shelby://0x-address/name blob path.');
        setRequested(true);
        return;
      }

      // Paid listings: micropayment channel — buyer signs create_channel (deposit),
      // buyer pays gas; the server holds the channel key and settles withdrawals.
      let createHash: string | undefined;
      let pendingKeyId: string | undefined;
      if (!free) {
        if (!manifestId) {
          setStreamError('Payment needs a published manifest — publish the dataset to the market first.');
          setRequested(true);
          return;
        }
        const quoteRes = await fetch('/api/payments/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manifestId,
            blobPath,
            start: 0,
            end: isFile ? undefined : bytes,
            buyer: wallet.address,
          }),
        });
        if (quoteRes.status === 503) {
          setStreamError('Shelby not configured — request saved as local preview.');
          setRequested(true);
          return;
        }
        if (!quoteRes.ok) {
          const quoteErr = (await quoteRes.json()) as { error?: string };
          setStreamError(quoteErr.error ?? 'Payment quote failed.');
          setRequested(true);
          return;
        }
        const quote = (await quoteRes.json()) as {
          payload?: InputGenerateTransactionPayloadData;
          initializePayload?: InputGenerateTransactionPayloadData;
          pendingKeyId?: string;
          needsCreate?: boolean;
          needsInitialize?: boolean;
          amountShelbyUSD?: number;
        };
        if (quote.needsCreate) {
          if (!quote.payload || !quote.pendingKeyId) {
            setStreamError('Payment quote returned no channel payload.');
            setRequested(true);
            return;
          }
          // One-time init (buyer signs) if the buyer has no channels yet.
          if (quote.needsInitialize && quote.initializePayload) {
            const initResult = await signAndSubmitTransaction(quote.initializePayload);
            setPaymentHash(initResult.hash);
          }
          // Buyer signs & submits the channel creation (deposit) — buyer pays gas.
          const result = await signAndSubmitTransaction(quote.payload);
          setPaymentHash(result.hash);
          createHash = result.hash;
          pendingKeyId = quote.pendingKeyId;
        }
      }

      // Fase C: minta signed URL dari server (access control).
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobPath,
          start: 0,
          end: isFile ? undefined : bytes,
          records: isFile ? undefined : wanted,
          rangeBytes: isFile ? undefined : bytes,
          manifestId,
          createHash,
          pendingKeyId,
          buyer: wallet.address,
        }),
      });
      if (res.status === 503) {
        setStreamError('Shelby not configured — request saved as local preview.');
        setRequested(true);
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setStreamError(data.error ?? 'Request failed.');
        setRequested(true);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) setDownloadUrl(data.url);
    } catch {
      setStreamError('Request failed — check the server.');
    } finally {
      setChecking(false);
    }
    setRequested(true);
  }

  const presets = [0.1, 0.25, 0.5, 1];

  const canStream = /^shelby:\/\/0x[0-9a-fA-F]+\//.test(blobPath);

  return (
    <div className="rounded-[16px] border border-[#303030] bg-[#171717] p-6 md:p-7">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#666]">Range request</p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-medium tabular-nums ${free ? 'border border-[#3a4a42] bg-[#7bafa0]/10 text-[#7bafa0]' : 'border border-[#303030] text-[#e5e5e5]'}`}>
          {formatShelbyPrice(priceShelbyUSD)}
          {!free ? ' / full dataset' : ''}
        </span>
      </div>

      {requested ? (
        <div className="mt-6 rounded-[12px] border border-[#3a4a42] bg-[#7bafa0]/10 px-5 py-6 text-center">
          <p className="flex items-center justify-center gap-2 text-[12px] uppercase tracking-[0.1em] text-[#7bafa0]">
            <i className="h-[5px] w-[5px] rounded-full bg-[#7bafa0]" />
            Request sent
          </p>
          <p className="mx-auto mt-3 max-w-[34ch] text-[13px] leading-6 text-[#999]">
            {isFile
              ? `Full file (${size}) requested${!free ? ` for ${formatShelbyPrice(priceShelbyUSD)}` : ''} from the Shelby blob. Delivery is a local preview until the backend ships.`
              : rowIndexed
                ? `${fmt.format(wanted)} records requested — the slice ends exactly on the last row, nothing truncated.`
                : `${fmt.format(wanted)} records (≈ ${formatBytes(bytes)}) requested${!free ? ` for ${formatShelbyPrice(slicePrice)}` : ''} from the Shelby blob. Delivery is a local preview until the backend ships.`}
          </p>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download
              className="mt-4 inline-flex items-center gap-2 rounded-[12px] bg-[#f2f2f2] px-6 py-3 text-[13px] font-medium text-[#222] no-underline transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97]"
            >
              Download slice
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </a>
          ) : streamError ? (
            <p className="mt-4 text-[11px] leading-5 text-[#e06c5b]">{streamError}</p>
          ) : !canStream ? (
            <p className="mt-4 text-[11px] text-[#666]">
              Streaming needs a shelby://0x-address/name blob path — sample data can&apos;t be downloaded.
            </p>
          ) : null}
        </div>
      ) : isFile ? (
        <>
          <p className="mt-4 text-[13px] leading-6 text-[#999]">
            This is a single config file — you get the whole file, no slicing.
          </p>

          <div className="mt-5 flex items-center justify-between rounded-[12px] border border-[#262626] bg-[#0a0a0a] px-4 py-3">
            <span className="text-[12px] text-[#888]">File</span>
            <span className="text-[13px] tabular-nums text-[#e5e5e5]">
              {size} · full file
            </span>
          </div>

          {!free ? (
            <div className="mt-3 rounded-[12px] border border-[#262626] bg-[#0a0a0a] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#888]">Price</span>
                <span className="text-[14px] font-medium tabular-nums text-[#e5e5e5]">{formatShelbyPrice(priceShelbyUSD)}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[#666]">
                One-time price for the complete file.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void request()}
            disabled={checking}
            className="mt-5 w-full appearance-none rounded-[12px] border-0 bg-[#f2f2f2] px-7 py-3 text-[14px] font-medium text-[#222] transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checking ? 'Checking wallet…' : free ? 'Get file · Free' : `Get file · ${formatShelbyPrice(priceShelbyUSD)}`}
          </button>

          <p className="mt-4 text-[11px] leading-5 text-[#666]">
            Connects your wallet to authorize the request. Signed file delivery opens with the backend.
          </p>
        </>
      ) : (
        <>
          <p className="mt-4 text-[13px] leading-6 text-[#999]">
            Pick how many records you need — a small slice works too. Only that slice leaves the Shelby blob; the publisher keeps the rest.
          </p>

          <div className="mt-5 flex items-end gap-3">
            <label className="block flex-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#888]">Records</span>
              <input
                type="number"
                min="1"
                max={maxRecords}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="mt-2 w-full rounded-[12px] border border-[#303030] bg-[#0a0a0a] px-4 py-3 text-[14px] tabular-nums text-[#ededed] outline-none transition-colors focus:border-[#7bafa0]"
              />
            </label>
            <p className="pb-3 text-[12px] text-[#666]">of {fmt.format(totalRecords)} total</p>
          </div>

          <div className="mt-3 flex gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCount(String(Math.round(totalRecords * p)))}
                className={`flex-1 appearance-none rounded-[10px] border px-3 py-2 text-[12px] transition-colors ${
                  Math.abs(pct - p) < 0.001
                    ? 'border-[#7bafa0] bg-[#7bafa0]/10 text-[#7bafa0]'
                    : 'border-[#303030] text-[#888] hover:border-[#4a4a4a] hover:text-white'
                }`}
              >
                {p === 1 ? 'All' : `${Math.round(p * 100)}%`}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[12px] border border-[#262626] bg-[#0a0a0a] px-4 py-3">
            <span className="text-[12px] text-[#888]">Your slice</span>
            <span className="text-[13px] tabular-nums text-[#e5e5e5]">
              {fmt.format(wanted)} records ·{' '}
              {rowIndexed ? 'ends on a row boundary' : `≈ ${formatBytes(bytes)} · approximate`}
            </span>
          </div>

          {!free ? (
            <div className="mt-3 rounded-[12px] border border-[#262626] bg-[#0a0a0a] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#888]">Price</span>
                <span className="text-[14px] font-medium tabular-nums text-[#e5e5e5]">{formatShelbyPrice(slicePrice)}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[#666]">
                {Math.round(pct * 100)}% of {formatShelbyPrice(priceShelbyUSD)} = {formatShelbyPrice(proportional)} · minimum 1 sUSD per request
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void request()}
            disabled={checking || wanted === 0}
            className="mt-5 w-full appearance-none rounded-[12px] border-0 bg-[#f2f2f2] px-7 py-3 text-[14px] font-medium text-[#222] transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checking ? 'Checking wallet…' : free ? 'Request free slice' : `Request slice · ${formatShelbyPrice(slicePrice)}`}
          </button>

          <p className="mt-4 text-[11px] leading-5 text-[#666]">
            Connects your wallet to authorize the request. Signed range delivery opens with the backend.
          </p>
        </>
      )}
    </div>
  );
}
