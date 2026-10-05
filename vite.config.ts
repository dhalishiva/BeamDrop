import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Social previews need absolute image URLs. Set SITE_URL to override (for example a custom
// domain); on Vercel the production domain is picked up automatically.
function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return '';
}

// In development the signaling server runs on :8787 and is proxied under /ws,
// so the browser always talks to its own origin.
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl()),
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
