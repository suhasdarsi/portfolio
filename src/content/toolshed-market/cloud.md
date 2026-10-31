---
category: 'Cloud'
summary: 'Cloud security has consolidated into a handful of CNAPP platforms, with the cloud providers’ own tools as a cheaper first layer and strong open-source tools underneath.'
asOf: '2026-10-31'
---

## How the market is shaped

- **CNAPP platforms** (Wiz, Orca, Cortex Cloud, Sysdig, Aqua, Upwind, Tenable) combine posture management, workload scanning, identity analysis and runtime detection. Most started from one of these and grew into the rest.
- **Cloud providers** sell their own security services. They are inexpensive and well integrated, but each one covers only its own cloud.
- **Open source** (Prowler, Trivy, Falco, Checkov, Kubescape, Steampipe) is mature, and is often what the commercial products build on.

## Where the overlap is

Nearly every CNAPP now covers posture, containers and infrastructure as code. The main differences are agentless scanning versus runtime agents, and how well each product connects issues into attack paths. Cloud tools are also spreading into AppSec (scanning code before it deploys), data security (finding sensitive data in buckets) and AI security (finding AI models and services in use).

## Consolidation

Google completed its $32 billion purchase of Wiz in March 2026; Wiz keeps its brand and still covers other clouds. Palo Alto Networks merged Prisma Cloud into Cortex Cloud. Fortinet bought Lacework.

## How to buy

Turn on your provider’s native tools and run Prowler first. That shows the size of the problem for free. When you evaluate a CNAPP, test it on your own accounts and judge whether it prioritises well, not how many findings it produces.
