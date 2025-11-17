# 🚀 Configuración de GitHub Pages

## ✅ Estado Actual

- ✅ **Commit y push completados** - Todos los cambios están en GitHub
- ✅ **Workflow configurado** - El archivo `.github/workflows/deploy-gh-pages.yml` está listo
- ✅ **Base path configurado** - Vite está configurado para usar `/tappxi-web-replica/`

## 📋 Pasos para Activar GitHub Pages

### 1. Activar GitHub Pages en el Repositorio

1. Ve a tu repositorio en GitHub: `https://github.com/Dowhi/tappxi-web-replica`
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, busca **Pages** (Páginas)
4. En **Source** (Origen), selecciona:
   - **Source**: `GitHub Actions`
5. **Guarda** los cambios

### 2. Verificar el Despliegue

1. Ve a la pestaña **Actions** en tu repositorio
2. Deberías ver un workflow ejecutándose llamado "Deploy to GitHub Pages (Alternative)"
3. Espera a que termine (puede tardar 2-5 minutos)
4. Una vez completado, verás un check verde ✅

### 3. Acceder a tu App

Tu aplicación estará disponible en:
```
https://dowhi.github.io/tappxi-web-replica/
```

⚠️ **Nota**: La primera vez puede tardar unos minutos en estar disponible.

## 🔧 Configuración de Google OAuth para GitHub Pages

Una vez que tengas la URL de GitHub Pages, necesitas añadirla en Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Edita tu **OAuth 2.0 Client ID**
5. En **"Orígenes autorizados de JavaScript"**, añade:
   ```
   https://dowhi.github.io
   ```
6. En **"URIs de redireccionamiento autorizados"**, añade:
   ```
   https://dowhi.github.io/tappxi-web-replica/
   ```
7. **Guarda** los cambios

⚠️ **Importante**: Los cambios pueden tardar 5-15 minutos en aplicarse.

## 🔄 Despliegue Automático

El workflow está configurado para desplegar automáticamente cada vez que hagas push a la rama `main`. 

**No necesitas hacer nada más** - cada vez que hagas `git push`, GitHub Actions:
1. Construirá la aplicación
2. La desplegará en GitHub Pages
3. Estará disponible en unos minutos

## 📱 Usar desde Móvil

Una vez desplegado, puedes:
1. Abrir `https://dowhi.github.io/tappxi-web-replica/` en tu móvil
2. El navegador te ofrecerá instalarla como PWA
3. Funcionará offline después de la primera carga

## 🐛 Solución de Problemas

### El workflow falla
- Verifica que el workflow tenga permisos de escritura (debería estar configurado)
- Revisa los logs en la pestaña **Actions**

### La página no carga
- Espera 5-10 minutos después del despliegue
- Verifica que GitHub Pages esté activado en Settings → Pages
- Asegúrate de que el Source sea "GitHub Actions"

### Google OAuth no funciona
- Verifica que hayas añadido la URL de GitHub Pages en Google Cloud Console
- Espera 5-15 minutos después de guardar los cambios
- Verifica que la URL sea exactamente `https://dowhi.github.io` (sin la ruta del proyecto)

## ✅ Verificación Final

Una vez configurado, deberías poder:
- ✅ Acceder a la app desde `https://dowhi.github.io/tappxi-web-replica/`
- ✅ Instalarla como PWA en el móvil
- ✅ Usar Google Drive y Sheets sin errores
- ✅ Ver actualizaciones automáticas cuando hagas push

