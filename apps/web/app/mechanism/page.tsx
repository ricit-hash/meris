import type { Metadata } from 'next';
import Link from 'next/link';
import LandingNav from '../../components/landing/LandingNav';

export const metadata: Metadata = {
  title: 'Mechanism — Range access on Shelby',
  description:
    'How Meris sells data: publishers upload blobs to the Shelby network, buyers request a slice of records, pay in ShelbyUSD, and receive a signed byte-range delivery.',
};

const steps = [
  {
    label: '01 · PUBLISH',
    title: 'Upload the blob, publish the manifest.',
    body: 'Publishers upload a file to the Shelby network. Shelby registers the blob on-chain — name, size, and Merkle commitments — and stores the bytes in its storage layer. The blob stays under the publisher\'s account; buyers never get the archive.',
    points: ['Blob committed on-chain with size + Merkle root', 'Data stays in Shelby storage under the publisher', 'No archive download — ever'],
  },
  {
    label: '02 · MANIFEST',
    title: 'A listing is just a pointer.',
    body: 'A manifest describes the dataset: name, format, license, record count, and the Shelby blob path it points to. Listings are server-side; the data itself never leaves Shelby.',
    points: ['Priced in ShelbyUSD, or free', 'Range-ready or full-file delivery', 'Publisher wallet address attached for payments'],
  },
  {
    label: '03 · SLICE',
    title: 'Buyers pick records, not bytes.',
    body: 'A buyer chooses how many records they need — a small slice works too. The app estimates the byte window that slice occupies inside the blob, based on total records and file size.',
    points: ['Records → percentage → byte range', 'Slice is proportional to the listing price', 'Minimum 1 sUSD per paid request'],
  },
  {
    label: '04 · PAY',
    title: 'One transaction, buyer-signed.',
    body: 'Paid listings move ShelbyUSD from the buyer\'s wallet straight to the publisher via a fungible-asset transfer. The buyer signs the transaction, so the buyer pays the gas fee. Free listings skip payment entirely.',
    points: ['ShelbyUSD fungible asset, on-chain', 'Full upfront — no escrow in this phase', 'Buyer signs and pays gas with their wallet'],
  },
  {
    label: '05 · DELIVER',
    title: 'Signed byte-range delivery.',
    body: 'The server mints a short-lived HMAC-signed URL for exactly the requested byte window. The stream route serves only that range from the Shelby blob — no signature, no bytes.',
    points: ['Signed URL expires after 5 minutes', 'Range-restricted read from Shelby RPC', 'Access control without exposing the blob'],
  },
];

export default function MechanismPage() {
  return (
    <div className="ref-shell">
      <LandingNav />
      <main>
        <section className="border-b border-[#262626] px-8 py-16 md:px-12 md:py-24">
          <div className="ref-rail">
            <p className="ref-label">MECHANISM</p>
            <div>
              <h1 className="text-[clamp(2.6rem,5.6vw,5rem)] font-light leading-[0.95] tracking-[-0.05em] text-[#ededed]">
                Range access, not the archive.
              </h1>
              <p className="mt-6 max-w-[56ch] text-[15px] leading-7 text-[#999]">
                Meris sells data the way databases serve queries: a buyer requests the records
                they need, and only that slice leaves the Shelby blob. The publisher keeps the
                archive; the network settles the payment.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/catalog"
                  className="rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] no-underline transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97]"
                >
                  Browse the catalog
                </Link>
                <Link
                  href="/publish"
                  className="rounded-[12px] border border-[#303030] px-6 py-[12px] text-[14px] font-medium text-[#a7a7a7] no-underline transition-colors hover:border-[#4a4a4a] hover:text-white"
                >
                  Publish a dataset
                </Link>
              </div>
            </div>
          </div>
        </section>

        {steps.map((step) => (
          <section key={step.label} className="ref-rail border-b border-[#262626] px-8 py-14 md:px-12 md:py-16">
            <p className="ref-label">{step.label}</p>
            <div>
              <h2 className="text-[clamp(1.6rem,2.6vw,2.4rem)] font-light leading-[1.05] tracking-[-0.03em] text-[#ededed]">
                {step.title}
              </h2>
              <p className="mt-4 max-w-[56ch] text-[14px] leading-7 text-[#999]">{step.body}</p>
              <ul className="mt-6 flex max-w-[52ch] flex-col gap-2">
                {step.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[13px] text-[#a7a7a7]">
                    <i className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#7bafa0]" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="border-b border-[#262626] px-8 py-14 md:px-12 md:py-16">
          <div className="ref-rail">
            <p className="ref-label">TRUTH</p>
            <div>
              <h2 className="text-[clamp(1.6rem,2.6vw,2.4rem)] font-light leading-[1.05] tracking-[-0.03em] text-[#ededed]">
                What is live, what is preview.
              </h2>
              <p className="mt-4 max-w-[56ch] text-[14px] leading-7 text-[#999]">
                The frontend and API flow are live. Blob upload, verification, listing, and
                signed range delivery all run against the Shelby network once the server is
                configured with an API key. Payments move ShelbyUSD on-chain with the buyer
                signing the transaction. Until the server has credentials, listings behave as a
                local preview and requests are recorded but not delivered.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#2b2b2b] px-8 py-8 md:px-12">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[#666]">
          <span>Built on Shelby Protocol</span>
          <Link href="/" className="no-underline hover:text-white">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
