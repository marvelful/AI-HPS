import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/api/pipeline': {
        target: 'http://localhost:8020',
        rewrite: (path) => path.replace(/^\/api\/pipeline/, '/pipeline'),
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/staff',
  },
})
