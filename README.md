<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1RhVLk11d1VySXVJdTRqcpgVCbabvtHOL

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Despliegue a GitHub Pages

Para publicar la aplicación en GitHub Pages sigue estos pasos:

1. **Configura la variable de entorno** `VITE_BASE_PATH` en el workflow (ya está configurada).
2. **Ejecuta el workflow** manualmente o empuja cambios a la rama `main`.
3. El workflow construirá la aplicación y la publicará en la rama `gh-pages`.
4. Accede a la aplicación en `https://dowhi.github.io/tappxi-web-replica/`.

También puedes desplegar localmente con el script:

```bash
npm run deploy
```

Asegúrate de que los secretos `VITE_GOOGLE_CLIENT_ID` y `VITE_GOOGLE_API_KEY` estén configurados en **Settings > Secrets and variables > Actions** del repositorio.
