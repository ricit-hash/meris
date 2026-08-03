import Link from 'next/link';
import GateLink from '../shared/GateLink';

const links = [
  { href: '/catalog', label: 'Marketplace', active: true },
  { href: '/mechanism', label: 'Mechanism' },
  { href: '/publish', label: 'Publish' },
];

export default function CatalogNav() {
  return (
    <header className="relative z-20 flex h-[96px] items-center justify-between px-8 md:h-[112px] md:items-center md:px-12">
        <Link href="/" aria-label="Meris home" className="text-[16px] font-medium tracking-[-0.02em] text-[#e5e5e5] no-underline md:text-[18px]">
          Meris
        </Link>
        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 rounded-full bg-[#1d1d1d] px-7 py-[12px] text-[14px] text-[#999] md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.active ? 'text-white no-underline' : 'no-underline hover:text-white'}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <GateLink href="/gate?intent=app&next=/app" className="rounded-[12px] bg-[#f2f2f2] px-6 py-[12px] text-[14px] font-medium text-[#222] no-underline hover:opacity-85">
          Login
        </GateLink>
      </header>
  );
}
