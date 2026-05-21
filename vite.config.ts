import { defineConfig } from 'vite'

export default defineConfig({
  base: '/oyun-yapma/',
  server: {
    port: 5173,
    strictPort: true,
    open: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
