---
slug: "your-prompt-has-more-hops-than-your-contract"
description: "A prompt can pass through a router, a reseller and a host before it is answered. Dragos sent two million traps through that chain and saw who kept copies."
pubDate: "2026-11-25"
topics: ["AI Security"]
stage: "budding"
short: "More hops than your contract"
---

Your contract names one AI vendor. Your prompt can visit four companies before it is answered.

In July 2026, HD Moore at the security firm Dragos began sending prompts with traps inside. Each carried a fake AWS key, a web address and a hostname that had never existed anywhere else. If anything touched them later, Dragos would know. Between July and November it sent about two million. [Dragos, "Three breaches, endless leaks"](https://www.dragos.com/blog/ai-supply-chain-security-canary-tokens)

Attackers touched them.

## What Dragos found

- **Three providers were breached, and none knew.** Data from at least three AI hosting providers was exposed. In Dragos's words, "none of the three providers knew about their breach until we notified them."
- **The bait was used.** In late October, a couple hundred bait AWS keys went out, each in one request to one provider. Every request in those windows was stolen. The attacker tested the keys, listed storage buckets, searched for secrets and tried to switch on AI models. That added up to tens of thousands of AWS calls.
- **"Zero retention" did not hold.** In two of the three breaches, some of the stolen requests were marked Zero Data Retention.
- **Sellers copied prompts too.** Dragos found marketplace sellers logging prompts and reselling them.

## The hop you did not sign

Dragos traced about 2,000 routes. It found a router hop that "was discovered by tracing and was not disclosed in the marketplace." It found one seller adding about a thousand hidden tokens to every prompt.

That is the gap. You sign a contract with a vendor. Your prompt travels through a router, a reseller and a host you may never have heard of. Each hop is a hub. The chain is only as strong as the weakest one, and a promise of zero retention is only as good as the hop that breaks it. I wrote about the same shape in [[You Rated the Answer. You Sent the Conversation]], and about why shared hubs matter in [[Your AI Vendor Is Your Biggest Hub]].

On 22 November, OpenRouter, the router Dragos found in one of those routes, published its response. It said the findings "did not show any breach or unauthorized access of OpenRouter." It off-boarded three providers, removed 125 endpoints from Zero Data Retention eligibility and notified affected customers. [OpenRouter's announcement](https://openrouter.ai/blog/announcements/data-processing-incidents-on-inference-providers/)

## What is and is not known

- Dragos is a security vendor, and the findings are its own. I have not seen them independently confirmed.
- Neither page names the three breached providers. OpenRouter does not say which three it dropped. The matching number is not proof that they are the same three.
- Dragos says it is now working with about a dozen providers and expects the list to grow.

## Three questions for your team

1. **Can we name every company our most sensitive prompts pass through?** The app, the router, the reseller, the host. Not the vendor on the contract: the whole chain.
2. **What does "zero retention" rest on?** A flag in a settings page, or a test someone ran.
3. **If one hop were breached, how would we find out?** Dragos found that the providers themselves did not know.

Dragos's own advice is practical. Host it yourself if you can afford it. Go directly to a first-tier provider. Choose the providers behind any router yourself. Stay away from reseller marketplaces. And plant your own traps: if one is ever used, treat it as an incident.

A contract tells you who you pay. It does not tell you who read the prompt.
