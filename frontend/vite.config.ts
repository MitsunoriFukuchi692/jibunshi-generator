import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/jibunshi/',
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    allowedHosts: 'all',
  },
  define: {
    // .env から VITE_API_URL を読み込む（vite が自動的に処理）
    // 開発環境：.env の VITE_API_URL = https://jibunshi-generator-backend.onrender.com
    // 本番環境：.env.production の VITE_API_URL = https://jibunshi-generator-backend.onrender.com
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
  },
})