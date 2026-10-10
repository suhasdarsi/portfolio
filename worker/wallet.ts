import forge from 'node-forge';
import { strToU8, zipSync } from 'fflate';
import { cardRoleLine, generateVCard, validateContact } from '../src/utils/contact-card';

export interface WalletEnv {
  WALLET_SIGNER_CERT?: string;
  WALLET_SIGNER_KEY?: string;
  WALLET_WWDR_CERT?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
  WALLET_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
const backLabels = { name: 'Name', title: 'Role', company: 'Company', phone: 'Phone', email: 'Email', website: 'Website', linkedin: 'LinkedIn', twitter: 'X', note: 'Notes' };
export async function walletResponse(request: Request, env: WalletEnv): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const fail = (message: string, status: number) => Response.json({ error: message }, { status, headers });
  if (request.method !== 'POST') return fail('Use the contact card form.', 405);
  if (request.headers.get('origin') !== new URL(request.url).origin) return fail('Open the form on this website.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return fail('Invalid request.', 415);
  if (!env.WALLET_SIGNER_CERT || !env.WALLET_SIGNER_KEY || !env.WALLET_WWDR_CERT) return fail('Wallet generation is not activated yet. QR and contact downloads still work.', 503);
  if (env.WALLET_LIMIT && !(await env.WALLET_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'local' })).success) return fail('Please wait a minute before generating another card.', 429);
  const reader = request.body?.getReader();
  if (!reader) return fail('Missing contact details.', 400);
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.length;
    if (size > 8192) { await reader.cancel(); return fail('Contact details are too large.', 413); }
    chunks.push(part.value);
  }
  let payload; let details;
  try {
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    payload = JSON.parse(new TextDecoder().decode(bytes)); details = validateContact(payload.contact);
    if (!/^[0-9a-f-]{36}$/i.test(payload.id)) throw new Error('Invalid card ID.');
  } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid details.', 400); }
  try {
    const pass = {
      formatVersion: 1, passTypeIdentifier: 'pass.com.suhasdarsi.contact', teamIdentifier: 'Q24Y9Q3T67',
      serialNumber: payload.id, organizationName: 'PureML Inc.', description: 'Pocket Card', logoText: 'Pocket Card',
      // The one Pocket Card look: stone grey with ink text. Keep in sync with the preview in src/pages/pocket-card.astro.
      backgroundColor: 'rgb(232, 229, 224)', foregroundColor: 'rgb(43, 40, 37)', labelColor: 'rgb(105, 100, 94)',
      generic: {
        primaryFields: [{ key: 'name', value: details.name }],
        // Front stays minimal: name and "Role · Company". Everything else is on the back and in the QR.
        secondaryFields: [cardRoleLine(details)].filter(role => role.value).map(role => ({ key: 'role', ...role })),
        backFields: Object.entries(details).filter(([, value]) => value).map(([key, value]) => ({ key, label: backLabels[key as keyof typeof details], value })),
      },
      barcodes: [{ format: 'PKBarcodeFormatQR', message: generateVCard(details), messageEncoding: 'utf-8' }],
    };
    const files: Record<string, Uint8Array> = { 'pass.json': strToU8(JSON.stringify(pass)) };
    // Artwork from scripts/build-pocket-art.ts: logo beside "Pocket Card", stitch thumbnail beside the name.
    const artwork = ['icon', 'logo', 'thumbnail'].flatMap(name => [`${name}.png`, `${name}@2x.png`, `${name}@3x.png`]);
    for (const name of artwork) {
      const response = await env.ASSETS.fetch(new Request(new URL(`/wallet/${name}`, request.url)));
      if (!response.ok) throw new Error('Missing Wallet artwork');
      files[name] = new Uint8Array(await response.arrayBuffer());
    }
    const binary = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join('');
    const manifest = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, forge.md.sha1.create().update(binary(bytes)).digest().toHex()]));
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    const signature = forge.pkcs7.createSignedData();
    signature.content = forge.util.createBuffer(binary(files['manifest.json']));
    signature.addCertificate(env.WALLET_SIGNER_CERT); signature.addCertificate(env.WALLET_WWDR_CERT);
    signature.addSigner({ key: env.WALLET_SIGNER_KEY, certificate: env.WALLET_SIGNER_CERT, digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: new Date().toISOString() }] });
    signature.sign({ detached: true });
    files.signature = Uint8Array.from(forge.asn1.toDer(signature.toAsn1()).getBytes(), c => c.charCodeAt(0));
    const archive = zipSync(files);
    return new Response(archive.buffer as ArrayBuffer, { headers: { ...headers, 'Content-Type': 'application/vnd.apple.pkpass', 'Content-Disposition': 'attachment; filename="contact.pkpass"' } });
  } catch { return fail('Unable to sign your card. Please try again later.', 500); }
}
