import Link from 'next/link';
import LandingNav from '../components/landing/LandingNav';

export default function NotFound() {
  return (
    <div className="ref-shell">
      <LandingNav />
      <main className="flex min-h-[60vh] items-center justify-center px-8">
        <div className="max-w-[52ch] text-center">
          <p className="ref-label">404 — NOT FOUND</p>
          <h1 className="mt-4 text-[clamp(2rem,4vw,3.4rem)] font-light leading-[1] tracking-[-0.05em] text-[#ededed]">
            This page doesn&apos;t exist.
          </h1>
          <p className="mx-auto mt-4 max-w-[40ch] text-[14px] leading-6 text-[#999]">
            The listing may have been removed, or the address is wrong.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] no-underline transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.97]"
            >
              Back to home
            </Link>
            <Link
              href="/catalog"
              className="rounded-[12px] border border-[#303030] px-6 py-[12px] text-[14px] font-medium text-[#a7a7a7] no-underline transition-colors hover:border-[#4a4a4a] hover:text-white"
            >
              Browse the catalog
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
