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
      onComplete={(p) => {
        saveProfile(p);
        router.replace('/dashboard');
      }}
    />
  );
}
