// SCRIPT DE DIAGNÓSTICO - Ver campos de carreras de Octubre 2025
(async function () {
    const { getCarrerasByMonth } = await import('./services/api.js');

    console.log('🔍 Analizando carreras de Octubre 2025...\n');

    const carreras = await getCarrerasByMonth(9, 2025); // Mes 9 = Octubre (0-indexado)

    console.log(`📊 Total carreras encontradas: ${carreras.length}\n`);

    if (carreras.length === 0) {
        console.log('❌ No hay carreras en Octubre 2025');
        return;
    }

    // Analizar campos
    let conEmisora = 0;
    let conAeropuerto = 0;
    let conEstacion = 0;
    let porFormaPago = {
        'Efectivo': 0,
        'Tarjeta': 0,
        'Bizum': 0,
        'Vales': 0
    };

    let totalEmisora = 0;
    let totalAeropuerto = 0;
    let totalVales = 0;
    let totalTarjeta = 0;

    const muestras = [];

    carreras.forEach((c, idx) => {
        // Contadores
        if (c.emisora === true) {
            conEmisora++;
            totalEmisora += (c.cobrado || 0);
        }
        if (c.aeropuerto === true) {
            conAeropuerto++;
            totalAeropuerto += (c.cobrado || 0);
        }
        if (c.estacion === true) conEstacion++;

        if (c.formaPago) {
            porFormaPago[c.formaPago] = (porFormaPago[c.formaPago] || 0) + 1;
            if (c.formaPago === 'Vales') totalVales += (c.cobrado || 0);
            if (c.formaPago === 'Tarjeta') totalTarjeta += (c.cobrado || 0);
        }

        // Guardar muestra de primeras 5 carreras
        if (idx < 5) {
            muestras.push({
                id: c.id.substring(0, 8),
                fecha: (c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora)).toLocaleDateString('es-ES'),
                cobrado: c.cobrado,
                formaPago: c.formaPago,
                emisora: c.emisora,
                aeropuerto: c.aeropuerto,
                estacion: c.estacion
            });
        }
    });

    console.log('📈 RESUMEN:');
    console.log(`Carreras con Emisora: ${conEmisora} (Total: ${totalEmisora.toFixed(2)}€)`);
    console.log(`Carreras al Aeropuerto: ${conAeropuerto} (Total: ${totalAeropuerto.toFixed(2)}€)`);
    console.log(`Carreras en Estación: ${conEstacion}`);
    console.log(`\nPor Forma de Pago:`);
    console.log(`  - Efectivo: ${porFormaPago['Efectivo'] || 0}`);
    console.log(`  - Tarjeta: ${porFormaPago['Tarjeta'] || 0} (Total: ${totalTarjeta.toFixed(2)}€)`);
    console.log(`  - Bizum: ${porFormaPago['Bizum'] || 0}`);
    console.log(`  - Vales: ${porFormaPago['Vales'] || 0} (Total: ${totalVales.toFixed(2)}€)`);

    console.log('\n📋 MUESTRA (primeras 5 carreras):');
    console.table(muestras);

    // Verificar si hay campos undefined
    const conCamposUndefined = carreras.filter(c =>
        c.emisora === undefined ||
        c.aeropuerto === undefined ||
        c.estacion === undefined ||
        !c.formaPago
    );

    console.log(`\n⚠️ Carreras con campos undefined/vacíos: ${conCamposUndefined.length}`);

    if (conCamposUndefined.length > 0) {
        console.log('Estas carreras necesitan ser actualizadas con valores por defecto.');
        console.log('Ejemplo de carrera con problemas:');
        console.log(conCamposUndefined[0]);
    }
})();
