import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/jibunshi/',
  plugins: [react()],
  server: {
    host: 'localhost',  // ← '0.0.0.0' から 'localhost' に戻す
    port: 5173,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  },
})