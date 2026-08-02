'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLoader from '../../components/brand/BrandLoader';
import ProfileSetup from '../../components/profile/ProfileSetup';
import { getProfile, saveProfile } from '../../lib/profile';

export default function ProfileRoute() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void import('../../lib/wallet/aptos-client')
      .then(({ getConnectedWallet }) => getConnectedWallet())
      .then((wallet) => {
        if (cancelled) return;
        if (!wallet?.address) {
          router.replace('/gate');
          return;
        }
        setAddress(wallet.address);
        const existing = getProfile();
        if (existing) {
          router.replace('/dashboard');
          return;
        }
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) router.replace('/gate');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!address || !checked) {
    return <BrandLoader label="Checking wallet" hint="Publisher access requires an active wallet session." />;
  }

  return (
    <ProfileSetup
      address={address}
      onComplete={async (p) => {
        saveProfile(p);
        // Write the profile blob to Shelby (on-chain registered). Best-effort —
        // when the server is not configured the local profile still works.
        try {
          const { getConnectedWallet, signMessageDetailed } = await import('../../lib/wallet/aptos-client');
          const wallet = await getConnectedWallet();
          if (!wallet?.address) throw new Error('no wallet');
          const expiry = Date.now() + 120_000;
          const signed = await signMessageDetailed(`meris:profile:${address}:${expiry}`);
          await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet: address,
              username: p.username,
              bio: '',
              publicKeyHex: wallet.publicKey,
              signature: signed.signature,
              fullMessage: signed.fullMessage,
            }),
          });
        } catch {
          // local profile fallback — server unavailable
        }
        router.replace('/dashboard');
      }}
    />
  );
}
