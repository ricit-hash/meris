import { filterGroups } from './sample-data';

type Props = {
  active: Record<string, string[]>;
  onToggle: (group: string, option: string) => void;
};

export default function CatalogFilters({ active, onToggle }: Props) {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col gap-8 lg:flex">
      {filterGroups.map((group) => (
        <div key={group.label}>
          <p className="ref-label">{group.label}</p>
          <ul className="mt-4 flex flex-col gap-1">
            {group.options.map((option, i) => {
              const checked = (active[group.label] ?? []).includes(option);
              return (
                <li key={option}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-[7px] text-[13px] text-[#999] hover:bg-white/[0.03] hover:text-white">
                    <input
                      type="checkbox"
                      className="h-3 w-3 accent-[#d0d0d0]"
                      checked={checked}
                      onChange={() => onToggle(group.label, option)}
                    />
                    {option}
                    <span className="ml-auto text-[11px] tabular-nums text-[#666]">{group.counts[i]}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="rounded-xl border border-[#303030] bg-[#171717] p-4">
        <p className="ref-label">Range access</p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#999]">
          Buyers request a slice of records, not the archive. Dataset blobs stay on Shelby.
        </p>
        <a href="/mechanism" className="mt-3 inline-block text-[12px] text-[#d0d0d0] no-underline hover:underline">
          Read the mechanism ↗
        </a>
      </div>
    </aside>
  );
}
