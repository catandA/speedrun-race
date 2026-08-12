import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 部署在 https://catanda.github.io/speedrun-race/ 子路径, base 必须匹配, 否则资源 404
export default defineConfig({
  base: '/speedrun-race/',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
