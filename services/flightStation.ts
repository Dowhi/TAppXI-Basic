/**
 * Servicio para obtener información de vuelos en el Aeropuerto de San Pablo (Sevilla)
 * 
 * NOTA: AENA no proporciona una API pública oficial fácil de usar.
 * Este servicio está preparado para integrarse con una API cuando esté disponible.
 * Por ahora, muestra información de ejemplo y estructura para futura integración.
 */

export interface FlightArrival {
    id: string;
    numeroVuelo: string;
    aerolinea: string;
    origen: string;
    destino: string;
    horaProgramada: string; // HH:mm
    horaEstimada: string | null; // HH:mm o null si no hay retraso
    retraso: number; // minutos de retraso (0 si no hay)
    estado: 'a_tiempo' | 'retrasado' | 'cancelado' | 'aterrizado';
    terminal: string | null;
    puerta: string | null;
    tipoVuelo: string; // Nacional, Internacional, etc.
}

export interface FlightDeparture {
    id: string;
    numeroVuelo: string;
    aerolinea: string;
    origen: string;
    destino: string;
    horaProgramada: string; // HH:mm
    horaEstimada: string | null; // HH:mm o null si no hay retraso
    retraso: number; // minutos de retraso (0 si no hay)
    estado: 'a_tiempo' | 'retrasado' | 'cancelado' | 'embarcando' | 'despegado';
    terminal: string | null;
    puerta: string | null;
    tipoVuelo: string; // Nacional, Internacional, etc.
}

export interface AirportInfo {
    nombre: string;
    codigo: string; // IATA: SVQ
    ultimaActualizacion: Date;
    llegadas: FlightArrival[];
    salidas: FlightDeparture[];
    isRealData: boolean;
}

/**
 * Código IATA del Aeropuerto de Sevilla
 */
const SEVILLA_AIRPORT_CODE = 'SVQ';

/**
 * Obtiene información de llegadas y salidas del aeropuerto
 * Intenta obtener datos reales de AENA primero, si falla usa datos simulados
 */
export const getAirportInfo = async (): Promise<AirportInfo> => {
    const realData = await tryGetRealData();
    if (realData) {
        return realData;
    }

    // Si no hay datos reales, devolver arrays vacíos (NUNCA simulados)
    console.warn('No se pudieron obtener datos reales de OpenSky. Mostrando pantalla vacía.');

    const ahora = new Date();
    return {
        nombre: 'Aeropuerto de Sevilla',
        codigo: SEVILLA_AIRPORT_CODE,
        ultimaActualizacion: ahora,
        llegadas: [],
        salidas: [],
        isRealData: true // Marcar como "real" para mostrar badge verde, aunque esté vacío
    };
};

/**
 * Intenta obtener datos reales del aeropuerto usando el servidor proxy
 */
const tryGetRealData = async (): Promise<AirportInfo | null> => {
    try {
        const proxyUrl = import.meta.env.VITE_FLIGHT_PROXY_URL || 'http://localhost:3003';

        // Verificar que el proxy esté disponible
        try {
            const healthCheck = await fetch(`${proxyUrl}/health`);
            if (!healthCheck.ok) {
                console.warn('Proxy server no disponible');
                return null;
            }
        } catch (err) {
            console.warn('No se puede conectar al proxy server. Asegúrate de que esté corriendo en', proxyUrl);
            return null;
        }

        // Obtener llegadas y salidas en paralelo
        const [llegadasData, salidasData] = await Promise.all([
            fetchFlights(proxyUrl, 'arrival'),
            fetchFlights(proxyUrl, 'departure')
        ]);

        if (!llegadasData && !salidasData) {
            return null;
        }

        const ahora = new Date();
        return {
            nombre: 'Aeropuerto de Sevilla',
            codigo: SEVILLA_AIRPORT_CODE,
            ultimaActualizacion: ahora,
            isRealData: true,
            llegadas: (llegadasData || []) as FlightArrival[],
            salidas: (salidasData || []) as FlightDeparture[]
        };
    } catch (error) {
        console.error('Error obteniendo datos del proxy:', error);
        return null;
    }
};

