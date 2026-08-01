import MerisWordmark from './MerisWordmark';

type Props = {
  label?: string;
  hint?: string;
  overlay?: boolean;
  variant?: 'default' | 'enter';
  tone?: 'light' | 'dark';
};

export default function BrandLoader({
  label = 'Loading',
  hint,
  overlay = false,
}: Props) {
  return (
    <div
      className={`${overlay ? 'fixed inset-0 z-[80]' : 'min-h-[100svh]'} flex min-h-[100svh] items-center justify-center bg-[#0a0a0a] px-6 text-[#ededed]`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-[24rem] text-center">
        <MerisWordmark className="mx-auto !text-[2.6rem]" tone="dark" ariaLabel="Meris" />
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.12em] text-white/55">{label}</p>
        {hint ? <p className="mt-3 text-sm leading-6 text-white/40">{hint}</p> : null}
        <div className="mx-auto mt-7 h-[2px] w-16 overflow-hidden bg-white/15" aria-hidden="true">
          <span className="block h-full w-1/2 bg-white/65" />
        </div>
      </div>
    </div>
  );
}
