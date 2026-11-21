---
slug: "cybersecurity-built-for-human-speed"
description: "AI-driven attacks move in minutes while security still runs on human approvals. Here is what has to change, and what boards should ask their teams."
pubDate: "2026-11-21"
topics: ["AI Security"]
stage: "budding"
---

In 2018, an intruder took one hour and 58 minutes to move from the first system to the next, by CrowdStrike's measure. For 2025 the average was 29 minutes, which CrowdStrike called "a 65% increase in speed from 2024". The fastest it saw was 27 seconds. In one intrusion, data theft began within four minutes of getting in.[^1][^2]

Now put that next to a response clock. A VentureBeat investigation cites a case with 19 minutes to detect, 19 hours to the first response, and nine more hours to contain.[^2] That figure is secondhand and I cannot check the case. But the shape is the point: **detection was fast. The decision was slow.**

The attacker's clock runs in minutes. The approval queue runs in hours. This post is about that gap.

![Two bars on the same scale: 29 minutes for the average attacker breakout, 19 hours for one reported first response.](illustrations/two-clocks.svg)

## Where the hours go

Picture the loop. An alert fires. It waits in a queue. An analyst opens it, checks it, and asks a manager. The manager approves a response. Then a machine carries it out.

![An alert reaches the queue in seconds, then waits at the queue, the analyst and the approval step before the action runs.](illustrations/approval-loop.svg)

Each step is sensible. A queue stops mistakes. An approval stops an analyst from taking a payroll system offline by accident. A ticket leaves a record. But every step assumes a person sets the pace, and the steps add up to hours.

A reported incident from this week has the same shape. A former NSA hacker told CNN that a swarm of AI agents got past a company's two-factor login, stole data and encrypted its systems in about 14 minutes. The company noticed about four and a half hours later.[^3][^4] The company is unnamed, the account is unverified, and the 14 minutes is the responder's own figure. Treat it as an illustration, not a finding.

## What the evidence shows, and what it does not

- **The speed figures are the vendor's.** The 29-minute average and the 27-second fastest come from CrowdStrike's own report. CrowdStrike sells security products.[^1]
- **Humans are still steering.** Palo Alto Networks' Unit 42 investigated a ransomware intrusion where AI agents carried the attacker through a network in under 10 hours. It estimated human operators would have needed about two weeks.
- The way in was a public-facing API endpoint. A Greyhound Research analyst quoted by CSO Online called it "a human-directed intrusion in which AI orchestrated delegated tactical work". It was not a fully autonomous attack.[^5]
- **Nobody agrees on the clock.** VentureBeat reports that CrowdStrike is moving away from breakout time, the metric it introduced in 2018, and has not settled on a replacement. Proposals include time-to-respond by stage, "damage-to-discovery" time, and how fast a company can shut off its own agents.[^2]
- **Much of the "machine speed" argument comes from vendors.** Rackspace, SentinelOne and Booz Allen all argue for rebuilding security operations, and all sell into this market.[^6][^7][^8] That does not make them wrong. It is a reason to read their numbers with care.

## Faster alerts still land on a person

The usual answer is more detection, more analysts, more automation in the queue. A faster alert still waits for the same approval.

Booz Allen's sponsored piece puts it this way: "adding more tools, analysts, and capacity isn't enough. The constraint is architecture." It is paid content from a vendor, but the point stands on its own. The slowest part of the system is the approval step, so that is where the design has to change.[^7]

## What a machine-speed design needs

You do not have to rebuild every tool. Detection still works. What changes is who decides, and when.

1. **Decide in advance what happens without a person.** Locking an account, ending a session, isolating a machine. Write each down as a pre-approved action with limits, so minute one does not wait for a ticket.
2. **Keep humans for the few risky calls.** Those should reach a person fast, with enough context to decide.
3. **Shrink what one account or agent can reach.** If one valid credential touches everything, speed multiplies the damage. A limit set ahead of time works at any speed.
4. **Keep a record you can replay.** Fast action needs a trail that shows what happened and why.
5. **Measure the new clocks.** Time from first sign to first action. Time to shut off one agent or one account. VentureBeat's survey of 89 organisations running or piloting agents is small, and it did not test whether per-agent identity speeds up revocation. Use it as a prompt to measure your own numbers, not as a benchmark.[^2]

