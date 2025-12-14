const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3003;

// Configurar CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173', 'https://dowhi.github.io'],
    methods: ['GET'],
    credentials: true
}));

app.use(express.json());

// Código ICAO del Aeropuerto de Sevilla
const SEVILLA_ICAO = 'LEZL';

// Cache para evitar llamadas excesivas
let flightsCache = {
    arrivals: { data: [], timestamp: 0 },
    departures: { data: [], timestamp: 0 }
};
const CACHE_DURATION = 300000; // 5 minutos (OpenSky actualiza cada varios minutos)

// Endpoint para obtener vuelos desde OpenSky Network
app.get('/api/flights', async (req, res) => {
    try {
        const { arr_iata, dep_iata } = req.query;
        const isArrival = !!arr_iata;
        const cacheKey = isArrival ? 'arrivals' : 'departures';

        // Verificar cache
        const now = Date.now();
        if (now - flightsCache[cacheKey].timestamp < CACHE_DURATION) {
            console.log(`[Proxy] Returning cached ${cacheKey} (${flightsCache[cacheKey].data.length} flights)`);
            return res.json({ data: flightsCache[cacheKey].data });
        }

        console.log(`[Proxy] Fetching ${isArrival ? 'arrivals' : 'departures'} from OpenSky Network...`);

        const flights = await fetchOpenSkyFlights(isArrival);

        // Actualizar cache
        flightsCache[cacheKey] = {
            data: flights,
            timestamp: now
        };

        console.log(`[Proxy] Success: ${flights.length} flights found`);

        res.json({ data: flights });

    } catch (error) {
        console.error('[Proxy] Error fetching from OpenSky:', error);
        res.status(500).json({
            error: 'Error al obtener datos de OpenSky',
            details: error.message
        });
    }
});

// Función para obtener vuelos de OpenSky Network
async function fetchOpenSkyFlights(isArrival) {
    try {
        // Calcular ventana de tiempo (últimas 12 horas hasta ahora)
        // OpenSky solo muestra vuelos que ya ocurrieron, no programados
        const now = Math.floor(Date.now() / 1000);
        const begin = now - (2 * 60 * 60); // 2 horas atrás (más relevante para "recién llegados")

        // URL de OpenSky Network API
        const endpoint = isArrival
            ? `https://opensky-network.org/api/flights/arrival`
            : `https://opensky-network.org/api/flights/departure`;

        const url = `${endpoint}?airport=${SEVILLA_ICAO}&begin=${begin}&end=${now}`;

        console.log(`[OpenSky] Fetching: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TAppXI-Flight-Info/1.0'
            }
        });

        if (!response.ok) {
            console.error(`[OpenSky] API error: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();

        if (!data || !Array.isArray(data)) {
            console.warn('[OpenSky] No flight data returned');
            return [];
        }

        console.log(`[OpenSky] Raw data: ${data.length} flights`);

        if (data.length === 0) {
            console.warn(`[OpenSky] ⚠️  No flights found in last 12 hours`);
            console.warn(`[OpenSky] Note: OpenSky only shows completed flights, not scheduled future flights`);
        }

        // Convertir formato OpenSky al formato esperado
        const flights = data.map(flight => convertOpenSkyToStandard(flight, isArrival)).filter(f => f !== null);

        return flights;

    } catch (error) {
        console.error('[OpenSky] Error:', error);
        return [];
    }
}

// Convertir formato OpenSky al formato estándar
function convertOpenSkyToStandard(flight, isArrival) {
    try {
        // OpenSky devuelve: icao24, firstSeen, estDepartureAirport, lastSeen, estArrivalAirport, callsign, etc.
        const callsign = (flight.callsign || '').trim();
        const icao24 = flight.icao24;
        const departureAirport = flight.estDepartureAirport;
        const arrivalAirport = flight.estArrivalAirport;
        const firstSeen = flight.firstSeen;
        const lastSeen = flight.lastSeen;

        if (!callsign && !icao24) return null;

        // Convertir timestamps a horas
        const formatTime = (timestamp) => {
            if (!timestamp) return null;
            const date = new Date(timestamp * 1000);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        };

        const scheduledTime = isArrival ? formatTime(lastSeen) : formatTime(firstSeen);
        const estimatedTime = scheduledTime;

        return {
            flight_date: new Date().toISOString().split('T')[0],
            flight_status: 'active',
            departure: {
                airport: isArrival ? (departureAirport || 'Unknown') : 'Sevilla',
                timezone: 'Europe/Madrid',
                iata: isArrival ? (departureAirport || 'UNK') : 'SVQ',
                icao: isArrival ? departureAirport : SEVILLA_ICAO,
                scheduled: scheduledTime,
                estimated: estimatedTime,
                terminal: null,
                gate: null
            },
            arrival: {
                airport: isArrival ? 'Sevilla' : (arrivalAirport || 'Unknown'),
                timezone: 'Europe/Madrid',
                iata: isArrival ? 'SVQ' : (arrivalAirport || 'UNK'),
                icao: isArrival ? SEVILLA_ICAO : arrivalAirport,
                scheduled: scheduledTime,
                estimated: estimatedTime,
                terminal: null,
                gate: null
            },
            airline: {
                name: extractAirline(callsign),
                iata: callsign.substring(0, 2)
            },
            flight: {
                number: callsign || icao24,
                iata: callsign || icao24,
                icao: callsign || icao24,
                icao24: icao24
            }
        };
    } catch (e) {
        console.error('[OpenSky] Error converting flight:', e);
        return null;
    }
}

// Extraer nombre de aerolínea del callsign
function extractAirline(callsign) {
    if (!callsign) return 'Unknown';

    const airlines = {
        'IBE': 'Iberia',
        'VLG': 'Vueling',
        'RYR': 'Ryanair',
        'AFR': 'Air France',
        'TAP': 'TAP Portugal',
        'DLH': 'Lufthansa',
        'BAW': 'British Airways',
        'KLM': 'KLM',
        'SWR': 'Swiss',
        'AEA': 'Air Europa',
        'EZY': 'easyJet',
        'WZZ': 'Wizz Air'
    };

    const prefix = callsign.substring(0, 3).toUpperCase();
    return airlines[prefix] || callsign.substring(0, 3);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'OpenSky Network proxy running',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 OpenSky Network Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`✈️  Flights endpoint: http://localhost:${PORT}/api/flights`);
    console.log(`🌐 Using OpenSky Network API (FREE & REAL DATA)`);
    console.log(`🛫 Airport: Sevilla (LEZL)`);
    console.log(`⏰ Time window: Last 12 hours`);
    console.log(`⚡ Cache duration: ${CACHE_DURATION / 1000} seconds\n`);
    console.log(`⚠️  Note: OpenSky shows completed flights only, not future scheduled flights\n`);
});
