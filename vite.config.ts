import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Base path: './' para compatibilidad con Capacitor y GitHub Pages
  const base = './';
  const isProd = mode === 'production';

  return {
    base: base,
    server: {
      port: 8080,
      strictPort: true,
      host: '0.0.0.0',
      open: true,
    },
    build: {
      minify: 'esbuild',
      target: 'esnext',
      rollupOptions: {
        output: {
          // Code-splitting manual: separa vendor y módulos pesados en chunks cacheables
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('node_modules/jspdf')) {
              return 'vendor-jspdf';
            }
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
          }
        }
      }
    },
    // Elimina todos los console.* y debugger en producción a nivel de transpilación
    // Sin modificar el código fuente — transparente para el desarrollador
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
    plugins: [
      react(),
      tailwindcss(),
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
          scope: base,
          start_url: base,
          icons: [
            {
              src: base + 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: base + 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: base + 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // 5 MB para cubrir chunks grandes sin romper el precache
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
          enabled: false,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
