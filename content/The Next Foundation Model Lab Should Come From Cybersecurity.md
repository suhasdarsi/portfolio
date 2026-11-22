---
slug: "next-foundation-model-lab-should-come-from-cybersecurity"
description: "In July the models that broke in had their refusals turned down, and the models defenders asked for help refused. Why security needs its own model, at 30B."
pubDate: "2026-11-22"
topics: ["AI Security"]
stage: "budding"
short: "A model lab for defenders"
---

*Security researchers need models they can run, test and improve on their own. I'd start with 30 billion parameters.*

In July 2026, AI models broke into Hugging Face's infrastructure. They had their cyber refusals turned down.

Then Hugging Face's responders asked AI models for help. Those models refused.

The intrusion began inside an OpenAI evaluation. OpenAI says models running "with reduced cyber refusals for evaluation purposes" found a zero-day in a package registry cache proxy and kept going until they reached a machine with internet access. [OpenAI's incident disclosure](https://openai.com/index/hugging-face-model-evaluation-security-incident/)

Hugging Face's team had more than 17,000 recorded attacker events to read. They turned to hosted commercial models. The requests were blocked by safeguards that, in Hugging Face's words, "cannot distinguish an incident responder from an attacker." The team finished the forensics on an open-weight model running on its own servers, where the logs, and the credentials inside them, could stay. [Hugging Face's incident disclosure](https://huggingface.co/blog/security-incident-july-2026)

That is the gap. The models that broke in had their limits lifted for a test. The models the defenders needed had their limits on during a real incident.

The security industry should build foundation models it can run and improve itself. I'd start at about 30 billion parameters.

## A refusal is another queue

In [[Cybersecurity Was Built for Human Speed]] I argued that attacks now move in minutes while defence waits on people: an alert sits in a queue, an analyst checks it, a manager approves. Every wait adds hours.

A model that refuses mid-incident adds one more wait. Unlike the others, the team can't clear it. There is no manager to ask.

![An alert waits at the queue, the analyst and the approval step, then waits again when the model refuses, before the action runs.](illustrations/refusal-loop.svg)

Machine-speed defence needs models that answer when the defender asks. That means models the team can run where the evidence lives, test before it trusts them, and still have on the day it needs them.

## What a defender needs from a model

Securing a system means asking how it could fail. Who can actually reach this service? Does this permission do in practice what it says on paper? Do two small findings add up to one serious problem?

I want a model that helps a researcher work through those questions. It should suggest paths the team missed, say which conditions would have to hold, and separate what has been seen from what still needs checking. The model widens the search. The researcher still judges the evidence.

Safeguards make sense for a model anyone can use. A provider usually can't tell whether the person asking has permission to test the system. OpenAI's Trusted Access for Cyber and Anthropic's Cyber Verification Program accept that context matters: verified defenders get capabilities with fewer blocks. That is a real step forward. [OpenAI's trusted access program](https://openai.com/index/scaling-trusted-access-for-cyber-defense/), [Anthropic's Cyber Verification Program](https://www.anthropic.com/news/cyber-verification-program)

But a security team needs three more things:

- the version it tested is still there during an incident,
- sensitive evidence never leaves its environment,
- a provider's policy change can't break a workflow overnight.

We ask this of every other piece of security infrastructure. We should ask it of the models inside it.

## Who sets the terms?

The frontier labs are already helping. Project Glasswing gave defenders early access to a capable model. Anthropic's update named the result: security work used to be limited by how fast teams found vulnerabilities, and is now limited by how fast they can "verify, disclose, and patch the large numbers of vulnerabilities found by AI." [Anthropic's Project Glasswing update](https://www.anthropic.com/research/glasswing-initial-update)

My worry is three roles landing on the same few companies: building the models, deciding who may use them for sensitive research, and selling the security tools built on them. Each role makes sense alone. Together they let a handful of labs decide who qualifies, what each group gets, and how that changes with the next release. For a security company, the same provider can be its supplier and its competitor.

Independence gives defenders a way out. A team should be able to keep running a version it has tested, pay for an independent assessment, or move to another operator. Even when a hosted frontier model is the best tool for the job, the team should have a real alternative.

## Start at about 30 billion parameters

Thinking Machines Lab's first Inkling, released in July, has 975 billion parameters, 41 billion active per token. That is far bigger than what I'd start with: about 30 billion **total**.

On 20 November the same lab released Inkling 2 Mini: 26.4 billion parameters, 3.4 billion active, under Apache 2.0. It ships as a single checkpoint of about 20GB and runs on a Mac with 32GB of memory. It feels capable enough to do substantial work without being one of the very large models that cost millions, or billions, of dollars to build, which most security labs cannot spend. That makes this size the right place to start: to experiment, and to ship to customers. Running it is cheap too. It needs a laptop-class machine, not a GPU cluster. Of the open models I've seen, it is the best starting point for this job. Its model card reports no cyber benchmark yet, so that is the first thing I'd measure. [Inkling model card](https://thinkingmachines.ai/model-card/inkling/), [Inkling 2 Mini model card](https://huggingface.co/thinkingmachines/Inkling-2-Mini)

Before Inkling 2 Mini, my pick was Alibaba's Qwen3.8-27B, a 27-billion-parameter dense model released in August under Apache 2.0. For me it was the state of the art at this size. [Qwen3.8-27B model card](https://huggingface.co/Qwen/Qwen3.8-27B)

Google's 31B Gemma 4 and Ai2's 32B Olmo 3 sit in the same class. Ai2 also publishes its training data, code and intermediate checkpoints, so outsiders can inspect how the model was made. [Gemma 4](https://gemma.ai/models/gemma-4/), [Ai2's Olmo 3 release](https://allenai.org/blog/olmo3)

Thirty billion is an experiment, not an answer. I'd test whether a model that size can:

- rebuild an incident timeline from messy logs,
- spot security-relevant changes in a large codebase,
- tell a reviewer whether a fix addresses the real problem.

I'd score it on three numbers: how much evidence it misses, how many false leads it sends to a human, and what it costs to keep running. If the results call for a bigger model, that's the case for investing more.

The hard part is money. A security company can ship on someone else's API in months. A model program needs data it has permission to use, compute for repeated training runs, independent evaluations and releases others can depend on, long after the first checkpoint. Buyers, security vendors and public research funders could share that cost. The case is strongest when one model serves many teams, including ones that could never fund their own.

Not every defender's model needs to be big. Some of the most useful ones are small enough to run on the laptop they protect. At [SuperAlign](https://superalign.ai), where I'm co-founder, we're building one: [Prism 1.1](https://superalign.ai/writing/introducing-prism-1-1), a private-data detector from 74 million to 287 million parameters that runs on Apple silicon or a regular CPU with no cloud API. It's in internal testing. If you work on endpoint protection, it may interest you.

## Next: computer use

Much of a defender's evidence lives behind screens a person has to click through. An access review starts with a written policy, moves to an admin console to see what's configured, and ends in an audit dashboard to see what actually happened.

Computer use could let a model follow that same path. It also makes authority concrete. What can the model see? What can it change? Who approved the action, and can someone replay what it did?

That's my next piece. The more of a defender's work a model can do inside real software, the more it matters who controls the model, where it runs, and whose permission it needs.
