# 🔧 Solución: TAppXI en Móvil con Google OAuth

## ❌ Problema

Google Cloud Console **NO acepta direcciones IP locales** (como `192.168.43.13:5173`) como orígenes autorizados. Solo acepta:
- `localhost` o `127.0.0.1`
- Dominios públicos (como `.com`, `.org`, etc.)

## ✅ Solución: Usar ngrok (Túnel Público)

### Paso 1: Eliminar el URI Inválido

1. Ve a Google Cloud Console → Credenciales
2. Edita tu OAuth 2.0 Client ID
3. **Elimina** el URI `http://192.168.43.13:5173` (el que tiene error)
4. **Mantén solo:**
   - `http://127.0.0.1:5173`
   - `http://localhost:5173`
5. Guarda los cambios

### Paso 2: Iniciar ngrok

1. **Inicia tu servidor:**
   ```bash
   npm run dev
   ```

2. **En otra terminal, inicia ngrok:**
   ```bash
   ngrok http 5173
   ```

3. **Verás algo como:**
   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:5173
   ```

4. **Copia la URL HTTPS** (la que empieza con `https://`)

### Paso 3: Añadir la URL de ngrok en Google Cloud

1. Ve a Google Cloud Console → Credenciales
2. Edita tu OAuth 2.0 Client ID
3. En "Orígenes autorizados de JavaScript", añade:
   - La URL de ngrok (ejemplo: `https://abc123.ngrok-free.app`)
4. En "URIs de redireccionamiento autorizados", añade:
   - La misma URL de ngrok (ejemplo: `https://abc123.ngrok-free.app`)
5. **Guarda los cambios**

### Paso 4: Usar desde el Móvil

1. **Abre la URL de ngrok en tu móvil** (ejemplo: `https://abc123.ngrok-free.app`)
2. La app debería cargar
3. Las funciones de Google (Drive, Sheets) deberían funcionar

## 🌐 Alternativa: Desplegar en Internet (Permanente)

Si quieres una solución permanente sin usar ngrok cada vez:

### Opción A: Vercel (Recomendado - Gratis)

1. **Instala Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Despliega:**
   ```bash
   vercel
   ```

3. **Obtendrás una URL como:** `tappxi.vercel.app`

4. **Añade esa URL en Google Cloud Console** como origen autorizado

### Opción B: Netlify (Gratis)

1. Ve a [netlify.com](https://netlify.com)
2. Arrastra la carpeta `dist` (después de `npm run build`)
3. Obtendrás una URL como: `tappxi.netlify.app`
4. Añade esa URL en Google Cloud Console

## 📝 Notas Importantes

- ⚠️ **ngrok gratuito:** La URL cambia cada vez que reinicias ngrok
- 💰 **ngrok Pro:** Si pagas, puedes tener una URL fija
- 🔒 **HTTPS:** ngrok proporciona HTTPS automáticamente (necesario para PWA)
- ⏱️ **Tiempo de propagación:** Los cambios en Google Cloud pueden tardar 5-15 minutos

## 🔄 Flujo de Trabajo Recomendado

**Para desarrollo local:**
1. Usa `localhost:5173` en tu PC (funciona sin ngrok)
2. Para probar en móvil, usa ngrok

**Para producción:**
1. Despliega en Vercel/Netlify
2. Añade la URL de producción en Google Cloud
3. Usa esa URL desde cualquier dispositivo

## ✅ Verificar que Funciona

1. Abre la URL de ngrok en el móvil
2. Ve a Ajustes → "Subir a Drive" o "Hojas de cálculo de Google"
3. Debería funcionar sin errores

