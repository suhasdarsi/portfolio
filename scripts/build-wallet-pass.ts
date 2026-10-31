// Local-only Wallet signing. Never put the credential folder or output in this repo.
// Optional --contact points to the .vcf downloaded from the contact page.
import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { createContactCard } from '../src/utils/contact-card';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { contact: { type: 'string' }, output: { type: 'string' } },
});
const privateDir = join(homedir(), '.wallet-contact');
const output = resolve(values.output ?? join(privateDir, 'suhas-darsi.pkpass'));
const repo = resolve(import.meta.dirname, '..');
const outputRelative = relative(repo, output);
if (outputRelative !== '..' && !outputRelative.startsWith('../'))
  throw new Error('Save Wallet passes outside the website repository.');
if (existsSync(output)) throw new Error('Output already exists. Choose a new --output path.');

const certificate = join(privateDir, 'pass.com.suhasdarsi.contact.cert.pem');
const key = join(privateDir, 'pass.com.suhasdarsi.contact.key.pem');
const intermediate = join(privateDir, 'wwdr.pem');
const root = join(privateDir, 'apple-root.pem');
for (const file of [certificate, key, intermediate, root]) {
  if (!existsSync(file))
    throw new Error('Wallet signing credentials are missing from the private local folder.');
}
execFileSync('openssl', ['verify', '-CAfile', root, '-untrusted', intermediate, certificate], {
  stdio: 'pipe',
});
const card = values.contact ? await readFile(resolve(values.contact), 'utf8') : createContactCard();
if (
  !card.startsWith('BEGIN:VCARD') ||
  !card.includes('FN:Suhas Darsi') ||
  !card.includes('END:VCARD')
) {
  throw new Error('Use Suhas Darsi’s contact file downloaded from the contact page.');
}

await mkdir(dirname(output), { recursive: true, mode: 0o700 });
const work = await mkdtemp(join(privateDir, 'pass-build-'));
try {
  const files = ['pass.json', 'icon.png', 'icon@2x.png', 'icon@3x.png'];
  const pass = {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.suhasdarsi.contact',
    teamIdentifier: 'Q24Y9Q3T67',
    serialNumber: randomUUID(),
    organizationName: 'PureML Inc',
    description: 'Suhas Darsi Contact Card',
    logoText: 'Contact card',
    foregroundColor: 'rgb(247, 240, 231)',
    backgroundColor: 'rgb(20, 19, 15)',
    labelColor: 'rgb(170, 164, 154)',
    sharingProhibited: true,
    generic: {
      primaryFields: [
        { key: 'name', label: 'FOUNDER · RESEARCHER · WRITER', value: 'Suhas Darsi' },
      ],
      secondaryFields: [
        { key: 'company', label: 'COMPANY', value: 'SuperAlign' },
        { key: 'role', label: 'ROLE', value: 'Co-founder' },
      ],
      auxiliaryFields: [{ key: 'website', label: 'WEBSITE', value: 'suhasdarsi.com' }],
      backFields: [
        { key: 'email', label: 'Email', value: 'suhas@superalign.ai' },
        { key: 'web', label: 'Website', value: 'https://suhasdarsi.com/' },
        {
          key: 'instructions',
          label: 'Save my contact',
          value:
            'Scan the QR with your phone camera and choose to save the contact. Anyone who scans the QR can read its details.',
        },
      ],
    },
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: card,
        messageEncoding: 'utf-8',
        altText: 'Scan to save my contact',
      },
    ],
  };
  await writeFile(join(work, 'pass.json'), JSON.stringify(pass), { mode: 0o600 });
  const icon = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="87" height="87"><rect width="87" height="87" rx="18" fill="#14130f"/><text x="43.5" y="58" text-anchor="middle" font-family="serif" font-size="46" fill="#f7f0e7">S</text></svg>'
  );
  for (const [name, size] of [
    ['icon.png', 29],
    ['icon@2x.png', 58],
    ['icon@3x.png', 87],
  ] as const) {
    await sharp(icon).resize(size, size).png().toFile(join(work, name));
  }
  const manifest: Record<string, string> = {};
  for (const file of files)
    manifest[file] = createHash('sha1')
      .update(await readFile(join(work, file)))
      .digest('hex');
  await writeFile(join(work, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600 });
  execFileSync(
    'openssl',
    [
      'smime',
      '-binary',
      '-sign',
      '-signer',
      certificate,
      '-inkey',
      key,
      '-certfile',
      intermediate,
      '-in',
      join(work, 'manifest.json'),
      '-out',
      join(work, 'signature'),
      '-outform',
      'DER',
    ],
    { stdio: 'pipe' }
  );
  execFileSync(
    'openssl',
    [
      'smime',
      '-verify',
      '-inform',
      'DER',
      '-in',
      join(work, 'signature'),
      '-content',
      join(work, 'manifest.json'),
      '-CAfile',
      root,
      '-purpose',
      'any',
      '-out',
      join(work, 'verified-manifest.json'),
    ],
    { stdio: 'pipe' }
  );
  execFileSync('zip', ['-q', '-j', output, ...files, 'manifest.json', 'signature'], {
    cwd: work,
    stdio: 'pipe',
  });
  await chmod(output, 0o600);
  console.log(`Signed Wallet pass saved locally: ${output}`);
} finally {
  // Remove only this uniquely-created signing workspace; keep the credentials and pass.
  await rm(work, { recursive: true, force: true });
}
