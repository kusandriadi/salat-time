import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // GitHub Pages akan deploy di https://<username>.github.io/<repo-name>/
  // Jika pakai custom domain, uncomment baris di bawah dan ubah base ke '/'
  base: '/salat-time/'
})