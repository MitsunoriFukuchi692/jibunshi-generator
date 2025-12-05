import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/jibunshi/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    // 本番環境用: 環境変数の置換を有効化
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  },
})