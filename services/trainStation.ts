/**
 * Servicio para obtener información de trenes en la estación de Santa Justa (Sevilla)
 * 
 * NOTA: Renfe/ADIF no proporcionan una API pública oficial fácil de usar.
 * Este servicio está preparado para integrarse con una API cuando esté disponible.
 * Por ahora, muestra información de ejemplo y estructura para futura integración.
 */

export interface TrainArrival {
    id: string;
    numeroTren: string;
    origen: string;
    destino: string;
    horaProgramada: string; // HH:mm
    horaEstimada: string | null; // HH:mm o null si no hay retraso
    retraso: number; // minutos de retraso (0 si no hay)
    estado: 'a_tiempo' | 'retrasado' | 'cancelado' | 'llegado';
    via: string | null;
    tipoTren: string; // AVE, Alvia, Media Distancia, etc.
}

export interface TrainDeparture {
    id: string;
    numeroTren: string;
    origen: string;
    destino: string;
    horaProgramada: string; // HH:mm
    horaEstimada: string | null; // HH:mm o null si no hay retraso
    retraso: number; // minutos de retraso (0 si no hay)
    estado: 'a_tiempo' | 'retrasado' | 'cancelado' | 'salido';
    via: string | null;
    tipoTren: string; // AVE, Alvia, Media Distancia, etc.
}

export interface StationInfo {
    nombre: string;
    codigo: string;
    ultimaActualizacion: Date;
    llegadas: TrainArrival[];
    salidas: TrainDeparture[];
}

/**
 * Código de la estación de Sevilla Santa Justa según ADIF
 */
const SANTA_JUSTA_CODE = '51003';

/**
 * Obtiene información de llegadas y salidas de la estación
 * Intenta obtener datos reales primero, si falla usa datos de ejemplo
 */
export const getStationInfo = async (): Promise<StationInfo> => {
    try {
        // Intentar obtener datos reales
        const realData = await tryGetRealData();
        if (realData) {
            return realData;
        }
        
        // Si falla, usar datos de ejemplo
        console.warn('No se pudieron obtener datos reales, usando datos de ejemplo');
        const ahora = new Date();
        const llegadas = generateSampleArrivals(ahora);
        const salidas = generateSampleDepartures(ahora);
        
        return {
            nombre: 'Sevilla Santa Justa',
            codigo: SANTA_JUSTA_CODE,
            ultimaActualizacion: ahora,
            llegadas,
            salidas,
        };
    } catch (error) {
        console.error('Error obteniendo información de la estación:', error);
        // En caso de error, devolver datos de ejemplo
        const ahora = new Date();
        const llegadas = generateSampleArrivals(ahora);
        const salidas = generateSampleDepartures(ahora);
        
        return {
            nombre: 'Sevilla Santa Justa',
            codigo: SANTA_JUSTA_CODE,
            ultimaActualizacion: ahora,
            llegadas,
            salidas,
        };
    }
};

/**
 * Intenta obtener datos reales de ADIF/Renfe
 * Usa múltiples métodos para intentar obtener la información
 */
