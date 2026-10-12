import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 单页应用 + 路由用相对路径，dist 可被现有 server.js 托管到任何子路径
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    // 开发期把 /api 代理到后端，前端可独立热更新
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
