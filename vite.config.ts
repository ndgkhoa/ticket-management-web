import path from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: { devSourcemap: true },
  resolve: { alias: { '~': path.resolve(__dirname, './src') } },
  // No `port` override — Vite's default (5173) is what every reader already expects.
  // `host: true` is kept on purpose: it binds all interfaces so the dev server is
  // reachable from a phone or another machine on the LAN.
  server: { host: true },
  // No `build.outDir` override: Vite's default is `dist`, which is what the whole
  // ecosystem — including Cloudflare Pages' Vite preset — expects. The old `./build`
  // override bought nothing and meant every tool had to be told about it.
});
