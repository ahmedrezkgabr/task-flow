import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Uncommon high ports to avoid clashing with other local dev servers.
    port: 47820,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:47821',
    },
  },
});
