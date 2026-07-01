import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        cookieDomainRewrite: { '*': '' },
      },
      '/logout': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        cookieDomainRewrite: { '*': '' },
      },
      '/files': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        cookieDomainRewrite: { '*': '' },
      },
      '/private': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        cookieDomainRewrite: { '*': '' },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
