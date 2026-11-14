# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: potential collaborators and clients. They find a note through search, RSS, or a link, then decide whether Suhas's thinking is worth a conversation about a project. They may also be evaluating SuperAlign.

Other audiences (security practitioners, hiring contacts, the general public) are plausible readers but were not confirmed as audiences for this site.

## Product Purpose

Suhas Darsi's personal site. It publishes long-form notes on AI security, agent architecture, and the network dynamics behind systemic failures, plus the Toolshed security-tools research and small micro-apps.

Success: a visitor leaves with a usable model of how AI systems fail, and gets in touch to discuss a project.

## Positioning

Notes that model AI risk as a network problem: hubs, small-world structure, and how failures cascade between connected agents. (Inferred from the published note titles and topics. Confirm before it becomes a claim elsewhere.)

## Operating Context

- Notes are written in Obsidian. `src/content/` is the vault, and each note is published with a date and topics. Drafts with future dates stay unpublished.
- Readers arrive by search, the RSS feed (`/rss.xml`), the sitemap, and direct links.
- Contact runs through a visible email address (copy-to-clipboard) and a booking link on the About page.

## Capabilities and Constraints

- Static Astro site on Cloudflare: built pages in `dist/`, plus a Cloudflare Worker (`worker/`) for wallet pass and Toolshed endpoints behind Turnstile and rate limits.
- Toolshed is in alpha: it is excluded from the sitemap and search.
- Pocket Card is `noindex`.
- Undecided: whether Toolshed leaves alpha, and when.
- Undecided: whether Toolshed data is treated as final. The homepage cites 359 tools in 15 categories.

## Brand Commitments

- Name: Suhas Darsi. Role at SuperAlign: co-founder.
- Notes stay free and public, with no paywall, sign-up gate, or account wall.

## Evidence on Hand

- Six published notes in `src/content/blog/`.
- Toolshed market research in `src/content/toolshed/` and `src/content/toolshed-market/`, with 15 categories.
- Absent, and not to be invented: testimonials, customer case studies, press mentions, and benchmarks. None were found in the repository.

## Product Principles

- The mental model is the product: a reader should leave with a way to reason about AI failure.
- Notes stay free, public, and readable without signing in.
- Contacting Suhas about a project is one step from any note.
- Never invent credentials, testimonials, customers, or results.
