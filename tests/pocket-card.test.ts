import { describe, expect, it } from 'vitest';
import { createContactCard, generateVCard, normalizePhone, validateContact } from '../src/pocket-card/contact';

describe('Pocket Card contacts', () => {
  it('escapes vCard text and normalizes the phone number', () => {
    const card = generateVCard({ name: 'Alex; Morgan', phone: '+1 (202) 555-0123' });
    expect(card).toContain('FN:Alex\\; Morgan');
    expect(card).toContain('TEL;TYPE=CELL:+12025550123\r\n');
  });

  it('rejects malformed numbers', () => {
    for (const value of ['2025550123', '+1', '+012345678', '+1234567890123456']) {
      expect(() => normalizePhone(value), value).toThrow();
    }
  });

  it('rejects vCard injection, unsafe links, missing names and over-long fields', () => {
    expect(() => validateContact({ name: 'Alex\r\nTEL:123' })).toThrow();
    expect(() => validateContact({ name: 'Alex', website: 'javascript:alert(1)' })).toThrow();
    expect(() => validateContact({ name: 'Alex', website: 'https://user:pass@example.com' })).toThrow();
    expect(() => validateContact({ name: '' })).toThrow();
    expect(() => validateContact({ name: 'A'.repeat(161) })).toThrow();
    expect(validateContact({ name: 'Alex', note: 'N'.repeat(240) }).note).toHaveLength(240);
  });

  it("builds the owner's card without a phone by default", () => {
    const card = createContactCard();
    expect(card).toContain('N:Darsi;Suhas;;;\r\n');
    expect(card).toContain('EMAIL;TYPE=INTERNET,WORK:suhas@superalign.ai');
    expect(card).toContain('URL:https://suhasdarsi.com/');
    expect(card).not.toContain('TEL');
    expect(card.endsWith('END:VCARD\r\n')).toBe(true);
    expect(createContactCard('+1 (202) 555-0123')).toContain('TEL;TYPE=CELL:+12025550123\r\n');
    expect(() => createContactCard('+12025550123\r\nURL:https://example.org')).toThrow();
  });
});
