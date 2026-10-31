---
category: 'AppSec'
summary: 'Application security covers the code you write, the packages you pull in, and the app once it’s running. Each stage needs a different kind of scanner.'
---

Application security tools find weaknesses in software before attackers do. Where the weakness hides decides which tool can see it.

## How it breaks down

- **Static analysis (SAST)** reads your source code without running it, and flags patterns like SQL injection or unsafe deserialisation. It is fast, and it runs on every pull request.
- **Dependencies and supply chain (SCA)** look at the code you didn’t write. Most of an application is open-source packages and base images, so you need to know which versions you ship, which have known vulnerabilities, and whether a package is malicious or unmaintained.
- **Dynamic and API testing** attacks the running app or API from the outside. It finds problems that only show up at runtime, like broken authentication or exposed endpoints.
- **Platforms and posture (ASPM)** sit on top. They combine findings from all the scanners, remove duplicates, map them to the team that owns the code, and show which ones reach production.

## Where to start

Turn on dependency scanning and secret scanning first: they are cheap and catch the most common real-world problems. Add SAST on pull requests next. Bring in DAST and an ASPM platform once the number of findings becomes the problem.
