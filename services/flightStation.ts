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
    // Intentar AviationStack (Plan A)
    let realData = await tryGetRealData();
    if (realData) {
        return realData;
    }

    // Intentar OpenSky (Plan B)
    console.log('AviationStack falló o sin cupo. Intentando OpenSky...');
    realData = await tryGetOpenSkyData();

    if (realData) {
        return realData;
    }

    // SI todo falla, devolver vacío pero NO inventar datos
    console.warn('No se pudieron obtener datos reales de ninguna fuente.');

    const ahora = new Date();
    return {
        nombre: 'Aeropuerto de Sevilla',
        codigo: SEVILLA_AIRPORT_CODE,
        ultimaActualizacion: ahora,
        llegadas: [],
        salidas: [],
        isRealData: false // Marcamos false para indicar que NO tenemos datos (error)
    };
};

/**
 * Intenta obtener datos reales del aeropuerto usando AviationStack
 */
const tryGetRealData = async (): Promise<AirportInfo | null> => {
    try {
        const proxyUrl = import.meta.env.VITE_FLIGHT_PROXY_URL || 'http://localhost:3003';

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
            llegadas: (llegadasData || []) as unknown as FlightArrival[],
            salidas: (salidasData || []) as unknown as FlightDeparture[]
        };
    } catch (error) {
        console.error('Error obteniendo datos de AviationStack:', error);
        return null; // Dejar que el fallback actúe
    }
};

/**
 * Intenta obtener datos de OpenSky
 */
const tryGetOpenSkyData = async (): Promise<AirportInfo | null> => {
    try {
        const [llegadasData, salidasData] = await Promise.all([
            fetchOpenSkyFlights('arrival'),
            fetchOpenSkyFlights('departure')
        ]);

        if (!llegadasData && !salidasData) {
            return null;
        }

        // Si ambos arrays estan vacios es sospechoso, pero valido
        if ((!llegadasData || llegadasData.length === 0) && (!salidasData || salidasData.length === 0)) {
            return null;
        }

        const ahora = new Date();
        return {
            nombre: 'Aeropuerto de Sevilla',
            codigo: SEVILLA_AIRPORT_CODE,
            ultimaActualizacion: ahora,
            isRealData: true,
            llegadas: (llegadasData || []) as unknown as FlightArrival[],
            salidas: (salidasData || []) as unknown as FlightDeparture[]
        };
    } catch (error) {
        console.error('Error obteniendo datos de OpenSky:', error);
        return null;
    }
};

/**
 * Obtiene vuelos usando AviationStack via CORS proxy para funcionar en cliente
 */
