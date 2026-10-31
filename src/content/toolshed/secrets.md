---
category: 'Secrets'
summary: 'Secrets are the API keys, passwords and certificates your systems use. Keep them out of code, and give them to apps only when they’re needed.'
---

A leaked API key is often all an attacker needs, and keys leak all the time: in commits, logs, tickets, chat and, now, prompts to AI tools.

## How it breaks down

- **Secrets managers** store secrets centrally, control who can read them, and hand them to apps at runtime. Ideally they issue short-lived credentials that expire on their own.
- **Secret scanning** finds keys that have already leaked into code, history, tickets and chat, so you can rotate them.
- **Encrypted config and Kubernetes** tools keep secrets encrypted in Git and sync them safely into clusters.

## Where to start

Run a secret scanner over your repositories and their history today. It almost always finds something. Then move those secrets into a manager, so the fix doesn’t leak again.
