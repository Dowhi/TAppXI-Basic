# 🚂 Configuración de Trenes en Tiempo Real - Sevilla Santa Justa

## 📋 Resumen

Este sistema obtiene datos **REALES en tiempo real** de llegadas y salidas de trenes de la estación Sevilla Santa Justa usando scraping de ADIF. **NUNCA muestra datos simulados**.

## 🚀 Inicio Rápido

### Paso 1: Ejecutar el Servidor Proxy

Abre una terminal y ejecuta:

```bash
npm run train-proxy
```

El servidor se iniciará en `http://localhost:3001` y mostrará:

```
🚂 ============================================
🚂 Servidor Proxy de Trenes ADIF - Santa Justa
🚂 ============================================
📡 Escuchando en puerto 3001
🌐 Health check: http://localhost:3001/health
📊 Datos: http://localhost:3001/station/51003
✅ Usando Puppeteer para extraer datos REALES de ADIF
⏱️  Cache: 30 segundos
```

### Paso 2: Ejecutar la Aplicación

En otra terminal, ejecuta:

```bash
npm run dev
```

La aplicación detectará automáticamente el proxy y obtendrá datos reales de ADIF.

## ⚙️ Configuración Opcional

Si quieres cambiar el puerto del proxy, crea un archivo `.env` en la raíz del proyecto:

```env
VITE_TRAIN_PROXY_URL=http://localhost:3001
TRAIN_PROXY_PORT=3001
```

Por defecto, la aplicación usa `http://localhost:3001` si no hay configuración.

## 🔍 Cómo Funciona

1. **Proxy Server** (`scripts/train-proxy-server-final.js`):
   - Usa Puppeteer para abrir un navegador real
   - Accede a la página de ADIF de Santa Justa
   - Extrae datos reales de llegadas y salidas
   - Cachea datos por 30 segundos para no sobrecargar ADIF
   - Expone una API REST simple

2. **Servicio Frontend** (`services/trainStation.ts`):
   - Intenta conectarse al proxy automáticamente
   - Verifica disponibilidad con health check
   - Si el proxy no está disponible, muestra pantalla vacía (NUNCA datos simulados)
   - Actualiza datos cada 60 segundos automáticamente

## 📡 Endpoints del Proxy

### Health Check
```
GET http://localhost:3001/health
```

Responde:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "cacheAge": 15
}
```

### Datos de Estación
```
GET http://localhost:3001/station/51003
```

Responde:
```json
{
  "llegadas": [
    {
      "numeroTren": "AVE-1120",
      "origen": "Madrid-Puerta de Atocha",
      "destino": "Sevilla Santa Justa",
      "horaProgramada": "14:30",
      "horaEstimada": "14:45",
      "retraso": 15,
      "estado": "retrasado",
      "via": "Vía 3",
      "tipoTren": "AVE"
    }
  ],
  "salidas": [...]
}
```

## ⚠️ Importante

- **El proxy DEBE estar ejecutándose** para obtener datos reales
- Si el proxy no está disponible, la aplicación mostrará una pantalla vacía (no datos simulados)
- El proxy usa cache de 30 segundos para no sobrecargar ADIF
- Los datos son extraídos en tiempo real del sitio oficial de ADIF

## 🛠️ Solución de Problemas

### El proxy no se conecta

1. Verifica que el puerto 3001 no esté en uso:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :3001
   
   # Si está en uso, cambia el puerto en .env
   ```

2. Verifica que Puppeteer esté instalado:
   ```bash
   npm list puppeteer
   ```

3. Revisa los logs del proxy para errores

### No se muestran datos

1. Verifica que el proxy esté ejecutándose:
   ```bash
   curl http://localhost:3001/health
   ```

2. Verifica la consola del navegador para errores

3. Revisa los logs del proxy para ver si ADIF devuelve datos

### El navegador Puppeteer no se inicia

1. Instala las dependencias del sistema si es necesario
2. En Linux, puede necesitar:
   ```bash
   sudo apt-get install -y chromium-browser
   ```

## 📊 Datos que se Extraen

- **Número de tren** (AVE-1120, MD-5447, etc.)
- **Tipo de tren** (AVE, Alvia, Media Distancia, etc.)
- **Origen/Destino**
- **Hora programada**
- **Hora estimada** (si hay retraso)
- **Retraso en minutos**
- **Estado** (a tiempo, retrasado, cancelado, llegado, salido)
- **Vía/Plataforma**

## 🔒 Privacidad y Uso

- Este sistema es para **uso personal**
- Los datos se obtienen del sitio público de ADIF
- No se almacenan datos personales
- No se realiza tracking ni analytics de usuarios
- El cache es temporal (solo en memoria)

## 📝 Notas Técnicas

- El proxy usa Puppeteer con navegador headless
- Los datos se actualizan automáticamente cada minuto en la app
- El cache del proxy es de 30 segundos
- Si ADIF cambia su estructura HTML, el parser puede necesitar ajustes

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs del proxy
2. Verifica la consola del navegador
3. Comprueba que ADIF esté accesible: https://www.adif.es/es/-/51003-sevilla-sta.-justa







