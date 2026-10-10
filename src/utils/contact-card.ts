export function normalizePhone(value: string): string {
  const phone = value.trim();
  if (!phone) return '';
  if (!/^\+[\d ()-]+$/.test(phone)) throw new Error('Use an international number beginning with + and your country code.');
  const normalized = phone.replace(/[ ()-]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) throw new Error('Enter a valid international number (7–15 digits).');
  return normalized;
}

export function createContactCard(phone = ''): string {
  const normalized = normalizePhone(phone);
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Darsi;Suhas;;;',
    'FN:Suhas Darsi',
    'ORG:SuperAlign',
    'TITLE:Co-founder',
    'EMAIL;TYPE=INTERNET,WORK:suhas@superalign.ai',
    'URL:https://suhasdarsi.com/',
    ...(normalized ? [`TEL;TYPE=CELL:${normalized}`] : []),
    'END:VCARD',
    '',
  ].join('\r\n');
}

export interface ContactDetails {
  name: string; phone: string; email: string; company: string; title: string;
  website: string; linkedin: string; twitter: string; note: string;
}
export const contactFields = ['name', 'phone', 'email', 'company', 'title', 'website', 'linkedin', 'twitter', 'note'] as const;
export function validateContact(input: unknown): ContactDetails {
  if (!input || typeof input !== 'object') throw new Error('Enter your contact details.');
  const data = input as Record<string, unknown>;
  const result = {} as ContactDetails;
  for (const field of contactFields) {
    if (data[field] !== undefined && typeof data[field] !== 'string') throw new Error('Invalid contact details.');
    const value = String(data[field] ?? '').trim();
    if (value.length > (field === 'note' ? 240 : 160) || /[\r\n\x00-\x1f]/.test(value)) throw new Error('Keep each field short and on one line.');
    result[field] = value;
  }
  if (!result.name) throw new Error('Enter your name.');
  result.phone = normalizePhone(result.phone);
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Enter a valid email address.');
  for (const field of ['website', 'linkedin', 'twitter'] as const) {
    if (!result[field]) continue;
    try {
      const url = new URL(result[field]);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch { throw new Error('Use a full http:// or https:// address for links.'); }
  }
  return result;
}
export function generateVCard(input: unknown): string {
  const d = validateContact(input);
  const escape = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const rows = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escape(d.name)}`, `N:${escape(d.name)};;;;`];
  for (const [key, value] of [['TEL;TYPE=CELL', d.phone], ['EMAIL;TYPE=INTERNET', d.email], ['ORG', d.company], ['TITLE', d.title], ['URL', d.website], ['URL;TYPE=LinkedIn', d.linkedin], ['URL;TYPE=X', d.twitter], ['NOTE', d.note]]) {
    if (value) rows.push(`${key}:${escape(value)}`);
  }
  rows.push('END:VCARD', '');
  return rows.join('\r\n');
}

// The single line under the name on the front of a Pocket Card: "Role · Company".
// Email, phone and links stay in the QR and on the back of the pass.
export function cardRoleLine({ title = '', company = '' }: { title?: string; company?: string }) {
  return { label: title ? 'Role' : 'Company', value: [title, company].filter(Boolean).join(' · ') };
}
