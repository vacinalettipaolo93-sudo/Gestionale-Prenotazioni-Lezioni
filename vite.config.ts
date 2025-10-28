import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

// Fix: Removed the import for 'process'. The Node.js global 'process' object is
// available in this context and provides the correct type definitions.
export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env': {}, // Polyfill per compatibilità
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url))
        }
      }
    };
});