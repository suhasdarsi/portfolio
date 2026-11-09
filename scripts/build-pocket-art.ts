// Renders the Pocket Card mark into the PNGs Apple Wallet needs. Run: bun scripts/build-pocket-art.ts
import { join } from 'node:path';
import sharp from 'sharp';
import { pocketCardColors } from '../src/pocket-card/contact';
import { pocketMarkSvg } from '../src/pocket-card/mark';

const out = join(import.meta.dirname, '..', 'public', 'wallet');
// Wallet sizes are in points; @2x and @3x cover retina screens.
const art: { name: string; points: number; color: string; weight: number; background?: string }[] = [
  // Lock-screen and notification icon: the mark in ink on the card's stone.
  { name: 'icon', points: 29, color: pocketCardColors.foregroundColor, weight: 2, background: pocketCardColors.backgroundColor },
  // Top-left logo, beside the "Pocket Card" text.
  { name: 'logo', points: 32, color: '#8a857e', weight: 2 },
  // Top-right thumbnail, beside the name: the quiet signature stitch.
  { name: 'thumbnail', points: 90, color: '#c4beb5', weight: 1.25 },
];

for (const { name, points, color, weight, background } of art) {
  for (const scale of [1, 2, 3]) {
    const size = points * scale;
    const file = join(out, `${name}${scale === 1 ? '' : `@${scale}x`}.png`);
    const image = sharp(Buffer.from(pocketMarkSvg({ color, size, weight })));
    await (background ? image.flatten({ background }) : image).png().toFile(file);
    console.log(`${file} (${size}×${size})`);
  }
}
