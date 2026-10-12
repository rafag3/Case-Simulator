import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relativa: funciona em qualquer subpasta (GitHub Pages, Vercel ou arquivo empacotado no app)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5183 },
  test: { environment: 'node' },
});
