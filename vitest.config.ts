import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Several test files invoke `bun run build`, and Astro writes to a shared
    // .astro cache dir. Running files sequentially avoids rename collisions
    // on that shared cache.
    fileParallelism: false,
  },
});
