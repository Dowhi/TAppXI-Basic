# 🔧 SOLUCIÓN DE PROBLEMAS: Backup a Google Drive y Google Sheets

## 🚨 Problema: Error al hacer backup en Google Drive o Google Sheets

Si estás experimentando errores al intentar hacer backup en Google Drive o exportar a Google Sheets, sigue esta guía paso a paso para solucionarlo.

---

## ✅ PASO 1: Verificar Configuración de Variables de Entorno

### 1.1 Verificar archivo `.env`

Primero, verifica si existe el archivo `.env` en la raíz del proyecto. Si no existe, créalo.

**Ubicación**: `tappxi-web-replica/.env`

### 1.2 Contenido necesario del archivo `.env`

El archivo `.env` debe contener estas dos líneas (reemplaza los valores con tus credenciales reales):

```env
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
VITE_GOOGLE_API_KEY=tu_api_key_aqui
```

**⚠️ IMPORTANTE**: 
- NO incluyas comillas alrededor de los valores
- NO dejes espacios alrededor del signo `=`
- Asegúrate de que el archivo se llame exactamente `.env` (no `.env.local` u otro nombre)

### 1.3 Reiniciar el servidor

Después de crear o modificar el archivo `.env`, **DEBES** reiniciar el servidor de desarrollo:

```bash
# Detén el servidor actual (Ctrl+C)
# Luego inicia de nuevo:
npm run dev
```

---

## ✅ PASO 2: Crear y Configurar Proyecto en Google Cloud Console

Si aún no tienes un proyecto configurado, sigue estos pasos:

### 2.1 Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Crea un nuevo proyecto o selecciona uno existente:
   - Click en el selector de proyectos (arriba a la izquierda)
   - Click en "Nuevo proyecto"
   - Ingresa un nombre (ej: "TAppXI Backup")
   - Click en "Crear"

### 2.2 Habilitar APIs Necesarias

1. En el menú lateral, ve a **APIs y servicios** → **Biblioteca**
2. Busca y habilita estas APIs:
   - **Google Drive API** - Click en "Habilitar"
   - **Google Sheets API** - Click en "Habilitar"

### 2.3 Crear Credenciales OAuth 2.0

1. Ve a **APIs y servicios** → **Credenciales**
2. Click en **+ CREAR CREDENCIALES** → **ID de cliente OAuth 2.0**
3. Si es la primera vez, configura la pantalla de consentimiento:
   - Tipo de aplicación: **Externo** (si aparece la opción)
   - Nombre de la app: "TAppXI Backup"
   - Usuario de soporte: Tu email
   - Click en **Guardar y continuar**
   - En "Ámbitos": No cambies nada, click en **Guardar y continuar**
   - En "Usuarios de prueba": Agrega tu email, click en **Guardar y continuar**
   - Revisa y click en **Volver al panel**

4. Ahora crea el ID de cliente:
   - Tipo de aplicación: **Aplicación web**
   - Nombre: "TAppXI Web Client"
   - **Orígenes autorizados de JavaScript** (Muy importante):
     
     **⚠️ FORMATO CORRECTO DE URL:**
     - ✅ `http://localhost:5173` (para desarrollo local)
     - ✅ `https://tu-dominio.com` (para producción)
     - ✅ `https://tu-usuario.github.io` (si usas GitHub Pages)
     - ❌ `http://localhost:5173/` (NO incluyas barra final)
     - ❌ `http://localhost:5173/home` (NO incluyas rutas)
     - ❌ `127.0.0.1:5173` (Usa `localhost`, no la IP)
     
     **🔍 Cómo saber tu URL exacta:**
     1. Abre tu aplicación en el navegador
     2. Abre la consola (F12)
     3. Escribe: `console.log(window.location.origin)`
     4. Presiona Enter
     5. Copia la URL que aparece (esa es la que debes agregar)
     
     **📝 Ejemplos:**
     - Si estás en desarrollo: `http://localhost:5173`
     - Si está en GitHub Pages: `https://tu-usuario.github.io` (o `https://tu-usuario.github.io/tappxi-web-replica` si está en subdirectorio)
     - Si tienes dominio propio: `https://mi-app.com`
     
   - **URI de redirección autorizados**:
     - Agrega las mismas URLs que en "Orígenes autorizados"
     - Mismo formato (sin barra final, sin rutas)
   - Click en **Crear**

5. **Copia las credenciales**:
   - Se mostrará un modal con **ID de cliente** y **Secreto del cliente**
   - Copia el **ID de cliente** (es lo que necesitas para `VITE_GOOGLE_CLIENT_ID`)
   - El secreto del cliente NO lo necesitas para esta aplicación

### 2.4 Crear API Key

