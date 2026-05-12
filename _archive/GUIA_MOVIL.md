# 📱 Guía para Usar TAppXI en Móvil

Esta guía te explica cómo acceder y usar TAppXI en tu dispositivo móvil.

## 🚀 Opción 1: Acceso desde la Red Local (Desarrollo)

### Paso 1: Encontrar la IP de tu PC

**Windows:**
1. Abre PowerShell o CMD
2. Ejecuta: `ipconfig`
3. Busca "Dirección IPv4" (algo como `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

### Paso 2: Iniciar el Servidor con Acceso de Red

El servidor ya está configurado para aceptar conexiones de la red local. Solo necesitas:

1. Asegúrate de que el servidor esté corriendo:
   ```bash
   npm run dev
   ```

2. Verás algo como:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.100:5173/
   ```

### Paso 3: Conectar desde el Móvil

1. **Asegúrate de que tu móvil esté en la misma red WiFi que tu PC**
2. Abre el navegador en tu móvil (Chrome, Safari, etc.)
3. Ve a: `http://TU_IP:5173` (ejemplo: `http://192.168.1.100:5173`)

### Paso 4: Instalar como App (PWA)

Una vez que la app cargue en el móvil:

**Android (Chrome):**
1. Verás un banner que dice "Añadir a pantalla de inicio" o "Instalar app"
2. Toca "Instalar" o "Añadir"
3. La app se instalará como una aplicación nativa

**iOS (Safari):**
1. Toca el botón de compartir (cuadrado con flecha)
2. Selecciona "Añadir a pantalla de inicio"
3. Personaliza el nombre si quieres
4. Toca "Añadir"

## 🌐 Opción 2: Desplegar en Internet (Producción)

Para que la app sea accesible desde cualquier lugar:

### Opción A: GitHub Pages (Gratis)

1. **Haz commit y push de tu código:**
   ```bash
   git add .
   git commit -m "Add PWA support"
   git push
   ```

2. **Despliega:**
   ```bash
   npm run deploy
   ```

3. **Accede desde:**
   `https://TU_USUARIO.github.io/tappxi-web-replica/`

### Opción B: Vercel (Gratis y Fácil)

1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Vercel detectará automáticamente Vite y desplegará
4. Tu app estará disponible en una URL como: `tappxi.vercel.app`

### Opción C: Netlify (Gratis)

1. Ve a [netlify.com](https://netlify.com)
2. Arrastra la carpeta `dist` después de hacer `npm run build`
3. O conecta tu repositorio de GitHub

## 🔧 Solución de Problemas

### No puedo acceder desde el móvil

1. **Verifica el firewall de Windows:**
   - Ve a "Configuración de Windows" → "Firewall"
   - Permite Node.js o el puerto 5173

2. **Verifica que estés en la misma red:**
   - El PC y el móvil deben estar en la misma WiFi

3. **Prueba con la IP correcta:**
   - Asegúrate de usar la IP que muestra Vite en la consola

### La app no se instala como PWA

1. **Verifica que uses HTTPS o localhost:**
   - PWA requiere HTTPS en producción
   - En desarrollo, `localhost` funciona

2. **Limpia la caché del navegador:**
   - En Chrome: Configuración → Privacidad → Limpiar datos de navegación

3. **Verifica el manifest:**
   - Abre `http://TU_IP:5173/manifest.webmanifest` en el navegador
   - Debe mostrar un JSON válido

## 📝 Notas Importantes

- ⚠️ **En desarrollo local**, usa la IP de tu red local, no `localhost`
- 🔒 **Para producción**, necesitas HTTPS (Vercel/Netlify lo proporcionan gratis)
- 📱 **iOS Safari** requiere que la app esté en HTTPS para instalar como PWA
- 🔄 **Las actualizaciones** se instalan automáticamente gracias al service worker

## 🎨 Personalizar Iconos

Los iconos actuales son placeholders. Para personalizarlos:

1. Crea iconos de 192x192 y 512x512 píxeles
2. Guárdalos como `public/pwa-192x192.png` y `public/pwa-512x512.png`
3. Crea `public/apple-touch-icon.png` (180x180) para iOS
4. Reinicia el servidor

## ✅ Verificar que Funciona

1. Abre la app en el móvil
2. Abre las herramientas de desarrollador (si es posible)
3. Ve a la pestaña "Application" → "Service Workers"
4. Deberías ver un service worker registrado
5. En "Manifest", deberías ver la información de la PWA


