// Who the site belongs to and where it lives. Pages, feeds, structured data and the Wallet scripts read these.
export const site = {
  url: 'https://suhasdarsi.com',
  name: 'Suhas Darsi',
  email: 'suhas@superalign.ai',
  linkedin: 'https://www.linkedin.com/in/suhasdarsi/',
  x: 'https://x.com/suhas_darsi',
  xHandle: '@suhas_darsi',
  booking: 'https://booking.akiflow.com/suhas--a84d',
  company: { name: 'SuperAlign', url: 'https://superalign.ai/' },
} as const;

// Roles, newest first. Home lists them all; About splits current from previous.
export const roles = [
  { name: site.company.name, role: 'Co-founder', url: site.company.url, current: true },
  { name: 'RIMAS Singapore', role: 'Chair, AI Alignment Chapter', url: 'https://www.rimas.org.sg/', current: true },
  { name: 'SUSS', role: 'Guest lecturer', url: 'https://www.suss.edu.sg/', current: true },
  { name: 'Aztlan', role: 'Founder', url: 'https://www.linkedin.com/company/aztlan/', current: false },
  { name: 'IIIT Hyderabad', role: 'Masters in AI', url: 'https://www.iiit.ac.in/', current: false },
  { name: 'IIIT Hyderabad', role: 'Bachelors', url: 'https://www.iiit.ac.in/', current: false },
] as const;

// Pages search engines are asked to skip. Pocket Card is a personal tool; Toolshed stays out while it's in alpha.
const unindexed = ['/404', '/pocket-card', '/toolshed'];

export function isIndexed(path: string): boolean {
  const clean = cleanPath(path);
  return !unindexed.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}

// With build.format 'file', Astro.url.pathname is '/index.html' or '/notes.html' at build time.
// Turn that into the clean URL Cloudflare serves and the sitemap lists ('/', '/notes').
export function cleanPath(pathname: string): string {
  const path = pathname.replace(/(\/index)?\.html$/, '').replace(/\/$/, '');
  return path || '/';
}

export function absoluteUrl(path: string): string {
  return `${site.url}${cleanPath(path)}`;
}
