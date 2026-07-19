import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublishedContent } from './content-routes.mjs';

type PublishableData = { draft: boolean; dueDate?: Date | string; published?: boolean };

export type BlogEntry = CollectionEntry<'blog'>;
export type CardEntry = CollectionEntry<'cards'>;

export function isPublished(data: PublishableData): boolean {
  return isPublishedContent(data);
}

function byNewestPubDate<T extends { data: { pubDate: Date } }>(a: T, b: T): number {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}

function byCardOrder(a: CardEntry, b: CardEntry): number {
  return a.data.order - b.data.order;
}

export async function getPublishedBlogEntries(): Promise<BlogEntry[]> {
  return (await getCollection('blog')).filter((post) => isPublished(post.data));
}

export async function getPublishedBlogEntriesByDate(): Promise<BlogEntry[]> {
  return (await getPublishedBlogEntries()).sort(byNewestPubDate);
}

export async function getPublishedCardEntries(): Promise<CardEntry[]> {
  return (await getCollection('cards')).filter((card) => isPublished(card.data));
}

export async function getPublishedCardEntriesByOrder(): Promise<CardEntry[]> {
  return (await getPublishedCardEntries()).sort(byCardOrder);
}

export function getConnectedCards(card: CardEntry, publishedCards: CardEntry[]): CardEntry[] {
  const relatedCards = card.data.related
    .map((slug) => publishedCards.find((entry) => entry.id === slug))
    .filter((entry): entry is CardEntry => entry !== undefined);
  const backlinks = publishedCards.filter((entry) => entry.data.related.includes(card.id));
  return [...new Map([...relatedCards, ...backlinks].map((entry) => [entry.id, entry])).values()];
}

export function getCardsForSource(sourceId: string, publishedCards: CardEntry[]): CardEntry[] {
  return publishedCards.filter((card) => card.data.source === sourceId).sort(byCardOrder);
}

let cardReferenceValidation: Promise<void> | undefined;

export function validatePublishedCardReferences(): Promise<void> {
  cardReferenceValidation ??= validatePublishedCardReferencesOnce();
  return cardReferenceValidation;
}

async function validatePublishedCardReferencesOnce(): Promise<void> {
  const [allCards, publishedCards, publishedPosts] = await Promise.all([
    getCollection('cards'),
    getPublishedCardEntries(),
    getPublishedBlogEntries(),
  ]);

  const publishedCardIds = new Set(publishedCards.map((card) => card.id));
  const publishedPostIds = new Set(publishedPosts.map((post) => post.id));
  const errors: string[] = [];

  for (const card of allCards) {
    if (!isPublished(card.data)) continue;

    for (const relatedId of card.data.related) {
      if (!publishedCardIds.has(relatedId)) {
        errors.push(
          `cards/${card.id}: related entry "${relatedId}" must point to an existing published card.`,
        );
      }
    }

    if (card.data.source && !publishedPostIds.has(card.data.source)) {
      errors.push(
        `cards/${card.id}: source "${card.data.source}" must point to an existing published blog note.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid published content references:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }
}
