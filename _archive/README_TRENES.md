# Información de Trenes - Estación Santa Justa

## Estado Actual

Esta funcionalidad está implementada pero **actualmente muestra datos de ejemplo** porque Renfe/ADIF no proporcionan una API pública oficial.

## Opciones para Obtener Datos Reales

### Opción 1: Servidor Proxy (Recomendado)

He creado un script de servidor proxy (`scripts/train-proxy-server.js`) que puede hacer scraping de la página de ADIF.

**Pasos para usar:**

1. **Instalar dependencias** (si es necesario):
   ```bash
   npm install cheerio  # Para parsing HTML más robusto
   ```

2. **Ejecutar el servidor proxy**:
   ```bash
   node scripts/train-proxy-server.js
   ```

3. **Configurar variable de entorno** en `.env`:
   ```
   VITE_TRAIN_PROXY_URL=http://localhost:3001
   ```

4. **Reiniciar la aplicación**:
   ```bash
   npm run dev
   ```

**Nota:** El script actual es básico y puede necesitar ajustes según la estructura HTML real de ADIF.

### Opción 2: Usar Puppeteer (Más Robusto)

Para un scraping más robusto, puedes usar Puppeteer:

```bash
npm install puppeteer
```

Luego modificar `scripts/train-proxy-server.js` para usar Puppeteer en lugar de fetch directo.

### Opción 3: Backend Dedicado

Crear un backend separado (Node.js, Python, etc.) que:
- Haga scraping de ADIF periódicamente
- Cachee los datos
- Proporcione una API REST simple
- Maneje errores y reintentos

### Opción 4: API de Terceros

Buscar servicios de terceros que proporcionen información de trenes:
- Algunos servicios pueden tener APIs disponibles
- Pueden requerir registro o pago

## Estructura de Datos

El servicio espera datos en el siguiente formato:

```json
{
  "llegadas": [
    {
      "numeroTren": "AVE-1234",
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
  "salidas": [
    {
      "numeroTren": "AVE-5678",
      "origen": "Sevilla Santa Justa",
      "destino": "Barcelona-Sants",
      "horaProgramada": "15:00",
      "horaEstimada": null,
      "retraso": 0,
      "estado": "a_tiempo",
      "via": "Vía 5",
      "tipoTren": "AVE"
    }
  ]
}
```

## Mejoras Futuras

1. **Cacheo inteligente**: Cachear datos para reducir peticiones
2. **Notificaciones**: Alertas cuando hay retrasos importantes
3. **Filtros**: Filtrar por tipo de tren, destino, etc.
4. **Historial**: Guardar historial de retrasos para análisis
5. **Integración con carreras**: Relacionar carreras de taxi con llegadas/salidas de trenes

## Limitaciones Actuales

- Los datos son de ejemplo
- No hay conexión real con ADIF/Renfe
- El servidor proxy necesita ser ajustado al HTML real de ADIF
- Puede haber problemas de CORS si se intenta acceso directo

## Contacto

Si encuentras una API oficial o un método mejor para obtener estos datos, por favor actualiza este documento y el código correspondiente.
















