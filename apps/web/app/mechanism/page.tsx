import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Docs — How Meris works',
  description:
    'Technical documentation for publishing datasets, requesting record ranges, paying with ShelbyUSD, and receiving signed delivery through Meris and Shelby.',
};

const sections = [
  ['overview', 'Overview'],
  ['lifecycle', 'Lifecycle'],
  ['range-access', 'Range access'],
  ['storage', 'Dataset ownership'],
  ['payments', 'Payments'],
  ['delivery', 'Delivery'],
  ['security', 'Security'],
];

const steps = [
  ['01', 'Publish', 'Upload the source blob to Shelby, then publish a Meris manifest that describes it.'],
  ['02', 'Discover', 'Buyers browse the manifest: format, records, license, price, expiry, and delivery type.'],
  ['03', 'Request', 'A buyer selects a record count or requests the complete file.'],
  ['04', 'Pay', 'Paid requests transfer ShelbyUSD to the publisher. Free requests skip payment.'],
  ['05', 'Deliver', 'Meris signs a short-lived URL for the exact permitted byte range.'],
];

function CodeBlock({ children }: { children: string }) {
  return <pre className="mt-5 overflow-x-auto rounded-[10px] border border-[#2b2b2b] bg-[#0d0d0d] p-4 font-mono text-[12px] leading-6 text-[#bdbdbd]"><code>{children}</code></pre>;
}

