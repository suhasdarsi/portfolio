// The site's sections outside the notes. The header, footer, search and llms.txt all list from here,
// so a new app or page is added once.
export interface Section {
  kind: 'App' | 'Page';
  title: string;
  href: string;
  /** The short label beside the title in search results. */
  meta: string;
  /** Extra words search should match on. */
  keywords: string;
  /** One line for llms.txt. */
  summary: string;
}

export const apps: Section[] = [
  { kind: 'App', title: 'Pocket Card', href: '/pocket-card', meta: 'Apple Wallet card', keywords: 'pocket card wallet business card qr contact', summary: 'Make a business card for Apple Wallet.' },
  { kind: 'App', title: 'Swatchbook', href: '/swatchbook', meta: 'Design systems', keywords: 'swatchbook design systems directory', summary: 'Directory of design systems.' },
  { kind: 'App', title: 'Toolshed', href: '/toolshed', meta: 'Security tools', keywords: 'toolshed security tools research market', summary: 'Research on the security tools market.' },
];

export const pages: Section[] = [
  { kind: 'Page', title: 'About', href: '/about', meta: 'Background', keywords: 'about background superalign aztlan iiit rimas suss', summary: 'Background, current work and ways to get in touch.' },
  { kind: 'Page', title: 'Uses', href: '/uses', meta: 'Tools and gear', keywords: 'uses tools gear setup', summary: 'The tools and gear Suhas uses.' },
];

export const nav = [
  { key: 'notes', label: 'Notes', href: '/notes' },
  { key: 'apps', label: 'Apps', href: '/#apps' },
  { key: 'about', label: 'About', href: '/about' },
  { key: 'uses', label: 'Uses', href: '/uses' },
] as const;

export type NavKey = (typeof nav)[number]['key'];
