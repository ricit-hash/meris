import { describe, expect, it } from 'vitest';
import { calculateSlicePrice } from '../lib/purchase-quote';

describe('calculateSlicePrice', () => {
  it('prices a range from requested records with a 1 sUSD minimum', () => {
    expect(calculateSlicePrice({ priceShelbyUSD: 4.5, kind: 'range', records: 1000, totalRecords: 10000 })).toBe(1);
    expect(calculateSlicePrice({ priceShelbyUSD: 4.5, kind: 'range', records: 5000, totalRecords: 10000 })).toBe(2.25);
  });

  it('keeps full-file listings flat-priced', () => {
    expect(calculateSlicePrice({ priceShelbyUSD: 4.5, kind: 'file', records: 1, totalRecords: 10000 })).toBe(4.5);
  });

  it('never returns negative or non-finite prices', () => {
    expect(calculateSlicePrice({ priceShelbyUSD: -1, kind: 'range', records: 10, totalRecords: 100 })).toBe(0);
    expect(calculateSlicePrice({ priceShelbyUSD: 4.5, kind: 'range', records: 10, totalRecords: 0 })).toBe(1);
  });
});
