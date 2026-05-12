// SCRIPT DE LIMPIEZA - Ejecutar en consola del navegador
// Muestra y permite borrar carreras de Nov/Dic 2025

(async function () {
    const { getCarreras, deleteCarrera } = await import('./services/api.js');

    console.log('🔍 Buscando carreras de Noviembre y Diciembre 2025...\n');

    const carreras = await getCarreras();

    const nov2025 = [];
    const dic2025 = [];

    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        const year = d.getFullYear();
        const month = d.getMonth();

        if (year === 2025 && month === 10) { // Noviembre
            nov2025.push({
                id: c.id,
                fecha: d.toLocaleString('es-ES'),
                cobrado: c.cobrado,
                formaPago: c.formaPago,
                taximetro: c.taximetro
            });
        } else if (year === 2025 && month === 11) { // Diciembre
            dic2025.push({
                id: c.id,
                fecha: d.toLocaleString('es-ES'),
                cobrado: c.cobrado,
                formaPago: c.formaPago,
                taximetro: c.taximetro
            });
        }
    });

    console.log('📅 NOVIEMBRE 2025:');
    console.log(`Total carreras: ${nov2025.length}`);
    if (nov2025.length > 0) {
        console.table(nov2025);
        const total = nov2025.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        console.log(`💰 Total: ${total.toFixed(2)}€\n`);
    }

    console.log('📅 DICIEMBRE 2025:');
    console.log(`Total carreras: ${dic2025.length}`);
    if (dic2025.length > 0) {
        console.table(dic2025);
        const total = dic2025.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        console.log(`💰 Total: ${total.toFixed(2)}€\n`);
    }

    // Guardar IDs para poder borrar después
    window.carrerasNov2025 = nov2025.map(c => c.id);
    window.carrerasDic2025 = dic2025.map(c => c.id);
    window.todasCarreras2025NovDic = [...nov2025.map(c => c.id), ...dic2025.map(c => c.id)];

    console.log('\n✅ Análisis completado');
    console.log('\n📝 ACCIONES DISPONIBLES:');
    console.log('Para BORRAR TODAS las carreras de Nov/Dic 2025, ejecuta:');
    console.log('  borrarCarrerasNovDic2025()');
    console.log('\nPara borrar solo NOVIEMBRE:');
    console.log('  borrarCarrerasNov2025()');
    console.log('\nPara borrar solo DICIEMBRE:');
    console.log('  borrarCarrerasDic2025()');

    // Función para borrar
    window.borrarCarrerasNovDic2025 = async function () {
        if (!confirm(`¿Estás seguro de borrar ${window.todasCarreras2025NovDic.length} carreras de Nov/Dic 2025?`)) {
            console.log('❌ Cancelado');
            return;
        }

        console.log('🗑️ Borrando carreras...');
        for (const id of window.todasCarreras2025NovDic) {
            await deleteCarrera(id);
            console.log(`✓ Borrada: ${id}`);
        }
        console.log('✅ Todas las carreras han sido borradas');
        console.log('Recarga la página para ver los cambios');
    };

    window.borrarCarrerasNov2025 = async function () {
        if (!confirm(`¿Borrar ${window.carrerasNov2025.length} carreras de Noviembre 2025?`)) return;
        for (const id of window.carrerasNov2025) await deleteCarrera(id);
        console.log('✅ Carreras de Noviembre borradas');
    };

    window.borrarCarrerasDic2025 = async function () {
        if (!confirm(`¿Borrar ${window.carrerasDic2025.length} carreras de Diciembre 2025?`)) return;
        for (const id of window.carrerasDic2025) await deleteCarrera(id);
        console.log('✅ Carreras de Diciembre borradas');
    };

})();
