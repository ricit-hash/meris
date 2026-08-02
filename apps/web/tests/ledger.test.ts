import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addLedgerEntry, listLedger, sumRevenue } from '../lib/ledger';

describe('ledger store', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ledger-'));
    process.env.LEDGER_FILE = path.join(dir, 'l.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.LEDGER_FILE;
  });

  it('adds and lists entries, filters by role', () => {
    addLedgerEntry({ manifestId: 'm-1', blobPath: 'shelby://0x1/x.csv', buyer: '0xbuyer', seller: '0xseller', amountShelbyUSD: 4.5, hash: '0xh1', kind: 'range' });
    addLedgerEntry({ manifestId: 'm-2', blobPath: 'shelby://0x1/y.csv', buyer: '0xbuyer', seller: '0xseller', amountShelbyUSD: 1, hash: '0xh2', kind: 'file' });
    expect(listLedger()).toHaveLength(2);
    expect(listLedger({ account: '0xseller', role: 'seller' })).toHaveLength(2);
    expect(listLedger({ account: '0xother' })).toHaveLength(0);
    expect(sumRevenue('0xseller')).toBe(5.5);
    addLedgerEntry({ manifestId: 'm-3', blobPath: 'shelby://0x1/z.csv', buyer: '0xbuyer', seller: '0xseller', amountShelbyUSD: 0.01, hash: '', kind: 'range', manifestName: 'Events', records: 25, channelId: '0xchannel' });
    const purchases = listLedger({ account: '0xbuyer', role: 'buyer' });
    expect(purchases[0]).toMatchObject({ manifestName: 'Events', records: 25, channelId: '0xchannel' });
  });

  it('returns empty list when store file does not exist', () => {
    expect(listLedger()).toEqual([]);
    expect(sumRevenue('0x1')).toBe(0);
  });
});
