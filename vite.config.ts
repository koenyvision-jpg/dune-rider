import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  assetsInlineLimit: 0,

  server: {
    port: 3000,
  },
  build: {
    target: 'es2020',
  },
})