1. En **APIs y servicios** → **Credenciales**
2. Click en **+ CREAR CREDENCIALES** → **Clave de API**
3. Se creará automáticamente una clave de API
4. (Opcional) Para mayor seguridad, puedes restringirla:
   - Click en **Restringir clave**
   - **Restricciones de aplicación**: Selecciona "Aplicaciones web"
   - **Referencias de sitios web**: Agrega tus orígenes (ej: `http://localhost:5173/*`)
   - **Restricciones de API**: Selecciona "Restringir clave" y marca:
     - Google Drive API
     - Google Sheets API
   - Click en **Guardar**

5. **Copia la clave de API** (es lo que necesitas para `VITE_GOOGLE_API_KEY`)

---

## ✅ PASO 3: Configurar Variables de Entorno

1. Abre o crea el archivo `.env` en la raíz del proyecto
2. Agrega las credenciales que copiaste:

```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz
```

**⚠️ IMPORTANTE**: Reemplaza los valores de ejemplo con tus credenciales reales.

3. Guarda el archivo
4. **Reinicia el servidor de desarrollo** (Ctrl+C y luego `npm run dev`)

---

## ✅ PASO 4: Verificar Configuración

### 4.1 Verificar en Consola del Navegador

Abre la consola del navegador (F12) y verifica:

1. No deberían aparecer errores relacionados con Google API al cargar la página
2. En modo desarrollo, puedes verificar la configuración escribiendo en la consola:
   ```javascript
   console.log(window.__tappxiGoogleCfg);
   ```
   Deberías ver un objeto con `clientId` y `apiKey` (no vacíos)

### 4.2 Verificar Orígenes Autorizados

