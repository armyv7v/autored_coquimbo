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
          // messaging y storage NO van aquí: se cargan bajo demanda vía dynamic
          // import (src/lib/firebase.ts) y Vite genera sus chunks async solos.
          // leaflet y charts TAMPOCO: forzarlos a chunks manuales los convertía
          // en dependencias ESTÁTICAS del entry (modulepreload en index.html)
          // aunque solo los consumen componentes lazy — llegaron a subir ~160 kB
          // gzip al arranque del landing. Dejar que Rollup los coloque con sus
          // consumidores lazy. Si un vendor vuelve a aparecer en el modulepreload
          // sin ser del grafo estático, es este mismo efecto: sacarlo de acá.
          manualChunks: {
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            motion: ['motion'],
          },
        },
      },
    },
  };
});
