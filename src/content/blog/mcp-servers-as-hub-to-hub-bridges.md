---
title: "MCP Servers Are Hub-to-Hub Bridges"
description: "The Model Context Protocol is how agents grow edges. Each server is a bridge between hubs that used to be separate."
pubDate: "2026-09-25"
author: "Suhas Darsi"
draft: true
topics: ["AI Security"]
---

If [[ai-as-the-ultimate-hub|AI is a hub]], then MCP servers are the bridges that let those hubs attach to tools, files, and other agents without a custom integration for each one. That is the point of the protocol. It is also the security problem.

## Edges as a product

MCP makes tool access look like a list of servers a client can connect to. From a network-science view, each server is an edge factory. A single agent process can acquire filesystem, browser, database, and SaaS capabilities in an afternoon.

This is [[the-cascade-risk-of-hub-to-hub-ai-networks|hub-to-hub wiring]] with a friendly name. The agent is already a concentration of context. The MCP server is how that concentration reaches another concentration — a privileged app, a production API, another agent's runtime.

We used to rely on the friction of different protocols to contain failure. MCP's job is to remove that friction.

## Shared bridges, shared fate

In a [[small-world-networks-and-hubs|small-world network]], a few well-placed shortcuts collapse distance. Popular MCP servers become those shortcuts. Teams reuse the same filesystem server, the same GitHub server, the same browser server. Preferential attachment again: the useful bridges get more clients.

That reuse is efficient. It is also correlated risk. A malicious or compromised server is not a single-app bug. It is a cut through every agent that trusted the same bridge. Hijacking a browser MCP server, over-scoping a filesystem server, or pointing a client at an unreviewed community server are all attacks on the edge set, not on one chatbot.

## Permissions without a topology view

Most MCP installs are still an allow-list of servers, not a map of what those servers connect. The question worth asking is not "is this server approved?" It is "which hubs does this server join, and what can fail across that join?"

A read-only docs server and a server that can execute in a browser are both "MCP." Only one of them creates a high-degree bridge into the rest of the user's digital life. Treating them as the same object is how [[why-ai-security-is-fundamentally-different|isolation assumptions]] sneak back in.

## Friction at the bridge

[[rethinking-ai-safety-through-network-science|Resilience]] here is mostly about the edge. Scope each server to the smallest hub it needs to touch. Prefer short-lived credentials over ambient tokens. Require a human checkpoint before a new server becomes a shortcut used by every agent on a machine.

MCP will keep growing because the integration value is real. The work is to treat servers as topology — bridges between hubs — rather than as plugins on a feature list.
