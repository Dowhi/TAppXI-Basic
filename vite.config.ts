import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Para GitHub Pages: si tu repositorio se llama "tappxi-web-replica", 
    // la base debe ser "/tappxi-web-replica/". Si está en la raíz del usuario (usuario.github.io), usar "/"
    // Se puede configurar con la variable de entorno VITE_BASE_PATH
    const base = process.env.VITE_BASE_PATH || '/tappxi-web-replica/';
    
    return {
      base: mode === 'production' ? base : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
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
