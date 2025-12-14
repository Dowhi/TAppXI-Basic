/**
 * Servidor proxy mejorado usando Puppeteer para obtener datos REALES de ADIF
 * 
 * Este script extrae información en tiempo real de llegadas y salidas
 * de la estación Sevilla Santa Justa desde el sitio oficial de ADIF.
 * 
 * Uso:
 *   node scripts/train-proxy-server-final.js
 * 
 * Luego configurar VITE_TRAIN_PROXY_URL=http://localhost:3001 en .env
 */

import http from 'http';
import puppeteer from 'puppeteer';

const PORT = process.env.TRAIN_PROXY_PORT || 3001;
const SANTA_JUSTA_CODE = '51003';
const CACHE_DURATION = 30000; // 30 segundos de cache para no sobrecargar ADIF

let browser = null;
let cache = {
    data: null,
    timestamp: 0
};

/**
 * Inicializa el navegador de Puppeteer (reutilizable)
 */
async function initBrowser() {
    if (!browser) {
        console.log('🚀 Inicializando navegador Puppeteer...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        console.log('✅ Navegador inicializado');
    }
    return browser;
}

/**
 * Extrae datos reales de ADIF usando Puppeteer
 */
async function fetchAdifDataWithPuppeteer(stationCode) {
    // Verificar cache
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
        console.log('📦 Retornando datos del cache');
        return cache.data;
    }

    const browser = await initBrowser();
    const page = await browser.newPage();
    
    try {
        // Configurar headers para parecer un navegador real
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Usar la URL correcta de ADIF (con /w/ en lugar de /-/)
        const url = `https://www.adif.es/es/w/${stationCode}-sevilla-sta.-justa`;
        console.log(`🌐 Navegando a: ${url}`);
        
        // Ir a la página con timeout generoso
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        // Esperar a que se cargue la página inicial
        console.log('⏳ Esperando carga inicial...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // IMPORTANTE: Seleccionar el filtro "AV / Media distancia / Larga distancia"
        console.log('🔍 Buscando y seleccionando filtro de Media/Larga distancia...');
        try {
            // Buscar el radio button o input para "AV / Media distancia / Larga distancia"
            // Puede estar en diferentes formatos
            const filterSelectors = [
                'input[type="radio"][value*="AV"], input[type="radio"][value*="Media"], input[type="radio"][value*="Larga"]',
                'input[type="radio"]:nth-of-type(2)', // Segundo radio button (generalmente el de AV/Media/Larga)
                '[data-filter*="AV"], [data-filter*="Media"], [data-filter*="Larga"]',
                'label:has-text("AV / Media"), label:has-text("Media distancia"), label:has-text("Larga distancia")',
                'input[type="radio"][id*="av"], input[type="radio"][id*="media"], input[type="radio"][id*="larga"]',
            ];
            
            let filterClicked = false;
            for (const selector of filterSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    const element = await page.$(selector);
                    if (element) {
                        // Intentar hacer click directamente
                        await element.click();
                        console.log(`✅ Filtro seleccionado usando selector: ${selector}`);
                        filterClicked = true;
                        break;
                    }
                } catch (e) {
                    // Continuar con el siguiente selector
                    continue;
                }
            }
            
            // Si no se encontró con selectores específicos, buscar por texto usando JavaScript
            if (!filterClicked) {
                console.log('🔍 Buscando filtro por texto en la página...');
                filterClicked = await page.evaluate(() => {
                    // Primero, encontrar todos los radio buttons
                    const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
                    console.log(`📻 Encontrados ${allRadios.length} radio buttons`);
                    
                    if (allRadios.length < 2) {
                        console.log('⚠️ No hay suficientes radio buttons');
                        return false;
                    }
                    
                    // Buscar el que NO sea de cercanías
                    let targetRadio = null;
                    
                    for (const radio of allRadios) {
                        const value = (radio.value || '').toLowerCase();
                        const id = (radio.id || '').toLowerCase();
                        const name = (radio.name || '').toLowerCase();
                        const label = radio.closest('label');
                        const labelText = label ? (label.textContent || '').toLowerCase() : '';
                        
                        // Excluir cercanías
                        if (value.includes('cercania') || 
                            id.includes('cercania') || 
                            name.includes('cercania') ||
                            labelText.includes('cercania')) {
                            continue;
                        }
                        
                        // Incluir si tiene indicios de AV/Media/Larga
                        if (value.includes('av') || 
                            value.includes('media') || 
                            value.includes('larga') ||
                            id.includes('av') || 
                            id.includes('media') || 
                            id.includes('larga') ||
                            labelText.includes('av / media') ||
                            labelText.includes('media distancia') ||
                            labelText.includes('larga distancia')) {
                            targetRadio = radio;
                            break;
                        }
                    }
                    
                    // Si no encontramos por contenido, usar el segundo radio (generalmente es AV/Media)
                    if (!targetRadio && allRadios.length >= 2) {
                        // Verificar que el segundo NO sea cercanías
                        const secondRadio = allRadios[1];
                        const secondValue = (secondRadio.value || '').toLowerCase();
                        const secondLabel = secondRadio.closest('label');
                        const secondLabelText = secondLabel ? (secondLabel.textContent || '').toLowerCase() : '';
                        
                        if (!secondValue.includes('cercania') && !secondLabelText.includes('cercania')) {
                            targetRadio = secondRadio;
                        }
                    }
                    
                    if (targetRadio) {
                        targetRadio.click();
                        console.log('✅ Radio seleccionado:', targetRadio.value || targetRadio.id || 'sin valor');
                        return true;
                    }
                    
                    console.log('⚠️ No se encontró el radio button correcto');
                    return false;
                });
                
                if (filterClicked) {
                    console.log('✅ Filtro seleccionado por búsqueda de texto');
                } else {
                    console.log('⚠️ No se pudo seleccionar el filtro correcto');
                }
            }
            
            // Esperar a que se actualicen los datos después de seleccionar el filtro
            if (filterClicked) {
                console.log('⏳ Esperando actualización de datos después del filtro...');
                
                // Verificar que el filtro correcto esté seleccionado
                const filterCheck = await page.evaluate(() => {
                    const checked = Array.from(document.querySelectorAll('input[type="radio"]:checked'));
                    return checked.map(r => ({
                        value: r.value,
                        id: r.id,
                        label: r.closest('label')?.textContent?.trim()
                    }));
                });
                console.log('🔍 Filtro actualmente seleccionado:', JSON.stringify(filterCheck));
                
                // IMPORTANTE: Buscar y hacer clic en el botón "CONSULTAR" para aplicar el filtro
                console.log('🔘 Buscando botón CONSULTAR...');
                try {
                    const consultButton = await page.evaluate(() => {
                        // Buscar botón con texto "Consultar", "CONSULTAR", o similar
                        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));
                        for (const btn of buttons) {
                            const text = (btn.textContent || btn.value || '').trim().toLowerCase();
                            if (text.includes('consultar') || text.includes('consult') || text.includes('aplicar') || text === 'consultar') {
                                return {
                                    text: text,
                                    tag: btn.tagName,
                                    className: btn.className
                                };
                            }
                        }
                        return null;
                    });
                    
                    if (consultButton) {
                        console.log(`✅ Botón encontrado: ${consultButton.text}`);
                        // Hacer clic en el botón
                        await page.evaluate(() => {
                            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));
                            for (const btn of buttons) {
                                const text = (btn.textContent || btn.value || '').trim().toLowerCase();
                                if (text.includes('consultar') || text.includes('consult') || text.includes('aplicar')) {
                                    btn.click();
                                    return true;
                                }
                            }
                            return false;
                        });
                        console.log('✅ Botón CONSULTAR clickeado');
                        // Esperar a que se carguen los nuevos datos
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } else {
                        console.log('⚠️  No se encontró botón CONSULTAR, esperando que se actualice automáticamente...');
                        await new Promise(resolve => setTimeout(resolve, 4000));
                    }
                } catch (error) {
                    console.log('⚠️  Error buscando botón CONSULTAR:', error.message);
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }
                
                // Esperar a que aparezcan filas en las tablas (no solo headers)
                try {
                    await page.waitForFunction(
                        () => {
                            const tables = document.querySelectorAll('table');
                            for (const table of tables) {
                                const rows = table.querySelectorAll('tr');
                                if (rows.length > 1) { // Más que solo el header
                                    return true;
                                }
                            }
                            return false;
                        },
                        { timeout: 10000 }
                    );
                    console.log('✅ Tablas actualizadas con datos');
                } catch (e) {
                    console.log('⚠️ Timeout esperando datos, continuando...');
                }
            } else {
                console.log('⚠️  No se pudo encontrar el filtro, continuando sin filtrar...');
            }
            
        } catch (error) {
            console.log('⚠️  Error al seleccionar filtro:', error.message);
            console.log('   Continuando sin filtro...');
        }
        
        // Intentar esperar a elementos específicos que puedan contener datos
        try {
            await page.waitForSelector('table, [class*="horario"], [class*="tren"], [id*="horario"]', { 
                timeout: 10000 
            });
            console.log('✅ Tabla de horarios encontrada');
        } catch (e) {
            console.log('⚠️  No se encontraron elementos específicos, continuando...');
        }
        
        // Esperar un poco más para asegurar que todo está cargado
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // DEBUG: Guardar screenshot para ver qué está pasando
        try {
            await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
            console.log('📸 Screenshot guardado en debug-screenshot.png');
        } catch (e) {
            console.log('⚠️  No se pudo guardar screenshot');
        }
        
        // DEBUG: Obtener información de la página
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                tablesCount: document.querySelectorAll('table').length,
                hasFilterSection: document.body.innerHTML.includes('Filtrar') || document.body.innerHTML.includes('Cercanías'),
                bodyText: document.body.innerText.substring(0, 500) // Primeros 500 caracteres
            };
        });
        console.log('📄 Información de la página:', JSON.stringify(pageInfo, null, 2));
        
        // Extraer datos de la página con múltiples estrategias
        const datos = await page.evaluate(() => {
            const llegadas = [];
            const salidas = [];
            const debugLogs = []; // Para capturar logs
            
            // Helper para log dentro de evaluate
            const log = (msg) => {
                debugLogs.push(msg);
                console.log(msg); // También en consola del navegador
            };
            
            log('🔍 Iniciando extracción de datos...');
            
            // Función helper para normalizar texto
            const normalize = (text) => text.trim().replace(/\s+/g, ' ');
            
            // Función para extraer hora
            const extractTime = (text) => {
                const match = text.match(/(\d{1,2}):(\d{2})/);
                return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
            };
            
            // Función para extraer número de tren
            // Formato ADIF: "RF - AVE 02561", "RF - MD 13073", "IL - IRYO 06011"
            const extractTrainNumber = (text) => {
                // Patrón para formato ADIF: "RF - AVE 02561" o "IL - IRYO 06011"
                const adifPattern = /(?:RF|IL|OU|FEVE|SNCF|RENFE)[\s\-]+(AVE|AVANT|MD|ALV|ALVIA|TALGO|IRYO|REG|CIV|REGIONAL|CERCANIAS)[\s\-]+(\d{3,5})/i;
                const adifMatch = text.match(adifPattern);
                if (adifMatch && adifMatch[1] && adifMatch[2]) {
                    const tipo = adifMatch[1].toUpperCase();
                    const numero = adifMatch[2];
                    // Normalizar tipos
                    let tipoNormalizado = tipo;
                    if (tipo === 'AVANT') tipoNormalizado = 'AVANT';
                    else if (tipo === 'IRYO') tipoNormalizado = 'IRYO';
                    
                    return { 
                        numero: `${tipoNormalizado}-${numero}`, 
                        tipo: tipoNormalizado 
                    };
                }
                
                // Patrones tradicionales
                const patterns = [
                    /(AVE|ALV|MD|REG|CIV|TALGO|ALVIA|MEDIA|DISTANCIA|REGIONAL|AVE-LD|AVE-MD|AVANT|IRYO)[\s\-]?(\d{3,5})/i,
                    /(\d{4,5})/,
                ];
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) {
                        if (match[1] && match[2]) {
                            return { numero: `${match[1].toUpperCase()}-${match[2]}`, tipo: match[1].toUpperCase() };
                        } else if (match[1] && /^\d+$/.test(match[1])) {
                            return { numero: `TREN-${match[1]}`, tipo: 'N/A' };
                        }
                    }
                }
                return null;
            };
            
            // Función para extraer retraso
            const extractDelay = (text) => {
                const patterns = [
                    /(\d+)\s*(?:min|minutos?|retraso|delay|late|atraso)/i,
                    /\+(\d+)/,
                    /retraso[:\s]*(\d+)/i
                ];
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) return parseInt(match[1]);
                }
                return 0;
            };
            
            // Función para extraer vía
            const extractVia = (text) => {
                const patterns = [
                    /[Vv]ía\s*(\d+)/i,
                    /(\d+)\s*[Vv]ía/i,
                    /[Pp]lataforma\s*(\d+)/i,
                    /[Aa]ndén\s*(\d+)/i,
                    /[Vv][ía]\s*(\d+)/i
                ];
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) return `Vía ${match[1]}`;
                }
                return null;
            };
            
            // ESTRATEGIA 1: Buscar tablas
            const tables = document.querySelectorAll('table');
            log(`📊 Encontradas ${tables.length} tablas`);
            
            // DEBUG: Información de las tablas
            tables.forEach((table, idx) => {
                const rows = table.querySelectorAll('tr');
                log(`  Tabla ${idx + 1}: ${rows.length} filas`);
                if (rows.length > 0) {
                    const firstRow = rows[0];
                    const cells = firstRow.querySelectorAll('td, th');
                    log(`    Header: ${Array.from(cells).map(c => c.textContent.trim().substring(0, 30)).join(' | ')}`);
                    
                    // Mostrar primeras 3 filas de datos como ejemplo
                    for (let i = 1; i <= Math.min(3, rows.length - 1); i++) {
                        const dataRow = rows[i];
                        const dataCells = Array.from(dataRow.querySelectorAll('td'));
                        if (dataCells.length > 0) {
                            const dataCellTexts = dataCells.map(c => {
                                const text = c.textContent.trim();
                                return text.length > 50 ? text.substring(0, 50) + '...' : text;
                            });
                            log(`    Fila ${i}: [${dataCellTexts.join('] [')}]`);
                        }
                    }
                }
            });
            
            tables.forEach((table, tableIndex) => {
                const tableText = normalize(table.textContent).toLowerCase();
                const isLlegadas = tableText.includes('llegada') || 
                                 tableText.includes('arrival') ||
                                 (tableIndex === 0 && !tableText.includes('salida'));
                const isSalidas = tableText.includes('salida') || 
                                tableText.includes('departure') ||
                                (tableIndex === 1 && !tableText.includes('llegada'));
                
                if (!isLlegadas && !isSalidas) return;
                
                const targetArray = isLlegadas ? llegadas : salidas;
                const rows = table.querySelectorAll('tr');
                
                rows.forEach((row, rowIndex) => {
                    // Saltar headers (filas con <th>)
                    if (row.querySelector('th')) {
                        if (rowIndex === 0) {
                            log(`  Tabla ${tableIndex + 1}: Header encontrado, saltando...`);
                        }
                        return;
                    }
                    
                    const cells = Array.from(row.querySelectorAll('td'));
                    
                    // DEBUG: Ver estructura real de la fila
                    if (rowIndex <= 2) {
                        log(`  🔍 Fila ${rowIndex}: ${cells.length} celdas TD encontradas`);
                        cells.forEach((cell, cellIdx) => {
                            const text = cell.textContent.trim();
                            const html = cell.innerHTML.trim().substring(0, 100);
                            log(`    Celda ${cellIdx}: "${text}" (HTML: ${html}...)`);
                        });
                    }
                    
                    if (cells.length < 2) {
                        if (rowIndex <= 2) {
                            log(`  ⚠️ Fila ${rowIndex}: Solo ${cells.length} celdas, saltando...`);
                        }
                        return;
                    }
                    
                    // ADIF tiene estructura: [Hora, Destino/Origen, Línea, Vía]
                    // Intentar mapear por posición primero (más confiable)
                    const cellTexts = cells.map(cell => normalize(cell.textContent));
                    const rowText = normalize(row.textContent);
                    
                    // DEBUG: Mostrar texto normalizado
                    if (rowIndex <= 2) {
                        log(`  📝 Fila ${rowIndex} normalizada: [${cellTexts.join('] [')}]`);
                    }
                    
                    // Extraer por posición (estructura ADIF conocida)
                    let horaProgramada = cellTexts[0] || null; // Primera columna: Hora
                    let destinoOrigen = cellTexts[1] || null;  // Segunda columna: Destino/Origen
                    let linea = cellTexts[2] || null;          // Tercera columna: Línea (tren)
                    let via = cellTexts[3] || null;            // Cuarta columna: Vía
                    
                    // DEBUG
                    if (rowIndex <= 2) {
                        log(`  📊 Valores extraídos: hora="${horaProgramada}", destino/origen="${destinoOrigen}", línea="${linea}", vía="${via}"`);
                    }
                    
                    // Extraer hora de la primera celda
                    const horaMatch = horaProgramada ? extractTime(horaProgramada) : null;
                    if (horaMatch) {
                        horaProgramada = horaMatch;
                    } else {
                        // Si no se encuentra hora en primera celda, buscar en todas
                        for (const text of cellTexts) {
                            const timeMatch = extractTime(text);
                            if (timeMatch) {
                                horaProgramada = timeMatch;
                                break;
                            }
                        }
                        if (!horaProgramada) {
                            horaProgramada = null;
                        }
                    }
                    
                    let horaEstimada = null;
                    let numeroTren = null;
                    let tipoTren = null;
                    let origen = null;
                    let destino = null;
                    let retraso = 0;
                    
                    // Extraer y separar horas de la primera celda
                    // ADIF puede tener: "22:10", "22:10/22:43", o "22:1022:43" (concatenadas)
                    if (horaProgramadaRaw) {
                        // Caso 1: Dos horas concatenadas sin separador (ej: "22:1022:43")
                        const matchConcatenadas = horaProgramadaRaw.match(/(\d{2}):(\d{2})(\d{2}):(\d{2})/);
                        if (matchConcatenadas) {
                            horaProgramada = `${matchConcatenadas[1]}:${matchConcatenadas[2]}`;
                            horaEstimada = `${matchConcatenadas[3]}:${matchConcatenadas[4]}`;
                        }
                        // Caso 2: Horas separadas por barra (ej: "22:10/22:43")
                        else if (horaProgramadaRaw.includes('/')) {
                            const horas = horaProgramadaRaw.split('/').map(h => extractTime(normalize(h))).filter(h => h);
                            if (horas.length >= 1) horaProgramada = horas[0];
                            if (horas.length >= 2) horaEstimada = horas[1];
                        }
                        // Caso 3: Una sola hora
                        else {
                            horaProgramada = extractTime(horaProgramadaRaw);
                        }
                    }
                    
                    // Si no se encontró hora, buscar en todo el texto de la fila
                    if (!horaProgramada) {
                        horaProgramada = extractTime(rowText);
                    }
                    
                    // Extraer número y tipo de tren de la columna "Línea"
                    if (linea) {
                        const trainInfo = extractTrainNumber(linea);
                        if (trainInfo) {
                            numeroTren = trainInfo.numero;
                            tipoTren = trainInfo.tipo;
                        } else {
                            // Si no se encontró, intentar con el texto completo de la celda
                            // ADIF usa formato como "RF - AVE 02561" o "RF - MD 13073"
                            const adifPattern = /(?:RF|IL|OU|FEVE|SNCF|RENFE)[\s\-]+(AVE|AVANT|MD|ALV|ALVIA|TALGO|IRYO|REG|CIV|REGIONAL|CERCANIAS)[\s\-]+(\d{3,5})/i;
                            const match = linea.match(adifPattern);
                            if (match && match[1] && match[2]) {
                                numeroTren = `${match[1].toUpperCase()}-${match[2]}`;
                                tipoTren = match[1].toUpperCase();
                            }
                        }
                    } else {
                        // Buscar en todo el texto de la fila
                        const trainInfo = extractTrainNumber(rowText);
                        if (trainInfo) {
                            numeroTren = trainInfo.numero;
                            tipoTren = trainInfo.tipo;
                        }
                    }
                    
                    // Extraer vía
                    if (via) {
                        via = extractVia(via) || normalize(via);
                        // Si es solo un número, formatear como "Vía X"
                        if (via && /^\d+$/.test(via.trim())) {
                            via = `Vía ${via.trim()}`;
                        }
                    }
                    
                    // Si no encontramos vía en la cuarta columna, buscar en toda la fila
                    if (!via || via === '') {
                        via = extractVia(rowText);
                    }
                    
                    // Asignar origen/destino
                    if (isLlegadas) {
                        origen = destinoOrigen || null;
                        destino = 'Sevilla Santa Justa';
                    } else {
                        origen = 'Sevilla Santa Justa';
                        destino = destinoOrigen || null;
                    }
                    
                    // Buscar información adicional solo si no se encontró por posición
                    if (!horaProgramada || !numeroTren) {
                        for (const text of cellTexts) {
                            if (!text) continue;
                            
                            // Hora programada (si no se encontró antes)
                            if (!horaProgramada) {
                                const time = extractTime(text);
                                if (time) horaProgramada = time;
                            }
                            
                            // Número de tren (si no se encontró antes)
                            if (!numeroTren) {
                                const trainInfo = extractTrainNumber(text);
                                if (trainInfo) {
                                    numeroTren = trainInfo.numero;
                                    tipoTren = trainInfo.tipo;
                                }
                            }
                            
                            // Retraso
                            const delay = extractDelay(text);
                            if (delay > retraso) {
                                retraso = delay;
                            }
                        }
                    }
                    
                    // Calcular retraso si hay hora estimada pero no retraso
                    if (horaEstimada && horaProgramada && retraso === 0) {
                        try {
                            const [h1, m1] = horaProgramada.split(':').map(Number);
                            const [h2, m2] = horaEstimada.split(':').map(Number);
                            const minutos1 = h1 * 60 + m1;
                            const minutos2 = h2 * 60 + m2;
                            let diff = minutos2 - minutos1;
                            // Manejar cambio de día (si la hora estimada es menor, asumir día siguiente)
                            if (diff < 0) {
                                diff += 24 * 60; // Añadir 24 horas
                            }
                            retraso = Math.max(0, diff);
                        } catch (e) {
                            // Si hay error, dejar retraso en 0
                        }
                    }
                    
                    // Buscar retraso en todo el texto de la fila si no se encontró en celdas
                    if (retraso === 0) {
                        retraso = extractDelay(rowText);
                    }
                    
                    // Si tenemos al menos hora programada Y número de tren, crear el tren
                    // Si no tenemos número de tren pero tenemos hora, usar un número genérico
                    if (horaProgramada) {
                        // Si no tenemos número de tren, intentar generarlo desde el texto
                        if (!numeroTren) {
                            // Último intento: buscar cualquier patrón de número en la columna de línea
                            if (linea) {
                                const numMatch = linea.match(/\d{3,5}/);
                                if (numMatch) {
                                    const tipoMatch = linea.match(/(AVE|AVANT|MD|ALV|ALVIA|TALGO|IRYO|ALVIA)/i);
                                    const tipo = tipoMatch ? tipoMatch[1].toUpperCase() : 'TREN';
                                    numeroTren = `${tipo}-${numMatch[0]}`;
                                    tipoTren = tipo;
                                }
                            }
                        }
                        
                        // DEBUG: Log para ver qué se está extrayendo
                        if (rowIndex <= 2) { // Solo las primeras 3 filas para no saturar
                            console.log(`  Fila ${rowIndex}: hora=${horaProgramada}, tren=${numeroTren || 'N/A'}, destino=${destino || origen || 'N/A'}, celdas=[${cellTexts.join('|')}]`);
                        }
                        // Calcular hora estimada si hay retraso
                        if (retraso > 0 && !horaEstimada) {
                            const [h, m] = horaProgramada.split(':').map(Number);
                            const totalMin = h * 60 + m + retraso;
                            const nuevasHoras = Math.floor(totalMin / 60) % 24;
                            const nuevosMin = totalMin % 60;
                            horaEstimada = `${String(nuevasHoras).padStart(2, '0')}:${String(nuevosMin).padStart(2, '0')}`;
                        }
                        
                        // Determinar estado
                        let estado = 'a_tiempo';
                        if (retraso > 0) {
                            estado = 'retrasado';
                        }
                        
                        // Verificar si el tren ya partió o llegó (buscar en el texto)
                        const rowTextLower = rowText.toLowerCase();
                        if (rowTextLower.includes('salido') || rowTextLower.includes('departed')) {
                            estado = 'salido';
                        } else if (rowTextLower.includes('llegado') || rowTextLower.includes('arrived')) {
                            estado = 'llegado';
                        } else if (rowTextLower.includes('cancelado') || rowTextLower.includes('cancel')) {
                            estado = 'cancelado';
                        }
                        
                        const tren = {
                            numeroTren: numeroTren || `TREN-${rowIndex}`,
                            horaProgramada: horaProgramada,
                            horaEstimada: horaEstimada,
                            origen: isLlegadas ? (origen || 'N/A') : 'Sevilla Santa Justa',
                            destino: isLlegadas ? 'Sevilla Santa Justa' : (destino || 'N/A'),
                            retraso: retraso,
                            estado: estado,
                            via: via,
                            tipoTren: tipoTren || 'N/A',
                        };
                        
                        targetArray.push(tren);
                        if (rowIndex <= 3) {
                            log(`    ✅ Tren creado: ${tren.numeroTren} a las ${tren.horaProgramada}`);
                        }
                    } else {
                        // DEBUG: Ver por qué no se creó el tren
                        if (rowIndex <= 3) {
                            log(`  ⚠️ Fila ${rowIndex} descartada: sin hora programada válida`);
                            log(`    Contenido celdas: [${cellTexts.join('] [')}]`);
                        }
                    }
                });
                
                log(`  ✅ ${targetArray.length} trenes extraídos de tabla ${tableIndex + 1} (${isLlegadas ? 'llegadas' : 'salidas'})`);
            });
            
            // ESTRATEGIA 2: Si no encontramos datos en tablas, buscar en divs con clases específicas
            if (llegadas.length === 0 && salidas.length === 0) {
                log('⚠️  No se encontraron datos en tablas, buscando en otros elementos...');
                
                // Buscar divs con información de horarios
                const horarioElements = document.querySelectorAll(
                    '[class*="horario"], [class*="tren"], [class*="schedule"], ' +
                    '[id*="horario"], [id*="tren"], [data-hora], [data-tren]'
                );
                
                // Intentar extraer información de estos elementos
                // (implementación similar a la de tablas pero adaptada)
            }
            
            // FILTRAR: Solo Media Distancia y Larga Distancia (excluir Cercanías)
            const tiposPermitidos = ['AVE', 'ALV', 'ALVIA', 'MD', 'MEDIA', 'DISTANCIA', 'TALGO', 'AVE-LD', 'AVE-MD', 'AVANT', 'IRYO'];
            const tiposExcluidos = ['CIV', 'REG', 'REGIONAL', 'CERCANIAS', 'CERCANÍAS', 'C'];
            
            const filtrarTrenes = (trenes) => {
                return trenes.filter(tren => {
                    const tipo = (tren.tipoTren || '').toUpperCase().trim();
                    const numero = (tren.numeroTren || '').toUpperCase();
                    
                    // Excluir si es un tipo de cercanías
                    if (tiposExcluidos.some(excluido => tipo.includes(excluido) || numero.includes(excluido))) {
                        return false;
                    }
                    
                    // Incluir si es un tipo permitido o si no se puede determinar (dar beneficio de la duda)
                    if (tipo === 'N/A' || tipo === '') {
                        // Si no se puede determinar, incluir si el número tiene formato de larga/media distancia
                        // Los trenes de cercanías suelen tener 4 dígitos seguidos, los de larga/media tienen prefijos
                        return numero.includes('AVE') || numero.includes('ALV') || numero.includes('MD') || numero.includes('ALVIA');
                    }
                    
                    return tiposPermitidos.some(permitido => tipo.includes(permitido));
                });
            };
            
            const llegadasFiltradas = filtrarTrenes(llegadas);
            const salidasFiltradas = filtrarTrenes(salidas);
            
            if (llegadas.length !== llegadasFiltradas.length || salidas.length !== salidasFiltradas.length) {
                log(`🔍 Filtrado (solo Media/Larga Distancia): ${llegadas.length} -> ${llegadasFiltradas.length} llegadas, ${salidas.length} -> ${salidasFiltradas.length} salidas`);
                log(`   (Excluyendo Cercanías: CIV, REG, Regional)`);
            }
            
            return { llegadas: llegadasFiltradas, salidas: salidasFiltradas, debugLogs: debugLogs };
        });
        
        // Mostrar logs de debug si existen
        if (datos.debugLogs && datos.debugLogs.length > 0) {
            console.log('\n📋 Logs de debug del parsing:');
            datos.debugLogs.forEach(logMsg => console.log(logMsg));
            console.log('');
        } else {
            console.log('⚠️  No se capturaron logs de debug del parsing');
        }
        
        // Obtener información de debug si no hay datos
        let debugInfo = null;
        if (datos.llegadas.length === 0 && datos.salidas.length === 0) {
            console.warn('⚠️  No se encontraron trenes en la página');
            
            // Capturar contenido real de las primeras filas de datos para debug
            const rowContent = await page.evaluate(() => {
                const tables = document.querySelectorAll('table');
                const content = [];
                tables.forEach((table, tableIdx) => {
                    const rows = table.querySelectorAll('tr');
                    const tableRows = [];
                    for (let i = 1; i <= Math.min(3, rows.length - 1); i++) {
                        const row = rows[i];
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length > 0) {
                            tableRows.push({
                                rowIndex: i,
                                cells: cells.map(c => ({
                                    text: c.textContent.trim(),
                                    html: c.innerHTML.trim().substring(0, 150)
                                }))
                            });
                        }
                    }
                    content.push({ tableIndex: tableIdx, rows: tableRows });
                });
                return content;
            });
            console.log('📊 Contenido real de las primeras 3 filas de datos:');
            console.log(JSON.stringify(rowContent, null, 2));
            // Obtener información de debug
            debugInfo = await page.evaluate(() => {
                const tables = document.querySelectorAll('table');
                const tablesInfo = Array.from(tables).map((table, idx) => {
                    const rows = table.querySelectorAll('tr');
                    const firstRowCells = rows[0] ? Array.from(rows[0].querySelectorAll('td, th')).map(c => c.textContent.trim().substring(0, 50)) : [];
                    return {
                        index: idx,
                        rows: rows.length,
                        firstRowCells: firstRowCells,
                        text: table.textContent.substring(0, 200)
                    };
                });
                
                return {
                    url: window.location.href,
                    title: document.title,
                    tablesCount: tables.length,
                    tablesInfo: tablesInfo,
                    bodyHasSalidas: document.body.textContent.includes('Salidas') || document.body.textContent.includes('SALIDAS'),
                    bodyHasLlegadas: document.body.textContent.includes('Llegadas') || document.body.textContent.includes('LLEGADAS'),
                    filterSelected: Array.from(document.querySelectorAll('input[type="radio"]:checked')).map(inp => inp.value || inp.id)
                };
            });
            console.log('🐛 Debug info:', JSON.stringify(debugInfo, null, 2));
        } else {
            console.log(`✅ Datos extraídos: ${datos.llegadas.length} llegadas, ${datos.salidas.length} salidas`);
            // Actualizar cache
            cache.data = datos;
            cache.timestamp = Date.now();
        }
        
        // Añadir debug info a la respuesta si no hay datos
        if (debugInfo) {
            datos.debug = debugInfo;
        }
        
        // Limpiar debugLogs de la respuesta (ya se mostraron)
        delete datos.debugLogs;
        
        return datos;
        
    } catch (error) {
        console.error('❌ Error con Puppeteer:', error.message);
        // Si hay cache, devolver cache aunque esté viejo
        if (cache.data) {
            console.log('⚠️  Error en fetch, retornando cache viejo');
            return cache.data;
        }
        throw error;
    } finally {
        await page.close();
    }
}

