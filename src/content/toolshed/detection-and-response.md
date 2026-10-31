---
category: 'Detection & response'
summary: 'Detection and response is the security operations stack: collecting signals, spotting attacks, and acting on them quickly.'
---

Prevention will fail eventually. Detection and response tools make sure you notice when it does and can act before the damage spreads.

## How it breaks down

- **SIEM and security data** collect logs from every system, make them searchable, and run detection rules over them. Data pipelines sit in front to filter and route logs before they get expensive.
- **Automation (SOAR)** turns response steps into workflows: enrich the alert, check the user, isolate the machine, open the ticket.
- **AI SOC** tools use AI agents to investigate alerts end to end and hand an analyst a conclusion rather than raw data.
- **Managed detection (MDR)** is a service. An outside team watches your tools around the clock and responds for you.
- **Network detection (NDR)** watches traffic inside the network for attackers moving between systems.
- **Detection rules and forensics** are the shared formats (Sigma, YARA) and incident tools that sit under all of the above.

## Where to start

Small teams usually get more from MDR on top of good EDR than from running their own SIEM. Build an in-house SIEM and automation once you have people to write detections and handle the alerts.
