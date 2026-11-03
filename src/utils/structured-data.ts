// Shared schema.org entities. Pages link to these by @id so an answer engine resolves one Person and one WebSite.
export const SITE_URL = 'https://suhasdarsi.com';
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
const CONTEXT = 'https://schema.org';

export type JsonLd = Record<string, unknown>;

export const person = (): JsonLd => ({
  '@context': CONTEXT,
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Suhas Darsi',
  url: SITE_URL,
  jobTitle: 'Co-founder of SuperAlign',
  description: 'Suhas Darsi is a co-founder of SuperAlign who writes about AI security, agent systems and network risk.',
  worksFor: { '@type': 'Organization', name: 'SuperAlign', url: 'https://superalign.ai/' },
  sameAs: ['https://www.linkedin.com/in/suhasdarsi/', 'https://x.com/suhas_darsi'],
});

export const website = (): JsonLd => ({
  '@context': CONTEXT,
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: 'Suhas Darsi',
  url: SITE_URL,
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
