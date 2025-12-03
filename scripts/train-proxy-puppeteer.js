/**
 * Servidor proxy usando Puppeteer para obtener datos reales de ADIF
 * Puppeteer controla un navegador real, por lo que puede ejecutar JavaScript
 */

import http from 'http';
import puppeteer from 'puppeteer';

const PORT = process.env.TRAIN_PROXY_PORT || 3001;
const SANTA_JUSTA_CODE = '51003';

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
 * Obtiene datos reales de ADIF usando Puppeteer
 */
async function fetchAdifDataWithPuppeteer(stationCode) {
    const browser = await initBrowser();
    const page = await browser.newPage();
    
    try {
        const url = `https://www.adif.es/es/-/${stationCode}-sevilla-sta.-justa`;
        console.log(`Navegando a: ${url}`);
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Esperar a que se carguen los datos (puede tardar)
        await page.waitForTimeout(3000);
        
        // Extraer datos de la página
        const datos = await page.evaluate(() => {
            const llegadas = [];
            const salidas = [];
            
            // Buscar tablas o elementos con información de trenes
            const tables = document.querySelectorAll('table');
            const divs = document.querySelectorAll('[class*="horario"], [class*="tren"], [id*="horario"]');
            
            // Intentar extraer de tablas
            tables.forEach((table, tableIndex) => {
                const rows = table.querySelectorAll('tr');
                const tableText = table.textContent.toLowerCase();
                const isLlegadas = tableText.includes('llegada');
                const isSalidas = tableText.includes('salida');
                
                if (!isLlegadas && !isSalidas) return;
                
                rows.forEach((row, rowIndex) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 2) return;
                    
                    const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
                    let horaProgramada = null;
                    let numeroTren = null;
                    let origen = null;
                    let destino = null;
                    let via = null;
                    let tipoTren = null;
                    let retraso = 0;
                    
                    cellTexts.forEach(text => {
                        // Buscar hora
                        const horaMatch = text.match(/(\d{1,2}):(\d{2})/);
                        if (horaMatch && !horaProgramada) {
                            horaProgramada = `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`;
                        }
                        
                        // Buscar número de tren
                        const trenMatch = text.match(/(AVE|ALV|MD|REG|ALVIA|MEDIA)[\s\-]?(\d{3,5})/i);
                        if (trenMatch && !numeroTren) {
                            numeroTren = `${trenMatch[1].toUpperCase()}-${trenMatch[2]}`;
                            tipoTren = trenMatch[1].toUpperCase();
                        }
                        
                        // Buscar retraso
                        const retrasoMatch = text.match(/(\d+)\s*(?:min|minutos?|retraso)/i);
                        if (retrasoMatch) {
                            retraso = parseInt(retrasoMatch[1]);
                        }
                        
                        // Buscar vía
                        const viaMatch = text.match(/[Vv]ía\s*(\d+)/i);
                        if (viaMatch) {
                            via = `Vía ${viaMatch[1]}`;
                        }
                        
                        // Origen/Destino
                        if (text.length > 5 && text.length < 50 && 
                            /^[A-ZÁÉÍÓÚÑ]/.test(text) && 
                            !horaMatch && !trenMatch && 
                            !text.toLowerCase().includes('sevilla')) {
                            if (isLlegadas && !origen) {
                                origen = text;
                            } else if (isSalidas && !destino) {
                                destino = text;
                            }
                        }
                    });
                    
                    if (horaProgramada) {
                        // Calcular hora estimada si hay retraso
                        let horaEstimada = null;
                        if (retraso > 0) {
                            const [h, m] = horaProgramada.split(':').map(Number);
                            const totalMin = h * 60 + m + retraso;
                            const nuevasHoras = Math.floor(totalMin / 60) % 24;
                            const nuevosMin = totalMin % 60;
                            horaEstimada = `${String(nuevasHoras).padStart(2, '0')}:${String(nuevosMin).padStart(2, '0')}`;
                        }
                        
                        const tren = {
                            numeroTren: numeroTren || `TREN-${rowIndex}`,
                            horaProgramada: horaProgramada,
                            horaEstimada: horaEstimada,
                            origen: isLlegadas ? (origen || 'N/A') : 'Sevilla Santa Justa',
                            destino: isLlegadas ? 'Sevilla Santa Justa' : (destino || 'N/A'),
                            retraso: retraso,
                            estado: retraso > 0 ? 'retrasado' : 'a_tiempo',
                            via: via,
                            tipoTren: tipoTren || 'N/A',
                        };
                        
                        if (isLlegadas) {
                            llegadas.push(tren);
                        } else {
                            salidas.push(tren);
                        }
                    }
                });
            });
            
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
    const pathMatch = url.pathname.match(/^\/station\/(\d+)$/);
    
    if (!pathMatch) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }
    
    const stationCode = pathMatch[1];
    console.log(`Solicitud recibida para estación ${stationCode}`);
    
    try {
        const data = await fetchAdifDataWithPuppeteer(stationCode);
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
    console.log(`🚂 Servidor proxy Puppeteer escuchando en puerto ${PORT}`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/station/${SANTA_JUSTA_CODE}`);
    console.log(`✅ Usando navegador real para obtener datos de ADIF`);
});

// Cerrar navegador al terminar
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

