/**
 * Servidor proxy simple para obtener datos de trenes de ADIF
 * 
 * Este script puede ejecutarse como servidor Node.js independiente
 * o integrarse en un backend existente.
 * 
 * Uso:
 *   node scripts/train-proxy-server.js
 * 
 * Luego configurar VITE_TRAIN_PROXY_URL=http://localhost:3001 en .env
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import * as cheerio from 'cheerio';

const PORT = process.env.TRAIN_PROXY_PORT || 3001;
const SANTA_JUSTA_CODE = '51003';

/**
 * Hace scraping de la página de ADIF para obtener información de trenes
 */
async function fetchAdifData(stationCode) {
    return new Promise((resolve, reject) => {
        // URL de la página de información en tiempo real de ADIF
        const url = `https://www.adif.es/es/-/${stationCode}-sevilla-sta.-justa`;
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            
            // Seguir redirecciones
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = res.headers.location;
                if (redirectUrl) {
                    return fetchAdifDataFromUrl(redirectUrl).then(resolve).catch(reject);
                }
            }
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const trenes = parseAdifHTML(data);
                    resolve(trenes);
                } catch (error) {
                    console.error('Error parseando HTML:', error);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Error en petición HTTPS:', error);
            reject(error);
        });
    });
}

/**
 * Función auxiliar para seguir redirecciones
 */
function fetchAdifDataFromUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const trenes = parseAdifHTML(data);
                    resolve(trenes);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Parsea el HTML de ADIF para extraer información de trenes
 * Usa cheerio para un parsing más robusto
 */
function parseAdifHTML(html) {
    const $ = cheerio.load(html);
    const llegadas = [];
    const salidas = [];
    
    try {
        // Buscar tablas de llegadas y salidas
        // Los selectores pueden variar según la estructura de ADIF
        
        // Intentar encontrar tablas con información de trenes
        $('table, .tabla, [class*="tren"], [class*="llegada"], [class*="salida"]').each((index, element) => {
            const $table = $(element);
            const tableText = $table.text().toLowerCase();
            
            // Determinar si es tabla de llegadas o salidas
            const isLlegadas = tableText.includes('llegada') || index % 2 === 0;
            const targetArray = isLlegadas ? llegadas : salidas;
            
            // Buscar filas de trenes
            $table.find('tr, [class*="tren"], [class*="fila"]').each((rowIndex, row) => {
                const $row = $(row);
                const cells = $row.find('td, th, [class*="celda"], [class*="columna"]');
                
                if (cells.length >= 3) {
                    const texto = $row.text();
                    
                    // Buscar número de tren (patrón común: letras-números)
                    const trenMatch = texto.match(/(AVE|ALV|MD|REG|CIV|AVE|TALGO)[\s\-]?(\d+)/i);
                    // Buscar hora (formato HH:mm)
                    const horaMatch = texto.match(/(\d{1,2}):(\d{2})/);
                    // Buscar origen/destino (texto antes/después de ciertos patrones)
                    const origenDestinoMatch = texto.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)*)/g);
                    
                    if (horaMatch) {
                        const tren = {
                            numeroTren: trenMatch ? `${trenMatch[1]}-${trenMatch[2]}` : `TREN-${rowIndex}`,
                            horaProgramada: `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`,
                            origen: isLlegadas ? (origenDestinoMatch && origenDestinoMatch[0] ? origenDestinoMatch[0].trim() : 'N/A') : 'Sevilla Santa Justa',
                            destino: isLlegadas ? 'Sevilla Santa Justa' : (origenDestinoMatch && origenDestinoMatch[0] ? origenDestinoMatch[0].trim() : 'N/A'),
                            retraso: 0,
                            estado: 'a_tiempo',
                            via: null,
                            tipoTren: trenMatch ? trenMatch[1] : 'N/A',
                        };
                        
                        // Buscar información de retraso
                        const retrasoMatch = texto.match(/(\d+)\s*(?:min|minutos?|retraso)/i);
                        if (retrasoMatch) {
                            tren.retraso = parseInt(retrasoMatch[1]);
                            tren.estado = 'retrasado';
                        }
                        
                        // Buscar vía
                        const viaMatch = texto.match(/[Vv]ía\s*(\d+)/i);
                        if (viaMatch) {
                            tren.via = `Vía ${viaMatch[1]}`;
                        }
                        
                        targetArray.push(tren);
                    }
                }
            });
        });
        
        // Si no encontramos datos en tablas, intentar buscar en divs o otros elementos
        if (llegadas.length === 0 && salidas.length === 0) {
            // Buscar cualquier elemento que contenga información de trenes
            $('[class*="tren"], [id*="tren"], [data-tren]').each((index, element) => {
                const $el = $(element);
                const texto = $el.text();
                const horaMatch = texto.match(/(\d{1,2}):(\d{2})/);
                
                if (horaMatch) {
                    const tren = {
                        numeroTren: `TREN-${index}`,
                        horaProgramada: `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`,
                        origen: 'N/A',
                        destino: 'N/A',
                        retraso: 0,
                        estado: 'a_tiempo',
                        via: null,
                        tipoTren: 'N/A',
                    };
                    
                    llegadas.push(tren);
                }
            });
        }
    } catch (error) {
        console.error('Error parseando HTML:', error);
    }
    
    return { llegadas, salidas };
}

/**
 * Servidor HTTP simple
 */
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Ruta: /station/:code
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathMatch = url.pathname.match(/^\/station\/(\d+)$/);
    
    if (!pathMatch) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }
    
    const stationCode = pathMatch[1];
    
    try {
        const data = await fetchAdifData(stationCode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
});

server.listen(PORT, () => {
    console.log(`Servidor proxy de trenes escuchando en puerto ${PORT}`);
    console.log(`Accede a: http://localhost:${PORT}/station/${SANTA_JUSTA_CODE}`);
});

