type MerisWordmarkProps = {
  className?: string;
  /** 'light' = dark text on light surface (gate/dashboard), 'dark' = light text on dark surface (landing) */
  tone?: 'light' | 'dark';
  ariaLabel?: string;
};

export default function MerisWordmark({
  className = '',
  tone = 'light',
  ariaLabel = 'Meris',
}: MerisWordmarkProps) {
  return (
    <span
      className={`inline-block font-medium tracking-[-0.02em] ${
        tone === 'light' ? 'text-[#090909]' : 'text-[#e5e5e5]'
      } ${className}`}
      aria-label={ariaLabel}
    >
      Meris
    </span>
  );
}
