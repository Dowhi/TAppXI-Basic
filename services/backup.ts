import {
    getCarreras,
    getGastos,
    getProveedores,
    getConceptos,
    getTalleres,
    getAjustes,
    getBreakConfiguration,
    getExcepciones,
    restoreCarrera,
    restoreGasto,
    restoreTurno,
    restoreProveedor,
    restoreConcepto,
    restoreTaller,
    restoreExcepcion,
    saveAjustes,
    saveBreakConfiguration,
    getTurnos as getAllTurnos
} from './api';
import { uploadFileToDrive, createSpreadsheetWithSheets, writeSheetValues, readSheetValues } from './google';

interface BackupPayload {
    meta: {
        app: string;
        version: string;
        createdAt: string;
    };
    ajustes: any;
    breakConfiguration: any;
    excepciones: any[];
    carreras: any[];
    gastos: any[];
    turnos: any[];
    proveedores: any[];
    conceptos: any[];
    talleres: any[];
}

const safeSerializeDate = (value: any): any => {
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map(safeSerializeDate);
    }
    if (value && typeof value === 'object') {
        const out: any = {};
        Object.keys(value).forEach((k) => {
            // @ts-ignore
            out[k] = safeSerializeDate(value[k]);
        });
        return out;
    }
    return value;
};

export const buildBackupPayload = async (): Promise<BackupPayload> => {
    // Función auxiliar para manejar errores de permisos
    const safeGet = async <T>(fn: () => Promise<T>, defaultValue: T): Promise<T> => {
        try {
            return await fn();
        } catch (error: any) {
            if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
                console.warn(`Error de permisos al obtener datos: ${error.message}`);
                return defaultValue;
            }
            throw error;
        }
    };

    const [
        ajustes,
        breakConfiguration,
        excepciones,
        carreras,
        gastos,
        turnos,
        proveedores,
        conceptos,
        talleres,
    ] = await Promise.all([
        safeGet(() => getAjustes(), null),
        safeGet(() => getBreakConfiguration(), null),
        safeGet(() => getExcepciones(), []),
        safeGet(() => getCarreras(), []),
        safeGet(() => getGastos(), []),
        safeGet(() => getAllTurnos(), []),
        safeGet(() => getProveedores(), []),
        safeGet(() => getConceptos(), []),
        safeGet(() => getTalleres(), []),
    ]);

    const payload: BackupPayload = {
        meta: {
            app: 'TAppXI',
            version: '1.0',
            createdAt: new Date().toISOString(),
        },
        ajustes: ajustes ? safeSerializeDate(ajustes) : null,
        breakConfiguration: breakConfiguration ? safeSerializeDate(breakConfiguration) : null,
        excepciones: excepciones ? safeSerializeDate(excepciones) : [],
        carreras: carreras ? safeSerializeDate(carreras) : [],
        gastos: gastos ? safeSerializeDate(gastos) : [],
        turnos: turnos ? safeSerializeDate(turnos) : [],
        proveedores: proveedores ? safeSerializeDate(proveedores) : [],
        conceptos: conceptos ? safeSerializeDate(conceptos) : [],
        talleres: talleres ? safeSerializeDate(talleres) : [],
    };

    return payload;
};

// Fallback: si no hay función pública para "get turnos recientes", usar getRecentTurnos si existe,
// de lo contrario recuperar todos (ya existe getRecentTurnos en api.ts, tomamos un límite amplio).
// import { getRecentTurnos } from './api';
// const getTurnosByRecentSafe = async () => {
//     try {
//         // Obtener más elementos por si el historial es largo
//         const list = await getRecentTurnos(500);
//         return list;
//     } catch {
//         return [];
//     }
// };

