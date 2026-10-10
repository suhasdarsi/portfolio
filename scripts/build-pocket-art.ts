// Renders the Pocket Card mark into the PNGs Apple Wallet needs. Run: bun scripts/build-pocket-art.ts
import { join } from 'node:path';
import sharp from 'sharp';
import { pocketMarkSvg } from '../src/utils/pocket-mark';

const out = join(import.meta.dirname, '..', 'public', 'wallet');
// Wallet sizes are in points; @2x and @3x cover retina screens.
const art = [
  // Top-left logo, beside the "Pocket Card" text.
  { name: 'logo', points: 32, color: '#8a857e', weight: 2 },
  // Top-right thumbnail, beside the name: the quiet signature stitch.
  { name: 'thumbnail', points: 90, color: '#c4beb5', weight: 1.25 },
];

for (const { name, points, color, weight } of art) {
  for (const scale of [1, 2, 3]) {
    const size = points * scale;
    const file = join(out, `${name}${scale === 1 ? '' : `@${scale}x`}.png`);
    await sharp(Buffer.from(pocketMarkSvg({ color, size, weight }))).png().toFile(file);
    console.log(`${file} (${size}×${size})`);
  }
}