const fetchFlights = async (
    proxyUrl: string, // Ignorado, usamos public proxies
    type: 'arrival' | 'departure'
): Promise<FlightArrival[] | FlightDeparture[] | null> => {
    try {
        const isArrival = type === 'arrival';
        const apiKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY || 'c5d73f4d32dd502acd03ead83b9d0130';

        // AviationStack Free solo permite HTTP
        const baseUrl = 'http://api.aviationstack.com/v1/flights';
        const params = new URLSearchParams({
            access_key: apiKey,
            [isArrival ? 'arr_iata' : 'dep_iata']: SEVILLA_AIRPORT_CODE,
            limit: '100' // Aumentamos límite para asegurar que capturamos los vuelos de la mañana
        });

        const targetUrl = `${baseUrl}?${params.toString()}`;

        // Usamos CodeTabs como proxy CORS/SSL (alternativa a corsproxy.io que fallaba DNS)
        const corsProxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;

        console.log(`Fetching ${type} flights via proxy: ${corsProxyUrl}`);

        const response = await fetch(corsProxyUrl, {
            method: 'GET',
        });

        if (!response.ok) {
            console.error(`Error fetching flights via proxy: ${response.status} ${response.statusText}`);
            return null;
        }

        // CodeTabs devuelve la respuesta directa
        const data = await response.json();

        if (data.error) {
            console.warn(`AviationStack Error:`, data.error);
            return null; // Retornar null para activar fallback
        }

        if (!data.data || data.data.length === 0) {
            console.warn(`No hay vuelos ${type} disponibles en AviationStack`, data);
            return [];
        }

        const flights = parseAviationStackFlights(data.data, isArrival);

        // Ordenar por hora (más cercano a más lejano)
        const sortedFlights = sortFlightsByTime(flights);

        const filteredFlights = isArrival
            ? (sortedFlights.filter((f): f is FlightArrival => 'destino' in f && f.destino === 'Sevilla') as FlightArrival[])
            : (sortedFlights.filter((f): f is FlightDeparture => 'origen' in f && f.origen === 'Sevilla') as FlightDeparture[]);

        return filteredFlights.slice(0, 10);
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

                // Filtrar vuelos que ya pasaron (más de 30 min atrás) o muy lejanos (más de 12h)
                const treintaMinutosAtras = new Date(ahora.getTime() - 30 * 60 * 1000);
                if (scheduledDate < treintaMinutosAtras) return null; // Vuelo ya pasó hace más de 30 min
                if (scheduledDate > doceHorasDespues) return null; // Vuelo demasiado lejano

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
        .filter((f): f is FlightArrival | FlightDeparture => f !== null);
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
 * Intenta obtener datos de OpenSky Network (Filtro por aeropuerto LEZL)
 */
const fetchOpenSkyFlights = async (
    type: 'arrival' | 'departure'
): Promise<FlightArrival[] | FlightDeparture[] | null> => {
    try {
        const isArrival = type === 'arrival';
        // OpenSky usa ICAO (LEZL) no IATA (SVQ)
        const airportCode = 'LEZL';

        const end = Math.floor(Date.now() / 1000); // Ahora
        // Buscar ultimas 12 horas (OpenSky free version tiene limitaciones de tiempo hacia atras)
        const begin = end - (6 * 60 * 60);

        const baseUrl = `https://opensky-network.org/api/flights/${type}`;
        const params = new URLSearchParams({
            airport: airportCode,
            begin: begin.toString(),
            end: end.toString()
        });

        const targetUrl = `${baseUrl}?${params.toString()}`;

        console.log(`Fetching OpenSky ${type} directly: ${targetUrl}`);

        const response = await fetch(targetUrl);

        if (!response.ok) {
            console.warn(`OpenSky API error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            return [];
        }

        return parseOpenSkyFlights(data, isArrival);
    } catch (error) {
        console.error(`Error fetching OpenSky ${type}:`, error);
        return null;
    }
};

/**
 * Parsea vuelos de OpenSky
 */
const parseOpenSkyFlights = (flights: any[], isArrival: boolean): (FlightArrival | FlightDeparture)[] => {
    return flights.map((flight, idx) => {
        const tiempo = isArrival ? flight.lastSeen : flight.firstSeen;
        const date = new Date(tiempo * 1000);
        const formatHora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        const baseData = {
            id: `os-${isArrival ? 'arr' : 'dep'}-${flight.icao24}-${flight.firstSeen}`,
            numeroVuelo: flight.callsign ? flight.callsign.trim() : `VUELO-${idx}`,
            aerolinea: getAirlineFromCallsign(flight.callsign),
            horaProgramada: formatHora(date), // OpenSky da tiempos reales, asi que usamos eso como programada tb
            horaEstimada: formatHora(date),
            retraso: 0, // No tenemos dato de retraso explicito facilmente
            estado: 'a_tiempo' as const, // Asumimos a tiempo si no sabemos
            terminal: null,
            puerta: null,
            tipoVuelo: 'N/A' // No distinguimos facilmente
        };

        if (isArrival) {
            return {
                ...baseData,
                origen: flight.estDepartureAirport || 'Desconocido',
                destino: 'Sevilla'
            } as FlightArrival;
        } else {
            return {
                ...baseData,
                origen: 'Sevilla',
                destino: flight.estArrivalAirport || 'Desconocido'
            } as FlightDeparture;
        }
    });
};

/**
 * Intenta deducir aerolinea por el callsign (muy basico)
 */
const getAirlineFromCallsign = (callsign: string | null): string => {
    if (!callsign) return 'N/A';
    const trimmed = callsign.trim();
    if (trimmed.startsWith('RYR')) return 'Ryanair';
    if (trimmed.startsWith('VLG')) return 'Vueling';
    if (trimmed.startsWith('IBE')) return 'Iberia';
    if (trimmed.startsWith('EJU')) return 'EasyJet';
    if (trimmed.startsWith('TRA')) return 'Transavia';
    if (trimmed.startsWith('TAP')) return 'TAP Portugal';
    return trimmed.substring(0, 3);
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

