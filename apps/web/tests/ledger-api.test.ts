import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/ledger/route';

describe('ledger ownership API', () => {
  it('rejects requests without a valid account', async () => {
    const response = await POST(new Request('http://localhost/api/ledger', { method: 'POST', body: JSON.stringify({ role: 'seller' }) }));
    expect(response.status).toBe(400);
  });

  it('rejects spoofed accounts without matching wallet proof', async () => {
    const response = await POST(new Request('http://localhost/api/ledger', { method: 'POST', body: JSON.stringify({ account: '0x1234', role: 'seller', publicKeyHex: '', signature: '', fullMessage: '' }) }));
    expect(response.status).toBe(403);
  });
});
