/**
 * Servidor proxy mejorado para obtener datos reales de ADIF
 * 
 * Este script hace scraping de la página de ADIF y extrae información real
 * de llegadas y salidas de trenes.
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
        const url = `https://www.adif.es/es/-/${stationCode}-sevilla-sta.-justa`;
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Accept-Encoding': 'identity', // No comprimir para simplificar
                'Connection': 'keep-alive',
            }
        };
        
        https.get(url, options, async (res) => {
            let data = '';
            
            // Manejar compresión - simplificado
            let stream = res;
            
            stream.on('data', (chunk) => {
                data += chunk.toString('utf8');
            });
            
            stream.on('end', () => {
                try {
                    console.log(`HTML recibido: ${data.length} caracteres`);
                    // Guardar una muestra del HTML para debugging
                    if (data.length > 0) {
                        const muestra = data.substring(0, Math.min(2000, data.length));
                        console.log('Muestra HTML (primeros 2000 chars):', muestra);
                    }
                    const trenes = parseAdifHTML(data);
                    console.log(`Datos parseados: ${trenes.llegadas.length} llegadas, ${trenes.salidas.length} salidas`);
                    resolve(trenes);
                } catch (error) {
                    console.error('Error parseando HTML:', error);
                    reject(error);
                }
            });
            
            stream.on('error', (error) => {
                console.error('Error en stream:', error);
                reject(error);
            });
        }).on('error', (error) => {
            console.error('Error en petición HTTPS:', error);
            reject(error);
        });
    });
}

/**
 * Parsea el HTML de ADIF para extraer información real de trenes
 */