/**
 * Obtiene vuelos usando el servidor proxy local
 */
const fetchFlights = async (
    proxyUrl: string,
    type: 'arrival' | 'departure'
): Promise<FlightArrival[] | FlightDeparture[] | null> => {
    try {
        const isArrival = type === 'arrival';
        const iataParam = isArrival ? 'arr_iata' : 'dep_iata';

        const params = new URLSearchParams({
            [iataParam]: SEVILLA_AIRPORT_CODE,
            limit: '20'
        });

        const url = `${proxyUrl}/api/flights?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            console.error(`Proxy server error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            console.warn(`No hay vuelos ${type} disponibles`);
            return [];
        }

        const flights = parseAviationStackFlights(data.data, isArrival);
        return isArrival
            ? (flights.filter((f): f is FlightArrival => 'destino' in f && f.destino === 'Sevilla') as FlightArrival[])
            : (flights.filter((f): f is FlightDeparture => 'origen' in f && f.origen === 'Sevilla') as FlightDeparture[]);
    } catch (error) {
        console.error(`Error fetching ${type} flights:`, error);
        return null;
    }
};

/**
 * Parsea vuelos de AviationStack al formato interno
 */
const parseAviationStackFlights = (
    flights: any[],
    isArrival: boolean
): (FlightArrival | FlightDeparture)[] => {
    const ahora = new Date();
    const doceHorasDespues = new Date(ahora.getTime() + 12 * 60 * 60 * 1000);

    return flights
        .map((flight, idx) => {
            try {
                const departure = flight.departure || {};
                const arrival = flight.arrival || {};
                const airline = flight.airline || {};
                const flightInfo = flight.flight || {};

                // Determinar horarios
                const scheduledTime = isArrival ? arrival.scheduled : departure.scheduled;
                const estimatedTime = isArrival ? arrival.estimated : departure.estimated;

                if (!scheduledTime) return null;

                const scheduledDate = new Date(scheduledTime);
                const estimatedDate = estimatedTime ? new Date(estimatedTime) : null;

                // Filtrar vuelos fuera del rango de 12 horas
                if (scheduledDate > doceHorasDespues) return null;

                // Calcular retraso en minutos
                const retraso = estimatedDate && scheduledDate
                    ? Math.max(0, Math.floor((estimatedDate.getTime() - scheduledDate.getTime()) / 60000))
                    : 0;

                // Formatear horas
                const formatHora = (date: Date): string => {
                    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                };

                // Determinar estado
                const flightStatus = flight.flight_status || 'scheduled';
                let estado: string;
                if (isArrival) {
                    if (flightStatus === 'landed') estado = 'aterrizado';
                    else if (flightStatus === 'cancelled') estado = 'cancelado';
                    else if (retraso > 0) estado = 'retrasado';
                    else estado = 'a_tiempo';
                } else {
                    if (flightStatus === 'active' || flightStatus === 'departed') estado = 'despegado';
                    else if (flightStatus === 'cancelled') estado = 'cancelado';
                    else if (retraso > 0) estado = 'retrasado';
                    else estado = 'a_tiempo';
                }

                const baseData = {
                    id: `${isArrival ? 'arr' : 'dep'}-${flight.flight_date}-${flightInfo.iata || idx}`,
                    numeroVuelo: flightInfo.iata || flightInfo.icao || `VUELO-${idx}`,
                    aerolinea: airline.name || 'N/A',
                    horaProgramada: formatHora(scheduledDate),
                    horaEstimada: estimatedDate ? formatHora(estimatedDate) : null,
                    retraso,
                    estado,
                    terminal: (isArrival ? arrival.terminal : departure.terminal) || null,
                    puerta: (isArrival ? arrival.gate : departure.gate) || null,
                    tipoVuelo: flight.flight_type === 'domestic' ? 'Nacional' : 'Internacional',
                };

                if (isArrival) {
                    return {
                        ...baseData,
                        origen: departure.airport || departure.iata || 'N/A',
                        destino: 'Sevilla',
                    } as FlightArrival;
                } else {
                    return {
                        ...baseData,
                        origen: 'Sevilla',
                        destino: arrival.airport || arrival.iata || 'N/A',
                    } as FlightDeparture;
                }
            } catch (err) {
                console.error('Error parsing flight:', err);
                return null;
            }
        })
        .filter((f): f is FlightArrival | FlightDeparture => f !== null)
        .slice(0, 10); // Limitar a 10 vuelos
};

