---
category: 'AI security'
summary: 'A young market that is consolidating fast. Startups built one layer each, and the big security platforms are buying them to offer all the layers at once.'
asOf: '2026-10-31'
---

## How the market is shaped

AI security started as a wave of startups, each built around one layer: a prompt-injection filter, a red-teaming tool, a model scanner, a browser extension. Within two years the big security platforms decided they needed all of these layers, and most of them bought their way in.

The market now has three groups:

- **Platform vendors** (Palo Alto Networks, Cisco, Check Point, F5, SentinelOne, CrowdStrike, Zscaler, Cato) sell AI security as part of a broader suite, often built on an acquisition.
- **Independent specialists** go deep on one or two kinds of agent (SaaS, local, AI platform or custom) or on one capability, such as MCP gateways or red teaming.
- **Open source** covers testing (garak, PyRIT, Promptfoo) and guardrails (NeMo Guardrails, LLM Guard) well, and is where many teams start.

## Where the overlap is

Two pairs of kinds blur the most:

- **Runtime protection and red teaming.** Most runtime protection vendors now sell testing too, because the same detection models power both.
- **Gateways and browser or endpoint tools.** Each is moving toward the others. Gateway vendors add browser extensions, and browser vendors add MCP gateways.

**Agents on AI platforms** (Agentforce, Copilot Studio, Bedrock) and **local agents** (Claude Code, Codex, Cursor, local MCP servers) remain more distinct, because they need deep integrations that a network gateway can’t provide. Most of the market’s tools still focus on **custom agents**, the ones companies build themselves.

## Consolidation

Recent deals include Palo Alto Networks buying Protect AI (now part of Prisma AIRS), Check Point buying Lakera, SentinelOne buying Prompt Security, F5 buying CalypsoAI, Snyk buying Invariant Labs, and Cato Networks buying Aim Security. Cisco built AI Defense on its earlier purchase of Robust Intelligence. Expect more of these deals, and expect product names to keep changing.

## How to buy

Start from the kinds of agent you actually have, not from the vendor’s category name. Ask each vendor three questions:

1. Which of the four kinds of agent (SaaS, local, AI platform, custom) do you cover natively?
2. What do you see when traffic doesn’t pass through your gateway?
3. Can you enforce (allow, warn, block), or only observe?

A platform suite is convenient if you already run that vendor’s stack. A specialist usually goes deeper in its own area.
