---
category: 'AI security'
summary: 'AI security depends on what kind of agent you are securing. Who built it and who runs it decide where it can be seen and controlled.'
---

“AI security” gets used as if it were one thing. It isn’t. The agents in a company fall into four groups, depending on who built them and who runs them, and each group is seen and controlled from a different place.

## The four kinds of agent

- **SaaS agents** are built and run by a vendor: ChatGPT, Claude.ai, Gemini, Notion AI and the copilots inside other SaaS apps. You never touch their code or infrastructure. You control them through identity (who can sign in), the vendor’s own settings, and the browser and network traffic people use to reach them.
- **Local agents** are built by a vendor but run on your machines: Claude Code, Codex CLI, Cursor. They start local MCP servers, load skills and extensions, and call models directly, so a network gateway often sees none of it. You control them on the endpoint, in their runtime, and through the identities and keys they use.
- **Agents on AI platforms** are built by your team on a vendor’s platform: Agentforce, Copilot Studio, ServiceNow, Bedrock. Their risk lives in the platform: what data they can read, which actions they can take, and who can build and publish them. You control them through platform settings, identity and the API gateway.
- **Custom agents** are built and run by your team, on frameworks like LangGraph, CrewAI and AutoGen, or as internal copilots. Nobody else secures any layer for you, so you need your own controls across the whole stack: guardrails at runtime, testing before release, and checks on the models you load.

## The capabilities

Tools are tagged with the kinds of agent they cover and with what they do:

- **Discovery and posture** finds which agents, models, MCP servers and extensions exist, and how risky they are.
- **Data controls** stop sensitive data from reaching AI tools.
- **Gateways** route AI traffic through one checkpoint, when the traffic can be routed.
- **Runtime protection** inspects prompts, responses and agent actions as they happen, and allows, warns or blocks them. It applies both to agents people use and to apps you build.
- **Red teaming and evaluation** and **model security** protect the agents and applications you build yourself.

Most tools cover one or two kinds of agent. Few cover all four.

## Where to start

Start with an inventory: which of the four kinds of agent you already have, and where they run. Then pick controls for each one. A gateway can’t see a local agent, and an endpoint tool can’t see inside Agentforce.