export default function MechanismPage() {
  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] text-[#ededed]">
      <header className="sticky top-0 z-30 border-b border-[#262626] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-6 md:px-10">
          <Link href="/" className="text-[16px] font-medium tracking-[-0.03em] text-[#ededed] no-underline">Meris</Link>
          <div className="flex items-center gap-5 text-[12px] text-[#777]">
            <span className="hidden md:inline">Documentation</span>
            <Link href="/catalog" className="text-[#a7a7a7] no-underline hover:text-white">Marketplace ↗</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid h-[calc(100svh-64px)] max-w-[1280px] overflow-hidden lg:grid-cols-[220px_minmax(0,720px)] lg:gap-20">
        <aside className="hidden border-r border-[#262626] lg:block">
          <div className="sticky top-[64px] py-12 pr-8">
            <p className="mb-5 text-[10px] uppercase tracking-[0.14em] text-[#666]">On this page</p>
            <nav className="flex flex-col gap-1">
              {sections.map(([id, label], index) => (
                <a key={id} href={`#${id}`} className="border-l border-transparent px-3 py-2 text-[13px] text-[#777] no-underline transition-colors hover:border-[#888] hover:text-white">
                  <span className="mr-2 font-mono text-[10px] text-[#555]">{String(index + 1).padStart(2, '0')}</span>{label}
                </a>
              ))}
            </nav>
            <div className="mt-12 border-t border-[#262626] pt-5 text-[11px] leading-5 text-[#666]">
              <p>Infrastructure</p>
              <p className="mt-1 text-[#999]">Shelby-backed storage</p>
              <p className="text-[#999]">ShelbyUSD settlement</p>
            </div>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-6 py-12 md:px-10 md:py-16 lg:px-0">
          <div className="mb-10 flex gap-2 overflow-x-auto border-b border-[#262626] pb-4 text-[11px] uppercase tracking-[0.1em] text-[#777] lg:hidden">
            {sections.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 no-underline hover:text-white">{label}</a>)}
          </div>

          <section id="overview" className="scroll-mt-24 border-b border-[#262626] pb-14">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">Meris documentation</p>
            <h1 className="mt-5 max-w-[14ch] text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.94] tracking-[-0.06em]">Sell datasets by the slice.</h1>
            <p className="mt-7 max-w-[58ch] text-[15px] leading-7 text-[#999]">Meris is a marketplace where publishers list datasets and buyers purchase the exact amount of data they need. The app handles catalog, pricing, checkout, access control, and delivery. Shelby is the storage layer underneath.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/catalog" className="rounded-[10px] bg-[#f2f2f2] px-5 py-3 text-[13px] font-medium text-[#222] no-underline hover:opacity-85">Browse marketplace</Link>
              <Link href="/publish" className="rounded-[10px] border border-[#303030] px-5 py-3 text-[13px] text-[#a7a7a7] no-underline hover:border-[#555] hover:text-white">Publish a dataset</Link>
            </div>
          </section>

          <section id="lifecycle" className="scroll-mt-24 border-b border-[#262626] py-14">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">01 · Lifecycle</p>
            <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.045em]">From listing to delivery</h2>
            <div className="mt-8 divide-y divide-[#262626] border-y border-[#262626]">
              {steps.map(([number, title, body]) => (
                <div key={number} className="grid gap-3 py-5 sm:grid-cols-[48px_130px_1fr] sm:gap-5">
                  <span className="font-mono text-[11px] text-[#666]">{number}</span>
                  <strong className="text-[14px] font-medium text-[#ededed]">{title}</strong>
                  <p className="text-[13px] leading-6 text-[#999]">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="range-access" className="scroll-mt-24 border-b border-[#262626] py-14">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">02 · Range access</p>
            <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.045em]">Buyers choose records, not archives.</h2>
            <p className="mt-5 max-w-[58ch] text-[14px] leading-7 text-[#999]">For range-ready listings, Meris maps a buyer's requested records to the exact byte window in the dataset. The checkout quote, access permission, and delivery token all stay scoped to that request. The buyer never needs to download the complete archive.</p>
            <CodeBlock>{`records = 10,000
request = records 2,001–2,500

start = rowIndex[2,001]
end   = rowIndex[2,501] - 1

Range: bytes=start-end`}</CodeBlock>
            <p className="mt-4 text-[12px] leading-5 text-[#666]">This is Meris's range layer: it keeps row boundaries so the marketplace can sell a precise slice. Full-file listings do not expose a record range.</p>
          </section>

          <section id="storage" className="scroll-mt-24 border-b border-[#262626] py-14">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">03 · Dataset ownership</p>
            <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.045em]">The listing stays separate from the file.</h2>
            <p className="mt-5 max-w-[58ch] text-[14px] leading-7 text-[#999]">Meris owns the marketplace record: title, description, category, format, license, price, publisher profile, votes, and download history. The publisher's source file is stored through Shelby and referenced by Meris. That separation lets the catalog stay searchable without copying every dataset into the app database.</p>
            <CodeBlock>{`{
  "kind": "range",
  "format": "csv",
  "records": 10000,
  "blobPath": "shelby://<owner>/<path>",
  "expiresAt": 1785695247710
}`}</CodeBlock>
          </section>

          <section id="payments" className="scroll-mt-24 border-b border-[#262626] py-14">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">04 · Checkout</p>
            <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.045em]">The quote follows the request.</h2>
            <p className="mt-5 max-w-[58ch] text-[14px] leading-7 text-[#999]">Meris calculates a proportional quote from the selected range and listing price. The buyer signs the checkout transaction, and the publisher receives the payment. Free listings skip the transfer but still require wallet authorization for protected delivery.</p>
            <div className="mt-6 grid gap-px overflow-hidden rounded-[10px] border border-[#303030] bg-[#303030] sm:grid-cols-3">
              {['Minimum paid request', 'Settlement', 'Gas payer'].map((label, index) => <div key={label} className="bg-[#151515] p-4"><p className="text-[10px] uppercase tracking-[0.1em] text-[#666]">{label}</p><p className="mt-2 text-[13px] text-[#e5e5e5]">{['1 ShelbyUSD', 'Publisher wallet', 'Buyer wallet'][index]}</p></div>)}
            </div>
          </section>

          <section id="delivery" className="scroll-mt-24 border-b border-[#262626] py-14">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">05 · Access</p>
            <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.045em]">Meris delivers only what was bought.</h2>
            <p className="mt-5 max-w-[58ch] text-[14px] leading-7 text-[#999]">After checkout or free authorization, Meris creates a short-lived delivery permission scoped to the listing, requester, and selected range. The delivery endpoint rejects missing or expired permissions before reading the underlying file.</p>
            <CodeBlock>{`GET /api/requests/stream?token=<signed-token>

200 OK
Content-Range: bytes start-end/total
Accept-Ranges: bytes`}</CodeBlock>
          </section>

          <section id="security" className="scroll-mt-24 py-14">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">06 · Trust boundaries</p>
            <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.045em]">What the app controls.</h2>
            <ul className="mt-6 space-y-3 text-[14px] leading-6 text-[#999]">
              <li className="border-l border-[#777] pl-4">Publisher signatures are verified against the wallet public key before upload or publish.</li>
              <li className="border-l border-[#777] pl-4">Delivery tokens are scoped to a blob, byte range, requester, and expiry.</li>
              <li className="border-l border-[#777] pl-4">The server does not trust client-supplied publisher identity; it derives the address from the verified key.</li>
              <li className="border-l border-[#777] pl-4">Current deployment uses persistent JSON stores on one server instance. Multi-instance indexing is not supported yet.</li>
            </ul>
            <div className="mt-10 border-t border-[#262626] pt-6 text-[12px] text-[#666]">Implementation note: Meris uses Shelby for encrypted storage and range delivery. Shelby is infrastructure; the marketplace rules above belong to Meris.</div>
          </section>
        </main>
      </div>
    </div>
  );
}
