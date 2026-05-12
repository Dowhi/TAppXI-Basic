# 📱 TAppXI en Móvil - Guía Rápida

## 🚀 Acceso Rápido desde el Móvil

### Paso 1: Iniciar el Servidor

```bash
npm run dev
```

Verás algo como:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

### Paso 2: Conectar desde el Móvil

1. **Asegúrate de que tu móvil esté en la misma WiFi que tu PC**
2. Abre el navegador en tu móvil
3. Ve a la URL que dice "Network" (ejemplo: `http://192.168.1.100:5173`)

### Paso 3: Instalar como App

**Android:**
- Verás un banner "Instalar app" → Toca "Instalar"

**iOS:**
- Toca el botón de compartir (□↑) → "Añadir a pantalla de inicio"

## 🎨 Generar Iconos

1. Abre `public/generate-icons.html` en tu navegador
2. Haz clic en los botones para generar los iconos
3. Los iconos se descargarán automáticamente
4. Muévelos a la carpeta `public/`

## ✅ Verificar

- Abre la app en el móvil
- Deberías poder instalarla como PWA
- Funciona offline (después de la primera carga)


