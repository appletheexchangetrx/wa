import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icons/app-icon.svg', 'icons/pwa-192.png', 'icons/pwa-512.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/wa/',
        name: 'WhatsApp — Apple The Exchange TRX',
        short_name: 'WhatsApp TRX',
        description: 'WhatsApp inbox — Apple The Exchange TRX',
        start_url: '/wa/',
        scope: '/wa/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#efeae2',
        theme_color: '#075e54',
        categories: ['business', 'communication'],
        icons: [
          { src: '/wa/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/wa/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/wa/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  base: '/wa/',
})