export const downloadBackupJson = async () => {
    const data = await buildBackupPayload();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `tappxi-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const uploadBackupToGoogleDrive = async (): Promise<void> => {
    try {
        const data = await buildBackupPayload();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `tappxi-backup-${dateStr}.json`;

        const result = await uploadFileToDrive({
            name: fileName,
            mimeType: 'application/json',
            content: blob,
        });

        if (!result || !result.id) {
            throw new Error("No se recibió confirmación de que el archivo se subió correctamente a Drive.");
        }

        console.log(`Backup subido exitosamente a Drive. ID: ${result.id}, Nombre: ${result.name || fileName}`);
    } catch (error: any) {
        const errorMsg = error?.message || String(error);
        throw new Error(
            `Error al subir backup a Google Drive: ${errorMsg}\n\n` +
            `Asegúrate de:\n` +
            `1. Tener conexión a internet\n` +
            `2. Haber autorizado el acceso a Google Drive\n` +
            `3. Tener espacio disponible en tu cuenta de Google Drive`
        );
    }
};

export const restoreBackup = async (jsonData: any, onProgress?: (progress: number, message: string) => void): Promise<{ carreras: number; gastos: number; turnos: number }> => {
    if (!jsonData || !jsonData.meta || !jsonData.meta.app) {
        throw new Error("El archivo no parece ser un backup válido de TAppXI.");
    }

    const stats = {
        carreras: 0,
        gastos: 0,
        turnos: 0
    };

    const totalSteps = 9; // Ajustes, Config, Carreras, Gastos, Turnos, Proveedores, Conceptos, Talleres, Excepciones
    let currentStep = 0;

    const reportProgress = (msg: string) => {
        if (onProgress) {
            const percent = Math.round((currentStep / totalSteps) * 100);
            onProgress(percent, msg);
        }
    };

    // Restaurar Ajustes
    reportProgress("Restaurando ajustes...");
    if (jsonData.ajustes) {
        // Enviar el objeto completo, saveAjustes ya no filtra
        await saveAjustes(jsonData.ajustes);

        // Mantener compatibilidad con backups antiguos que usaban "tam\u00f1oFuente"
        if (jsonData.ajustes['tam\u00f1oFuente'] && !jsonData.ajustes.tamanoFuente) {
            await saveAjustes({ tamanoFuente: jsonData.ajustes['tam\u00f1oFuente'] });
        }
    }
    currentStep++;

    // Restaurar Configuración de Descansos
    reportProgress("Restaurando configuración...");
    if (jsonData.breakConfiguration) {
        await saveBreakConfiguration(jsonData.breakConfiguration);
    }
    currentStep++;

    // Restaurar Carreras
    reportProgress("Restaurando carreras...");
    if (jsonData.carreras && Array.isArray(jsonData.carreras)) {
        const total = jsonData.carreras.length;
        for (let i = 0; i < total; i++) {
            await restoreCarrera(jsonData.carreras[i]);
            stats.carreras++;
            if (i % 10 === 0 && onProgress) {
                // Progreso granular dentro del paso de carreras (20% del total asignado a este paso)
                const stepBase = (2 / totalSteps) * 100; // paso 2 (0-indexed) es el 3ro
                // Mejor simplificamos: solo actualizamos mensaje
                onProgress(Math.round((2 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando carreras (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Gastos
    reportProgress("Restaurando gastos...");
    if (jsonData.gastos && Array.isArray(jsonData.gastos)) {
        const total = jsonData.gastos.length;
        for (let i = 0; i < total; i++) {
            await restoreGasto(jsonData.gastos[i]);
            stats.gastos++;
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((3 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando gastos (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Turnos
    reportProgress("Restaurando turnos...");
    if (jsonData.turnos && Array.isArray(jsonData.turnos)) {
        const total = jsonData.turnos.length;
        for (let i = 0; i < total; i++) {
            await restoreTurno(jsonData.turnos[i]);
            stats.turnos++;
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((4 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando turnos (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Proveedores
    reportProgress("Restaurando proveedores...");
    if (jsonData.proveedores && Array.isArray(jsonData.proveedores)) {
        const total = jsonData.proveedores.length;
        for (let i = 0; i < total; i++) {
            await restoreProveedor(jsonData.proveedores[i]);
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((5 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando proveedores (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Conceptos
    reportProgress("Restaurando conceptos...");
    if (jsonData.conceptos && Array.isArray(jsonData.conceptos)) {
        const total = jsonData.conceptos.length;
        for (let i = 0; i < total; i++) {
            await restoreConcepto(jsonData.conceptos[i]);
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((6 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando conceptos (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Talleres
    reportProgress("Restaurando talleres...");
    if (jsonData.talleres && Array.isArray(jsonData.talleres)) {
        const total = jsonData.talleres.length;
        for (let i = 0; i < total; i++) {
            await restoreTaller(jsonData.talleres[i]);
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((7 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando talleres (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Excepciones
    reportProgress("Restaurando excepciones...");
    if (jsonData.excepciones && Array.isArray(jsonData.excepciones)) {
        const total = jsonData.excepciones.length;
        for (let i = 0; i < total; i++) {
            await restoreExcepcion(jsonData.excepciones[i]);
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((8 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando excepciones (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    if (onProgress) onProgress(100, "Restauración completada.");

    return stats;
};

// Helpers para Google Sheets
const toRows = <T extends Record<string, any>>(items: T[], columns: string[]): (string | number | null)[][] => {
    const header = columns;
    const dataRows = (items || []).map((it) =>
        columns.map((c) => {
            const v = (it as any)[c];
            if (v instanceof Date) return v.toISOString();
            if (v === null || v === undefined) return null;
            if (typeof v === 'object') return JSON.stringify(safeSerializeDate(v));
            return v;
        })
    );
    return [header, ...dataRows];
};

// Convierte un objeto único a filas (para ajustes, breakConfiguration)
const objectToRows = (obj: any, prefix: string = ''): (string | number | null)[][] => {
    if (!obj || typeof obj !== 'object') {
        return [['Clave', 'Valor'], [prefix || 'root', JSON.stringify(obj)]];
    }

    const rows: (string | number | null)[][] = [['Clave', 'Valor']];

    const flatten = (o: any, parentKey: string = '') => {
        Object.keys(o).forEach((key) => {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            const value = o[key];

            if (value === null || value === undefined) {
                rows.push([fullKey, null]);
            } else if (value instanceof Date) {
                rows.push([fullKey, value.toISOString()]);
            } else if (Array.isArray(value)) {
                rows.push([fullKey, JSON.stringify(safeSerializeDate(value))]);
            } else if (typeof value === 'object') {
                flatten(value, fullKey);
            } else {
                rows.push([fullKey, value]);
            }
        });
    };

    flatten(obj, prefix);
    return rows;
};

export const exportToGoogleSheets = async (): Promise<{ spreadsheetId: string; url: string }> => {
    try {
        const data = await buildBackupPayload();
        const dateStr = new Date().toISOString().split('T')[0];

        // Crear todas las hojas necesarias
        const sheetTitles = [
            'Carreras',
            'Gastos',
            'Turnos',
            'Proveedores',
            'Conceptos',
            'Talleres',
            'Ajustes',
            'BreakConfiguration',
            'Excepciones',
            'Servicios'
        ];

        const { spreadsheetId } = await createSpreadsheetWithSheets(`TAppXI Export ${dateStr}`, sheetTitles);

        if (!spreadsheetId) {
            throw new Error("No se recibió el ID de la hoja de cálculo creada.");
        }

        // Definir columnas para cada tipo de dato
        const carrerasCols = ['id', 'taximetro', 'cobrado', 'formaPago', 'tipoCarrera', 'emisora', 'aeropuerto', 'estacion', 'fechaHora', 'turnoId', 'valeInfo', 'notas'];
        const gastosCols = ['id', 'importe', 'fecha', 'tipo', 'categoria', 'formaPago', 'proveedor', 'concepto', 'taller', 'numeroFactura', 'baseImponible', 'ivaImporte', 'ivaPorcentaje', 'kilometros', 'kilometrosVehiculo', 'descuento', 'servicios', 'notas'];
        const serviciosCols = ['GastoID', 'Fecha', 'Servicio', 'Referencia', 'Importe', 'Cantidad', 'Descuento', 'Descripcion'];
        const turnosCols = ['id', 'fechaInicio', 'kilometrosInicio', 'fechaFin', 'kilometrosFin', 'numero'];
        const proveedoresCols = ['id', 'nombre', 'direccion', 'telefono', 'nif', 'createdAt'];
        const conceptosCols = ['id', 'nombre', 'descripcion', 'categoria', 'createdAt'];
        const talleresCols = ['id', 'nombre', 'direccion', 'telefono', 'createdAt'];
        const excepcionesCols = ['id', 'fecha', 'descripcion', 'createdAt'];

        // Convertir datos a filas
        const carrerasRows = toRows((data.carreras as any[]) || [], carrerasCols);

        // Filtrar gastos: Vehículo va a Servicios, pero TAMBIÉN se queda en Gastos (encabezado)
        const allGastos = (data.gastos as any[]) || [];
        // const gastosGenerales = allGastos.filter(g => g.tipo !== 'vehiculo'); // Ya no filtramos, queremos todos en Gastos
        const gastosVehiculo = allGastos.filter(g => g.tipo === 'vehiculo');

        const gastosRows = toRows(allGastos, gastosCols);

        // Procesar gastos de vehículo para la hoja Servicios
        const serviciosRows: (string | number | null)[][] = [serviciosCols];

        gastosVehiculo.forEach(gasto => {
            const fechaStr = gasto.fecha instanceof Date ? gasto.fecha.toISOString() : gasto.fecha;
            // const taller = gasto.taller || '';
            const servicioPrincipal = gasto.concepto || ''; // Usar concepto como servicio principal

            // Si tiene items de servicios, crear una fila por cada uno
            if (gasto.servicios && Array.isArray(gasto.servicios) && gasto.servicios.length > 0) {
                gasto.servicios.forEach((item: any) => {
                    serviciosRows.push([
                        gasto.id,
                        fechaStr,
                        servicioPrincipal,
                        item.referencia || '',
                        item.importe || 0,
                        item.cantidad || 1,
                        item.descuentoPorcentaje || 0,
                        item.descripcion || ''
                    ]);
                });
            } else {
                // Si no tiene items, crear una fila con el importe total
                serviciosRows.push([
                    gasto.id,
                    fechaStr,
                    servicioPrincipal,
                    '', // Referencia
                    gasto.importe || 0,
                    1, // Cantidad
                    gasto.descuento || 0,
                    gasto.notas || '' // Usar notas como descripción si no hay items
                ]);
            }
        });

        const turnosRows = toRows((data.turnos as any[]) || [], turnosCols);
        const proveedoresRows = toRows((data.proveedores as any[]) || [], proveedoresCols);
        const conceptosRows = toRows((data.conceptos as any[]) || [], conceptosCols);
        const talleresRows = toRows((data.talleres as any[]) || [], talleresCols);
        const excepcionesRows = toRows((data.excepciones as any[]) || [], excepcionesCols);

        // Para objetos únicos (ajustes y breakConfiguration)
        const ajustesRows = objectToRows(data.ajustes, 'ajustes');
        const breakConfigRows = objectToRows(data.breakConfiguration, 'breakConfiguration');

        // Escribir cada hoja
        console.log(`Escribiendo ${carrerasRows.length} filas en Carreras`);
        if (carrerasRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Carreras', carrerasRows);
        }

        console.log(`Escribiendo ${gastosRows.length} filas en Gastos`);
        if (gastosRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Gastos', gastosRows);
        }

        console.log(`Escribiendo ${turnosRows.length} filas en Turnos`);
        if (turnosRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Turnos', turnosRows);
        }

        console.log(`Escribiendo ${proveedoresRows.length} filas en Proveedores`);
        if (proveedoresRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Proveedores', proveedoresRows);
        }

        console.log(`Escribiendo ${conceptosRows.length} filas en Conceptos`);
        if (conceptosRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Conceptos', conceptosRows);
        }

        console.log(`Escribiendo ${talleresRows.length} filas en Talleres`);
        if (talleresRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Talleres', talleresRows);
        }

        console.log(`Escribiendo ${ajustesRows.length} filas en Ajustes`);
        if (ajustesRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Ajustes', ajustesRows);
        }

        console.log(`Escribiendo ${breakConfigRows.length} filas en BreakConfiguration`);
        if (breakConfigRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'BreakConfiguration', breakConfigRows);
        }

        console.log(`Escribiendo ${excepcionesRows.length} filas en Excepciones`);
        if (excepcionesRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Excepciones', excepcionesRows);
        }

        console.log(`Escribiendo ${serviciosRows.length} filas en Servicios`);
        if (serviciosRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Servicios', serviciosRows);
        }

        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
        console.log(`Exportación completa a Google Sheets. ID: ${spreadsheetId}`);

        return { spreadsheetId, url };
    } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error("Error detallado exportación Sheets:", error);

        let userFriendlyMsg = `Error al exportar a Google Sheets: ${errorMsg}\n\n`;

        if (errorMsg.includes("403") || errorMsg.includes("permission") || errorMsg.includes("unverified")) {
            userFriendlyMsg += `POSIBLE PROBLEMA DE PERMISOS:\n` +
                `Si ves una pantalla de "Aplicación no verificada", haz clic en "Configuración avanzada" y luego en "Ir a tappxi (no seguro)" para continuar.\n` +
                `Asegúrate de haber concedido todos los permisos solicitados.`;
        } else {
            userFriendlyMsg += `Asegúrate de:\n` +
                `1. Tener conexión a internet\n` +
                `2. Haber autorizado el acceso a Google Sheets\n` +
                `3. Tener espacio disponible en tu cuenta de Google`;
        }

        throw new Error(userFriendlyMsg);
    }
};



const fromRows = (rows: any[][]): any[] => {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0];
    const data = rows.slice(1);

    return data.map((row) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
            let value = row[index];
            if (value === undefined) {
                value = null;
            }
            // Intentar parsear JSON si parece un objeto serializado
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                try {
                    value = JSON.parse(value);
                } catch {
                    // Ignorar error, dejar como string
                }
            }
            obj[header] = value;
        });
        return obj;
    });
};

const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'string') {
        // Reemplazar coma por punto y eliminar caracteres no numéricos (excepto . y -)
        const clean = val.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    }
    return 0;
};

// Función segura para parsear fechas
const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) {
        // Verificar que la fecha es válida
        if (isNaN(val.getTime())) return null;
        return val;
    }
    if (typeof val === 'string') {
        // Intentar parsear diferentes formatos
        const trimmed = val.trim();
        if (!trimmed || trimmed === '') return null;

        // Intentar parsear ISO string
        let date = new Date(trimmed);
        if (!isNaN(date.getTime())) return date;

        // Intentar parsear formato español DD/MM/YYYY
        const spanishFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
        if (spanishFormat) {
            const [, day, month, year] = spanishFormat;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(date.getTime())) return date;
        }

        // Si no se puede parsear, retornar null
        return null;
    }
    if (typeof val === 'number') {
        // Timestamp
        const date = new Date(val);
        if (!isNaN(date.getTime())) return date;
        return null;
    }
    return null;
};

export const restoreFromGoogleSheets = async (spreadsheetId: string, onProgress?: (progress: number, message: string) => void): Promise<{ carreras: number; gastos: number; turnos: number }> => {
    try {
        console.log(`Iniciando restauración desde Sheet ID: ${spreadsheetId}`);
        if (onProgress) onProgress(0, "Descargando datos de Google Sheets...");

        // Leer todas las hojas
        const [
            carrerasRows,
            gastosRows,
            turnosRows,
            proveedoresRows,
            conceptosRows,
            talleresRows,
            ajustesRows,
            breakConfigRows,
            excepcionesRows
        ] = await Promise.all([
            readSheetValues(spreadsheetId, 'Carreras!A:Z').catch(() => []),
            readSheetValues(spreadsheetId, 'Gastos!A:Z').catch(() => []),
            readSheetValues(spreadsheetId, 'Turnos!A:Z').catch(() => []),
            readSheetValues(spreadsheetId, 'Proveedores!A:Z').catch(() => []),
            readSheetValues(spreadsheetId, 'Conceptos!A:Z').catch(() => []),
            readSheetValues(spreadsheetId, 'Talleres!A:Z').catch(() => []),
            readSheetValues(spreadsheetId, 'Ajustes!A:B').catch(() => []),
            readSheetValues(spreadsheetId, 'BreakConfiguration!A:B').catch(() => []),
            readSheetValues(spreadsheetId, 'Excepciones!A:Z').catch(() => []),
        ]);

        if (onProgress) onProgress(10, "Procesando datos...");

        console.log(`Leídas filas: Carreras=${carrerasRows.length}, Gastos=${gastosRows.length}, Turnos=${turnosRows.length}, Proveedores=${proveedoresRows.length}, Conceptos=${conceptosRows.length}, Talleres=${talleresRows.length}, Excepciones=${excepcionesRows.length}`);

        const carrerasRaw = fromRows(carrerasRows);
        const gastosRaw = fromRows(gastosRows);
        const turnosRaw = fromRows(turnosRows);
        const proveedoresRaw = fromRows(proveedoresRows);
        const conceptosRaw = fromRows(conceptosRows);
        const talleresRaw = fromRows(talleresRows);
        const excepcionesRaw = fromRows(excepcionesRows);

        // Procesar tipos de datos (números, fechas si es necesario)
        const carreras = carrerasRaw.map(c => {
            const fechaHora = parseDate(c.fechaHora);
            return {
                ...c,
                taximetro: parseNumber(c.taximetro),
                cobrado: parseNumber(c.cobrado),
                fechaHora: fechaHora || new Date(), // Si no se puede parsear, usar fecha actual
            };
        });

        const gastos = gastosRaw.map(g => {
            const fecha = parseDate(g.fecha);
            return {
                ...g,
                importe: parseNumber(g.importe),
                baseImponible: parseNumber(g.baseImponible),
                ivaImporte: parseNumber(g.ivaImporte),
                ivaPorcentaje: parseNumber(g.ivaPorcentaje),
                kilometros: parseNumber(g.kilometros),
                kilometrosVehiculo: parseNumber(g.kilometrosVehiculo),
                descuento: parseNumber(g.descuento),
                fecha: fecha || new Date(), // Si no se puede parsear, usar fecha actual
            };
        });

        const turnos = turnosRaw.map(t => {
            const fechaInicio = parseDate(t.fechaInicio);
            const fechaFin = parseDate(t.fechaFin);
            return {
                ...t,
                kilometrosInicio: parseNumber(t.kilometrosInicio),
                kilometrosFin: t.kilometrosFin ? parseNumber(t.kilometrosFin) : null,
                fechaInicio: fechaInicio || new Date(), // Si no se puede parsear, usar fecha actual
                fechaFin: fechaFin || null,
            };
        });

        // Función auxiliar para limpiar objetos y convertir undefined a null
        const cleanObject = (obj: any): any => {
            if (obj === null || obj === undefined) return null;
            if (Array.isArray(obj)) {
                return obj.map(cleanObject);
            }
            if (typeof obj === 'object') {
                const cleaned: any = {};
                for (const key in obj) {
                    if (obj[key] !== undefined) {
                        cleaned[key] = cleanObject(obj[key]);
                    }
                }
                return cleaned;
            }
            return obj;
        };

        // Procesar ajustes (formato clave-valor)
        let ajustes = null;
        if (ajustesRows.length > 1) {
            ajustes = {};
            for (let i = 1; i < ajustesRows.length; i++) {
                const [key, value] = ajustesRows[i];
                if (key && value !== null && value !== undefined && value !== '') {
                    // Reconstruir estructura anidada
                    const keys = key.split('.');
                    let current = ajustes;
                    for (let j = 0; j < keys.length - 1; j++) {
                        if (!current[keys[j]]) current[keys[j]] = {};
                        current = current[keys[j]];
                    }
                    // Intentar parsear JSON si es necesario
                    let finalValue = value;
                    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                        try {
                            finalValue = JSON.parse(value);
                        } catch {
                            // Dejar como string
                        }
                    }
                    current[keys[keys.length - 1]] = finalValue;
                }
            }
            // Limpiar el objeto ajustes para eliminar undefined y asegurar valores por defecto
            ajustes = cleanObject(ajustes);
            // Asegurar valores por defecto para campos críticos, pero permitir otros campos
            if (ajustes) {
                ajustes.temaOscuro = ajustes.temaOscuro ?? false;
                ajustes.tamanoFuente = ajustes.tamanoFuente ?? ajustes['tam\u00f1oFuente'] ?? 14;
                ajustes.letraDescanso = ajustes.letraDescanso ?? '';
                ajustes.objetivoDiario = ajustes.objetivoDiario ?? 100;

                // Nuevos campos opcionales defaults
                ajustes.temaColor = ajustes.temaColor ?? 'azul';
                ajustes.altoContraste = ajustes.altoContraste ?? false;

                // Eliminar la clave con tilde si existe
                if (ajustes['tam\u00f1oFuente'] !== undefined) {
                    delete ajustes['tam\u00f1oFuente'];
                }
            }
        }

        // Procesar breakConfiguration (formato clave-valor)
        let breakConfiguration = null;
        if (breakConfigRows.length > 1) {
            breakConfiguration = {};
            for (let i = 1; i < breakConfigRows.length; i++) {
                const [key, value] = breakConfigRows[i];
                if (key && value !== null && value !== undefined && value !== '') {
                    const keys = key.split('.');
                    let current = breakConfiguration;
                    for (let j = 0; j < keys.length - 1; j++) {
                        if (!current[keys[j]]) current[keys[j]] = {};
                        current = current[keys[j]];
                    }
                    let finalValue = value;
                    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                        try {
                            finalValue = JSON.parse(value);
                        } catch {
                            // Dejar como string
                        }
                    }
                    current[keys[keys.length - 1]] = finalValue;
                }
            }
            // Limpiar el objeto breakConfiguration
            breakConfiguration = cleanObject(breakConfiguration);
            // Asegurar valores por defecto
            if (breakConfiguration) {
                breakConfiguration.startDate = breakConfiguration.startDate ?? '';
                breakConfiguration.startDayLetter = breakConfiguration.startDayLetter ?? 'A';
                breakConfiguration.weekendPattern = breakConfiguration.weekendPattern ?? 'Sabado: AC / Domingo: BD';
                breakConfiguration.userBreakLetter = breakConfiguration.userBreakLetter ?? 'A';
            }
        }

        // Procesar excepciones con validación de fechas
        const excepciones = excepcionesRaw.map(e => {
            const fechaDesde = parseDate(e.fechaDesde);
            const fechaHasta = parseDate(e.fechaHasta);
            const createdAt = parseDate(e.createdAt);

            // Si alguna fecha es inválida, usar valores por defecto
            return {
                ...e,
                fechaDesde: fechaDesde || new Date(),
                fechaHasta: fechaHasta || new Date(),
                createdAt: createdAt || new Date(),
            };
        });

        // Procesar proveedores, conceptos y talleres con validación de fechas
        const proveedores = proveedoresRaw.map(p => {
            const createdAt = parseDate(p.createdAt);
            return {
                ...p,
                createdAt: createdAt || new Date(),
            };
        });

        const conceptos = conceptosRaw.map(c => {
            const createdAt = parseDate(c.createdAt);
            return {
                ...c,
                createdAt: createdAt || new Date(),
            };
        });

        const talleres = talleresRaw.map(t => {
            const createdAt = parseDate(t.createdAt);
            return {
                ...t,
                createdAt: createdAt || new Date(),
            };
        });

        // Construir payload completo
        const payload: Partial<BackupPayload> = {
            meta: {
                app: 'TAppXI',
                version: '1.0',
                createdAt: new Date().toISOString(),
            },
            carreras,
            gastos,
            turnos,
            proveedores,
            conceptos,
            talleres,
            excepciones,
            ajustes,
            breakConfiguration,
        };

        return await restoreBackup(payload, onProgress);

    } catch (error: any) {
        console.error("Error en restoreFromGoogleSheets:", error);
        throw new Error(`Error al restaurar desde Google Sheets: ${error.message}`);
    }
};
