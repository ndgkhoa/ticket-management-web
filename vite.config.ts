import path from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  css: { devSourcemap: true },
  build: { sourcemap: process.env.COVERAGE === 'true' },
  resolve: { alias: { '~': path.resolve(__dirname, './src') } },
  server: { host: true },
});
