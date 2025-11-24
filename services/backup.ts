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
    saveBreakConfiguration
} from './api';
import { uploadFileToDrive, createSpreadsheetWithSheets, writeSheetValues } from './google';

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
        getTurnosByRecentSafe(),
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
import { getRecentTurnos } from './api';
const getTurnosByRecentSafe = async () => {
    try {
        // Obtener más elementos por si el historial es largo
        const list = await getRecentTurnos(500);
        return list;
    } catch {
        return [];
    }
};

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

export const restoreBackup = async (jsonData: any): Promise<{ carreras: number; gastos: number; turnos: number }> => {
    if (!jsonData || !jsonData.meta || !jsonData.meta.app) {
        throw new Error("El archivo no parece ser un backup válido de TAppXI.");
    }

    const stats = {
        carreras: 0,
        gastos: 0,
        turnos: 0
    };

    // Restaurar Ajustes
    if (jsonData.ajustes) {
        await saveAjustes(jsonData.ajustes);
    }

    // Restaurar Configuración de Descansos
    if (jsonData.breakConfiguration) {
        await saveBreakConfiguration(jsonData.breakConfiguration);
    }

    // Restaurar Carreras
    if (jsonData.carreras && Array.isArray(jsonData.carreras)) {
        for (const carrera of jsonData.carreras) {
            await restoreCarrera(carrera);
            stats.carreras++;
        }
    }

    // Restaurar Gastos
    if (jsonData.gastos && Array.isArray(jsonData.gastos)) {
        for (const gasto of jsonData.gastos) {
            await restoreGasto(gasto);
            stats.gastos++;
        }
    }

    // Restaurar Turnos
    if (jsonData.turnos && Array.isArray(jsonData.turnos)) {
        for (const turno of jsonData.turnos) {
            await restoreTurno(turno);
            stats.turnos++;
        }
    }

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

        // Escribir datos en las hojas
        if (carrerasRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Carreras', carrerasRows);
        }
        if (gastosRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Gastos', gastosRows);
        }
        if (turnosRows.length > 0) {
            await writeSheetValues(spreadsheetId, 'Turnos', turnosRows);
        }

        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

        console.log(`Exportación a Google Sheets completada. ID: ${spreadsheetId}`);

        return { spreadsheetId, url };
    } catch (error: any) {
        const errorMsg = error?.message || String(error);
        throw new Error(
            `Error al exportar a Google Sheets: ${errorMsg}\n\n` +
            `Asegúrate de:\n` +
            `1. Tener conexión a internet\n` +
            `2. Haber autorizado el acceso a Google Sheets\n` +
            `3. Tener espacio disponible en tu cuenta de Google`
        );
    }
};


