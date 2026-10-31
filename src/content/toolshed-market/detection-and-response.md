---
category: 'Detection & response'
summary: 'The SIEM is being rebuilt around cheaper data storage and AI analysts, while managed services take on the work small teams can’t.'
asOf: '2026-10-31'
---

## How the market is shaped

- **Big SIEM platforms** (Splunk, Microsoft Sentinel, Google SecOps, Cortex XSIAM, Elastic) are where most large teams run detection. They compete on cost per gigabyte as much as on features.
- **Newer SIEMs and data pipelines** (Panther, Cribl, Anvilogic) separate data storage from analysis to cut costs.
- **Automation and AI SOC tools** (Tines, Torq, Tracecat, 7AI, Dropzone AI, Prophet Security) handle triage and investigation that analysts used to do by hand.
- **MDR providers** (Arctic Wolf, Expel, Huntress, Zscaler MDR) sell the whole job as a service.
- **Open source** (Wazuh, Security Onion, Zeek, Suricata, Sigma, Velociraptor) runs a surprising share of the world’s detection.

## Where the overlap is

SOAR is now built into every major SIEM, and AI agents are replacing much of what playbooks did. EDR vendors offer their own SIEMs, and SIEM vendors offer their own endpoint agents. MDR providers increasingly run on the customer’s existing tools rather than bringing their own.

## Consolidation

Cisco bought Splunk. Palo Alto Networks bought IBM’s QRadar SaaS business and moved its customers onto Cortex XSIAM. Zscaler bought Red Canary for MDR. Sophos bought Secureworks.

## How to buy

Be honest about who will do the work. Without people to write detections and handle alerts, MDR on top of good EDR beats a SIEM nobody watches. If you do run a SIEM, model data costs at your real log volume before signing.
