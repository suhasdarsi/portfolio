# Dependency maintenance

Registry snapshot: 2026-10-31, npm registry. All 28 direct dependencies were checked and updated to the latest compatible stable release.

## Compatibility and security

- TypeScript stays on `^6.0.3`: Astro check and typescript-eslint explicitly reject TypeScript 7.0.2. The latest version was tried and its incompatibility reproduced before selecting 6.0.3.
- The `minimatch` override selects `^11.0.3` to eliminate the remaining globparts-amplification advisory in tooling dependencies. Remove it when upstream dependencies adopt a patched major version; lint and the full test suite verify compatibility today.
- Node support matches the intersection required by Astro, ESLint and Vitest: `^22.23.4 || ^24.0.0 || >=26.0.0`.
- Bun remains the package manager. Commit `bun.lock` with dependency changes and use `bun install --frozen-lockfile` for reproducible installations.

## Validation

Run `bun run check` for lint (including Workers and local scripts), Astro typechecking, unit/integration tests and desktop/mobile browser tests. Browser tests include accessibility checks in both themes. Run `bun audit` separately for dependency advisories. No deployment, package publishing or commits are part of this maintenance.
