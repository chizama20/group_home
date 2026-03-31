import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name:             'Group Home Management',
        short_name:       'GroupHome',
        description:      'Resident care management for group homes and care facilities',
        theme_color:      '#4F46E5',
        background_color: '#F8FAFC',
        display:          'standalone',
        start_url:        '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // App shell — cache first
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // API GET requests — network first, fall back to cache
            urlPattern: /^http:\/\/localhost:3000\/(?!auth\/logout)/,
            handler: 'NetworkFirst',
            options: {
              cacheName:        'api-cache',
              expiration:       { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
