import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'patient-html-entry',
      transformIndexHtml: {
        order: 'pre',
        handler() {
          return fs.readFileSync(
            path.resolve(__dirname, 'index.patient.html'),
            'utf-8',
          )
        },
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3004,
    proxy: {
      '/api/pipeline': {
        target: 'http://localhost:8020',
        rewrite: (path) => path.replace(/^\/api\/pipeline/, '/pipeline'),
        changeOrigin: true,
        proxyTimeout: 120_000,
        timeout: 120_000,
      },
      '/api/svc03': {
        target: 'http://localhost:8003',
        rewrite: (path) => path.replace(/^\/api\/svc03/, ''),
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/patient',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.patient.html'),
    },
  },
})
