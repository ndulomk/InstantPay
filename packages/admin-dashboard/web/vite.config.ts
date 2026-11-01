import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const proxy = {
  '/api': {
    target: 'http://127.0.0.1:9993',
    changeOrigin: true,
  },
};

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@kit': fileURLToPath(new URL('../src/kit', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy,
  },
  preview: {
    port: 4174,
    strictPort: true,
    proxy,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
