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
      includeAssets: ['icons/app-icon.svg'],
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
          { src: '/wa/icons/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
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
