// Renders the site mark into the favicons. Run: bun scripts/build-site-mark.ts
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { siteMarkPaths } from '../src/utils/site-mark';

const out = join(import.meta.dirname, '..', 'public');

// Cream mark on the dark ink tile, inset so it breathes inside the rounded square.
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">`
  + `<rect width="32" height="32" rx="7" fill="#1a1812"/>`
  + `<g transform="translate(3.5 3.5) scale(0.78125)">${siteMarkPaths({ color: '#f7f0e7', weight: 2.4 })}</g>`
  + `</svg>\n`;
await writeFile(join(out, 'favicon.svg'), tile);

// favicon.ico holds PNG frames, which every current browser reads.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map((size) => sharp(Buffer.from(tile)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const entry = 6 + index * 16;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frames[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frames[index].length;
});
await writeFile(join(out, 'favicon.ico'), Buffer.concat([header, ...frames]));
console.log('public/favicon.svg, public/favicon.ico');
