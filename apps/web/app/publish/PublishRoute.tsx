'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLoader from '../../components/brand/BrandLoader';
import PublishForm from '../../components/publish/PublishForm';
import { getProfile, type PublisherProfile } from '../../lib/profile';
import WorkspaceFrame from '../../components/dashboard/WorkspaceFrame';

export default function PublishRoute() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void import('../../lib/wallet/aptos-client')
      .then(({ getConnectedWallet }) => getConnectedWallet())
      .then((wallet) => {
        if (cancelled) return;
        if (!wallet?.address) {
          router.replace('/gate?intent=publish&next=/app/publish');
          return;
        }
        setAddress(wallet.address);
        const existing = getProfile();
        if (!existing) {
          router.replace('/profile');
          return;
        }
        setProfile(existing);
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) router.replace('/gate?intent=publish&next=/app/publish');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!address || !profile || !checked) {
    return <BrandLoader label="Checking wallet" hint="Publisher access requires an active wallet session." />;
  }

  return <WorkspaceFrame address={address} profile={profile} title="Publish"><PublishForm address={address} username={profile.username} /></WorkspaceFrame>;
}