const tryGetRealData = async (): Promise<StationInfo | null> => {
    try {
        // Método 1: Usar un servicio proxy si está configurado
        const proxyUrl = import.meta.env.VITE_TRAIN_PROXY_URL;
        if (proxyUrl) {
            try {
                const response = await fetch(`${proxyUrl}/station/${SANTA_JUSTA_CODE}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return parseAdifData(data);
                }
            } catch (err) {
                console.warn('Error con proxy:', err);
            }
        }
        
        // Método 2: Intentar API pública de terceros (si existe)
        // Por ahora no hay APIs públicas disponibles
        
        // Método 3: Intentar scraping directo (fallará por CORS en navegador)
        // Esto requeriría un backend proxy en producción
        return null;
    } catch (error) {
        console.warn('Error intentando obtener datos reales:', error);
        return null;
    }
};

/**
 * Parsea datos de ADIF al formato interno
 */
const parseAdifData = (data: any): StationInfo | null => {
    try {
        const llegadas: TrainArrival[] = (data.llegadas || []).map((item: any, index: number) => ({
            id: `arr-${index}-${item.numeroTren || index}`,
            numeroTren: item.numeroTren || item.tren || 'N/A',
            origen: item.origen || 'N/A',
            destino: item.destino || 'Sevilla Santa Justa',
            horaProgramada: formatTime(item.horaProgramada || item.hora),
            horaEstimada: item.horaEstimada ? formatTime(item.horaEstimada) : null,
            retraso: item.retraso || item.delay || 0,
            estado: getEstado(item.estado, item.retraso || item.delay || 0),
            via: item.via || item.plataforma || null,
            tipoTren: item.tipoTren || item.tipo || 'N/A',
        }));
        
        const salidas: TrainDeparture[] = (data.salidas || []).map((item: any, index: number) => ({
            id: `dep-${index}-${item.numeroTren || index}`,
            numeroTren: item.numeroTren || item.tren || 'N/A',
            origen: item.origen || 'Sevilla Santa Justa',
            destino: item.destino || 'N/A',
            horaProgramada: formatTime(item.horaProgramada || item.hora),
            horaEstimada: item.horaEstimada ? formatTime(item.horaEstimada) : null,
            retraso: item.retraso || item.delay || 0,
            estado: getEstado(item.estado, item.retraso || item.delay || 0),
            via: item.via || item.plataforma || null,
            tipoTren: item.tipoTren || item.tipo || 'N/A',
        }));
        
        // Ordenar por hora programada (más próximo primero, considerando cambio de día)
        const llegadasOrdenadas = sortTrainsByTime(llegadas);
        const salidasOrdenadas = sortTrainsByTime(salidas);
        
        return {
            nombre: 'Sevilla Santa Justa',
            codigo: SANTA_JUSTA_CODE,
            ultimaActualizacion: new Date(),
            llegadas: llegadasOrdenadas,
            salidas: salidasOrdenadas,
        };
    } catch (error) {
        console.error('Error parseando datos de ADIF:', error);
        return null;
    }
};

/**
 * Formatea una hora a formato HH:mm
 */
const formatTime = (time: string | Date | null): string => {
    if (!time) return '--:--';
    if (time instanceof Date) {
        return time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (typeof time === 'string') {
        const date = new Date(time);
        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
        if (/^\d{2}:\d{2}$/.test(time)) {
            return time;
        }
    }
    return '--:--';
};

/**
 * Determina el estado del tren basándose en los datos
 */
const getEstado = (estado: string | null, retraso: number): 'a_tiempo' | 'retrasado' | 'cancelado' | 'llegado' | 'salido' => {
    if (!estado) {
        return retraso > 0 ? 'retrasado' : 'a_tiempo';
    }
    
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('cancelado') || estadoLower.includes('cancel')) {
        return 'cancelado';
    }
    if (estadoLower.includes('llegado') || estadoLower.includes('arrived')) {
        return 'llegado';
    }
    if (estadoLower.includes('salido') || estadoLower.includes('departed')) {
        return 'salido';
    }
    if (estadoLower.includes('retrasado') || estadoLower.includes('delay') || retraso > 0) {
        return 'retrasado';
    }
    return 'a_tiempo';
};

/**
 * Compara dos horas para ordenar
 */
const compareTimes = (time1: string, time2: string): number => {
    try {
        const [h1, m1] = time1.split(':').map(Number);
        const [h2, m2] = time2.split(':').map(Number);
        const minutos1 = h1 * 60 + m1;
        const minutos2 = h2 * 60 + m2;
        return minutos1 - minutos2;
    } catch {
        return 0;
    }
};

/**
 * Genera datos de ejemplo de llegadas
 * En producción, esto vendría de una API real
 */
const generateSampleArrivals = (ahora: Date): TrainArrival[] => {
    const llegadas: TrainArrival[] = [];
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    
    // Generar próximas 10 llegadas
    for (let i = 0; i < 10; i++) {
        const minutosAdelante = 15 + (i * 20); // Cada 20 minutos aproximadamente
        const horaProgramada = new Date(ahora);
        horaProgramada.setMinutes(minutosActuales + minutosAdelante);
        
        // Algunos trenes con retraso aleatorio
        const tieneRetraso = Math.random() > 0.7;
        const retraso = tieneRetraso ? Math.floor(Math.random() * 30) + 5 : 0;
        
        const horaEstimada = retraso > 0 
            ? new Date(horaProgramada.getTime() + retraso * 60000)
            : null;
        
        const origenes = ['Madrid-Puerta de Atocha', 'Barcelona-Sants', 'Málaga-María Zambrano', 'Córdoba', 'Cádiz'];
        const destinos = ['Sevilla Santa Justa'];
        const tiposTren = ['AVE', 'Alvia', 'Media Distancia', 'Regional'];
        
        const origen = origenes[Math.floor(Math.random() * origenes.length)];
        const tipoTren = tiposTren[Math.floor(Math.random() * tiposTren.length)];
        const numeroTren = `${tipoTren === 'AVE' ? 'AVE' : tipoTren === 'Alvia' ? 'ALV' : 'MD'}-${Math.floor(Math.random() * 9000) + 1000}`;
        
        llegadas.push({
            id: `arr-${i}`,
            numeroTren,
            origen,
            destino: destinos[0],
            horaProgramada: horaProgramada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            horaEstimada: horaEstimada ? horaEstimada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
            retraso,
            estado: retraso > 0 ? 'retrasado' : 'a_tiempo',
            via: Math.random() > 0.5 ? `Vía ${Math.floor(Math.random() * 8) + 1}` : null,
            tipoTren,
        });
    }
    
    // Ordenar por hora programada (más próximo primero, considerando cambio de día)
    return sortTrainsByTime(llegadas);
};

/**
 * Genera datos de ejemplo de salidas
 */
const generateSampleDepartures = (ahora: Date): TrainDeparture[] => {
    const salidas: TrainDeparture[] = [];
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    
    // Generar próximas 10 salidas
    for (let i = 0; i < 10; i++) {
        const minutosAdelante = 10 + (i * 25); // Cada 25 minutos aproximadamente
        const horaProgramada = new Date(ahora);
        horaProgramada.setMinutes(minutosActuales + minutosAdelante);
        
        // Algunos trenes con retraso aleatorio
        const tieneRetraso = Math.random() > 0.75;
        const retraso = tieneRetraso ? Math.floor(Math.random() * 25) + 3 : 0;
        
        const horaEstimada = retraso > 0 
            ? new Date(horaProgramada.getTime() + retraso * 60000)
            : null;
        
        const origenes = ['Sevilla Santa Justa'];
        const destinos = ['Madrid-Puerta de Atocha', 'Barcelona-Sants', 'Málaga-María Zambrano', 'Córdoba', 'Cádiz', 'Huelva'];
        const tiposTren = ['AVE', 'Alvia', 'Media Distancia', 'Regional'];
        
        const destino = destinos[Math.floor(Math.random() * destinos.length)];
        const tipoTren = tiposTren[Math.floor(Math.random() * tiposTren.length)];
        const numeroTren = `${tipoTren === 'AVE' ? 'AVE' : tipoTren === 'Alvia' ? 'ALV' : 'MD'}-${Math.floor(Math.random() * 9000) + 1000}`;
        
        salidas.push({
            id: `dep-${i}`,
            numeroTren,
            origen: origenes[0],
            destino,
            horaProgramada: horaProgramada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            horaEstimada: horaEstimada ? horaEstimada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
            retraso,
            estado: retraso > 0 ? 'retrasado' : 'a_tiempo',
            via: Math.random() > 0.5 ? `Vía ${Math.floor(Math.random() * 8) + 1}` : null,
            tipoTren,
        });
    }
    
    // Ordenar por hora programada (más próximo primero, considerando cambio de día)
    return sortTrainsByTime(salidas);
};

/**
 * Parsea una hora en formato HH:mm a minutos desde medianoche
 * Maneja correctamente el cambio de día (trenes después de medianoche)
 */
const parseTime = (timeStr: string): number => {
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return 0;
        return hours * 60 + minutes;
    } catch {
        return 0;
    }
};

/**
 * Ordena trenes por hora, considerando el cambio de día
 * Los trenes más próximos aparecen primero
 */
const sortTrainsByTime = <T extends { horaProgramada: string }>(trains: T[]): T[] => {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    const minutosActualesTotal = horaActual * 60 + minutosActuales;
    
    return trains.sort((a, b) => {
        const minutosA = parseTime(a.horaProgramada);
        const minutosB = parseTime(b.horaProgramada);
        
        // Si ambos trenes son del mismo día (después de la hora actual)
        if (minutosA >= minutosActualesTotal && minutosB >= minutosActualesTotal) {
            return minutosA - minutosB;
        }
        
        // Si ambos trenes son del día anterior (antes de la hora actual)
        if (minutosA < minutosActualesTotal && minutosB < minutosActualesTotal) {
            return minutosA - minutosB;
        }
        
        // Si uno es del día siguiente y otro del día actual
        // Los del día siguiente van después
        if (minutosA < minutosActualesTotal) return 1; // A es del día siguiente
        if (minutosB < minutosActualesTotal) return -1; // B es del día siguiente
        
        return minutosA - minutosB;
    });
};

/**
 * Actualiza la información de la estación cada cierto tiempo
 */
export const startStationUpdates = (
    callback: (info: StationInfo) => void,
    intervalMs: number = 60000 // 1 minuto por defecto
): (() => void) => {
    let intervalId: NodeJS.Timeout;
    let isRunning = true;
    
    const update = async () => {
        if (!isRunning) return;
        try {
            const info = await getStationInfo();
            callback(info);
        } catch (error) {
            console.error('Error actualizando información de estación:', error);
        }
    };
    
    // Primera actualización inmediata
    update();
    
    // Actualizaciones periódicas
    intervalId = setInterval(update, intervalMs);
    
    // Retornar función para detener
    return () => {
        isRunning = false;
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
};

