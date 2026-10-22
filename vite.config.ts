import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Hosted at https://johnsaita.github.io/risk-map/. Data URLs are built from
  // import.meta.env.BASE_URL, so they follow this automatically.
  base: '/risk-map/',
  plugins: [react()],
  build: {
    // mapbox-gl alone is ~1.4 MB minified (~400 KB gzip); it is already split into its own chunk.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Keep mapbox-gl in its own chunk so app changes don't bust its cache.
        manualChunks: { mapbox: ['mapbox-gl'] },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
