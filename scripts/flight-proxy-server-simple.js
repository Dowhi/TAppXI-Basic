/**
 * Servidor proxy simplificado para obtener datos reales de AENA
 * Versión simplificada y más robusta
 */

import http from 'http';
import puppeteer from 'puppeteer';

const PORT = process.env.FLIGHT_PROXY_PORT || 3002;
const SEVILLA_AIRPORT_CODE = 'SVQ';

let browser = null;

async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

async function fetchAenaDataWithPuppeteer(airportCode) {
    const browser = await initBrowser();
    const page = await browser.newPage();

    try {
        // URL directa de AENA para vuelos de Sevilla (sin fechas para que coja el día actual por defecto)
        const url = `https://www.aena.es/es/infovuelos.html`;
        console.log(`Navegando a: ${url}`);

        // Configurar user agent para evitar bloqueos
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('Página cargada, esperando contenido...');

        // Esperar a que cargue el selector de aeropuerto si estamos en la home
        // O si redirige, esperar a la tabla
        await page.waitForTimeout(5000);

        // Si estamos en la home de infovuelos, intentar seleccionar SVQ si no lo ha cogido
        // Pero mejor asumimos que la URL con parámetros funciona o intentamos navegar

        // Intentar ir directamente a la página de resultados si no estamos en ella
        if (!page.url().includes('codIata=SVQ')) {
            console.log('Redirigiendo a URL específica de SVQ...');
            const hoy = new Date();
            const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            const searchUrl = `https://www.aena.es/es/infovuelos.html?codIata=SVQ&fechaSalida=${fechaStr}&fechaLlegada=${fechaStr}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        }

        console.log('Esperando tabla de vuelos...');
        try {
            await page.waitForSelector('table', { timeout: 20000 });
            console.log('Tabla encontrada');
        } catch (e) {
            console.log('Timeout esperando tabla, intentando continuar...');
        }

        // Extraer datos
        const datos = await page.evaluate(() => {
            console.log('Iniciando extracción de datos...');
            const llegadas = [];
            const salidas = [];

            // Buscar todas las filas de la tabla principal
            // AENA suele usar tablas con clases como 'table' o dentro de contenedores específicos
            const rows = Array.from(document.querySelectorAll('tr'));
            console.log(`Total filas encontradas: ${rows.length}`);

            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 5) return; // Filtrar filas que no sean de datos

                const rowText = cells.map(c => c.innerText.trim());
                // Estructura típica AENA: Hora | Vuelo | Compañía | Destino/Origen | Terminal | ... | Estado

                // Intentar detectar si es una fila de vuelo válida
                // Patrón de hora: HH:MM
                const horaMatch = rowText[0].match(/(\d{2}:\d{2})/);
                if (!horaMatch) return;

                const hora = horaMatch[1];
                const vuelo = rowText[1] || '';
                const compania = rowText[2] || '';
                const ciudad = rowText[3] || ''; // Destino u Origen
                const terminal = rowText[4] || '';
                // A veces hay columnas ocultas o diferentes, ajustamos dinámicamente
                const estado = rowText[rowText.length - 1] || '';
                const puerta = rowText.find(t => t.match(/^[A-Z]\d+$/) || t.match(/^Gate/)) || '';

                // Determinar si es Salida o Llegada
                // AENA suele tener pestañas. Miramos si hay algún indicador activo.
                // Por defecto, si no podemos saberlo, lo metemos en salidas si parece salida
                const isSalida = document.querySelector('.active')?.innerText.includes('Salida') ||
                    document.body.innerText.includes('Salidas') || true; // Asumimos salidas por defecto si no

                const vueloData = {
                    numeroVuelo: vuelo,
                    aerolinea: compania,
                    origen: isSalida ? 'Sevilla' : ciudad,
                    destino: isSalida ? ciudad : 'Sevilla',
                    horaProgramada: hora,
                    horaEstimada: null,
                    retraso: 0,
                    estado: estado,
                    terminal: terminal,
                    puerta: puerta,
                    tipoVuelo: 'Nacional' // Placeholder
                };

                if (isSalida) {
                    salidas.push(vueloData);
                } else {
                    llegadas.push(vueloData);
                }
            });

            return { llegadas, salidas };
        });

        console.log(`Datos extraídos: ${datos.llegadas.length} llegadas, ${datos.salidas.length} salidas`);
        return datos;

    } catch (error) {
        console.error('Error con Puppeteer:', error);
        return { llegadas: [], salidas: [] };
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        browser = null; // Reset browser instance
    }
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathMatch = url.pathname.match(/^\/airport\/([A-Z]{3})$/);

    if (!pathMatch) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    const airportCode = pathMatch[1];
    console.log(`Solicitud recibida para aeropuerto ${airportCode}`);

    try {
        console.log(`Iniciando extracción de datos para ${airportCode}...`);
        const data = await fetchAenaDataWithPuppeteer(airportCode);
        console.log(`Extracción completada: ${data.llegadas.length} llegadas, ${data.salidas.length} salidas`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        console.error('Stack:', error.stack);
        res.writeHead(200, { 'Content-Type': 'application/json' }); // 200 para que la app pueda manejar arrays vacíos
        res.end(JSON.stringify({
            error: 'No se pudieron obtener datos',
            details: error.message,
            llegadas: [],
            salidas: []
        }));
    }
});

server.listen(PORT, () => {
    console.log(`✈️ Servidor proxy de vuelos escuchando en puerto ${PORT}`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/airport/${SEVILLA_AIRPORT_CODE}`);
});

process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

