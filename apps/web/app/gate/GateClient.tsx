'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLoader from '../../components/brand/BrandLoader';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function GatePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sub, setSub] = useState('Connect a wallet to enter');
  const [needPetra, setNeedPetra] = useState(false);
  const [checking, setChecking] = useState(true);
  const [entering, setEntering] = useState(false);
  const [enterLabel, setEnterLabel] = useState('Entering Meris');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getConnectedWallet, hasAppSession } = await import('../../lib/wallet/aptos-client');
      if (!hasAppSession()) {
        if (!cancelled) setChecking(false);
        return;
      }
      try {
        const existing = await getConnectedWallet();
        if (existing?.address && !cancelled) {
          setEnterLabel('Welcome back');
          setEntering(true);
          await sleep(520);
          if (!cancelled) router.replace('/profile');
          return;
        }
      } catch {
        /* stay */
      }
      sessionStorage.removeItem('blobbed_session');
      sessionStorage.removeItem('blobbed_wallet');
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onConnect() {
    setError('');
    setNeedPetra(false);
    setBusy(true);
    setSub('Connecting…');
    try {
      const { connectWallet } = await import('../../lib/wallet/aptos-client');
      const wallet = await connectWallet();
      if (!wallet?.address) throw new Error('No address returned');
      setSub('Connected');
      setEnterLabel('Entering Meris');
      setEntering(true);
      await sleep(680);
      router.replace('/profile');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connect failed';
      setError(msg);
      setSub('Connect a wallet to enter');
      setBusy(false);
      setEntering(false);
      if (/not installed/i.test(msg)) setNeedPetra(true);
    }
  }

  const errorDetail = needPetra
    ? 'Install Petra or another Aptos wallet, then retry.'
    : error;

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 py-12 text-[#ededed] [view-transition-name:publisher-gate]">
      <div className={`w-full max-w-[30rem] text-center transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${entering ? 'pointer-events-none opacity-35 blur-[2px] motion-reduce:blur-none' : ''}`}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777]">Meris publisher access</p>
                <h1 className="mt-5 font-[Newsreader,Georgia,serif] text-[clamp(3rem,7vw,5.75rem)] font-normal leading-[0.9] tracking-[-0.055em] text-[#ededed]">Sign in to publish.</h1>
                <p className="mx-auto mt-6 max-w-[26rem] text-sm leading-6 text-[#999]">Connect an Aptos wallet to add dataset metadata and import an existing Shelby blob.</p>
                <button
                  type="button"
                  className={`mt-9 min-h-12 min-w-48 appearance-none rounded-full border border-[#f2f2f2] bg-[#f2f2f2] px-7 py-3 font-[inherit] text-[13px] font-medium text-[#222] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#dededb] active:scale-[0.97] disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100 ${busy ? 'animate-pulse' : ''}`}
                  disabled={busy || checking || entering}
                  onClick={() => void onConnect()}
                >
                  {busy ? 'Connecting…' : checking ? 'Checking…' : 'Connect wallet'}
                </button>
                <p className="mt-4 text-xs text-[#777]">{checking ? 'Checking existing session…' : sub}</p>
                {needPetra ? <p className="mt-2 text-xs text-[#888]">Install <a className="text-[#ededed] underline underline-offset-4" href="https://petra.app/" target="_blank" rel="noopener noreferrer">Petra</a>, then retry.</p> : null}
                {error ? <div className="mx-auto mt-5 max-w-[22rem] rounded-xl border border-red-400/30 bg-red-950/25 px-4 py-3 text-left text-xs leading-5 text-red-200" role="alert">{errorDetail}</div> : null}
      </div>
      {entering ? <BrandLoader overlay tone="dark" variant="enter" label={enterLabel} /> : null}
    </main>
  );
}
