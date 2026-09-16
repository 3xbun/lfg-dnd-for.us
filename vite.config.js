import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // In dev, the Pages Functions (the /api/* proxy to NocoDB) run under
    // `wrangler pages dev` on :8788. Forward API calls there so `npm run dev`
    // is fully functional with HMR. Set VITE_API_PROXY to override the target.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
})
