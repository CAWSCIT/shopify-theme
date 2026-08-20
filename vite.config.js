import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * Shopify themes can only serve flat files out of `assets/`, so the build is
 * configured to emit predictable, un-hashed filenames straight into that folder.
 * Cache busting is handled by Shopify's `asset_url` filter, which appends its
 * own version query string.
 */
export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss()],
  build: {
    // Minified for `npm run build`, readable for `npm run dev`.
    minify: mode === 'production',
    outDir: 'assets',
    // `assets/` holds hand-authored files (critical.css, svgs) — never wipe it.
    emptyOutDir: false,
    // Left on (the default) so the stylesheet is named after its entry
    // (`theme.css`) instead of Vite's combined-bundle name (`style.css`).
    cssCodeSplit: true,
    manifest: false,
    sourcemap: false,
    // Safari 16.4 / Chrome 111 era — matches Shopify's supported browser matrix.
    target: 'es2022',
    rollupOptions: {
      input: {
        theme: 'src/main.js',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
}));