## One more place the clock matters: the AI you run

Companies also run AI agents of their own. They read files, load skills, connect to MCP servers and act with a user's authority. That is more access that can move at machine speed.

CrowdStrike's report says adversaries injected malicious prompts into generative AI tools at more than 90 organisations to generate commands for stealing credentials.[^1] That is an attack on AI a company already runs. It is worth asking who knows what is running.

## Three questions for the board

1. **How long from the first sign of an intrusion to our first action?** The measured answer from the last exercise, not the policy answer.
2. **What happens automatically in the first ten minutes?** If every step waits for a person, the attacker keeps the head start.
3. **How many AI agents and tools run in our company, and what can each one reach?** If nobody can answer, that is the first gap.

## Where to start

Measure your own gap first: the time from detection to action, and what runs without a person.

A note from me: this is the problem we work on at [SuperAlign](https://superalign.ai), where I am co-founder, mainly finding the AI agents, MCP servers and extensions running on company devices and what each can reach. If that is on your list, I am happy to talk: contact@superalign.ai.

---

## References

[^1]: CrowdStrike, "2026 CrowdStrike Global Threat Report: AI Accelerates Adversaries and Reshapes the Attack Surface", press release, 24 February 2026. https://www.crowdstrike.com/en-us/press-releases/2026-crowdstrike-global-threat-report/ (29-minute 2025 average eCrime breakout time, "65% increase in speed from 2024", 27-second fastest, exfiltration within four minutes in one intrusion, malicious prompts injected into GenAI tools at more than 90 organisations). Vendor source.
[^2]: Louis Columbus, VentureBeat, "AI agents are stealing credentials in minutes, and security's old response targets can't keep up", 12 November 2026. https://venturebeat.com/security/ai-agents-are-making-securitys-breakout-time-metric-obsolete-and-no-one-agrees-on-what-replaces-it (1 hour 58 minutes in the 2018 report; 19 minutes to detect, 19 hours to first response, nine more to contain; CrowdStrike moving away from breakout time; survey of 89 organisations). Secondhand for the 2018 and 19-hour figures.
[^3]: IBTimes UK, "Living on Borrowed Time: Cybersecurity Journalist Warns After AI Agents Breach Company Systems in 14 Minutes", 20 November 2026. https://www.ibtimes.co.uk/ai-attack-bypassed-two-factor-authentication-14-minutes-1833605 (states the account has not been independently verified).
[^4]: The420.in, "Ex-NSA Hacker Reveals How AI Agents Breached Security in Just 14 Minutes", 20 November 2026. https://the420.in/ai-agents-ransomware-attack-david-kennedy/
[^5]: Prasanth Aby Thomas, CSO Online, "AI agents help compress ransomware intrusion to under 10 hours, raising stakes for CISOs", 3 September 2026, reporting Palo Alto Networks Unit 42 research. https://www.csoonline.com/article/4217976/ai-agents-help-compress-ransomware-intrusion-to-under-10-hours-raising-stakes-for-cisos.html
[^6]: Rackspace, "Defending at Machine Speed: Rethinking Security Operations in the AI Era". https://www.rackspace.com/blog/rethinking-security-operations-ai-era . Vendor source.
[^7]: Brad Medairy, Booz Allen, "When cyber moves at AI speed, the model has to change", TechCrunch sponsored content (paid; TechCrunch editorial not involved). https://techcrunch.com/sponsor/booz-allen/when-cyber-moves-at-ai-speed-the-model-has-to-change/ . Vendor source.
[^8]: SentinelOne, "Automation at Machine Speed: Rethinking Execution in Modern Cybersecurity". https://sentinelone.com/blog/automation-at-machine-speed-rethinking-execution-in-modern-cybersecurity . Vendor source; read only as a search summary.
