/// <reference types="vitest/config" />

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// A unique id per build, baked into the bundle (__BUILD_ID__) and written to
// /version.json. The app polls version.json to detect a newer deploy and offer
// a refresh — no service worker involved, so push notifications are unaffected.
const BUILD_ID = Date.now().toString()

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: BUILD_ID }),
        })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      // Include the assets the generator actually created
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'factoryLogoNew.png'],
      manifest: {
        name: 'JI',
        short_name: 'JI',
        description: 'JI - Complete management system for Jivo Wellness.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
