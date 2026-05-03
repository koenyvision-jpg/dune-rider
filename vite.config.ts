import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/dune-rider/',
  assetsInlineLimit: 0,

  server: {
    port: 3000,
  },
  build: {
    target: 'es2020',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png'],
      manifest: {
        name: 'Dune Rider',
        short_name: 'Dune Rider',
        description: 'Paragliding endless runner',
        theme_color: '#0d0028',
        background_color: '#0d0028',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
