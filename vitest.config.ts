import { BaseSequencer, type TestSpecification } from 'vitest/node';
import { defineConfig } from 'vitest/config';

// tests/build.test.ts builds dist/, and the verifiers in tests/quality read it. Vitest
// otherwise orders files by cached timings, so a fresh checkout ran the verifiers first
// against a missing dist/. Run the build test first, then everything else in the usual order.
class BuildFirst extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    const sorted = await super.sort(files);
    const isBuild = (file: TestSpecification) => file.moduleId.endsWith('/tests/build.test.ts');
    return [...sorted.filter(isBuild), ...sorted.filter((file) => !isBuild(file))];
  }
}

export default defineConfig({
  test: {
    // Several test files invoke `bun run build`, and Astro writes to a shared
    // .astro cache dir. Running files sequentially avoids rename collisions
    // on that shared cache.
    fileParallelism: false,
    sequence: { sequencer: BuildFirst },
    exclude: ['tests/browser/**', '**/node_modules/**', '**/dist/**'],
  },
});
