import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Para GitHub Pages: si tu repositorio se llama "tappxi-web-replica", 
    // la base debe ser "/tappxi-web-replica/". Si está en la raíz del usuario (usuario.github.io), usar "/"
    // Se puede configurar con la variable de entorno VITE_BASE_PATH
    const base = process.env.VITE_BASE_PATH || '/tappxi-web-replica/';
    
    return {
      base: mode === 'production' ? base : '/',
      server: {
        port: 5173,
        strictPort: true,
        host: '0.0.0.0', // Permite acceso desde la red local (móvil)
        open: true,
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
          manifest: {
            name: 'TAppXI - Gestión de Taxis',
            short_name: 'TAppXI',
            description: 'Aplicación para gestión de carreras, gastos y turnos de taxis',
            theme_color: '#3b82f6',
            background_color: '#18181b',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/www\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
                  }
                }
              }
            ]
          },
          devOptions: {
            enabled: true, // Habilita PWA en desarrollo
            type: 'module'
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
