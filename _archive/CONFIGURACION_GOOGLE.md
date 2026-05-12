# 🔧 Configuración de Google API para TAppXI

Este documento explica cómo configurar las credenciales de Google para usar las funciones de "Subir a Drive" y "Hojas de cálculo de Google".

## ❌ Error Común

Si ves el error `idpiframe_initialization_failed` o `Configuración de Google faltante`, significa que necesitas configurar las credenciales.

## 📋 Pasos para Configurar

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el nombre del proyecto

### 2. Habilitar las APIs Necesarias

1. En el menú lateral, ve a **"APIs y servicios" → "Biblioteca"**
2. Busca y habilita estas APIs:
   - **Google Drive API**
   - **Google Sheets API**

### 3. Crear Credenciales OAuth 2.0

1. Ve a **"APIs y servicios" → "Credenciales"**
2. Haz clic en **"+ CREAR CREDENCIALES" → "ID de cliente OAuth"**
3. Selecciona **"Aplicación web"**
4. Configura:
   - **Nombre**: TAppXI (o el que prefieras)
   - **Orígenes autorizados de JavaScript**: 
     - `http://localhost:5173`
     - `http://localhost:3000` (si usas otro puerto)
   - **URI de redirección autorizados**: 
     - `http://localhost:5173`
     - `http://localhost:3000`
5. Haz clic en **"Crear"**
6. **Copia el "ID de cliente"** (algo como: `123456789-abc.apps.googleusercontent.com`)

### 4. Crear Clave de API

1. En la misma página de "Credenciales", haz clic en **"+ CREAR CREDENCIALES" → "Clave de API"**
2. **Copia la clave de API** generada
3. (Opcional) Haz clic en "Restringir clave" y selecciona solo:
   - Google Drive API
   - Google Sheets API

### 5. Configurar Variables de Entorno

1. En la raíz del proyecto `tappxi-web-replica`, crea un archivo llamado `.env`
2. Añade estas líneas (reemplaza con tus valores reales):

```env
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=tu_api_key_aqui
```

**Ejemplo:**
```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567
```

### 6. Reiniciar el Servidor

1. Detén el servidor (Ctrl + C en la terminal)
2. Reinicia con: `npm run dev`
3. Recarga la página en el navegador

## ✅ Verificar que Funciona

1. Abre la consola del navegador (F12)
2. Escribe: `window.__tappxiGoogleCfg`
3. Deberías ver un objeto con `clientId` y `apiKey` (no vacíos)

## 🔍 Solución de Problemas

### Error: "idpiframe_initialization_failed"

**Causa**: El origen no está permitido en Google Cloud Console.

**Solución**:
1. Ve a Google Cloud Console → Credenciales
2. Edita tu OAuth 2.0 Client ID
3. Añade este origen en "Orígenes autorizados de JavaScript":
   - `http://localhost:5173` (o el puerto que uses)
4. Guarda y espera 2-3 minutos

### Error: "Configuración de Google faltante"

**Causa**: No existe el archivo `.env` o las variables están vacías.

**Solución**:
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que las variables empiezan con `VITE_`
3. Reinicia el servidor después de crear/modificar `.env`

### Error: "No se pudo cargar Google API"

**Causa**: Problema de conexión o bloqueador de anuncios.

**Solución**:
1. Verifica tu conexión a internet
2. Desactiva temporalmente bloqueadores de anuncios
3. Prueba en modo incógnito

## 📝 Notas Importantes

- ⚠️ **NUNCA** subas el archivo `.env` a Git (ya está en `.gitignore`)
- 🔒 Mantén tus credenciales seguras y no las compartas
- 🌐 Si despliegas la app en producción, añade el dominio de producción como origen autorizado
- ⏱️ Los cambios en Google Cloud Console pueden tardar unos minutos en aplicarse

## 🆘 ¿Necesitas Ayuda?

Si después de seguir estos pasos sigue sin funcionar:
1. Revisa la consola del navegador (F12) para ver errores detallados
2. Verifica que las APIs están habilitadas en Google Cloud Console
3. Asegúrate de que el archivo `.env` está en la raíz del proyecto (mismo nivel que `package.json`)


