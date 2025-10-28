import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  // Non è più necessario il blocco 'define'.
  // Vite espone automaticamente le variabili da .env che iniziano con 'VITE_'
  // su `import.meta.env`.
});
