// DEBUG SCRIPT - Para ejecutar en consola del navegador
// Verifica fechas de Noviembre y Diciembre en Google Sheets

import { readSheetValues } from './services/google';

async function debugGoogleSheetsDates() {
    const spreadsheetId = '1DaSwVPqi_ks6lcuorx31Z1V-M8nmylr0lQpBTD_T2SM';

    try {
        console.log('Leyendo hoja de Carreras...');
        const rows = await readSheetValues(spreadsheetId, 'Carreras!A:Z');

        if (!rows || rows.length === 0) {
            console.log('No hay datos en la hoja');
            return;
        }

        // Primera fila son headers
        const headers = rows[0];
        const dateIndex = headers.findIndex(h =>
            h && (h.toLowerCase().includes('fecha') || h.toLowerCase() === 'fechahora')
        );

        if (dateIndex === -1) {
            console.log('No se encontró columna de fecha. Headers:', headers);
            return;
        }

        console.log(`Columna de fecha encontrada en índice ${dateIndex}: "${headers[dateIndex]}"`);

        // Analizar todas las fechas
        const nov2025 = [];
        const dic2025 = [];
        const otherDates = {};

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[dateIndex]) continue;

            const dateStr = row[dateIndex];
            let date;

            // Intentar parsear la fecha
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    date = new Date(year, month, day);
                }
            } else {
                date = new Date(dateStr);
            }

            if (!date || isNaN(date.getTime())) {
                console.log(`Fecha inválida en fila ${i + 1}: "${dateStr}"`);
                continue;
            }

            const year = date.getFullYear();
            const month = date.getMonth();

            // Clasificar
            if (year === 2025 && month === 10) {
                nov2025.push({ fila: i + 1, fecha: dateStr, parsed: date.toISOString(), cobrado: row[3] });
            } else if (year === 2025 && month === 11) {
                dic2025.push({ fila: i + 1, fecha: dateStr, parsed: date.toISOString(), cobrado: row[3] });
            } else {
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                if (!otherDates[key]) otherDates[key] = 0;
                otherDates[key]++;
            }
        }

        console.log('\n=== RESULTADOS ===\n');

        console.log(`📅 NOVIEMBRE 2025: ${nov2025.length} carreras`);
        if (nov2025.length > 0) {
            console.table(nov2025);
            const totalNov = nov2025.reduce((sum, c) => sum + parseFloat(c.cobrado || 0), 0);
            console.log(`Total cobrado: ${totalNov.toFixed(2)}€`);
        }

        console.log(`\n📅 DICIEMBRE 2025: ${dic2025.length} carreras`);
        if (dic2025.length > 0) {
            console.table(dic2025);
            const totalDic = dic2025.reduce((sum, c) => sum + parseFloat(c.cobrado || 0), 0);
            console.log(`Total cobrado: ${totalDic.toFixed(2)}€`);
        }

        console.log('\n📊 Distribución por mes/año:');
        console.table(otherDates);

        console.log('\n✅ Análisis completado');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
debugGoogleSheetsDates();
