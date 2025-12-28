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
    isRealData: boolean;
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/16a55f43-70e7-4375-9248-a649a1c4fc05', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'trainStation.ts:53', message: 'getStationInfo called', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    try {
        // Intentar obtener datos reales
        const realData = await tryGetRealData();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/16a55f43-70e7-4375-9248-a649a1c4fc05', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'trainStation.ts:57', message: 'tryGetRealData result', data: { hasData: !!realData, llegadasCount: realData?.llegadas?.length || 0, salidasCount: realData?.salidas?.length || 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        if (realData) {
            return realData;
        }

        // Si falla, devolver arrays vacíos (igual que en flightStation)
        console.warn('No se pudieron obtener datos reales de ADIF. Mostrando pantalla vacía.');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/16a55f43-70e7-4375-9248-a649a1c4fc05', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'trainStation.ts:62', message: 'Returning empty arrays - no real data', data: { reason: 'tryGetRealData returned null' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
        // #endregion
        const ahora = new Date();

        return {
            nombre: 'Sevilla Santa Justa',
            codigo: SANTA_JUSTA_CODE,
            ultimaActualizacion: ahora,
            llegadas: [],
            salidas: [],
            isRealData: false // Sin datos reales disponibles
        };
    } catch (error) {
        console.error('Error obteniendo información de la estación:', error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/16a55f43-70e7-4375-9248-a649a1c4fc05', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'trainStation.ts:74', message: 'Error in getStationInfo', data: { error: error instanceof Error ? error.message : String(error) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
        // #endregion
        // En caso de error, devolver arrays vacíos
        const ahora = new Date();

        return {
            nombre: 'Sevilla Santa Justa',
            codigo: SANTA_JUSTA_CODE,
            ultimaActualizacion: ahora,
            llegadas: [],
            salidas: [],
            isRealData: true,
        };
    }
};

/**
 * Intenta obtener datos reales de Renfe Open Data API
 * NUNCA devuelve datos simulados - solo datos reales o null
 */
