import forge from 'node-forge';
import { strToU8, zipSync } from 'fflate';
import { cardRoleLine, contactFields, generateVCard, pocketCardColors, validateContact, walletPass } from '../src/pocket-card/contact';
import { fail, headers, readJsonPost, type RateLimiter } from './json-post';

export interface WalletEnv {
  WALLET_SIGNER_CERT?: string;
  WALLET_SIGNER_KEY?: string;
  WALLET_WWDR_CERT?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
  WALLET_LIMIT?: RateLimiter;
}

export async function walletResponse(request: Request, env: WalletEnv): Promise<Response> {
  const { WALLET_SIGNER_CERT: certificate = '', WALLET_SIGNER_KEY: key = '', WALLET_WWDR_CERT: intermediate = '' } = env;
  const read = await readJsonPost(request, {
    ready: Boolean(certificate && key && intermediate),
    limiter: env.WALLET_LIMIT,
    messages: {
      wrongMethod: 'Use the contact card form.',
      notReady: 'Wallet generation is not activated yet. QR and contact downloads still work.',
      rateLimited: 'Please wait a minute before generating another card.',
      tooLarge: 'Contact details are too large.',
      invalid: 'Invalid contact details.',
    },
  });
  if (read instanceof Response) return read;
  const { payload } = read;
  let details;
  try {
    details = validateContact(payload.contact);
    if (typeof payload.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.id)) throw new Error('Invalid card ID.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Invalid details.', 400);
  }
  try {
    const pass = {
      formatVersion: 1,
      ...walletPass,
      serialNumber: payload.id,
      description: 'Pocket Card',
      logoText: 'Pocket Card',
      ...pocketCardColors,
      generic: {
        primaryFields: [{ key: 'name', value: details.name }],
        // Front stays minimal: name and "Role · Company". Everything else is on the back and in the QR.
        secondaryFields: [cardRoleLine(details)]
          .filter((role) => role.value)
          .map((role) => ({ key: 'role', ...role })),
        backFields: contactFields
          .filter(({ name }) => details[name])
          .map(({ name, label }) => ({ key: name, label, value: details[name] })),
      },
      barcodes: [
        { format: 'PKBarcodeFormatQR', message: generateVCard(details), messageEncoding: 'utf-8' },
      ],
    };
    const files: Record<string, Uint8Array> = { 'pass.json': strToU8(JSON.stringify(pass)) };
    // Artwork from scripts/build-pocket-art.ts: logo beside "Pocket Card", stitch thumbnail beside the name.
    const artwork = ['icon', 'logo', 'thumbnail'].flatMap((name) => [
      `${name}.png`,
      `${name}@2x.png`,
      `${name}@3x.png`,
    ]);
    for (const name of artwork) {
      const response = await env.ASSETS.fetch(new Request(new URL(`/wallet/${name}`, request.url)));
      if (!response.ok) throw new Error('Missing Wallet artwork');
      files[name] = new Uint8Array(await response.arrayBuffer());
    }
    const binary = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const manifest = Object.fromEntries(
      Object.entries(files).map(([name, bytes]) => [
        name,
        forge.md.sha1.create().update(binary(bytes)).digest().toHex(),
      ])
    );
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    const signature = forge.pkcs7.createSignedData();
    signature.content = forge.util.createBuffer(binary(files['manifest.json']));
    signature.addCertificate(certificate);
    signature.addCertificate(intermediate);
    signature.addSigner({
      key,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
      ],
    });
    signature.sign({ detached: true });
    files.signature = Uint8Array.from(forge.asn1.toDer(signature.toAsn1()).getBytes(), (c) =>
      c.charCodeAt(0)
    );
    const archive = zipSync(files);
    return new Response(archive.buffer as ArrayBuffer, {
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'attachment; filename="contact.pkpass"',
      },
    });
  } catch {
    return fail('Unable to sign your card. Please try again later.', 500);
  }
}
