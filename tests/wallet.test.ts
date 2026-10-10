import { it, expect } from 'vitest';
import { validateContact, generateVCard } from '../src/utils/contact-card';
import { walletResponse } from '../worker/wallet';
it('validates contacts and escapes vCard text', () => {
  expect(generateVCard({ name: 'Alex; Morgan', phone: '+1 (202) 555-0123' })).toContain('FN:Alex\\; Morgan');
  expect(() => validateContact({ name: 'Alex\r\nTEL:123' })).toThrow();
  expect(() => validateContact({ name: 'Alex', website: 'javascript:alert(1)' })).toThrow();
  expect(() => validateContact({ name: '' })).toThrow();
});
it('requires same-origin JSON and fails safely without secrets', async () => {
  const env = { ASSETS: { fetch: async () => new Response() } };
  expect((await walletResponse(new Request('https://example.com/api/wallet'), env)).status).toBe(405);
  expect((await walletResponse(new Request('https://example.com/api/wallet', { method: 'POST' }), env)).status).toBe(403);
  expect((await walletResponse(new Request('https://example.com/api/wallet', { method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/json' }, body: '{}' }), env)).status).toBe(503);
});