1. Ve a [Google Cloud Console - Credenciales](https://console.cloud.google.com/apis/credentials)
2. Click en tu **OAuth 2.0 Client ID**
3. Verifica que en **Orígenes autorizados de JavaScript** esté:
   - `http://localhost:5173` (si estás en desarrollo)
   - Tu URL de producción (si estás en producción)

**⚠️ IMPORTANTE**: 
- Debe ser la URL exacta (sin barra al final, sin rutas adicionales)
- Para desarrollo local: `http://localhost:5173`
- No uses `http://127.0.0.1:5173`, usa `http://localhost:5173`

---

## ✅ PASO 5: Probar el Backup

### 5.1 Probar Backup a Google Drive

1. Abre la aplicación
2. Ve a **Ajustes**
3. Busca la sección **Backup y Exportación**
4. Click en **Subir Backup a Google Drive**
5. Deberías ver una ventana emergente pidiendo permiso para acceder a Google Drive
6. Autoriza el acceso
7. Espera a que se complete el proceso

### 5.2 Probar Exportación a Google Sheets

1. En **Ajustes**, sección **Backup y Exportación**
2. Click en **Exportar a Google Sheets**
3. Autoriza el acceso si se solicita
4. Espera a que se cree la hoja de cálculo
5. Se te pedirá si quieres abrir la hoja (click en "Sí")

---

## 🔍 DIAGNÓSTICO DE ERRORES COMUNES

### Error: "Configuración de Google faltante"

**Causa**: No están configuradas las variables de entorno

**Solución**:
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que contiene `VITE_GOOGLE_CLIENT_ID` y `VITE_GOOGLE_API_KEY`
3. Verifica que los valores no están vacíos
4. Reinicia el servidor de desarrollo

---

### Error: "idpiframe_initialization_failed" o "El origen no está autorizado"

**Causa**: El origen de tu aplicación no está en la lista de orígenes autorizados

**Solución**:
1. Ve a [Google Cloud Console - Credenciales](https://console.cloud.google.com/apis/credentials)
2. Click en tu **OAuth 2.0 Client ID**
3. En **Orígenes autorizados de JavaScript**, agrega:
   - Tu URL exacta (ej: `http://localhost:5173` o `https://tu-dominio.com`)
4. Click en **Guardar**
5. **Espera 5-15 minutos** para que los cambios se propaguen
6. Recarga la página de la aplicación
7. Intenta de nuevo

**Nota**: Los cambios en Google Cloud Console pueden tardar varios minutos en aplicarse. Si no funciona de inmediato, espera unos minutos.

---

### Error: "Google API no disponible" o "Google Auth2 no disponible"

**Causa**: La API de Google no se cargó correctamente

**Solución**:
1. Verifica tu conexión a internet
2. Abre la consola del navegador (F12) y busca errores de red
3. Verifica que no hay bloqueadores de anuncios o extensiones bloqueando Google APIs
4. Intenta en modo incógnito
5. Limpia la caché del navegador (Ctrl+Shift+Delete)
6. Recarga la página

---

### Error: "Inicio de sesión cancelado" o "popup_closed_by_user"

**Causa**: Cerraste la ventana de autorización de Google

**Solución**:
1. Vuelve a intentar el backup
2. Esta vez, completa todo el proceso de autorización
3. Asegúrate de hacer click en "Permitir" cuando Google te pida acceso

---

### Error: "Error de permisos" o "insufficientPermissions"

**Causa**: No autorizaste los permisos necesarios o los cancelaste

**Solución**:
1. Haz click en tu foto de perfil en Google (arriba a la derecha)
2. Ve a **Administrar tu cuenta de Google**
3. Click en **Seguridad** → **Acceso de aplicaciones de terceros**
4. Busca tu aplicación y verifica los permisos
5. Si no está, vuelve a intentar el backup y autoriza cuando se solicite

---

### Error: "Error de almacenamiento" o "quota exceeded"

**Causa**: Tu cuenta de Google Drive está sin espacio

**Solución**:
1. Ve a [Google Drive](https://drive.google.com)
2. Verifica el espacio disponible
3. Libera espacio eliminando archivos innecesarios
4. Vuelve a intentar el backup

---

### Error: "API no habilitada" o "API not enabled"

**Causa**: Las APIs de Google Drive y Sheets no están habilitadas en tu proyecto

**Solución**:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs y servicios** → **Biblioteca**
4. Busca y habilita:
   - **Google Drive API**
   - **Google Sheets API**
5. Espera unos minutos para que se habiliten
6. Vuelve a intentar

---

### Error al escribir en Google Sheets: "La hoja no existe"

**Causa**: La hoja de cálculo se creó pero algo falló al escribir los datos

**Solución**:
1. Esto es un error temporal
2. Verifica en tu Google Drive si se creó el archivo
3. Si se creó, los datos pueden haberse guardado parcialmente
4. Intenta exportar de nuevo
5. Si persiste, verifica los permisos de Google Sheets API

---

## 🛠️ VERIFICACIÓN ADICIONAL

### Verificar en Consola del Navegador

Abre la consola (F12) y escribe estos comandos para diagnosticar:

```javascript
// Verificar si Google API está cargada
console.log(window.gapi);

// Verificar configuración (en desarrollo)
console.log(window.__tappxiGoogleCfg);

// Verificar si hay errores de red
// Ve a la pestaña "Network" y busca requests fallidos
```

### Verificar Variables de Entorno

En la raíz del proyecto, verifica que el archivo `.env` contiene:

```env
VITE_GOOGLE_CLIENT_ID=tu_client_id_real
VITE_GOOGLE_API_KEY=tu_api_key_real
```

**⚠️ NO commitees el archivo `.env` con tus credenciales reales** al repositorio.

---

## 📝 NOTAS IMPORTANTES

1. **Tiempo de propagación**: Los cambios en Google Cloud Console pueden tardar **5 minutos a varias horas** en aplicarse completamente. Si configuraste todo correctamente pero aún no funciona, espera un poco y vuelve a intentar.

2. **Orígenes autorizados**: El origen debe ser **exactamente** igual a la URL de tu aplicación (sin `/` al final, sin rutas adicionales).

3. **Reiniciar servidor**: Después de modificar el archivo `.env`, **SIEMPRE** debes reiniciar el servidor de desarrollo.

4. **Modo desarrollo vs producción**: Si estás en desarrollo local, usa `http://localhost:5173`. Si estás en producción, usa tu URL completa (ej: `https://tu-dominio.com`).

5. **API Key vs Client ID**: 
   - **Client ID** (OAuth 2.0): Se usa para autenticación
   - **API Key**: Se usa para habilitar las APIs
   - Ambos son necesarios y diferentes

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de reportar un problema, verifica que:

- [ ] El archivo `.env` existe en la raíz del proyecto
- [ ] El archivo `.env` contiene `VITE_GOOGLE_CLIENT_ID` con un valor válido
- [ ] El archivo `.env` contiene `VITE_GOOGLE_API_KEY` con un valor válido
- [ ] Reiniciaste el servidor después de modificar `.env`
- [ ] Google Drive API está habilitada en Google Cloud Console
- [ ] Google Sheets API está habilitada en Google Cloud Console
- [ ] Tu origen está en "Orígenes autorizados de JavaScript" en Google Cloud Console
- [ ] Esperaste al menos 5-15 minutos después de hacer cambios en Google Cloud Console
- [ ] Tu cuenta de Google Drive tiene espacio disponible
- [ ] No hay errores en la consola del navegador (F12)

---

## 🆘 SI NADA FUNCIONA

Si después de seguir todos los pasos aún tienes problemas:

1. **Verifica los logs de la consola** (F12 → Console) y busca el error exacto
2. **Verifica la pestaña Network** (F12 → Network) para ver si hay requests fallidos
3. **Intenta en modo incógnito** para descartar problemas de caché o extensiones
4. **Verifica que el proyecto correcto esté seleccionado** en Google Cloud Console
5. **Asegúrate de usar el mismo proyecto** para todas las APIs y credenciales

---

## 📞 CONTACTO

Si después de seguir esta guía completa sigues teniendo problemas, proporciona:

1. El mensaje de error exacto (copiado de la consola)
2. Una captura de pantalla de la configuración en Google Cloud Console (sin mostrar las credenciales completas)
3. Verifica que no hay errores en la consola del navegador (F12)

---

**Última actualización**: Basado en la versión actual de la aplicación TAppXI Web Replica

