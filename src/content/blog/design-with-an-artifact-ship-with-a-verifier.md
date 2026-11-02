---
title: "Design With an Artifact, Ship With a Verifier"
description: "I redesigned this site with AI agents. The design artifact set the target. Verifiers made the result reliable, and they are the part I'd build first next time."
pubDate: "2026-11-03"
author: "Suhas Darsi"
topics: ["Building with AI"]
---

I redesigned this site this week, and I barely wrote any of the code. I described what I wanted, Claude built a design, agents implemented it, and the new pages went live after one long session. The interesting part wasn't how fast the code appeared. It was how much of the session went into answering a simpler question: is it actually right?

## Starting from an artifact

I didn't start in Figma or in the codebase. I started by having Claude crawl the live site and map every route to the screen it renders and the file that builds it. Then it built a design canvas as an artifact: one artboard for each page template, linked together so I could click through the whole site before any of it existed.

That artifact did two jobs. It was a spec I could see instead of a document I had to imagine. And it was something I could argue with. I left comments on the exact element I didn't like ("this font size is not right and spacing is wrong as well"), and the next version came back changed in that spot. A personal site is mostly taste, and taste is much easier to express by pointing than by writing requirements.

## Where "done" broke down

The problems started when I asked for rules instead of looks. I asked for at most three font sizes across every page. The answer came back: done, only 13, 16 and 28 pixels. I could still see more.

Both were true. The source only declared three sizes, but the rendered page inherited others: a browser default on buttons, a 14px body from the page wrapper. Later, a cleanup script rounded anything over 17.5px up to 28px, so the description under each note's title became exactly as large as the title. Every check that ran against the source passed. The page was still wrong.

That's the pattern I kept running into. An agent says it finished, the claim is reasonable, and the result is off in a way only something looking at the output would notice.

## The verifiers I ended up with

By the end there were four layers, each catching what the others missed.

- **A rules verifier.** A Jest suite that reads every page and fails if any font size isn't 13, 16 or 28px, if any font is something other than Geist or Geist Serif, or if any padding, margin or gap is off a fixed spacing scale. It runs 78 checks in about a second.
- **A design reviewer.** A separate agent with no stake in the code, asked to review it the way a designer reads CSS. It found the oversized descriptions, labels clipped inside small thumbnails, and a grey used for most small text that failed WCAG contrast at 4.17:1.
- **A pixel diff.** Each artboard and its real page are rendered side by side at 1440px and compared.
- **The existing test suite.** 115 unit tests and 76 browser tests on desktop and phone, updated to describe the new design. They caught two real bugs the redesign had introduced: search arrow keys starting from a stale result, and the Toolshed navigation running off the screen on phones.

```mermaid Every change goes back through the verifiers until they pass. A human looks last.
flowchart LR
  accTitle: From design artifact to verified page
  accDescr: The design artifact sets the target. Agents implement it and the verifiers check it. A failure goes back to a fix and the work is checked again. Work that passes goes to a human review.
  A((Design artifact)):::hub --> B[Implement] --> C{Verifiers}
  C -- Fail --> D[Fix]:::alert --> B
  C -- Pass --> E[Human review]
```

## Verify the verifier

The pixel diff taught me the most, mostly by being wrong at first.

The obvious measure is the share of pixels that differ. Before any porting, with the old site and the new design looking nothing alike, it reported about 2% for most pages. Both pages are mostly empty background, and empty background matches. A 5% target would have passed a page that hadn't been touched.

So the diff got a second measure: of all the dark pixels that make up text, lines and icons, how many have no matching pixel within one pixel on the other page. That one read 95 to 99% before the port and below 3% after. Every page now passes both, with the worst at 0.23% and 2.8%.

The lesson is uncomfortable. A verifier you haven't tested against a known-bad case is a guess that happens to print a number.

## What they still missed

Then I clicked from the home page to Notes, and the navigation jumped.

The search button only existed on the home page, so on every other page the links slid right to fill the gap. The note pages also used a wider column, so the whole header moved. Every page matched its own design almost exactly. Nothing compared one page with the next, and that's precisely where the problem was. The fix took minutes once it was visible. Finding it took a person.

Verifiers check what you thought to ask. They don't replace looking; they make sure you only spend your looking on the things nothing else can catch.

## Why verifiers are the next step

Building with agents has moved the bottleneck. Generating code is no longer the slow part. In this migration four agents ported different pages at the same time. What I couldn't do was review nineteen pages by eye after every change. Without verifiers, I either slow everything down to my reading speed or trust reports I can't check.

A verifier changes that in four ways.

- **It turns taste into a target.** "Make it match the design" becomes "both numbers under 5%", which an agent can work toward and stop at.
- **It makes parallel work safe.** Each agent had its own pages and its own diff. When one reported 0.00%, I could rerun the same check myself instead of taking its word for it.
- **It's a second opinion without the same blind spots.** An agent that wrote a page is the worst judge of it. A rule, a screenshot comparison or an independent reviewer doesn't share its assumptions.
- **It keeps the work honest over time.** The checks stay in the repository, so the next change to this site is held to the same standard without anyone remembering to look.

This is the same idea as the [[rethinking-ai-safety-through-network-science|checkpoints between AI hubs]] I've written about before: intentional friction placed where mistakes would otherwise pass straight through. Here the stakes are a misplaced nav link, not a cascading failure, but the shape is the same.

The artifact told the agents where to go. The verifiers told them, and me, when they'd actually arrived. Next time I'll write the verifiers before the first line of the port, not after the first round of "done".
