# 🔐 Configurar Credenciales en GitHub

El error "Faltan credenciales de Google" en tu web publicada (`dowhi.github.io`) ocurre porque GitHub no tiene acceso a tus claves (el archivo `.env` no se sube por seguridad).

Para solucionarlo, debes guardar tus claves como "Secretos" en la configuración de tu repositorio en GitHub.

## ✅ Pasos a seguir

1.  Ve a la página de tu repositorio en GitHub.
2.  Haz clic en la pestaña **Settings** (Configuración).
3.  En el menú de la izquierda, busca **Secrets and variables** y haz clic en **Actions**.
4.  Haz clic en el botón verde **New repository secret**.
5.  Crea el primer secreto:
    *   **Name**: `VITE_GOOGLE_CLIENT_ID`
    *   **Secret**: (Copia el valor de tu archivo `.env` local)
    *   Haz clic en **Add secret**.
6.  Crea el segundo secreto:
    *   **Name**: `VITE_GOOGLE_API_KEY`
    *   **Secret**: (Copia el valor de tu archivo `.env` local)
    *   Haz clic en **Add secret**.

## 🚀 Aplicar los cambios

Una vez guardados los secretos:

1.  Ve a la pestaña **Actions** de tu repositorio.
2.  Selecciona el último flujo de trabajo fallido o haz un nuevo cambio en tu código (subir los cambios que acabo de hacer en los archivos `.yml` servirá).
3.  Espera a que termine el despliegue (el círculo se pondrá verde).
4.  Recarga tu página web y prueba de nuevo.
