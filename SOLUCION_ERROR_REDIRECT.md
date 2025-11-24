# 🔧 Solución al error: "Origen no válido" (IP Local)

Si ves el error **"Origen no válido: debe terminar con un dominio de nivel superior público"**, es porque Google **NO permite** usar direcciones IP privadas (como `192.168.x.x`) por seguridad.

## ❌ Lo que NO funciona
*   Intentar añadir `http://192.168.43.14:5173` en Google Cloud Console.
*   Google rechazará cualquier IP que no sea `127.0.0.1` (localhost).

## ✅ Solución 1: Usar Localhost (Recomendado para PC)
Si estás probando en tu ordenador, simplemente usa esta dirección en tu navegador:
👉 **`http://localhost:5173`**

Asegúrate de que `http://localhost:5173` esté añadido en Google Cloud Console.

## ✅ Solución 2: Usar ngrok (Para Móvil)
Si necesitas probar **obligatoriamente** desde tu móvil, necesitas una dirección pública (HTTPS).

1.  Descarga e instala [ngrok](https://ngrok.com/download).
2.  En tu terminal, ejecuta: `ngrok http 5173`
3.  Copia la dirección HTTPS que te da (ej: `https://a1b2c3d4.ngrok-free.app`).
4.  Añade ESA dirección en Google Cloud Console (tanto en Orígenes como en Redirección).
5.  Usa esa dirección en tu móvil.

> 💡 Para más detalles sobre cómo configurar ngrok, consulta el archivo: `SOLUCION_MOVIL_GOOGLE.md`
