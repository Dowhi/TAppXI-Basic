# Información de Vuelos - Aeropuerto de Sevilla

Este documento explica cómo configurar y usar la funcionalidad de información de vuelos del Aeropuerto de San Pablo (Sevilla).

## Descripción

La aplicación muestra información en tiempo real (o aproximada) sobre las llegadas y salidas de vuelos en el Aeropuerto de Sevilla (SVQ).

## Configuración

### Opción 1: Datos Aproximados (Sin servidor proxy)

Por defecto, la aplicación muestra horarios aproximados basados en vuelos típicos del aeropuerto. No requiere configuración adicional.

### Opción 2: Datos Reales (Con servidor proxy)

Para obtener datos reales del aeropuerto, necesitas ejecutar un servidor proxy que hace scraping de la web de AENA.

#### Requisitos

- Node.js instalado
- Puppeteer instalado (se instala automáticamente con `npm install`)

#### Pasos

1. **Instalar dependencias** (si no están instaladas):
   ```bash
   npm install puppeteer
   ```

2. **Configurar variable de entorno**:
   Crea o edita el archivo `.env` en la raíz del proyecto y agrega:
   ```
   VITE_FLIGHT_PROXY_URL=http://localhost:3002
   ```

3. **Iniciar el servidor proxy**:
   ```bash
   node scripts/flight-proxy-server-simple.js
   ```
   
   **Nota importante**: El servidor mostrará logs en la consola. Si no extrae datos, revisa los logs para ver qué está pasando. AENA puede tener protecciones anti-bot o cambiar su estructura HTML.

4. **Verificar que funciona**:
   Abre tu navegador y visita:
   ```
   http://localhost:3002/airport/SVQ
   ```
   
   Deberías ver un JSON. Si los arrays están vacíos, el servidor funciona pero no está extrayendo datos (revisa los logs del servidor).

   El servidor se iniciará en el puerto 3002 (por defecto).

4. **Verificar que funciona**:
   Abre tu navegador y visita:
   ```
   http://localhost:3002/airport/SVQ
   ```

   Deberías ver un JSON con datos de llegadas y salidas.

5. **Reiniciar la aplicación web**:
   Si la aplicación ya estaba corriendo, reiníciala para que cargue la nueva variable de entorno.

## Uso

1. Desde la pantalla principal (HomeScreen), haz clic en el botón "Aeropuerto" con el icono de avión.

2. Verás dos pestañas:
   - **Llegadas**: Vuelos que están llegando al aeropuerto
   - **Salidas**: Vuelos que están saliendo del aeropuerto

3. Los datos se actualizan automáticamente cada 60 segundos.

4. Cada vuelo muestra:
   - Número de vuelo
   - Aerolínea
   - Origen/Destino
   - Hora programada
   - Hora estimada (si hay retraso)
   - Estado (A tiempo, Retrasado, etc.)
   - Terminal y Puerta (si está disponible)

## Notas Importantes

- **Datos Reales**: El servidor proxy intenta obtener datos reales de la web de AENA usando Puppeteer. Sin embargo, AENA puede tener protecciones anti-bot o cambiar la estructura de su web, lo que podría hacer que el scraping falle.

- **Datos Aproximados**: Si el servidor proxy no está disponible o falla, la aplicación mostrará horarios aproximados basados en vuelos típicos del aeropuerto. Estos son útiles como referencia pero no son datos en tiempo real.

- **Actualización Automática**: Los datos se actualizan automáticamente cada minuto. Puedes ver la última actualización en la parte superior de la pantalla.

- **Indicadores**:
  - ✅ **Datos Reales**: Se están obteniendo datos reales del servidor proxy
  - 📋 **Horarios Aproximados**: Se están mostrando datos de ejemplo

## Solución de Problemas

### El servidor proxy no inicia

- Verifica que Node.js esté instalado: `node --version`
- Verifica que Puppeteer esté instalado: `npm list puppeteer`
- Revisa los logs del servidor para ver errores específicos

### El servidor responde pero no extrae datos

- La estructura de la web de AENA puede haber cambiado
- AENA puede tener protecciones anti-bot activas
- Revisa la consola del servidor para ver qué está pasando

### La aplicación no muestra datos reales

- Verifica que la variable `VITE_FLIGHT_PROXY_URL` esté configurada en `.env`
- Reinicia la aplicación después de cambiar `.env`
- Verifica que el servidor proxy esté corriendo en el puerto correcto
- Abre las herramientas de desarrollador del navegador y revisa la consola para ver errores

## Información Oficial

Para información oficial y actualizada en tiempo real, consulta:
- [AENA - Aeropuerto de Sevilla](https://www.aena.es/es/sevilla/sevilla.html)

