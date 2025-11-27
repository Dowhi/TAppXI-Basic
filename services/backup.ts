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
    saveAjustes,
    saveBreakConfiguration,
    getAllTurnos
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
        getAjustes(),
        getBreakConfiguration(),
        getExcepciones(),
        getCarreras(),
        getGastos(),

        getAllTurnos(),
        getProveedores(),
        getConceptos(),
        getTalleres(),
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

        // Validar que el archivo se subió correctamente
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

    const totalSteps = 5; // Ajustes, Config, Carreras, Gastos, Turnos
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
        await saveAjustes(jsonData.ajustes);
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

export const exportToGoogleSheets = async (): Promise<{ spreadsheetId: string; url: string }> => {
    try {
        const data = await buildBackupPayload();
        const dateStr = new Date().toISOString().split('T')[0];
        const sheetTitles = ['Carreras', 'Gastos', 'Turnos'];
        const { spreadsheetId } = await createSpreadsheetWithSheets(`TAppXI Export ${dateStr}`, sheetTitles);

        if (!spreadsheetId) {
            throw new Error("No se recibió el ID de la hoja de cálculo creada.");
        }

        // Definir columnas representativas
        const carrerasCols = ['id', 'taximetro', 'cobrado', 'formaPago', 'tipoCarrera', 'emisora', 'aeropuerto', 'estacion', 'fechaHora', 'turnoId', 'valeInfo', 'notas'];
        const gastosCols = ['id', 'importe', 'fecha', 'tipo', 'categoria', 'formaPago', 'proveedor', 'concepto', 'taller', 'numeroFactura', 'baseImponible', 'ivaImporte', 'ivaPorcentaje', 'kilometros', 'kilometrosVehiculo', 'descuento', 'servicios', 'notas'];
        const turnosCols = ['id', 'fechaInicio', 'kilometrosInicio', 'fechaFin', 'kilometrosFin'];

        const carrerasRows = toRows((data.carreras as any[]) || [], carrerasCols);
        const gastosRows = toRows((data.gastos as any[]) || [], gastosCols);
        const turnosRows = toRows((data.turnos as any[]) || [], turnosCols);

        console.log(`Escribiendo ${carrerasRows.length} filas en Carreras`);
        if (carrerasRows.length > 0) {
            console.log("Iniciando escritura en hoja Carreras...");
            await writeSheetValues(spreadsheetId, 'Carreras', carrerasRows);
            console.log("Escritura en hoja Carreras finalizada.");
        }
        console.log(`Escribiendo ${gastosRows.length} filas en Gastos`);
        if (gastosRows.length > 0) {
            console.log("Iniciando escritura en hoja Gastos...");
            await writeSheetValues(spreadsheetId, 'Gastos', gastosRows);
            console.log("Escritura en hoja Gastos finalizada.");
        }
        console.log(`Escribiendo ${turnosRows.length} filas en Turnos`);
        if (turnosRows.length > 0) {
            console.log("Iniciando escritura en hoja Turnos...");
            await writeSheetValues(spreadsheetId, 'Turnos', turnosRows);
            console.log("Escritura en hoja Turnos finalizada.");
        }

        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

        console.log(`Exportación a Google Sheets completada. ID: ${spreadsheetId}`);

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

export const restoreFromGoogleSheets = async (spreadsheetId: string, onProgress?: (progress: number, message: string) => void): Promise<{ carreras: number; gastos: number; turnos: number }> => {
    try {
        console.log(`Iniciando restauración desde Sheet ID: ${spreadsheetId}`);
        if (onProgress) onProgress(0, "Descargando datos de Google Sheets...");

        // Leer hojas
        const [carrerasRows, gastosRows, turnosRows] = await Promise.all([
            readSheetValues(spreadsheetId, 'Carreras!A:Z'),
            readSheetValues(spreadsheetId, 'Gastos!A:Z'),
            readSheetValues(spreadsheetId, 'Turnos!A:Z'),
        ]);

        if (onProgress) onProgress(10, "Procesando datos...");

        console.log(`Leídas filas: Carreras=${carrerasRows.length}, Gastos=${gastosRows.length}, Turnos=${turnosRows.length}`);

        const carrerasRaw = fromRows(carrerasRows);
        const gastosRaw = fromRows(gastosRows);
        const turnosRaw = fromRows(turnosRows);

        // Procesar tipos de datos (números, fechas si es necesario)
        const carreras = carrerasRaw.map(c => ({
            ...c,
            taximetro: parseNumber(c.taximetro),
            cobrado: parseNumber(c.cobrado),
        }));

        const gastos = gastosRaw.map(g => ({
            ...g,
            importe: parseNumber(g.importe),
            baseImponible: parseNumber(g.baseImponible),
            ivaImporte: parseNumber(g.ivaImporte),
            ivaPorcentaje: parseNumber(g.ivaPorcentaje),
            kilometros: parseNumber(g.kilometros),
            kilometrosVehiculo: parseNumber(g.kilometrosVehiculo),
            descuento: parseNumber(g.descuento),
        }));

        const turnos = turnosRaw.map(t => ({
            ...t,
            kilometrosInicio: parseNumber(t.kilometrosInicio),
            kilometrosFin: t.kilometrosFin ? parseNumber(t.kilometrosFin) : null,
        }));

        // Construir payload parcial (solo lo que tenemos en sheets)
        const payload: Partial<BackupPayload> = {
            meta: {
                app: 'TAppXI',
                version: '1.0',
                createdAt: new Date().toISOString(),
            },
            carreras,
            gastos,
            turnos,
            // Los demás arrays vacíos o null, restoreBackup maneja nulls
            ajustes: null,
            breakConfiguration: null,
            excepciones: [],
            proveedores: [],
            conceptos: [],
            talleres: [],
        };

        return await restoreBackup(payload, onProgress);

    } catch (error: any) {
        console.error("Error en restoreFromGoogleSheets:", error);
        throw new Error(`Error al restaurar desde Google Sheets: ${error.message}`);
    }
};
