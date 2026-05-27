import { defineConfig } from 'vite'

/** GitHub Pages: VITE_BASE=/oyun-yapma/ — Render / yerel: boş bırak (/) */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  server: { port: 5173, strictPort: true, open: true },
  preview: { port: 4173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@capacitor') || id.includes('@capgo') || id.includes('admob')) {
              return 'vendor-capacitor'
            }
            return 'vendor'
          }
          if (id.includes('/src/i18n/locales/')) {
            const m = id.match(/locales\/(\w+)\.ts/)
            return m ? `locale-${m[1]}` : 'i18n'
          }
          if (id.includes('/src/game/GameState')) return 'game-core'
          if (id.includes('/src/ui/components/ShopPanel')) return 'ui-shop'
          if (id.includes('/src/ui/components/LifestylePanel')) return 'ui-lifestyle'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
