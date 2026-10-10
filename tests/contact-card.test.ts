import { describe, expect, it } from 'vitest';
import { createContactCard, normalizePhone } from '../src/utils/contact-card';

describe('contact card', () => {
  it('shares public details without a phone by default', () => {
    const card = createContactCard();
    expect(card).toContain('N:Darsi;Suhas;;;\r\n');
    expect(card).toContain('EMAIL;TYPE=INTERNET,WORK:suhas@superalign.ai');
    expect(card).toContain('URL:https://suhasdarsi.com/');
    expect(card).not.toContain('TEL');
    expect(card.endsWith('END:VCARD\r\n')).toBe(true);
  });
  it('normalizes an international phone number', () => {
    expect(normalizePhone('+1 (202) 555-0123')).toBe('+12025550123');
    expect(createContactCard('+1 (202) 555-0123')).toContain('TEL;TYPE=CELL:+12025550123\r\n');
  });
  it('rejects malformed numbers and vCard injection', () => {
    for (const value of ['2025550123', '+1', '+012345678', '+1234567890123456', '+12025550123\r\nURL:https://example.org']) {
      expect(() => createContactCard(value)).toThrow();
    }
  });
});
