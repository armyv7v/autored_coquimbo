import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          // Separa vendors pesados en chunks estables (mejor caching, main más liviano).
          manualChunks: {
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/storage', 'firebase/auth', 'firebase/messaging'],
            leaflet: ['leaflet', 'react-leaflet', 'leaflet.heat'],
            charts: ['recharts'],
            motion: ['motion'],
          },
        },
      },
    },
  };
});
