'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import BrandLoader from '../brand/BrandLoader';

type Props = {
  href?: string;
  className?: string;
  label?: string;
  children: React.ReactNode;
};

/**
 * Landing/nav CTA toward /gate. Shows a brief loading overlay
 * (matching the publisher-gate morph) before navigating, so the
 * transition never feels like a dead click.
 */
export default function GateLink({
  href = '/gate',
  className = '',
  label = 'Opening publisher gate',
  children,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function onNavigate(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let modifier-clicks / new-tab behave natively.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    window.setTimeout(() => router.push(href), 700);
  }

  return (
    <>
      <Link href={href} className={className} onClick={onNavigate}>
        {children}
      </Link>
      {loading ? <BrandLoader overlay tone="dark" label={label} /> : null}
    </>
  );
}
