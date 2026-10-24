// The personal mark: a hub, its dashed reach, and one node it has connected to.
// Same family rule as the micro-app marks: one solid shape, one dashed detail.
// Single source for the header, favicon (scripts/build-site-mark.ts) and OG images.
export const siteMark = {
  viewBox: '0 0 32 32',
  hub: { cx: 16, cy: 16, r: 4.5 },
  // The orbit stops short of the node on both sides, so the node sits in a clear gap.
  reach: 'M26.4 12.42A11 11 0 1 1 19.58 5.6',
  node: { cx: 23.78, cy: 8.22, r: 2.25 },
};

export function siteMarkPaths({ color, weight = 2 }: { color: string; weight?: number }) {
  const { hub, reach, node } = siteMark;
  const dash = `${weight * 1.15} ${weight * 1.35}`;
  return `<circle cx="${hub.cx}" cy="${hub.cy}" r="${hub.r}" fill="none" stroke="${color}" stroke-width="${weight}"/>`
    + `<path d="${reach}" fill="none" stroke="${color}" stroke-width="${weight}" stroke-linecap="round" stroke-dasharray="${dash}"/>`
    + `<circle cx="${node.cx}" cy="${node.cy}" r="${node.r}" fill="${color}"/>`;
}
