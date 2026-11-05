import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` needs the PHP API somewhere. Point API_PROXY at a local PHP server (e.g. XAMPP),
// for example: API_PROXY=http://localhost/mindtrack npm run dev
const proxy = process.env.API_PROXY ? { '/api': { target: process.env.API_PROXY, changeOrigin: true } } : undefined;

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  // Keep images (Fluent emoji, mood art) as separate files so each page only downloads the ones it shows.
  build: { assetsInlineLimit: 0 },
});
