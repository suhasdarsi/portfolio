// Contact details on a Pocket Card: the fields, how they're validated, and the vCard the QR and pass carry.
// The form (src/pages/pocket-card.astro), the Wallet Worker (worker/wallet.ts) and the tests share this.
import { site } from '../site/site';

/** Each field with its label on the back of the pass and its longest allowed value. */
export const contactFields = [
  { name: 'name', label: 'Name', max: 160 },
  { name: 'title', label: 'Role', max: 160 },
  { name: 'company', label: 'Company', max: 160 },
  { name: 'phone', label: 'Phone', max: 160 },
  { name: 'email', label: 'Email', max: 160 },
  { name: 'website', label: 'Website', max: 160 },
  { name: 'linkedin', label: 'LinkedIn', max: 160 },
  { name: 'twitter', label: 'X', max: 160 },
  { name: 'note', label: 'Notes', max: 240 },
] as const;

export type ContactField = (typeof contactFields)[number]['name'];
export type ContactDetails = Record<ContactField, string>;

export const fieldMax = (name: string) => contactFields.find((field) => field.name === name)!.max;

export function normalizePhone(value: string): string {
  const phone = value.trim();
  if (!phone) return '';
  if (!/^\+[\d ()-]+$/.test(phone)) throw new Error('Use an international number beginning with + and your country code.');
  const normalized = phone.replace(/[ ()-]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) throw new Error('Enter a valid international number (7–15 digits).');
  return normalized;
}

export function validateContact(input: unknown): ContactDetails {
  if (!input || typeof input !== 'object') throw new Error('Enter your contact details.');
  const data = input as Record<string, unknown>;
  const result = {} as ContactDetails;
  for (const { name, max } of contactFields) {
    if (data[name] !== undefined && typeof data[name] !== 'string') throw new Error('Invalid contact details.');
    const value = String(data[name] ?? '').trim();
    if (value.length > max || /[\r\n\x00-\x1f]/.test(value)) throw new Error('Keep each field short and on one line.');
    result[name] = value;
  }
  if (!result.name) throw new Error('Enter your name.');
  result.phone = normalizePhone(result.phone);
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Enter a valid email address.');
  for (const field of ['website', 'linkedin', 'twitter'] as const) {
    if (!result[field]) continue;
    let url: URL | undefined;
    try {
      url = new URL(result[field]);
    } catch {
      // Reported below.
    }
    if (!url || !['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      throw new Error('Use a full http:// or https:// address for links.');
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

// The site owner's own card, for scripts/build-wallet-pass.ts.
export function createContactCard(phone = ''): string {
  const normalized = normalizePhone(phone);
  const [given, family] = site.name.split(' ');
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${family};${given};;;`,
    `FN:${site.name}`,
    `ORG:${site.company.name}`,
    'TITLE:Co-founder',
    `EMAIL;TYPE=INTERNET,WORK:${site.email}`,
    `URL:${site.url}/`,
    ...(normalized ? [`TEL;TYPE=CELL:${normalized}`] : []),
    'END:VCARD',
    '',
  ].join('\r\n');
}

// The Wallet pass type the Worker and the local script sign with.
export const walletPass = {
  passTypeIdentifier: 'pass.com.suhasdarsi.contact',
  teamIdentifier: 'Q24Y9Q3T67',
  organizationName: 'PureML Inc.',
} as const;

// The one Pocket Card look, shared by the signed pass, the page preview and the Wallet artwork.
export const pocketCardColors = {
  backgroundColor: 'rgb(232, 229, 224)',
  foregroundColor: 'rgb(43, 40, 37)',
  labelColor: 'rgb(105, 100, 94)',
} as const;
