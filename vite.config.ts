import { defineConfig } from 'vite'

/** GitHub Pages: VITE_BASE=/oyun-yapma/ — Render / yerel: boş bırak (/) */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
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