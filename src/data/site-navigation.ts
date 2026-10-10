// Micro-app marks drawn by src/components/AppMark.astro.
export type AppMarkName = 'pocket' | 'swatchbook';

// The one action the homepage leads with.
export const primaryCta = {
  label: 'Say hello',
  href: 'https://booking.akiflow.com/suhas--a84d',
};

// Add new homepage destinations here, grouped by what visitors want to do.
export const homeLinkGroups = [
  {
    label: 'On this site',
    links: [
      { label: 'About', href: '/about', meta: 'Background and current work' },
      { label: 'Notes', href: '/notes', meta: 'Essays on AI security' },
      { label: 'Uses', href: '/uses', meta: 'Tools and gear' },
    ],
  },
  {
    label: 'Micro-apps',
    description: 'Small, standalone tools I’m building.',
    links: [
      { label: 'Pocket Card', href: '/pocket-card', meta: 'Business card for Apple Wallet', mark: 'pocket' as AppMarkName },
      { label: 'Swatchbook', href: '/swatchbook', meta: 'Directory of design systems', mark: 'swatchbook' as AppMarkName },
    ],
  },
];
