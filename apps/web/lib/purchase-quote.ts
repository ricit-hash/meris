type SlicePriceInput = {
  priceShelbyUSD: number;
  kind: 'range' | 'file';
  records: number;
  totalRecords: number;
};

export function calculateSlicePrice({ priceShelbyUSD, kind, records, totalRecords }: SlicePriceInput): number {
  if (!Number.isFinite(priceShelbyUSD) || priceShelbyUSD <= 0) return 0;
  if (kind === 'file') return Math.round(priceShelbyUSD * 100) / 100;
  const total = Math.max(0, Math.floor(totalRecords));
  const wanted = Math.max(0, Math.floor(records));
  const pct = total > 0 ? Math.min(1, wanted / total) : 0;
  return Math.round(Math.max(1, priceShelbyUSD * pct) * 100) / 100;
}
