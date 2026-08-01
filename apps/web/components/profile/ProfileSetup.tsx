'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublisherProfile } from '../../lib/profile';
import MerisWordmark from '../brand/MerisWordmark';

type Props = {
  address: string;
  onComplete: (profile: PublisherProfile) => void;
};

const STEPS = ['Username', 'Discord', 'X'];

export default function ProfileSetup({ address, onComplete }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [discord, setDiscord] = useState('');
  const [x, setX] = useState('');
  const [error, setError] = useState('');

  const usernameValid = /^[a-zA-Z0-9_.-]{3,}$/.test(username.trim());

  function next() {
    if (step === 0 && !usernameValid) {
      setError('Username needs at least 3 characters (letters, numbers, . _ -).');
      return;
    }
    setError('');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    onComplete({ username: username.trim(), discord: discord.trim(), x: x.trim() });
  }

  const inputClass =
    'w-full rounded-[12px] border border-[#303030] bg-[#0a0a0a] px-4 py-3 text-[14px] text-[#ededed] outline-none transition-colors placeholder:text-[#555] focus:border-[#7bafa0]';

  const stepCopy = [
    { title: 'Pick a username.', body: 'Buyers see this on your listings. It becomes your publisher handle.', placeholder: 'e.g. meteo-labs', optional: false },
    { title: 'Add Discord (optional).', body: 'Used for buyer questions and data disputes. Leave empty to skip.', placeholder: 'e.g. meteo_labs', optional: true },
    { title: 'Add X handle (optional).', body: 'Shown on your listings when buyers want to follow updates.', placeholder: 'e.g. @meteolabs', optional: true },
  ];

  const copy = stepCopy[step];
  const value = step === 0 ? username : step === 1 ? discord : x;
  const setValue = step === 0 ? setUsername : step === 1 ? setDiscord : setX;
  const canNext = step > 0 || usernameValid;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-rows-[auto_1fr] bg-[#0a0a0a] lg:h-screen lg:min-h-0">
        <nav className="px-5 pt-2 md:px-8">
          <div className="flex h-14 items-center justify-between px-2 md:px-3">
            <MerisWordmark tone="dark" className="!text-[1.15rem]" />
            <span className="rounded-full border border-[#ededed]/20 px-5 py-2 text-xs font-medium text-[#a7a7a7]">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </div>
        </nav>

        <header className="min-h-0 px-5 pb-5 pt-3 md:px-8 md:pb-8">
          <main className="flex h-full min-h-[34rem] items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#303030] bg-[#171717] px-6 py-10 [view-transition-name:publisher-gate] lg:min-h-0">
            <div className="w-full max-w-[26rem]">
              <div className="flex items-center gap-2" aria-hidden="true">
                {STEPS.map((label, i) => (
                  <span
                    key={label}
                    className={`h-[3px] flex-1 rounded-full ${i <= step ? 'bg-[#7bafa0]' : 'bg-[#303030]'}`}
                  />
                ))}
              </div>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-[#666]">
                Publisher account · {step + 1} of {STEPS.length}
              </p>
              <h1 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[0.98] tracking-[-0.05em] text-[#ededed]">
                {copy.title}
              </h1>
              <p className="mt-4 text-sm leading-6 text-[#999]">{copy.body}</p>

              <label className="mt-8 block">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#888]">
                  {STEPS[step]} {copy.optional ? '' : '*'}
                </span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={copy.placeholder}
                  autoFocus
                  autoComplete="off"
                  className={`mt-2 ${inputClass}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') next();
                  }}
                />
              </label>

              {error ? (
                <p className="mt-4 text-xs text-[#f87171]" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-8 flex items-center gap-3">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="appearance-none rounded-[12px] border border-[#303030] bg-transparent px-5 py-[0.95rem] text-xs font-medium text-[#999] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-white active:scale-[0.97]"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext}
                  className="flex-1 appearance-none rounded-[12px] border-0 bg-[#f2f2f2] px-7 py-[0.95rem] text-xs font-medium text-[#222] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-85 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {step === STEPS.length - 1 ? 'Continue to dashboard' : copy.optional ? 'Continue' : 'Next'}
                </button>
              </div>

              {copy.optional ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === STEPS.length - 1) {
                      // Skip on the last step finishes the setup (like Continue).
                      onComplete({ username: username.trim(), discord: discord.trim(), x: x.trim() });
                    } else {
                      setStep(step + 1);
                    }
                  }}
                  className="mt-3 w-full appearance-none bg-transparent text-[12px] text-[#666] transition-colors hover:text-white"
                >
                  Skip
                </button>
              ) : null}

              <p className="mt-5 text-center text-[11px] leading-5 text-[#666]">
                Profile is stored locally in your browser. Publishing to the market comes with the backend.
              </p>
            </div>
          </main>
        </header>
      </div>
    </div>
  );
}
