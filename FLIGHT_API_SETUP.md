# AviationStack API - Configuración para Datos de Vuelos en Tiempo Real

Esta aplicación utiliza AviationStack API para mostrar información en tiempo real de vuelos del Aeropuerto de Sevilla (SVQ).

## Paso 1: Registro en AviationStack

1. Visita https://aviationstack.com/signup/free
2. Crea una cuenta gratuita
3. Verifica tu email

## Paso 2: Obtener API Key

1. Inicia sesión en tu cuenta de AviationStack
2. Ve al Dashboard
3. Copia tu **API Access Key**

## Paso 3: Configurar Variables de Entorno

1. En la raíz del proyecto, crea un archivo `.env` (si no existe)
2. Agrega la siguiente línea:

```env
VITE_AVIATIONSTACK_API_KEY=tu_api_key_aqui
```

3. Reemplaza `tu_api_key_aqui` con tu API key real

## Paso 4: Verificar Funcionamiento

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Navega a la sección "Aeropuerto San Pablo"

3. Deberías ver:
   - Badge "✅ Datos Reales" en verde
   - Vuelos reales de llegadas y salidas
   - Actualización automática cada 60 segundos

## Límites del Plan Gratuito

- **500 llamadas API por mes**
- Datos actualizados en tiempo real
- Suficiente para ~16 actualizaciones diarias si se usa continuamente

## Solución de Problemas

### No veo datos de vuelos

1. Verifica que tu API key esté correctamente configurada en `.env`
2. Revisa la consola del navegador para errores
3. Asegúrate de que el archivo `.env` esté en la raíz del proyecto
4. Reinicia el servidor después de agregar la API key

### Error de API

- Verifica que tu API key sea válida
- Revisa que no hayas excedido el límite de 500 llamadas/mes
- Consulta https://aviationstack.com/documentation para más información

## Nota Importante

⚠️ **No compartas tu API key públicamente**. El archivo `.env` está incluido en `.gitignore` para evitar que se suba a GitHub.