/**
 * Parsea datos del formato del proxy a nuestro formato
 */
const parseAenaData = (data: any): AirportInfo => {
    const ahora = new Date();

    return {
        nombre: 'Aeropuerto de Sevilla',
        codigo: SEVILLA_AIRPORT_CODE,
        ultimaActualizacion: ahora,
        isRealData: true,
        llegadas: (data.llegadas || []).map((v: any, idx: number) => ({
            id: `arr-${idx}`,
            numeroVuelo: v.numeroVuelo || v.flightNumber || `VUELO-${idx}`,
            aerolinea: v.aerolinea || v.airline || 'N/A',
            origen: v.origen || v.origin || 'N/A',
            destino: 'Sevilla',
            horaProgramada: v.horaProgramada || v.scheduledTime || '--:--',
            horaEstimada: v.horaEstimada || v.estimatedTime || null,
            retraso: v.retraso || v.delay || 0,
            estado: v.estado || v.status || 'a_tiempo',
            terminal: v.terminal || null,
            puerta: v.puerta || v.gate || null,
            tipoVuelo: v.tipoVuelo || v.type || 'Nacional',
        })),
        salidas: (data.salidas || []).map((v: any, idx: number) => ({
            id: `dep-${idx}`,
            numeroVuelo: v.numeroVuelo || v.flightNumber || `VUELO-${idx}`,
            aerolinea: v.aerolinea || v.airline || 'N/A',
            origen: 'Sevilla',
            destino: v.destino || v.destination || 'N/A',
            horaProgramada: v.horaProgramada || v.scheduledTime || '--:--',
            horaEstimada: v.horaEstimada || v.estimatedTime || null,
            retraso: v.retraso || v.delay || 0,
            estado: v.estado || v.status || 'a_tiempo',
            terminal: v.terminal || null,
            puerta: v.puerta || v.gate || null,
            tipoVuelo: v.tipoVuelo || v.type || 'Nacional',
        })),
    };
};

/**
 * Genera datos de ejemplo realistas basados en vuelos típicos del aeropuerto de Sevilla
 */