/**
 * Servidor HTTP con endpoint de health check
 */
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Health check endpoint
    if (url.pathname === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            cacheAge: cache.data ? Math.floor((Date.now() - cache.timestamp) / 1000) : null
        }));
        return;
    }
    
    // Station endpoint: /station/:code
    const pathMatch = url.pathname.match(/^\/station\/(\d+)$/);
    
    if (!pathMatch) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found. Use /health or /station/51003' }));
        return;
    }
    
    const stationCode = pathMatch[1];
    console.log(`📡 Solicitud recibida para estación ${stationCode}`);
    
    try {
        const data = await fetchAdifDataWithPuppeteer(stationCode);
        res.writeHead(200);
        res.end(JSON.stringify(data));
        console.log(`✅ Respuesta enviada: ${data.llegadas.length} llegadas, ${data.salidas.length} salidas`);
    } catch (error) {
        console.error('❌ Error procesando solicitud:', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ 
            error: 'Internal server error', 
            details: error.message,
            llegadas: [],
            salidas: []
        }));
    }
});

server.listen(PORT, () => {
    console.log('');
    console.log('🚂 ============================================');
    console.log('🚂 Servidor Proxy de Trenes ADIF - Santa Justa');
    console.log('🚂 ============================================');
    console.log(`📡 Escuchando en puerto ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Datos: http://localhost:${PORT}/station/${SANTA_JUSTA_CODE}`);
    console.log('');
    console.log('✅ Usando Puppeteer para extraer datos REALES de ADIF');
    console.log('⏱️  Cache: 30 segundos');
    console.log('');
});

// Manejar cierre limpio
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (browser) {
        await browser.close();
        console.log('✅ Navegador cerrado');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (browser) {
        await browser.close();
        console.log('✅ Navegador cerrado');
    }
    process.exit(0);
});

