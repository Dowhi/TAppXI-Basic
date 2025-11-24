# 🚀 Configuración de GitHub Pages y Google Auth

Para que tu aplicación funcione en GitHub Pages (`dowhi.github.io`), necesitas configurar dos cosas:

## 1. Configurar Google Cloud Console

Google necesita saber que tu página de GitHub es segura y autorizada.

1.  Ve a [Google Cloud Console - Credenciales](https://console.cloud.google.com/apis/credentials).
2.  Edita tu **ID de cliente de OAuth 2.0**.
3.  En **"Orígenes autorizados de JavaScript"**, AÑADE:
    *   `https://dowhi.github.io`
4.  En **"URI de redirección autorizados"**, AÑADE:
    *   `https://dowhi.github.io/tappxi-web-replica`
    *   `https://dowhi.github.io/tappxi-web-replica/`
5.  **Guarda** los cambios.

⏳ **Espera 10-15 minutos** para que los cambios se propaguen.

## 2. Configurar Secretos en GitHub

Para que la aplicación se construya correctamente con tus claves:

1.  Ve a tu repositorio en GitHub > **Settings** > **Secrets and variables** > **Actions**.
2.  Asegúrate de tener creados los secretos:
    *   `VITE_GOOGLE_CLIENT_ID`
    *   `VITE_GOOGLE_API_KEY`
3.  Si no están, créalos copiando los valores de tu archivo `.env` local.

## 3. Verificar el Despliegue

1.  Haz un cambio en tu código y súbelo (`git push`) o ejecuta manualmente el workflow en la pestaña **Actions**.
2.  Espera a que termine el despliegue.
3.  Abre tu web: `https://dowhi.github.io/tappxi-web-replica/`
4.  Prueba el botón de "Google Sheets".

---

**Nota**: Si al probar te sale error de "redirect_uri_mismatch", verifica que la URL en la consola de Google sea EXACTAMENTE igual a la que ves en el navegador.
