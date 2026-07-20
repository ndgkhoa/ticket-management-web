import path from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must precede the React plugin: it generates `routeTree.gen.ts` from the files in
    // `src/routes/` and the React plugin has to see the generated code.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  css: { devSourcemap: true },
  // Emit source maps for the e2e coverage build (COVERAGE=true) so monocart can map the
  // browser's V8 coverage back to `src/`. Off for normal builds — no public source maps.
  build: { sourcemap: process.env.COVERAGE === 'true' },
  resolve: { alias: { '~': path.resolve(__dirname, './src') } },
  // No `port` override — Vite's default (5173) is what every reader already expects.
  // `host: true` is kept on purpose: it binds all interfaces so the dev server is
  // reachable from a phone or another machine on the LAN.
  server: { host: true },
  // No `build.outDir` override: Vite's default is `dist`, which is what the whole
  // ecosystem — including Cloudflare Pages' Vite preset — expects. The old `./build`
  // override bought nothing and meant every tool had to be told about it.
});
