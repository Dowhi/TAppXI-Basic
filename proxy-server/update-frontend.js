// Script para actualizar flightStation.ts automáticamente
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'services', 'flightStation.ts');

console.log('📝 Actualizando flightStation.ts para usar el proxy server...\n');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Reemplazar tryGetRealData
    const tryGetRealDataOld = /\/\*\*\s*\n \* Intenta obtener datos reales del aeropuerto usando AviationStack API[\s\S]*?^};/m;
    const tryGetRealDataNew = `/**
 * Intenta obtener datos reales del aeropuerto usando el servidor proxy
 */
const tryGetRealData = async (): Promise<AirportInfo | null> => {
    try {
        const proxyUrl = import.meta.env.VITE_FLIGHT_PROXY_URL || 'http://localhost:3003';
        
        // Verificar que el proxy esté disponible
        try {
            const healthCheck = await fetch(\`\${proxyUrl}/health\`);
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
};`;

    content = content.replace(tryGetRealDataOld, tryGetRealDataNew);

    // Reemplazar fetchFlights
    const fetchFlightsOld = /\/\*\*\s*\n \* Obtiene vuelos de AviationStack API[\s\S]*?^};/m;
    const fetchFlightsNew = `/**
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
            flight_status: 'scheduled,active,landed,departed',
            limit: '20'
        });

        const url = \`\${proxyUrl}/api/flights?\${params.toString()}\`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            console.error(\`Proxy server error: \${response.status} \${response.statusText}\`);
            return null;
        }

        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            console.warn(\`No hay vuelos \${type} disponibles\`);
            return [];
        }

        const flights = parseAviationStackFlights(data.data, isArrival);
        return isArrival 
            ? (flights.filter((f): f is FlightArrival => 'destino' in f && f.destino === 'Sevilla') as FlightArrival[])
            : (flights.filter((f): f is FlightDeparture => 'origen' in f && f.origen === 'Sevilla') as FlightDeparture[]);
    } catch (error) {
        console.error(\`Error fetching \${type} flights:\`, error);
        return null;
    }
};`;

    content = content.replace(fetchFlightsOld, fetchFlightsNew);

    // Guardar archivo
    fs.writeFileSync(filePath, content, 'utf8');

    console.log('✅ Archivo actualizado exitosamente!');
    console.log('📁 Ubicación:', filePath);
    console.log('\n🚀 Próximos pasos:');
    console.log('   1. Configura proxy-server/.env con tu API key');
    console.log('   2. Inicia el proxy: cd proxy-server && npm start');
    console.log('   3. Inicia la app: npm run dev\n');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Por favor, actualiza el archivo manualmente siguiendo walkthrough.md\n');
}
