// Shared schema.org entities. Pages link to these by @id so an answer engine resolves one Person and one WebSite.
import { site } from './site';

export const PERSON_ID = `${site.url}/#person`;
const WEBSITE_ID = `${site.url}/#website`;
const CONTEXT = 'https://schema.org';

export type JsonLd = Record<string, unknown>;

export const person = (): JsonLd => ({
  '@context': CONTEXT,
  '@type': 'Person',
  '@id': PERSON_ID,
  name: site.name,
  url: site.url,
  jobTitle: `Co-founder of ${site.company.name}`,
  description: `${site.name} is a co-founder of ${site.company.name} who writes about AI security, agent systems and network risk.`,
  worksFor: { '@type': 'Organization', name: site.company.name, url: site.company.url },
  sameAs: [site.linkedin, site.x],
});

export const website = (): JsonLd => ({
  '@context': CONTEXT,
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: site.name,
  url: site.url,
  description: 'Notes on AI security, agent systems and network risk, plus small micro-apps.',
  publisher: { '@id': PERSON_ID },
  inLanguage: 'en',
});

export const webPage = (url: string, name: string, description: string | undefined, type = 'WebPage'): JsonLd => ({
  '@context': CONTEXT,
  '@type': type,
  '@id': `${url}#webpage`,
  url,
  name,
  ...(description ? { description } : {}),
  isPartOf: { '@id': WEBSITE_ID },
  about: { '@id': PERSON_ID },
});

export const breadcrumbs = (trail: { name: string; url: string }[]): JsonLd => ({
  '@context': CONTEXT,
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.url })),
});

/** Serialise for an inline script: escape "<" so content can never close the tag. */
export const serialize = (data: JsonLd) => JSON.stringify(data).replace(/</g, '\\u003c');
