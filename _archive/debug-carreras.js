// Temporary debug - Run this in browser console to check what data exists

// Function to check carreras in November and December 2025
async function debugCarrerasNovDic2025() {
    const { getCarreras } = await import('./services/api');
    const carreras = await getCarreras();

    // Filter for November and December 2025
    const nov2025 = carreras.filter(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        return d.getFullYear() === 2025 && d.getMonth() === 10; // 10 = November
    });

    const dic2025 = carreras.filter(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        return d.getFullYear() === 2025 && d.getMonth() === 11; // 11 = December
    });

    console.log('=== NOVIEMBRE 2025 ===');
    console.log('Total carreras:', nov2025.length);
    console.log('Ingresos totales:', nov2025.reduce((sum, c) => sum + (c.cobrado || 0), 0));
    console.table(nov2025.map(c => ({
        id: c.id,
        fecha: c.fechaHora,
        cobrado: c.cobrado,
        formaPago: c.formaPago
    })));

    console.log('=== DICIEMBRE 2025 ===');
    console.log('Total carreras:', dic2025.length);
    console.log('Ingresos totales:', dic2025.reduce((sum, c) => sum + (c.cobrado || 0), 0));
    console.table(dic2025.map(c => ({
        id: c.id,
        fecha: c.fechaHora,
        cobrado: c.cobrado,
        formaPago: c.formaPago
    })));

    // Check all 2025 carreras
    const all2025 = carreras.filter(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        return d.getFullYear() === 2025;
    });

    console.log('=== TODAS LAS CARRERAS 2025 ===');
    console.log('Total:', all2025.length);

    // Group by month
    const byMonth = {};
    all2025.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        const month = d.getMonth();
        if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 };
        byMonth[month].count++;
        byMonth[month].total += (c.cobrado || 0);
    });

    console.table(byMonth);
}

// Run it
debugCarrerasNovDic2025();
