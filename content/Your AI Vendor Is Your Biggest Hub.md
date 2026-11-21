---
slug: "your-ai-vendor-is-your-biggest-hub"
description: "Regulators now treat dependence on a few AI and cloud providers as a systemic risk. The board question: what do you share with everyone, and what if it breaks?"
pubDate: "2026-11-20"
topics: ["AI Security"]
stage: "budding"
short: "Your AI vendor is a hub"
---

Most boards ask one question about AI risk: *is our AI secure?* Between May and September 2026, the institutions that watch the stability of the financial system started asking a different one: *what does everyone share, and what happens to all of us when it fails?*

That is a network question. It is the one I have been writing about, and regulators are now asking it in public.

## What regulators said

The Cloud Security Alliance's [September 2026 research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-concentration-systemic-risk-20260927-cs/) collects five warnings from five institutions in five months:

- **IMF, 7 May.** A blog post warned that AI-enabled cyberattacks could strain funding and disrupt markets. It named concentration in a small number of software platforms, cloud providers or AI models as the mechanism that turns one exploited weakness into a system-wide failure.
- **European Systemic Risk Board, 25 June and 7 July.** It raised its systemic cyber risk assessment from "elevated" to "severe" and published a [report on frontier AI models with cyber capabilities](https://www.esrb.europa.eu/pub/pdf/reports/esrb.report202607_AImodelscybercapabilites.en.pdf). The ESRB also noted that leading AI providers sit outside the EU, which adds strategic dependency to the risk.
- **ECB and the European supervisory authorities, 7 and 31 July.** The ECB told the CEOs of all significant banks it supervises to submit action plans on frontier AI cyber risk by 31 October. The three European supervisory authorities endorsed the ESRB's warning.
- **Financial Stability Board, August.** Its chair, Andrew Bailey, wrote to G20 finance ministers that frontier AI could "undermine market confidence system-wide, especially due to highly concentrated third-party service providers." He also flagged circular investment between AI developers and the cloud providers that host them.
- **Moody's, August.** It warned that most banks now depend on a narrow set of foundation-model and cloud providers, and that an outage at one could spread quickly across customers and sectors.

I took these from the CSA's summary. I have not yet checked each primary document. Check the originals before you quote the wording.

## Why this is a hub problem

In [[Small World Networks and the Power of Hubs]] I described how real networks grow: new nodes attach to nodes that are already well connected. Enterprise AI followed the same rule. Companies picked the model and the cloud that everyone else was picking, because they were the best and the safest-looking choice.

The result, in the CSA's words, is a small number of foundation-model providers and hyperscale cloud platforms underneath a large share of enterprise and financial-sector AI. Each choice made sense on its own. Together they built a hub.

Hubs are efficient. They are also where [[The Cascade Risk of Hub-to-Hub AI Networks]] begins. If your supplier, your competitor and your bank all depend on the same hub, a failure at that hub is not your incident. It is everyone's incident, at the same moment and no one has spare capacity to help anyone else.

```mermaid Illustration: when many companies depend on the same hub, one failure reaches all of them at once.
flowchart LR
  accTitle: One hub, many companies
  accDescr: A shared AI and cloud provider sits in the middle, linked to your company, your bank, your supplier, your competitor and your customer. A failure at the provider reaches all five at once.
  H((Shared AI and cloud provider)):::hub --> a[Your company] & b[Your bank] & c[Your supplier] & d[Your competitor] & e[Your customer]
```

## Three ways the hub fails you

The CSA separates the warnings into three channels. They are useful because each one asks the board a different question.

1. **Cyber.** Frontier models make finding and exploiting weaknesses faster and cheaper. Concentration means a weakness found against one setup may work against many similar ones. *Question: if an attacker weaponises a flaw in a shared model, how many of our suppliers are exposed along with us?*
2. **Operational dependency.** Retries and caching built into your own systems cannot replace a provider that is down or compromised. *Question: which business functions stop if one provider stops, and what do we do for the first 48 hours?*
3. **Financial.** Several leading providers are loss-making and funded through arrangements among a small set of chipmakers, cloud providers and investors. A provider in trouble could raise prices or restructure without any cyberattack at all. *Question: have we priced in a vendor that changes terms, or fails?*

## What I would put in front of the board

I would not start with a security audit. I would start with a map.

- **List every business function that depends on an AI model or AI platform**, and name the provider and the cloud underneath each one. Most companies discover the same two or three names repeating.
- **Mark where the same name appears twice**, for example your own use and your critical suppliers' use. That overlap is your hidden hub.
- **Decide what you will do when a hub fails**, per function: switch, degrade, or stop. Write it down before the incident.
- **Ask your top suppliers the same question.** Your resilience is partly theirs.

None of this means abandoning the best providers. Hubs exist because they are good. It means knowing where you are exposed so a failure is a plan and not a surprise.

## Finding your own hubs without a spreadsheet

The map above is hard to build by hand. AI arrives through a browser extension here, a coding assistant there, an agent someone connected to a company system last month. Nobody has the full list.

This is the problem we built [SuperAlign](https://superalign.ai) for, and I am its co-founder. Its first step is asset security: it discovers the AI running across your endpoints, SaaS tools and AI platforms. That means agents, skills, MCP servers, browser and IDE extensions, and models. Each asset is mapped to the device it runs on and scored by what it can reach, and you get an AI usage view of what is really in use and where the spend goes. The result is a factual starting point for the dependency map, with the models and platforms your people actually rely on, found without a survey. It works alongside your existing endpoint and access tools. It does not cover fully custom in-house agents.

The usual first step is a two-week discovery scan on a pilot group, then a review of the findings together. Contact: contact@superalign.ai.

## The short version

Concentration is what makes AI cheap, fast and capable. It is also what makes its failures shared. The regulators have now said so. The leadership question is no longer only "is our AI secure?" It is "what do we share with everyone else, and what happens to us when it breaks?"
