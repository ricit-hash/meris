import Link from 'next/link';
import { filterGroups } from './sample-data';

type Props = {
  active: Record<string, string[]>;
  onToggle: (group: string, option: string) => void;
};

function ListFilter({ label, options, counts, active, onToggle }: { label: string; options: readonly string[]; counts: readonly number[]; active: string[]; onToggle: Props['onToggle'] }) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#666]">{label}</p>
      <div className="mt-3 space-y-1">
        {options.map((option, index) => {
          const selected = active.includes(option);
          return (
            <button key={option} type="button" onClick={() => onToggle(label, option)} className={`flex w-full items-center justify-between border-l px-2.5 py-1.5 text-left text-[12px] transition-colors ${selected ? 'border-[#ededed] bg-[#1c1c1c] text-[#ededed]' : 'border-transparent text-[#888] hover:border-[#555] hover:text-white'}`}>
              <span>{option}</span><span className="font-mono text-[10px] text-[#555]">{counts[index]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SegmentedFilter({ label, options, active, onToggle }: { label: string; options: readonly string[]; active: string[]; onToggle: Props['onToggle'] }) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#666]">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-[8px] border border-[#2b2b2b] bg-[#101010] p-1">
        {options.map((option) => {
          const selected = active.includes(option);
          return <button key={option} type="button" onClick={() => onToggle(label, option)} className={`min-w-0 px-2 py-2 text-[11px] transition-colors ${selected ? 'bg-[#ededed] text-[#222]' : 'text-[#777] hover:text-white'}`}>{option === 'Range-ready' ? 'Range' : option}</button>;
        })}
      </div>
    </section>
  );
}

export default function AppMarketplaceFilters({ active, onToggle }: Props) {
  const category = filterGroups.find((group) => group.label === 'Category')!;
  const delivery = filterGroups.find((group) => group.label === 'Delivery')!;
  const price = filterGroups.find((group) => group.label === 'Price')!;
  const license = filterGroups.find((group) => group.label === 'License')!;
  return (
    <aside className="hidden w-[204px] shrink-0 flex-col gap-7 lg:flex">
      <ListFilter {...category} active={active.Category ?? []} onToggle={onToggle} />
      <SegmentedFilter {...delivery} active={active.Delivery ?? []} onToggle={onToggle} />
      <SegmentedFilter {...price} active={active.Price ?? []} onToggle={onToggle} />
      <ListFilter {...license} active={active.License ?? []} onToggle={onToggle} />
      <div className="border-t border-[#262626] pt-4 text-[11px] leading-5 text-[#666]"><p className="text-[#888]">Range access</p><p className="mt-1">Request records, not the archive.</p><Link href="/mechanism" className="mt-2 inline-block text-[#aaa] no-underline hover:text-white">Read mechanism ↗</Link></div>
    </aside>
  );
}
