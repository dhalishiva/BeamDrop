import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the signaling server runs on :8787 and is proxied under /ws,
// so the browser always talks to its own origin.
export default defineConfig({
  plugins: [react()],
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