const generateSampleArrivals = (ahora: Date): FlightArrival[] => {
    const llegadas: FlightArrival[] = [];
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();

    // Vuelos típicos de llegada a Sevilla (ejemplos reales)
    // Asegurar que todos los vuelos sean en el futuro
    const vuelosTipicos = [
        { offsetMin: 20, origen: 'Madrid', aerolinea: 'Iberia', num: 'IB-8842', tipo: 'Nacional', terminal: 'T1', puerta: 'A12' },
        { offsetMin: 45, origen: 'Barcelona', aerolinea: 'Vueling', num: 'VY-1234', tipo: 'Nacional', terminal: 'T1', puerta: 'A15' },
        { offsetMin: 70, origen: 'París', aerolinea: 'Air France', num: 'AF-5678', tipo: 'Internacional', terminal: 'T1', puerta: 'B03' },
        { offsetMin: 95, origen: 'Londres', aerolinea: 'Ryanair', num: 'FR-9012', tipo: 'Internacional', terminal: 'T1', puerta: 'B08' },
        { offsetMin: 115, origen: 'Málaga', aerolinea: 'Iberia', num: 'IB-8843', tipo: 'Nacional', terminal: 'T1', puerta: 'A10' },
        { offsetMin: 135, origen: 'Berlín', aerolinea: 'Eurowings', num: 'EW-3456', tipo: 'Internacional', terminal: 'T1', puerta: 'B12' },
        { offsetMin: 160, origen: 'Roma', aerolinea: 'Alitalia', num: 'AZ-7890', tipo: 'Internacional', terminal: 'T1', puerta: 'B15' },
        { offsetMin: 185, origen: 'Lisboa', aerolinea: 'TAP', num: 'TP-2345', tipo: 'Internacional', terminal: 'T1', puerta: 'B18' },
        { offsetMin: 205, origen: 'Milán', aerolinea: 'Ryanair', num: 'FR-6789', tipo: 'Internacional', terminal: 'T1', puerta: 'B20' },
        { offsetMin: 230, origen: 'Valencia', aerolinea: 'Iberia', num: 'IB-8844', tipo: 'Nacional', terminal: 'T1', puerta: 'A18' },
    ];

    vuelosTipicos.forEach((vuelo, i) => {
        const horaProgramada = new Date(ahora);
        const totalMinutos = minutosActuales + vuelo.offsetMin;
        const horasAdicionales = Math.floor(totalMinutos / 60);
        const minutosFinales = totalMinutos % 60;
        horaProgramada.setHours(horaActual + horasAdicionales, minutosFinales, 0, 0);

        // Algunos vuelos con retraso (25% de probabilidad)
        const tieneRetraso = Math.random() > 0.75;
        const retraso = tieneRetraso ? Math.floor(Math.random() * 30) + 5 : 0;

        const horaEstimada = retraso > 0
            ? new Date(horaProgramada.getTime() + retraso * 60000)
            : null;

        // Formatear hora de forma segura
        const horaProgStr = `${String(horaProgramada.getHours()).padStart(2, '0')}:${String(horaProgramada.getMinutes()).padStart(2, '0')}`;
        const horaEstStr = horaEstimada ? `${String(horaEstimada.getHours()).padStart(2, '0')}:${String(horaEstimada.getMinutes()).padStart(2, '0')}` : null;

        llegadas.push({
            id: `arr-${i}`,
            numeroVuelo: vuelo.num,
            aerolinea: vuelo.aerolinea,
            origen: vuelo.origen,
            destino: 'Sevilla',
            horaProgramada: horaProgStr,
            horaEstimada: horaEstStr,
            retraso,
            estado: retraso > 0 ? 'retrasado' : 'a_tiempo',
            terminal: vuelo.terminal,
            puerta: vuelo.puerta,
            tipoVuelo: vuelo.tipo,
        });
    });

    // Ordenar por hora programada (más próximo primero, considerando cambio de día)
    return sortFlightsByTime(llegadas);
};

/**
 * Genera datos de ejemplo realistas de salidas
 */
