// The site's type system, written as roles. Every piece of visible text on every page must be set as one of these;
// fonts.spec.ts checks that on desktop and on a phone. To change how the site's type works, change it here and in the
// stylesheet together. Drawings of other things (app thumbnails, the Wallet card preview) carry `data-type-drawing`
// and are not checked.
import type { TextStyle } from './type-audit';

export interface Role {
  name: string;
  /** Where the role is used, for the failure message. */
  use: string;
  families: string[];
  /** Sizes in px on screens 760px and wider, and on narrower ones. */
  desktop: number[];
  phone: number[];
  weights: number[];
  /** Line height as a multiple of the size. */
  leading: number[];
  /** Letter spacing in em. */
  tracking: number[];
  upper?: boolean;
}

const SANS = ['Geist'];
const SERIF = ['Geist Serif', 'Geist Serif Text'];

export const roles: Role[] = [
  { name: 'Interface text', use: 'navigation, descriptions, dates, buttons, lists, table text', families: SANS, desktop: [15], phone: [15], weights: [400, 500, 600], leading: [1.5, 1.6], tracking: [0] },
  { name: 'Label', use: 'small capital labels', families: SANS, desktop: [15], phone: [15], weights: [400, 500, 600], leading: [1.5, 1.6], tracking: [0.06], upper: true },
  { name: 'Reading text', use: 'note text and the About bio', families: SERIF, desktop: [22], phone: [18], weights: [400], leading: [1.6], tracking: [0] },
  { name: 'Intro', use: 'the paragraph under a page title (28px on the home page)', families: SERIF, desktop: [22, 28], phone: [18, 22], weights: [400], leading: [1.45], tracking: [0] },
  { name: 'Heading', use: 'card titles and section headings', families: SERIF, desktop: [22], phone: [22], weights: [400], leading: [1.3], tracking: [0] },
  { name: 'Note section heading', use: 'h2 inside a note', families: SERIF, desktop: [28], phone: [22], weights: [400], leading: [1.25], tracking: [-0.01] },
  { name: 'Page title', use: 'h1 on every page, the home headline and the home section title', families: SERIF, desktop: [44, 80], phone: [28, 44], weights: [400], leading: [1.1], tracking: [-0.02] },
  { name: 'Bold in reading text', use: 'bold runs and h3 inside a note (the serif has no bold)', families: SANS, desktop: [22], phone: [18], weights: [600], leading: [1.3, 1.6], tracking: [-0.01] },
];

const near = (value: number, allowed: number[], slack: number) => allowed.some((a) => Math.abs(a - value) <= slack);

/** What is wrong with this text for a given role; empty when it fits. */
function problems(text: TextStyle, role: Role, phone: boolean): string[] {
  const sizes = phone ? role.phone : role.desktop;
  const wrong: string[] = [];
  if (!role.families.includes(text.family)) wrong.push(`typeface ${text.family} (expected ${role.families[0]})`);
  if (!sizes.includes(text.size)) wrong.push(`size ${text.size}px (expected ${sizes.join(' or ')}px)`);
  if (!role.weights.includes(text.weight)) wrong.push(`weight ${text.weight} (expected ${role.weights.join(', ')})`);
  if (!near(text.leading, role.leading, 0.011)) wrong.push(`line height ${text.leading || 'browser default'} (expected ${role.leading.join(' or ')})`);
  if (!near(text.tracking, role.tracking, 0.002)) wrong.push(`letter spacing ${text.tracking}em (expected ${role.tracking.join(' or ')}em)`);
  if (text.upper !== Boolean(role.upper)) wrong.push(text.upper ? 'capitals (not expected)' : 'not in capitals');
  return wrong;
}

/** Undefined when the text fits a role; otherwise the nearest role and what differs from it. */
export function check(text: TextStyle, phone: boolean): { role: Role; wrong: string[] } | undefined {
  if (text.code) return undefined; // code keeps the browser's monospace face
  let best: { role: Role; wrong: string[] } | undefined;
  for (const role of roles) {
    const wrong = problems(text, role, phone);
    if (!wrong.length) return undefined;
    if (!best || wrong.length < best.wrong.length) best = { role, wrong };
  }
  return best;
}
