/**
 * Servidor proxy usando Puppeteer para obtener datos reales de AENA
 * Puppeteer controla un navegador real, por lo que puede ejecutar JavaScript
 */

import http from 'http';
import puppeteer from 'puppeteer';

const PORT = process.env.FLIGHT_PROXY_PORT || 3002;
const SEVILLA_AIRPORT_CODE = 'SVQ';

let browser = null;

/**
 * Inicializa el navegador de Puppeteer
 */
async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

/**
 * Obtiene datos reales de AENA usando Puppeteer
 */
async function fetchAenaDataWithPuppeteer(airportCode) {
    const browser = await initBrowser();
    const page = await browser.newPage();
    
    try {
        // URL correcta de AENA para información de vuelos de Sevilla
        // Usar la fecha de hoy
        const hoy = new Date();
        const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
        const url = `https://www.aena.es/es/infovuelos.html?codIata=SVQ&fechaSalida=${fechaStr}&fechaLlegada=${fechaStr}`;
        console.log(`Navegando a: ${url}`);
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Esperar a que se carguen los datos (puede tardar)
        await page.waitForTimeout(5000);
        
        // Intentar esperar a que aparezcan las tablas de vuelos
        try {
            await page.waitForSelector('table, tbody tr', { timeout: 15000 });
        } catch (e) {
            console.log('No se encontraron tablas, continuando con extracción general...');
        }
        
        // Esperar un poco más para que se carguen todos los datos dinámicos
        await page.waitForTimeout(2000);
        
        // Extraer datos de la página
        const datos = await page.evaluate(() => {
            const llegadas = [];
            const salidas = [];
            
            // Buscar todas las tablas en la página
            const tables = document.querySelectorAll('table');
            
            // Buscar específicamente las tablas de AENA que tienen estructura específica
            tables.forEach((table, tableIndex) => {
                const rows = table.querySelectorAll('tbody tr');
                if (rows.length === 0) return;
                
                // Verificar si es tabla de llegadas o salidas por el contexto
                const tableHeaders = table.querySelectorAll('th');
                const headerText = Array.from(tableHeaders).map(th => th.textContent.toLowerCase()).join(' ');
                const isLlegadas = headerText.includes('llegada') || headerText.includes('arrival') || 
                                 headerText.includes('origen') || headerText.includes('origin');
                const isSalidas = headerText.includes('salida') || headerText.includes('departure') || 
                                headerText.includes('destino') || headerText.includes('destination');
                
                // Si no está claro, intentar determinar por la estructura de columnas
                let esTablaVuelos = false;
                if (tableHeaders.length >= 4) {
                    const columnas = Array.from(tableHeaders).map(th => th.textContent.toLowerCase());
                    esTablaVuelos = columnas.some(col => 
                        col.includes('vuelo') || col.includes('flight') || 
                        col.includes('hora') || col.includes('time') ||
                        col.includes('compañía') || col.includes('airline')
                    );
                }
                
                if (!esTablaVuelos && !isLlegadas && !isSalidas) return;
                
                rows.forEach((row, rowIndex) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 3) return; // AENA tiene al menos 3 columnas
                    
                    const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
                    
                    // En AENA, la estructura típica es:
                    // [Hora, Vuelo, Compañía, Destino/Origen, Terminal, Mostrador, Puerta, Estado]
                    let horaProgramada = null;
                    let horaEstimada = null;
                    let numeroVuelo = null;
                    let aerolinea = null;
                    let origen = null;
                    let destino = null;
                    let terminal = null;
                    let puerta = null;
                    let retraso = 0;
                    let estado = 'a_tiempo';
                    
                    // Procesar cada celda según su posición típica en AENA
                    cellTexts.forEach((text, cellIndex) => {
                        // Primera columna generalmente es la hora
                        if (cellIndex === 0) {
                            const horaMatch = text.match(/(\d{1,2}):(\d{2})/);
                            if (horaMatch) {
                                horaProgramada = horaMatch[1].padStart(2, '0') + ':' + horaMatch[2].padStart(2, '0');
                            }
                        }
                        
                        // Buscar número de vuelo en cualquier celda (formato: VLG2221, IBE5171, etc.)
                        const vueloMatch = text.match(/([A-Z]{2,3})(\d{3,4})/);
                        if (vueloMatch && !numeroVuelo) {
                            numeroVuelo = vueloMatch[1] + '-' + vueloMatch[2];
                            // Mapeo de códigos de aerolíneas de AENA
                            const aerolineas = {
                                'IBE': 'Iberia', 'IB': 'Iberia', 'VLG': 'Vueling', 'VY': 'Vueling',
                                'RYR': 'Ryanair', 'FR': 'Ryanair', 'AF': 'Air France',
                                'AAL': 'American Airlines', 'QTR': 'Qatar Airways',
                                'LVL': 'LEVEL', 'TVF': 'Transavia', 'EW': 'Eurowings',
                                'TP': 'TAP', 'BA': 'British Airways', 'LH': 'Lufthansa',
                                'UX': 'Air Europa', 'SN': 'Brussels Airlines'
                            };
                            const codigo = vueloMatch[1];
                            aerolinea = aerolineas[codigo] || codigo;
                        }
                        
                        // Buscar destino/origen (generalmente en columna 3 o 4)
                        if ((cellIndex === 3 || cellIndex === 4) && text.length > 3 && text.length < 100) {
                            if (isSalidas && !destino && !text.match(/terminal|puerta|mostrador|embarque/i)) {
                                destino = text.split('/')[0].trim(); // Tomar solo la primera parte antes de /
                            } else if (isLlegadas && !origen && !text.match(/terminal|puerta|mostrador|embarque/i)) {
                                origen = text.split('/')[0].trim();
                            }
                        }
                        
                        // Buscar terminal (generalmente columna 4 o 5)
                        if ((cellIndex === 4 || cellIndex === 5) && /^T?\d+$/.test(text)) {
                            terminal = text.startsWith('T') ? text : `T${text}`;
                        }
                        
                        // Buscar puerta (generalmente columna 6 o 7)
                        if ((cellIndex === 6 || cellIndex === 7) && /^[A-Z]?\d+$/.test(text)) {
                            puerta = text;
                        }
                        
                        // Buscar estado (última columna generalmente)
                        if (cellIndex === cellTexts.length - 1 || cellIndex === cellTexts.length - 2) {
                            const estadoText = text.toLowerCase();
                            if (estadoText.includes('retrasado') || estadoText.includes('delayed')) {
                                estado = 'retrasado';
                                // Intentar extraer minutos de retraso
                                const retrasoMatch = text.match(/(\d+)\s*(?:min|minutos?)/i);
                                if (retrasoMatch) {
                                    retraso = parseInt(retrasoMatch[1]);
                                }
                            } else if (estadoText.includes('embarcando') || estadoText.includes('boarding')) {
                                estado = 'embarcando';
                            } else if (estadoText.includes('cerrado') || estadoText.includes('closed')) {
                                estado = 'cancelado';
                            } else if (estadoText.includes('llamada') || estadoText.includes('call')) {
                                estado = 'embarcando';
                            }
                        }
                    });
                    
                    if (horaProgramada && numeroVuelo) {
                        // Calcular hora estimada si hay retraso y no se encontró explícitamente
                        if (!horaEstimada && retraso > 0) {
                            const partes = horaProgramada.split(':');
                            const h = parseInt(partes[0]);
                            const m = parseInt(partes[1]);
                            const totalMin = h * 60 + m + retraso;
                            const nuevasHoras = Math.floor(totalMin / 60) % 24;
                            const nuevosMin = totalMin % 60;
                            const horasStr = nuevasHoras < 10 ? '0' + nuevasHoras : String(nuevasHoras);
                            const minStr = nuevosMin < 10 ? '0' + nuevosMin : String(nuevosMin);
                            horaEstimada = horasStr + ':' + minStr;
                        }
                        
                        // Determinar tipo de vuelo (Internacional si destino/origen no es España)
                        const destinosEspana = ['madrid', 'barcelona', 'valencia', 'málaga', 'sevilla', 'bilbao', 'alicante', 'palma', 'gran canaria'];
                        const destinoLower = destino ? destino.toLowerCase() : '';
                        const origenLower = origen ? origen.toLowerCase() : '';
                        const esInternacional = (destino && !destinosEspana.some(d => destinoLower.includes(d))) ||
                                             (origen && !destinosEspana.some(d => origenLower.includes(d)));
                        
                        const vuelo = {
                            numeroVuelo: numeroVuelo,
                            aerolinea: aerolinea || 'N/A',
                            horaProgramada: horaProgramada,
                            horaEstimada: horaEstimada,
                            origen: isLlegadas ? (origen || 'N/A') : 'Sevilla',
                            destino: isLlegadas ? 'Sevilla' : (destino || 'N/A'),
                            retraso: retraso,
                            estado: estado,
                            terminal: terminal || 'T1',
                            puerta: puerta,
                            tipoVuelo: esInternacional ? 'Internacional' : 'Nacional',
                        };
                        
                        if (isLlegadas) {
                            llegadas.push(vuelo);
                        } else if (isSalidas) {
                            salidas.push(vuelo);
                        } else {
                            // Si no está claro, alternar entre llegadas y salidas
                            if (llegadas.length <= salidas.length) {
                                llegadas.push(vuelo);
                            } else {
                                salidas.push(vuelo);
                            }
                        }
                    }
                });
            });
            
            // Si no encontramos datos en tablas, intentar buscar en toda la página
            if (llegadas.length === 0 && salidas.length === 0) {
                // Buscar cualquier texto que parezca un número de vuelo
                const vueloPattern = /([A-Z]{2})[\s\-]?(\d{3,4})/g;
                const horaPattern = /(\d{1,2}):(\d{2})/g;
                const pageText = document.body.innerText;
                
                // Buscar todas las horas en la página
                const horas = [];
                let horaMatch;
                while ((horaMatch = horaPattern.exec(pageText)) !== null) {
                    horas.push({
                        hora: horaMatch[0],
                        index: horaMatch.index
                    });
                }
                
                // Buscar números de vuelo cerca de las horas
                horas.slice(0, 20).forEach((horaInfo, idx) => {
                    const contextStart = Math.max(0, horaInfo.index - 100);
                    const contextEnd = Math.min(pageText.length, horaInfo.index + 200);
                    const context = pageText.substring(contextStart, contextEnd);
                    
                    const vueloMatch = context.match(vueloPattern);
                    if (vueloMatch) {
                        const vueloNum = vueloMatch[0].replace(/\s/g, '-');
                        const aerolineas = {
                            'IB': 'Iberia', 'VY': 'Vueling', 'FR': 'Ryanair', 
                            'AF': 'Air France', 'EW': 'Eurowings', 'TP': 'TAP',
                            'AZ': 'Alitalia', 'BA': 'British Airways', 'LH': 'Lufthansa',
                            'UX': 'Air Europa', 'SN': 'Brussels Airlines'
                        };
                        const codigo = vueloNum.substring(0, 2);
                        const aerolinea = aerolineas[codigo] || codigo;
                        
                        // Determinar si es llegada o salida basándose en el contexto
                        const esLlegada = context.toLowerCase().includes('llegada') || 
                                         context.toLowerCase().includes('arrival') ||
                                         idx % 2 === 0;
                        
                        const vuelo = {
                            numeroVuelo: vueloNum,
                            aerolinea: aerolinea,
                            horaProgramada: horaInfo.hora,
                            horaEstimada: null,
                            origen: esLlegada ? 'N/A' : 'Sevilla',
                            destino: esLlegada ? 'Sevilla' : 'N/A',
                            retraso: 0,
                            estado: 'a_tiempo',
                            terminal: 'T1',
                            puerta: null,
                            tipoVuelo: 'Nacional',
                        };
                        
                        if (esLlegada) {
                            llegadas.push(vuelo);
                        } else {
                            salidas.push(vuelo);
                        }
                    }
                });
            }
            
            return { llegadas, salidas };
        });
        
        console.log(`Datos extraídos: ${datos.llegadas.length} llegadas, ${datos.salidas.length} salidas`);
        return datos;
        
    } catch (error) {
        console.error('Error con Puppeteer:', error);
        throw error;
    } finally {
        await page.close();
    }
}

/**
 * Servidor HTTP
 */
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
        const data = await fetchAenaDataWithPuppeteer(airportCode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Internal server error', 
            details: error.message,
            llegadas: [],
            salidas: []
        }));
    }
});

server.listen(PORT, () => {
    console.log(`✈️ Servidor proxy de vuelos escuchando en puerto ${PORT}`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/airport/${SEVILLA_AIRPORT_CODE}`);
    console.log(`✅ Usando navegador real para obtener datos de AENA`);
});

// Cerrar navegador al terminar
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

