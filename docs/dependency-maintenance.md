# Dependency maintenance

Registry snapshot: 2026-11-19, npm registry. Every direct dependency is on its latest release except TypeScript (see below).

## Compatibility and security

- TypeScript stays on `^6.0.3`: Astro check and typescript-eslint explicitly reject TypeScript 7.0.2. The latest version was tried and its incompatibility reproduced before selecting 6.0.3.
- The `minimatch` override selects `^11.0.3` to eliminate the remaining globparts-amplification advisory in tooling dependencies. Remove it when upstream dependencies adopt a patched major version; lint and the full test suite verify compatibility today.
- The `@emnapi/core` and `@emnapi/runtime` overrides hold both at `^1.11.3`. Since Vitest 5.1, Rolldown's wasm binding brings `@emnapi/*` 2.0 betas, and Bun hoists that runtime to the top of `node_modules`. `@astrojs/astro2tsx` (used by `astro check`) uses `@emnapi/core` 1.x but doesn't declare the runtime, so it picks up the 2.0 beta and `bun run typecheck` crashes with `this.bridge.setLastError is not a function`. The wasm bindings are only used on wasm32 hosts. Remove the overrides once astro2tsx declares its runtime or moves to emnapi 2.
- Node support matches the intersection required by Astro, ESLint and Vitest: `^22.23.4 || ^24.0.0 || >=26.0.0`.
- Bun remains the package manager. Commit `bun.lock` with dependency changes and use `bun install --frozen-lockfile` for reproducible installations.

## Validation

Run `bun run check` for lint (including Workers and local scripts), Astro typechecking, unit/integration tests and desktop/mobile browser tests. Browser tests include accessibility checks in both themes. Run `bun audit` separately for dependency advisories. No deployment, package publishing or commits are part of this maintenance.
