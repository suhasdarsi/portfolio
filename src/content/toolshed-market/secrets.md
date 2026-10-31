---
category: 'Secrets'
summary: 'Secrets management is splitting between the cloud providers’ built-in vaults and developer-friendly platforms, while secret scanning grows into non-human identity security.'
asOf: '2026-10-31'
---

## How the market is shaped

- **HashiCorp Vault** (now part of IBM) is the long-standing standard. OpenBao is its community fork, created after HashiCorp changed Vault’s licence.
- **Cloud provider vaults** (AWS Secrets Manager, Azure Key Vault, Google Secret Manager) are the default for teams on a single cloud.
- **Developer-first platforms** (Doppler, Infisical, Phase, Akeyless) focus on simple setup and syncing across environments.
- **Secret scanners** (GitGuardian, TruffleHog, Gitleaks) find secrets that have already leaked.

## Where the overlap is

Secret managers are adding scanning, and scanners are adding management and rotation. Both are moving into non-human identity security, because a leaked secret is really a compromised machine identity. AI agents raise the stakes: they need credentials to act, and secrets leak into prompts and agent logs.

## Consolidation

IBM bought HashiCorp. SailPoint bought Entro, a non-human identity startup that grew out of secrets security. Identity vendors and secrets vendors are moving toward each other.

## How to buy

Scan your repositories and their history before buying anything. Then pick a manager that fits how you deploy. Prefer short-lived, automatically rotated credentials over static ones wherever the tools support it.
