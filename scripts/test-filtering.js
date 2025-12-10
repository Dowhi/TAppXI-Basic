
const gastos = [
    { id: '1', tipo: 'actividad', importe: 100, concepto: 'Material', proveedor: 'Papeleria' },
    { id: '2', tipo: 'vehiculo', importe: 200, taller: 'Talleres Pepe', kilometrosVehiculo: 1000 },
    { id: '3', tipo: 'actividad', importe: 50, concepto: 'Combustible', litros: 30 }, // Fuel as Activity
    { id: '4', importe: 60, concepto: 'Combustible Legacy', litros: 35 }, // Legacy Fuel (no tipo)
    { id: '5', importe: 300, taller: 'Talleres Juan' }, // Legacy Vehicle (no tipo)
    { id: '6', importe: 40, proveedor: 'Restaurante' }, // Legacy Activity (no tipo)
    { id: '7', tipo: 'vehiculo', importe: 150, proveedor: 'Recambios Auto' }, // Vehicle with provider (weird but possible)
    { id: '8', tipo: 'actividad', importe: 80 }, // Activity without details
    { id: '9', importe: 90 }, // Unknown legacy
];

const testFilter = (filtros) => {
    console.log(`\nTesting filter: ${JSON.stringify(filtros)}`);
    let gastosFinales = [...gastos];

    if (filtros.tipo === 'gastos' || filtros.tipo === 'todos') {
        if (filtros.gastosFiltro === 'actividad') {
            gastosFinales = gastosFinales.filter(g => {
                const tipo = g.tipo?.toLowerCase();
                return tipo === 'actividad' || (!tipo && (g.proveedor || g.concepto) && !g.kilometrosVehiculo);
            });
        } else if (filtros.gastosFiltro === 'vehiculo') {
            gastosFinales = gastosFinales.filter(g => {
                const tipo = String(g.tipo || '').toLowerCase().trim();

                const esTipoVehiculo = tipo === 'vehiculo' ||
                    tipo === 'vehículo' ||
                    tipo === 'vehicle' ||
                    tipo === 'vehicul' ||
                    (tipo.length > 0 && tipo.includes('vehic'));

                const tieneTaller = g.taller != null && String(g.taller).trim() !== '';
                const tieneKilometros = g.kilometrosVehiculo != null && Number(g.kilometrosVehiculo) > 0;
                const tieneServicios = g.servicios && Array.isArray(g.servicios) && g.servicios.length > 0;
                // También incluir si tiene litros (combustible)
                const tieneCombustible = (g.litros != null && Number(g.litros) > 0) || (g.precioPorLitro != null && Number(g.precioPorLitro) > 0);

                const tieneCamposVehiculo = tieneTaller || tieneKilometros || tieneServicios || tieneCombustible;

                return esTipoVehiculo || tieneCamposVehiculo;
            });
        } else if (filtros.gastosFiltro === 'conceptos' && filtros.concepto) {
            gastosFinales = gastosFinales.filter(g => g.concepto?.toLowerCase().includes(filtros.concepto.toLowerCase()));
        } else if (filtros.gastosFiltro === 'proveedores' && filtros.proveedor) {
            gastosFinales = gastosFinales.filter(g => g.proveedor?.toLowerCase().includes(filtros.proveedor.toLowerCase()));
        }
    }

    console.log('Result IDs:', gastosFinales.map(g => g.id).join(', '));
    return gastosFinales;
};

// Test cases
testFilter({ tipo: 'todos', gastosFiltro: 'actividad' });
testFilter({ tipo: 'todos', gastosFiltro: 'vehiculo' });
testFilter({ tipo: 'todos', gastosFiltro: 'conceptos', concepto: '' }); // Empty concept
testFilter({ tipo: 'todos', gastosFiltro: 'conceptos', concepto: 'Combustible' });
testFilter({ tipo: 'todos', gastosFiltro: 'proveedores', proveedor: '' }); // Empty provider
