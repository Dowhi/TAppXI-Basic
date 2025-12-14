# Servidor Proxy para Datos de Vuelos

Este directorio contiene un servidor proxy Node.js que maneja las llamadas a AviationStack API desde el backend, evitando problemas de CORS.

## ¿Por qué un Proxy?

AviationStack API no permite llamadas directas desde el navegador debido a restricciones CORS. Este servidor proxy:
- ✅ Maneja las llamadas API desde el servidor (Node.js)
- ✅ Permite que el frontend haga peticiones sin errores CORS
- ✅ Mantiene la API key segura en el servidor

## Instalación

1. Navega al directorio del proxy:
   ```bash
   cd proxy-server
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` basado en `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edita `.env` y agrega tu API key de AviationStack:
   ```env
   AVIATIONSTACK_API_KEY=tu_api_key_real
   PORT=3003
   ```

## Uso

### Iniciar el servidor

```bash
npm start
```

O para desarrollo con auto-reload:

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3003`

### Verificar que funciona

Abre en tu navegador:
```
http://localhost:3003/health
```

Deberías ver:
```json
{
  "status": "ok",
  "message": "Flight data proxy server is running",
  "timestamp": "2025-12-10T08:37:00.000Z"
}
```

## Endpoints

### `GET /health`
Health check del servidor

### `GET /api/flights`
Obtiene datos de vuelos de AviationStack

**Parámetros de query:**
- `arr_iata`: Código IATA del aeropuerto de llegada (ej: `SVQ`)
- `dep_iata`: Código IATA del aeropuerto de salida (ej: `SVQ`)
- `flight_status`: Estados de vuelos (default: `scheduled,active,landed,departed`)
- `limit`: Número máximo de resultados (default: `20`)

**Ejemplo:**
```
http://localhost:3003/api/flights?arr_iata=SVQ&limit=10
```

## Uso con la Aplicación

1. **Inicia el proxy server** (en una terminal):
   ```bash
   cd proxy-server
   npm start
   ```

2. **Inicia la aplicación** (en otra terminal):
   ```bash
   npm run dev
   ```

3. La aplicación automáticamente usará el proxy en `http://localhost:3003`

## Configuración

Puedes cambiar la URL del proxy editando `.env` en la raíz del proyecto:

```env
VITE_FLIGHT_PROXY_URL=http://localhost:3003
```

## Despliegue en Producción

Para producción, necesitarás:

1. **Desplegar el proxy server** en un servicio como:
   - Heroku
   - Railway
   - Render
   - Vercel (Serverless Functions)

2. **Actualizar la URL del proxy** en las variables de entorno de producción:
   ```env
   VITE_FLIGHT_PROXY_URL=https://tu-proxy-server.herokuapp.com
   ```

3. **Configurar la API key** en las variables de entorno del servidor proxy

## Solución de Problemas

### El proxy no inicia

- Verifica que el puerto 3003 no esté en uso
- Asegúrate de haber ejecutado `npm install`
- Verifica que el archivo `.env` exista y tenga la API key

### Errores CORS

- Verifica que el proxy esté corriendo
- Asegúrate de que la URL del proxy en `.env` sea correcta
- Revisa que el origen del frontend esté permitido en `server.js`

### No se muestran vuelos

- Verifica que la API key sea válida
- Revisa los logs del proxy server
- Confirma que no hayas excedido el límite de 500 llamadas/mes
