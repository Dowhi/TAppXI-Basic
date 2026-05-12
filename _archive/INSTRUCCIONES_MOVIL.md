# 📱 Cómo Usar TAppXI en el Móvil

## 🚀 Pasos Rápidos

### 1. Iniciar el Servidor

```bash
npm run dev
```

Verás algo como:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

**¡Importante!** Anota la URL que dice "Network" (no "Local").

### 2. Conectar desde el Móvil

1. **Asegúrate de que tu móvil y tu PC estén en la misma red WiFi**
2. Abre el navegador en tu móvil (Chrome, Safari, Firefox, etc.)
3. Escribe la URL "Network" que viste antes (ejemplo: `http://192.168.1.100:5173`)
4. La app debería cargar

### 3. Instalar como App (PWA)

Una vez que la app cargue en el móvil:

**Android (Chrome/Edge):**
- Verás un banner que dice "Instalar app" o "Añadir a pantalla de inicio"
- Toca "Instalar" o "Añadir"
- La app se instalará como una aplicación nativa

**iOS (Safari):**
- Toca el botón de compartir (cuadrado con flecha arriba) en la barra inferior
- Desplázate y selecciona "Añadir a pantalla de inicio"
- Personaliza el nombre si quieres (por defecto será "TAppXI")
- Toca "Añadir" en la esquina superior derecha

## 🎨 Generar Iconos (Opcional)

Los iconos actuales son placeholders. Para crear iconos personalizados:

### Opción 1: Usar el Generador HTML (Recomendado)

1. Abre `public/generate-icons.html` en tu navegador
2. Haz clic en los botones para generar los iconos PNG
3. Los iconos se descargarán automáticamente
4. Muévelos a la carpeta `public/` con estos nombres:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png` (180x180)

### Opción 2: Crear Manualmente

Crea iconos de:
- 192x192 píxeles → `public/pwa-192x192.png`
- 512x512 píxeles → `public/pwa-512x512.png`
- 180x180 píxeles → `public/apple-touch-icon.png`

## 🔧 Solución de Problemas

### No puedo acceder desde el móvil

**Problema:** El móvil no puede conectarse a la IP.

**Soluciones:**
1. Verifica que ambos dispositivos estén en la misma WiFi
2. Verifica el firewall de Windows:
   - Ve a "Configuración" → "Firewall de Windows"
   - Permite Node.js o el puerto 5173
3. Prueba con la IP correcta (la que muestra Vite en "Network")

### La app no se instala como PWA

**Problema:** No aparece la opción de instalar.

**Soluciones:**
1. **Android:** Asegúrate de usar Chrome o Edge (no Firefox)
2. **iOS:** Debes usar Safari (no Chrome)
3. Limpia la caché del navegador
4. Verifica que el manifest funcione:
   - Abre `http://TU_IP:5173/manifest.webmanifest` en el navegador
   - Debe mostrar un JSON válido

### Los iconos no aparecen

**Problema:** Los iconos son placeholders o no se ven.

**Solución:**
1. Genera los iconos usando `public/generate-icons.html`
2. O crea tus propios iconos y guárdalos en `public/`
3. Reinicia el servidor después de añadir los iconos

## 📝 Notas Importantes

- ✅ **En desarrollo:** La app funciona en `http://TU_IP:5173` (red local)
- ✅ **PWA habilitada:** La app se puede instalar como aplicación nativa
- ✅ **Modo offline:** Después de la primera carga, funciona sin internet
- ⚠️ **Firebase:** Necesitas conexión a internet para sincronizar datos
- 🔄 **Actualizaciones:** Se instalan automáticamente cuando hay nueva versión

## 🌐 Desplegar en Internet (Opcional)

Para que la app sea accesible desde cualquier lugar:

1. **Vercel (Recomendado - Gratis):**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify:**
   - Ve a [netlify.com](https://netlify.com)
   - Arrastra la carpeta `dist` después de `npm run build`

3. **GitHub Pages:**
   ```bash
   npm run deploy
   ```

## ✅ Verificar que Funciona

1. Abre la app en el móvil
2. Deberías poder instalarla como PWA
3. Una vez instalada, se abre como app nativa (sin barra del navegador)
4. Funciona offline (después de la primera carga)

¡Listo! Tu app ahora funciona en móvil. 🎉


