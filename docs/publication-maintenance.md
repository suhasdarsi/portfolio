# Publication and technical maintenance

Verified against this checkout on 25 October 2026. Editorial approval belongs to the author and editorial owner; engineering prepares and validates the site.

## Before editing

1. Confirm `pwd`, read `agents.md`, and inspect `git status --short` and `git diff`. Preserve existing work and unrelated files, including `output/`, `tmp/`, and other deliverables.
2. Confirm the target is `https://suhasdarsi.com`, the repository remote is `https://github.com/suhasdarsi/portfolio`, and inspect the current `astro.config.mjs`, `wrangler.jsonc`, and `.github/workflows/quality.yml`.
3. Read article drafts without editing them unless the editorial owner has requested that specific edit. Do not add a new draft to this public repository merely to stage it for review.

## Per-article release preparation

1. Obtain approval of the exact title, body, description, author, references, and release time. Check evidence and publication rights with the editorial owner.
2. Keep the approved URL slug stable. Files in `src/content/blog/` create `/notes/<file-id>` routes; changing filenames changes URLs and requires a redirect plan.
3. Validate frontmatter against `src/content.config.ts`. Use `published: false` to hold material regardless of dates. `draft: true` without a due date stays hidden. `draft: true` with a due `dueDate` becomes public on the next build. **A future `pubDate` alone does not hold publication.** Use an ISO timestamp with an explicit timezone when release timing matters.
4. Check links, wikilinks, heading targets, image alternative text, and reading order. Wikilink targets must exist and be unambiguous. Add revisions only for actual substantive updates; do not invent modification dates.
5. Run `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`. Tests create temporary publication fixtures; do not run simultaneous builds or edits in the content directory.
6. Preview the production build with `bun run preview --host 127.0.0.1 --port 4337`. Using OpenBot browser, inspect the article on desktop and mobile, both themes, keyboard focus, skip link, global search/Escape, and `/notes?q=<query>`.
7. Check the built article's title, description, author, canonical, Open Graph/Twitter image, and valid `BlogPosting` JSON-LD. Image and canonical must identify the same article. Verify the generated PNG is 1200×630.
8. Confirm released material appears in article routes, `/notes`, `/search.json`, `/rss.xml`, and `/sitemap-0.xml`; held material must be absent from those outputs and `/og/`. Check the homepage's recent-note selection where applicable.
9. Give the owner the exact diff, validation, URL, intended release time, and remaining gaps. Commit, push, workflow dispatch, and deploy require explicit authorization. A build is not a publication.

## Deployment boundary and verification

The existing workflow runs on pull requests, main-branch pushes, manual dispatch, and a daily schedule at **05:47 Asia/Kolkata** (00:17 UTC). Its `publish` job deploys the checked `dist` artifact for main, except on pull requests. A main-branch push, manual main run, or scheduled main run can therefore publish due content. Do not use workflow dispatch as a read-only check.

This audit did not verify remote workflow execution, default-branch contents, repository secrets, branch protection, or Cloudflare deployment integrations. The configuration alone does not establish that scheduled publishing works. Do not print or inspect credential values to verify setup. Avoid introducing a second production deployment path that bypasses checks.

After an authorized release, verify the actual production article and preview PNG return 200; canonicals match HTTPS apex URLs without `.html` or trailing slashes; listings, search, RSS and sitemap contain the new article; held articles remain absent; and a nonexistent path returns 404. Check HTTP and www navigation reaches HTTPS apex with path and query preserved. Record deploy identifier and checks separately from indexing or search visibility. Search submissions and external posts require their own authorization.

The repository's `bun run check` also runs Playwright and launches a separate browser. In the OpenBot environment, use only OpenBot browser for browser work; run the four non-browser commands above and perform browser validation there. The existing CI browser suite can be evaluated from an authorized remote run. Do not report the full `check` command passed when only the non-browser commands ran.

## Recurring maintenance proposal

No new routine is created by this document. Suggested cadence: weekly technical maintenance on Monday at **10:00 Asia/Kolkata**, before every approved article release, and after every authorized deployment. Review traffic/indexing trends monthly only when access is available and explicitly authorized; distinguish impressions, clicks, indexed URLs, citations, and rankings.

Proposed instruction for Chief Of Staff to use only after routine approval:

> Each Monday at 10:00 Asia/Kolkata, request a technical maintenance report for suhasdarsi.com from Engineering Lead. Confirm repository identity and instructions, inspect git status, and preserve existing work. Read-only audit availability, HTTP/www destinations, canonical URLs, robots/sitemap, published articles' metadata/JSON-LD/previews, RSS/search consistency, internal links, and a missing-page 404. Use only OpenBot browser for browser work; sample mobile/desktop, light/dark themes, keyboard focus and search. Run Bun lint/typecheck/tests/build when the checkout and installed tools are available. Prepare justified reversible technical fixes locally, coordinate around editorial files, and return exact diffs, checks, evidence, unresolved issues and activation steps. Do not commit, push, deploy, dispatch publishing workflows, publish articles, edit editorial drafts, submit search forms, change accounts/DNS or create more schedules. Alert on confirmed failures or required decisions; otherwise send a concise weekly status. If authentication is needed, report the specific missing access without requesting interactive sign-in during the routine.

## Known follow-up from 25 October 2026

Production already injects a Cloudflare Insights beacon. The shared layout allows its script origin `https://static.cloudflareinsights.com` and collection endpoint `https://cloudflareinsights.com/cdn-cgi/rum`; same-origin `/cdn-cgi/rum` is covered by the existing `connect-src 'self'`. This follows [Cloudflare's collection documentation](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/). Verify actual script load and collection responses after deployment; source configuration alone does not establish successful collection or populated analytics reports.

Performance timing from one embedded-browser navigation is not field Core Web Vitals or a Lighthouse score. Collect controlled repeat measurements and real-user data before prioritizing performance changes. Automated accessibility checks supplement manual screen-reader and keyboard review.
