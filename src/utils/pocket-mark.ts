// The Pocket Card mark: a pocket hem with a dashed U-stitch beneath it.
// Single source for the site icon and the Wallet pass artwork (scripts/build-pocket-art.ts).
export const pocketMark = {
  viewBox: '0 0 32 32',
  hem: 'M5 8H27',
  stitch: 'M9 12V17a7 7 0 0 0 14 0V12',
};

export function pocketMarkSvg({ color, size, weight = 1.75 }: { color: string; size: number; weight?: number }) {
  // Dash length tracks the stroke so the stitch reads the same at every size.
  const dash = `${weight * 1.15} ${weight * 1.35}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${pocketMark.viewBox}" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="${pocketMark.hem}" stroke-width="${weight}"/>`
    + `<path d="${pocketMark.stitch}" stroke-width="${weight}" stroke-dasharray="${dash}"/>`
    + '</svg>';
}
