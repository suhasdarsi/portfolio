---
category: 'Cloud'
summary: 'Cloud security means knowing what you run in AWS, Azure and Google Cloud, whether it’s configured safely, and what it’s doing right now.'
---

In the cloud, a single misconfigured setting such as a public bucket or an over-permissive role can expose more than any software bug. Cloud security tools focus on configuration, identity and runtime behaviour.

## How it breaks down

- **Cloud platforms (CNAPP)** combine posture checks, workload scanning, identity analysis and runtime detection, and show how one issue connects to another, for example an exposed VM with a vulnerable package and an admin role.
- **Provider-native tools** are each cloud’s own security services. They are a sensible first layer, but each one sees only its own cloud.
- **Posture checks and inventory** are open-source tools that list resources and compare them with benchmarks like CIS. They are good for audits and small estates.
- **Infrastructure as code and policy** catches problems in Terraform and Kubernetes files before deployment, and enforces rules such as “no public buckets” at admission.
- **Containers and Kubernetes** tools scan images and clusters, and watch container behaviour at runtime.

## Where to start

Turn on your provider’s native services and run an open-source posture check to see where you stand. Add IaC scanning in CI so new problems stop arriving. A CNAPP earns its cost once you run several accounts or clouds.
