---
title: "Shadow AI as Unauthorized Hubs"
description: "Unapproved AI tools are not just unsanctioned SaaS. They are hubs that attach to your network without appearing on the map."
pubDate: "2026-09-18"
author: "Suhas Darsi"
draft: true
topics: ["AI Security"]
---

The last few notes argued that [[ai-as-the-ultimate-hub|AI concentrates access]] and that [[the-cascade-risk-of-hub-to-hub-ai-networks|hub-to-hub links]] make failures non-linear. Shadow AI is what that looks like before anyone draws the graph.

## Off-map hubs

Shadow AI is usually described as employees using ChatGPT, a browser agent, or a local model without approval. That framing is too small. The interesting property is not the policy violation. It is the topology.

A public assistant, an IDE agent, or a personal MCP client becomes a hub the moment it can read mail, code, calendars, tickets, or files. It compresses systems that the organization still pretends are separate. It just does so on an account, a laptop, or a browser profile that never entered the asset inventory.

In [[small-world-networks-and-hubs|scale-free networks]], new nodes prefer already-useful hubs. Shadow AI is preferential attachment happening in the dark. The tools that feel most useful accumulate the most context. The organization then has a second, unofficial hub layer sitting on top of the official one.

## Why this is not shadow IT

Shadow IT was mostly another destination: a SaaS app with its own login and its own database. You could find it in SSO logs, expense reports, or DNS.

Shadow AI is a merging point. The same paste into a prompt can join source code, a customer record, and a strategy doc in one step. The same local agent can hold tokens for GitHub, Google, and Slack at once. There is often no new vendor contract to notice — only a hub that was never named.

That is why [[why-ai-security-is-fundamentally-different|traditional controls miss it]]. Network tools see HTTPS to a popular domain. Endpoint tools see a browser. DLP sees fragments, not the fact that a new hub now sits across several systems.

## Cascade without a diagram

The danger is not only leakage into a model provider. It is what the unofficial hub can reach next.

A coding agent with repo access is already a hub. Connect it to production secrets, a browser, or another agent, and you have the hub-to-hub pattern without an architecture review. A compromise, a prompt injection, or a simple mis-share then propagates along edges nobody drew.

You cannot put circuit breakers on a hub you cannot see. The monitoring and [[rethinking-ai-safety-through-network-science|intentional friction]] from the last note only work if the node is on the map.

## What to map first

Start with hubs, not with a catalog of every AI brand. Ask: which unsanctioned tools can already read or act across more than one system? Which identities and devices made them useful enough to attract more connections?

Shadow AI security is inventory work for a network that forms itself. Until those unofficial hubs are visible, every official control is defending a graph that is no longer the real one.