function parseAdifHTML(html) {
    const $ = cheerio.load(html);
    const llegadas = [];
    const salidas = [];
    
    try {
        console.log('Iniciando parseo de HTML...');
        console.log(`Tamaño HTML: ${html.length} caracteres`);
        
        // Verificar si la página tiene contenido relevante
        const tieneLlegadas = html.toLowerCase().includes('llegada') || html.toLowerCase().includes('arrival');
        const tieneSalidas = html.toLowerCase().includes('salida') || html.toLowerCase().includes('departure');
        console.log(`Contiene 'llegada': ${tieneLlegadas}, Contiene 'salida': ${tieneSalidas}`);
        
        // Buscar todas las tablas en la página
        const tables = $('table');
        console.log(`Encontradas ${tables.length} tablas`);
        
        // También buscar divs con clases que puedan contener información
        const divsConHorarios = $('[class*="horario"], [class*="tren"], [class*="schedule"], [id*="horario"], [id*="tren"]');
        console.log(`Encontrados ${divsConHorarios.length} divs con posibles horarios`);
        
        // Buscar cualquier elemento que contenga horas
        const elementosConHoras = $('*:contains(":")').filter((i, el) => {
            const texto = $(el).text();
            return /\d{1,2}:\d{2}/.test(texto);
        });
        console.log(`Encontrados ${elementosConHoras.length} elementos con formato de hora`);
        
        tables.each((tableIndex, table) => {
            const $table = $(table);
            const tableHtml = $table.html() || '';
            const tableText = $table.text().toLowerCase();
            
            // Determinar si es tabla de llegadas o salidas
            const isLlegadas = tableText.includes('llegada') || 
                             tableHtml.includes('llegada') ||
                             (tableIndex === 0 && !tableText.includes('salida'));
            const isSalidas = tableText.includes('salida') || 
                            tableHtml.includes('salida') ||
                            (tableIndex === 1 && !tableText.includes('llegada'));
            
            if (!isLlegadas && !isSalidas) {
                return; // Saltar tablas que no son de trenes
            }
            
            const targetArray = isLlegadas ? llegadas : salidas;
            console.log(`Procesando tabla ${tableIndex + 1} como ${isLlegadas ? 'llegadas' : 'salidas'}`);
            
            // Buscar todas las filas (excluir header)
            $table.find('tr').each((rowIndex, row) => {
                const $row = $(row);
                
                // Saltar filas de encabezado
                if ($row.find('th').length > 0) {
                    return;
                }
                
                const cells = $row.find('td');
                if (cells.length < 2) {
                    return;
                }
                
                // Extraer texto de cada celda
                const cellTexts = cells.map((i, cell) => {
                    return $(cell).text().trim().replace(/\s+/g, ' ');
                }).get();
                
                // Buscar información en las celdas
                let horaProgramada = null;
                let horaEstimada = null;
                let numeroTren = null;
                let origen = null;
                let destino = null;
                let via = null;
                let tipoTren = null;
                let retraso = 0;
                
                cellTexts.forEach((text, idx) => {
                    if (!text) return;
                    
                    // Buscar hora (formato HH:mm o H:mm)
                    const horaMatch = text.match(/(\d{1,2}):(\d{2})/);
                    if (horaMatch) {
                        const hora = `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`;
                        if (!horaProgramada) {
                            horaProgramada = hora;
                        } else if (!horaEstimada && hora !== horaProgramada) {
                            horaEstimada = hora;
                        }
                    }
                    
                    // Buscar número de tren (patrones comunes)
                    const trenPatterns = [
                        /(AVE|ALV|MD|REG|CIV|TALGO|ALVIA|MEDIA|DISTANCIA|REGIONAL)[\s\-]?(\d{3,5})/i,
                        /(\d{4,5})/,
                    ];
                    
                    for (const pattern of trenPatterns) {
                        const trenMatch = text.match(pattern);
                        if (trenMatch && !numeroTren) {
                            if (trenMatch[1] && trenMatch[2]) {
                                numeroTren = `${trenMatch[1].toUpperCase()}-${trenMatch[2]}`;
                                tipoTren = trenMatch[1].toUpperCase();
                            } else if (trenMatch[1] && /^\d+$/.test(trenMatch[1])) {
                                numeroTren = `TREN-${trenMatch[1]}`;
                            }
                            break;
                        }
                    }
                    
                    // Buscar retraso
                    const retrasoPatterns = [
                        /(\d+)\s*(?:min|minutos?|retraso|delay|late)/i,
                        /\+(\d+)/,
                    ];
                    
                    for (const pattern of retrasoPatterns) {
                        const retrasoMatch = text.match(pattern);
                        if (retrasoMatch) {
                            retraso = parseInt(retrasoMatch[1]);
                            break;
                        }
                    }
                    
                    // Buscar vía
                    const viaPatterns = [
                        /[Vv]ía\s*(\d+)/i,
                        /(\d+)\s*[Vv]ía/i,
                        /[Pp]lataforma\s*(\d+)/i,
                        /[Aa]ndén\s*(\d+)/i,
                    ];
                    
                    for (const pattern of viaPatterns) {
                        const viaMatch = text.match(pattern);
                        if (viaMatch) {
                            via = `Vía ${viaMatch[1]}`;
                            break;
                        }
                    }
                    
                    // Origen/Destino (texto largo que parece nombre de ciudad/estación)
                    if (text.length > 3 && text.length < 60 && 
                        !horaMatch && !trenPatterns.some(p => p.test(text)) && 
                        !retrasoPatterns.some(p => p.test(text)) &&
                        !viaPatterns.some(p => p.test(text)) &&
                        /^[A-ZÁÉÍÓÚÑ]/.test(text) &&
                        !text.match(/^\d+$/) &&
                        !text.toLowerCase().includes('sevilla')) {
                        
                        if (isLlegadas && !origen) {
                            origen = text;
                        } else if (isSalidas && !destino) {
                            destino = text;
                        }
                    }
                });
                
                // Si encontramos al menos una hora, crear el tren
                if (horaProgramada) {
                    // Calcular hora estimada si hay retraso
                    if (retraso > 0 && !horaEstimada) {
                        horaEstimada = calcularHoraEstimada(horaProgramada, retraso);
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
                    
                    targetArray.push(tren);
                }
            });
        });
        
        console.log(`Parseo completado: ${llegadas.length} llegadas, ${salidas.length} salidas`);
        
    } catch (error) {
        console.error('Error en parseAdifHTML:', error);
    }
    
    return { llegadas, salidas };
}

/**
 * Calcula la hora estimada sumando el retraso
 */
function calcularHoraEstimada(horaProgramada, retrasoMinutos) {
    try {
        const [h, m] = horaProgramada.split(':').map(Number);
        const totalMinutos = h * 60 + m + retrasoMinutos;
        const nuevasHoras = Math.floor(totalMinutos / 60) % 24;
        const nuevosMinutos = totalMinutos % 60;
        return `${String(nuevasHoras).padStart(2, '0')}:${String(nuevosMinutos).padStart(2, '0')}`;
    } catch {
        return null;
    }
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
    console.log(`Solicitud recibida para estación ${stationCode}`);
    
    try {
        const data = await fetchAdifData(stationCode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        console.log(`Respuesta enviada: ${data.llegadas.length} llegadas, ${data.salidas.length} salidas`);
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
    }
});

server.listen(PORT, () => {
    console.log(`🚂 Servidor proxy de trenes escuchando en puerto ${PORT}`);
    console.log(`📡 Accede a: http://localhost:${PORT}/station/${SANTA_JUSTA_CODE}`);
    console.log(`✅ Listo para recibir peticiones`);
});

