import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    vue(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files > 1kb
      deleteOriginFile: false
    }),
    // Brotli compression (better than gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // GitHub Pages akan deploy di https://<username>.github.io/<repo-name>/
  // Jika pakai custom domain, uncomment baris di bawah dan ubah base ke '/'
  base: '/salat-time/',
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        },
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Compress and minify (esbuild is faster and built-in)
    minify: 'esbuild',
    // Optimize CSS
    cssCodeSplit: true,
    // Set chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Target modern browsers for smaller bundle
    target: 'esnext',
    // Reduce number of chunks
    cssMinify: true,
    // Report compressed size
    reportCompressedSize: true,
    // Sourcemap for production debugging (optional, can disable for smaller size)
    sourcemap: false
  }
})