const tryGetRealData = async (): Promise<StationInfo | null> => {
    try {
        // Renfe Open Data API - No requiere API key pero necesita proxy CORS
        const renfeApiUrl = 'https://gtfsrt.renfe.com/trip_updates_LD.json';

        // Usar proxy CORS para evitar bloqueo del navegador
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(renfeApiUrl)}`;

        console.log(`📡 Fetching train data from Renfe Open Data (via proxy)...`);

        const response = await fetch(corsProxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15000) // 15 segundos timeout
        });

        if (!response.ok) {
            console.warn(`⚠️ Renfe API error: ${response.status}`);
            return null;
        }

        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error('Error parsing Renfe JSON:', e);
            return null;
        }

        if (!data || !data.entity || !Array.isArray(data.entity)) {
            console.warn('⚠️ Invalid data format from Renfe API');
            return null;
        }

        console.log(`✅ Renfe data received: ${data.entity.length} trip updates`);

        // Parsear datos GTFS-RT de Renfe
        const parsed = parseRenfeGTFSData(data);

        if (parsed) {
            console.log(`✅ Parsed: ${parsed.llegadas.length} arrivals, ${parsed.salidas.length} departures`);
            return parsed;
        }

        return null;
    } catch (error: any) {
        console.warn('⚠️ Error fetching Renfe data:', error.message);
        return null;
    }
};

/**
 * Parsea datos GTFS-RT de Renfe al formato interno
 * Filtra solo trenes que llegan o salen de Santa Justa
 */
const parseRenfeGTFSData = (data: any): StationInfo | null => {
    try {
        if (!data || !data.entity || !Array.isArray(data.entity)) {
            console.warn('⚠️ Invalid GTFS data format');
            return null;
        }

        const ahora = new Date();
        const treintaMinutosAtras = new Date(ahora.getTime() - 30 * 60 * 1000);
        const doceHorasDespues = new Date(ahora.getTime() + 12 * 60 * 60 * 1000);

        const llegadas: TrainArrival[] = [];
        const salidas: TrainDeparture[] = [];

        // GTFS-RT usa códigos de estación ADIF
        // Santa Justa = código "71401" en GTFS
        const SANTA_JUSTA_GTFS_CODE = '71401';

        data.entity.forEach((tripUpdate: any, idx: number) => {
            try {
                if (!tripUpdate.trip_update || !tripUpdate.trip_update.stop_time_update) {
                    return;
                }

                const trip = tripUpdate.trip_update.trip;
                const stopUpdates = tripUpdate.trip_update.stop_time_update;

                //ループ through all stops to find Santa Justa
                stopUpdates.forEach((stopUpdate: any) => {
                    const stopId = stopUpdate.stop_id;

                    // Verificar si esta parada es Santa Justa
                    if (!stopId || !stopId.includes(SANTA_JUSTA_GTFS_CODE)) {
                        return;
                    }

                    const arrival = stopUpdate.arrival;
                    const departure = stopUpdate.departure;

                    // Parsear número de tren y tipo
                    const trainNumber = trip?.trip_id || `TRAIN-${idx}`;
                    const routeId = trip?.route_id || '';
                    const trainType = getTrainType(routeId, trainNumber);

                    // Procesar llegada si existe
                    if (arrival && arrival.time) {
                        const scheduledTime = new Date(arrival.time * 1000);

                        // Filtrar por tiempo
                        if (scheduledTime >= treintaMinutosAtras && scheduledTime <= doceHorasDespues) {
                            const delay = arrival.delay || 0;
                            const estimatedTime = delay > 0 ? new Date(scheduledTime.getTime() + delay * 1000) : null;

                            llegadas.push({
                                id: `gtfs-arr-${trainNumber}-${arrival.time}`,
                                numeroTren: trainNumber,
                                origen: getOriginFromTrip(trip, stopUpdates, stopId) || 'N/A',
                                destino: 'Sevilla Santa Justa',
                                horaProgramada: formatGTFSTime(scheduledTime),
                                horaEstimada: estimatedTime ? formatGTFSTime(estimatedTime) : null,
                                retraso: Math.max(0, Math.floor(delay / 60)), // Convertir segundos a minutos
                                estado: getTrainEstado(delay, false) as any,
                                via: null,
                                tipoTren: trainType
                            });
                        }
                    }

                    // Procesar salida si existe
                    if (departure && departure.time) {
                        const scheduledTime = new Date(departure.time * 1000);

                        // Filtrar por tiempo
                        if (scheduledTime >= treintaMinutosAtras && scheduledTime <= doceHorasDespues) {
                            const delay = departure.delay || 0;
                            const estimatedTime = delay > 0 ? new Date(scheduledTime.getTime() + delay * 1000) : null;

                            salidas.push({
                                id: `gtfs-dep-${trainNumber}-${departure.time}`,
                                numeroTren: trainNumber,
                                origen: 'Sevilla Santa Justa',
                                destino: getDestinationFromTrip(trip, stopUpdates, stopId) || 'N/A',
                                horaProgramada: formatGTFSTime(scheduledTime),
                                horaEstimada: estimatedTime ? formatGTFSTime(estimatedTime) : null,
                                retraso: Math.max(0, Math.floor(delay / 60)), // Convertir segundos a minutos
                                estado: getTrainEstado(delay, true) as any,
                                via: null,
                                tipoTren: trainType
                            });
                        }
                    }
                });
            } catch (err) {
                console.warn('Error parsing trip update:', err);
            }
        });

        // Ordenar por hora
        const llegadasOrdenadas = sortTrainsByTime(llegadas);
        const salidasOrdenadas = sortTrainsByTime(salidas);

        return {
            nombre: 'Sevilla Santa Justa',
            codigo: SANTA_JUSTA_CODE,
            ultimaActualizacion: new Date(),
            llegadas: llegadasOrdenadas,
            salidas: salidasOrdenadas,
            isRealData: true
        };
    } catch (error) {
        console.error('❌ Error parsing Renfe GTFS data:', error);
        return null;
    }
};

/**
 * Formatea tiempo GTFS a HH:mm
 */
const formatGTFSTime = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * Obtiene el tipo de tren basándose en route_id o trip_id
 */
const getTrainType = (routeId: string, trainNumber: string): string => {
    const id = (routeId || trainNumber).toUpperCase();

    if (id.includes('AVE') || id.includes('AV-')) return 'AVE';
    if (id.includes('ALVIA') || id.includes('ALV')) return 'ALVIA';
    if (id.includes('MD') || id.includes('MEDIA')) return 'MD';
    if (id.includes('LD') || id.includes('LARGA')) return 'LD';
    if (id.includes('AVANT')) return 'AVANT';

    return 'LD'; // Por defecto Larga Distancia
};

/**
 * Obtiene el origen del viaje (primera parada antes de Santa Justa)
 */
const getOriginFromTrip = (trip: any, stops: any[], currentStopId: string): string | null => {
    // Buscar la primera parada del viaje
    if (stops && stops.length > 0) {
        const firstStop = stops[0];
        if (firstStop.stop_id && firstStop.stop_id !== currentStopId) {
            return getStationName(firstStop.stop_id);
        }
    }
    return trip?.trip_headsign || null;
};

/**
 * Obtiene el destino del viaje (última parada después de Santa Justa)
 */
const getDestinationFromTrip = (trip: any, stops: any[], currentStopId: string): string | null => {
    // Buscar la última parada del viaje
    if (stops && stops.length > 0) {
        const lastStop = stops[stops.length - 1];
        if (lastStop.stop_id && lastStop.stop_id !== currentStopId) {
            return getStationName(lastStop.stop_id);
        }
    }
    return trip?.trip_headsign || null;
};

/**
 * Convierte código de estación GTFS a nombre legible
 */
const getStationName = (stopId: string): string => {
    // Map común de códigos GTFS a nombres de estación
    const stationMap: Record<string, string> = {
        '71401': 'Sevilla Santa Justa',
        '60000': 'Madrid Puerta de Atocha',
        '71801': 'Córdoba',
        '72200': 'Málaga María Zambrano',
        '79600': 'Barcelona Sants',
        '73401': 'Cádiz',
        // Añadir más según necesidad
    };

    // Extraer código base (primeros 5 dígitos)
    const baseCode = stopId.substring(0, 5);
    return stationMap[baseCode] || stopId;
};

/**
 * Determina estado del tren basado en retraso
 */
const getTrainEstado = (delaySeconds: number, isDeparture: boolean): string => {
    const delayMinutes = Math.floor(delaySeconds / 60);

    if (delayMinutes > 5) return 'retrasado';
    if (delayMinutes < -5) { // Salió/llegó antes
        return isDeparture ? 'salido' : 'llegado';
    }
    return 'a_tiempo';
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
    if (!estado || typeof estado !== 'string') {
        return retraso > 0 ? 'retrasado' : 'a_tiempo';
    }

    const estadoLower = estado.toLowerCase().trim();

    // Estados finales primero (prioridad)
    if (estadoLower.includes('cancelado') || estadoLower.includes('cancel') || estadoLower === 'cancelado') {
        return 'cancelado';
    }
    if (estadoLower.includes('llegado') || estadoLower.includes('arrived') || estadoLower === 'llegado') {
        return 'llegado';
    }
    if (estadoLower.includes('salido') || estadoLower.includes('departed') || estadoLower === 'salido') {
        return 'salido';
    }

    // Estado de retraso
    if (retraso > 0 || estadoLower.includes('retrasado') || estadoLower.includes('delay') || estadoLower.includes('atraso')) {
        return 'retrasado';
    }

    // Por defecto, a tiempo
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
 * Genera datos de ejemplo realistas basados en horarios típicos de Santa Justa
 * Estos son horarios aproximados basados en servicios reales de Renfe
 */
const generateSampleArrivals = (ahora: Date): TrainArrival[] => {
    const llegadas: TrainArrival[] = [];
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();

    // Horarios típicos de llegadas a Santa Justa (ejemplos reales)
    const horariosTipicos = [
        { hora: horaActual, min: minutosActuales + 15, origen: 'Madrid-Puerta de Atocha', tipo: 'AVE', num: '1120' },
        { hora: horaActual, min: minutosActuales + 35, origen: 'Córdoba', tipo: 'MD', num: '5447' },
        { hora: horaActual, min: minutosActuales + 50, origen: 'Málaga-María Zambrano', tipo: 'AVE', num: '8816' },
        { hora: horaActual + 1, min: 10, origen: 'Madrid-Puerta de Atocha', tipo: 'ALV', num: '5315' },
        { hora: horaActual + 1, min: 30, origen: 'Cádiz', tipo: 'MD', num: '4456' },
        { hora: horaActual + 1, min: 55, origen: 'Barcelona-Sants', tipo: 'AVE', num: '9876' },
        { hora: horaActual + 2, min: 15, origen: 'Madrid-Puerta de Atocha', tipo: 'AVE', num: '1121' },
        { hora: horaActual + 2, min: 40, origen: 'Córdoba', tipo: 'MD', num: '5448' },
        { hora: horaActual + 3, min: 5, origen: 'Málaga-María Zambrano', tipo: 'AVE', num: '8817' },
        { hora: horaActual + 3, min: 25, origen: 'Madrid-Puerta de Atocha', tipo: 'ALV', num: '5316' },
    ];

    horariosTipicos.forEach((horario, i) => {
        const horaProgramada = new Date(ahora);
        horaProgramada.setHours(horario.hora, horario.min, 0, 0);

        // Algunos trenes con retraso (30% de probabilidad)
        const tieneRetraso = Math.random() > 0.7;
        const retraso = tieneRetraso ? Math.floor(Math.random() * 25) + 3 : 0;

        const horaEstimada = retraso > 0
            ? new Date(horaProgramada.getTime() + retraso * 60000)
            : null;

        const numeroTren = `${horario.tipo}-${horario.num}`;
        const via = Math.random() > 0.4 ? `Vía ${Math.floor(Math.random() * 8) + 1}` : null;

        llegadas.push({
            id: `arr-${i}`,
            numeroTren,
            origen: horario.origen,
            destino: 'Sevilla Santa Justa',
            horaProgramada: horaProgramada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            horaEstimada: horaEstimada ? horaEstimada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
            retraso,
            estado: retraso > 0 ? 'retrasado' : 'a_tiempo',
            via,
            tipoTren: horario.tipo,
        });
    });

    // Ordenar por hora programada (más próximo primero, considerando cambio de día)
    return sortTrainsByTime(llegadas);
};

/**
 * Genera datos de ejemplo realistas de salidas basados en horarios típicos
 */
const generateSampleDepartures = (ahora: Date): TrainDeparture[] => {
    const salidas: TrainDeparture[] = [];
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();

    // Horarios típicos de salidas desde Santa Justa
    const horariosTipicos = [
        { hora: horaActual, min: minutosActuales + 12, destino: 'Madrid-Puerta de Atocha', tipo: 'AVE', num: '1122' },
        { hora: horaActual, min: minutosActuales + 28, destino: 'Cádiz', tipo: 'MD', num: '4457' },
        { hora: horaActual, min: minutosActuales + 45, destino: 'Málaga-María Zambrano', tipo: 'AVE', num: '8818' },
        { hora: horaActual + 1, min: 5, destino: 'Barcelona-Sants', tipo: 'AVE', num: '9877' },
        { hora: horaActual + 1, min: 22, destino: 'Madrid-Puerta de Atocha', tipo: 'ALV', num: '5317' },
        { hora: horaActual + 1, min: 38, destino: 'Córdoba', tipo: 'MD', num: '5449' },
        { hora: horaActual + 1, min: 52, destino: 'Huelva', tipo: 'MD', num: '3321' },
        { hora: horaActual + 2, min: 8, destino: 'Madrid-Puerta de Atocha', tipo: 'AVE', num: '1123' },
        { hora: horaActual + 2, min: 35, destino: 'Málaga-María Zambrano', tipo: 'AVE', num: '8819' },
        { hora: horaActual + 2, min: 48, destino: 'Cádiz', tipo: 'MD', num: '4458' },
    ];

    horariosTipicos.forEach((horario, i) => {
        const horaProgramada = new Date(ahora);
        horaProgramada.setHours(horario.hora, horario.min, 0, 0);

        // Algunos trenes con retraso (25% de probabilidad)
        const tieneRetraso = Math.random() > 0.75;
        const retraso = tieneRetraso ? Math.floor(Math.random() * 20) + 2 : 0;

        const horaEstimada = retraso > 0
            ? new Date(horaProgramada.getTime() + retraso * 60000)
            : null;

        const numeroTren = `${horario.tipo}-${horario.num}`;
        const via = Math.random() > 0.4 ? `Vía ${Math.floor(Math.random() * 8) + 1}` : null;

        salidas.push({
            id: `dep-${i}`,
            numeroTren,
            origen: 'Sevilla Santa Justa',
            destino: horario.destino,
            horaProgramada: horaProgramada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            horaEstimada: horaEstimada ? horaEstimada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
            retraso,
            estado: retraso > 0 ? 'retrasado' : 'a_tiempo',
            via,
            tipoTren: horario.tipo,
        });
    });

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