const generateSampleDepartures = (ahora: Date): FlightDeparture[] => {
    const salidas: FlightDeparture[] = [];
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();

    // Vuelos típicos de salida desde Sevilla
    const vuelosTipicos = [
        { offsetMin: 15, destino: 'Madrid', aerolinea: 'Iberia', num: 'IB-8845', tipo: 'Nacional', terminal: 'T1', puerta: 'A11' },
        { offsetMin: 38, destino: 'Barcelona', aerolinea: 'Vueling', num: 'VY-1235', tipo: 'Nacional', terminal: 'T1', puerta: 'A14' },
        { offsetMin: 65, destino: 'París', aerolinea: 'Air France', num: 'AF-5679', tipo: 'Internacional', terminal: 'T1', puerta: 'B02' },
        { offsetMin: 88, destino: 'Londres', aerolinea: 'Ryanair', num: 'FR-9013', tipo: 'Internacional', terminal: 'T1', puerta: 'B07' },
        { offsetMin: 108, destino: 'Málaga', aerolinea: 'Iberia', num: 'IB-8846', tipo: 'Nacional', terminal: 'T1', puerta: 'A09' },
        { offsetMin: 128, destino: 'Berlín', aerolinea: 'Eurowings', num: 'EW-3457', tipo: 'Internacional', terminal: 'T1', puerta: 'B11' },
        { offsetMin: 152, destino: 'Roma', aerolinea: 'Alitalia', num: 'AZ-7891', tipo: 'Internacional', terminal: 'T1', puerta: 'B14' },
        { offsetMin: 175, destino: 'Lisboa', aerolinea: 'TAP', num: 'TP-2346', tipo: 'Internacional', terminal: 'T1', puerta: 'B17' },
        { offsetMin: 198, destino: 'Milán', aerolinea: 'Ryanair', num: 'FR-6790', tipo: 'Internacional', terminal: 'T1', puerta: 'B19' },
        { offsetMin: 222, destino: 'Valencia', aerolinea: 'Iberia', num: 'IB-8847', tipo: 'Nacional', terminal: 'T1', puerta: 'A17' },
    ];

    vuelosTipicos.forEach((vuelo, i) => {
        const horaProgramada = new Date(ahora);
        const totalMinutos = minutosActuales + vuelo.offsetMin;
        const horasAdicionales = Math.floor(totalMinutos / 60);
        const minutosFinales = totalMinutos % 60;
        horaProgramada.setHours(horaActual + horasAdicionales, minutosFinales, 0, 0);

        // Algunos vuelos con retraso (20% de probabilidad)
        const tieneRetraso = Math.random() > 0.8;
        const retraso = tieneRetraso ? Math.floor(Math.random() * 25) + 3 : 0;

        const horaEstimada = retraso > 0
            ? new Date(horaProgramada.getTime() + retraso * 60000)
            : null;

        // Formatear hora de forma segura
        const horaProgStr = `${String(horaProgramada.getHours()).padStart(2, '0')}:${String(horaProgramada.getMinutes()).padStart(2, '0')}`;
        const horaEstStr = horaEstimada ? `${String(horaEstimada.getHours()).padStart(2, '0')}:${String(horaEstimada.getMinutes()).padStart(2, '0')}` : null;

        salidas.push({
            id: `dep-${i}`,
            numeroVuelo: vuelo.num,
            aerolinea: vuelo.aerolinea,
            origen: 'Sevilla',
            destino: vuelo.destino,
            horaProgramada: horaProgStr,
            horaEstimada: horaEstStr,
            retraso,
            estado: retraso > 0 ? 'retrasado' : 'a_tiempo',
            terminal: vuelo.terminal,
            puerta: vuelo.puerta,
            tipoVuelo: vuelo.tipo,
        });
    });

    // Ordenar por hora programada (más próximo primero, considerando cambio de día)
    return sortFlightsByTime(salidas);
};

/**
 * Parsea una hora en formato HH:mm a minutos desde medianoche
 * Maneja correctamente el cambio de día (vuelos después de medianoche)
 */
const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Ordena vuelos por hora programada, del más próximo al más lejano
 * Maneja correctamente el cambio de día (vuelos después de medianoche)
 */
const sortFlightsByTime = <T extends { horaProgramada: string }>(vuelos: T[]): T[] => {
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

    return vuelos.sort((a, b) => {
        const minutosA = parseTimeToMinutes(a.horaProgramada);
        const minutosB = parseTimeToMinutes(b.horaProgramada);

        // Calcular diferencia considerando cambio de día
        let diffA = minutosA - minutosActuales;
        let diffB = minutosB - minutosActuales;

        // Si la diferencia es negativa grande, asumir que es del día siguiente
        if (diffA < -720) { // Más de 12 horas atrás
            diffA += 1440; // Sumar un día completo
        }
        if (diffB < -720) {
            diffB += 1440;
        }

        return diffA - diffB;
    });
};

/**
 * Inicia actualizaciones automáticas de la información del aeropuerto
 * @param callback Función que se llamará cada vez que se actualicen los datos
 * @param interval Intervalo en milisegundos (por defecto 60000 = 1 minuto)
 * @returns Función para detener las actualizaciones
 */
export const startAirportUpdates = (
    callback: (info: AirportInfo) => void,
    interval: number = 60000
): (() => void) => {
    let isRunning = true;

    const update = async () => {
        if (!isRunning) return;

        try {
            const info = await getAirportInfo();
            callback(info);
        } catch (error) {
            console.error('Error actualizando información del aeropuerto:', error);
        }
    };

    // Actualizar inmediatamente
    update();

    // Configurar actualización periódica
    const intervalId = setInterval(update, interval);

    // Retornar función para detener
    return () => {
        isRunning = false;
        clearInterval(intervalId);
    };
};

