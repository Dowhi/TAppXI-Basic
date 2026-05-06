import * as XLSX from 'xlsx';
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
    getTurnos as getAllTurnos,
    getValesDirectory,
    getReminders,
    restoreValeDirectoryEntry,
    restoreReminder,
    getOtrosIngresos,
    restoreOtroIngreso,
    clearAllData,
    cleanN,
    parseDate as apiParseDate
} from './api';
import { getCustomReports, restoreCustomReport } from './customReports';
import { getTemplates, restoreTemplates } from './expenseTemplates';
import { uploadFileToDrive, createSpreadsheetWithSheets, writeSheetValues, readSheetValues, getSpreadsheetDetails, findOrCreateFolder, listFilesInFolder, deleteFile, isGoogleLoggedIn, getFileBinary, extractGapiErrorMessage } from './google';

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
    vales: any[];
    reminders: any[];
    expenseTemplates: any[];
    customReports: any[];
    otrosIngresos: any[];
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
        vales,
        reminders,
        expenseTemplates,
        customReports,
        otrosIngresos,
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
        safeGet(() => getValesDirectory(), []),
        safeGet(() => getReminders(), []),
        safeGet(async () => getTemplates(), []),
        safeGet(() => getCustomReports(), []),
        safeGet(() => getOtrosIngresos(), []),
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
        vales: vales ? safeSerializeDate(vales) : [],
        reminders: reminders ? safeSerializeDate(reminders) : [],
        expenseTemplates: expenseTemplates ? safeSerializeDate(expenseTemplates) : [],
        customReports: customReports ? safeSerializeDate(customReports) : [],
        otrosIngresos: otrosIngresos ? safeSerializeDate(otrosIngresos) : [],
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

export const uploadBackupToGoogleDrive = async (folderId?: string): Promise<void> => {
    try {
        const data = await buildBackupPayload();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `tappxi-backup-${dateStr}.json`;

        let targetFolderId = folderId;
        if (!targetFolderId) {
            targetFolderId = await findOrCreateFolder('TAppXI');
        }

        const result = await uploadFileToDrive({
            name: fileName,
            mimeType: 'application/json',
            content: blob,
            parents: targetFolderId ? [targetFolderId] : undefined
        });

        if (!result || !result.id) {
            throw new Error("No se recibió confirmación de que el archivo se subió correctamente a Drive.");
        }

        console.log(`Backup subido exitosamente a Drive. ID: ${result.id}, Nombre: ${result.name || fileName}`);
    } catch (error: any) {
        const errorMsg = extractGapiErrorMessage(error);
        throw new Error(
            `Error al subir backup a Google Drive: ${errorMsg}\n\n` +
            `Asegúrate de:\n` +
            `1. Tener conexión a internet\n` +
            `2. Haber autorizado el acceso a Google Drive\n` +
            `3. Tener espacio disponible en tu cuenta de Google Drive`
        );
    }
};

export const restoreBackup = async (jsonData: any, onProgress?: (progress: number, message: string) => void): Promise<{ 
    ajustes: number;
    config: number;
    carreras: number; 
    gastos: number; 
    turnos: number;
    proveedores: number;
    conceptos: number;
    talleres: number;
    excepciones: number;
    vales: number;
    reminders: number;
    expenseTemplates: number;
    customReports: number;
    otrosIngresos: number;
}> => {
    if (!jsonData || !jsonData.meta || !jsonData.meta.app) {
        throw new Error("El archivo no parece ser un backup válido de TAppXI.");
    }

    const stats = {
        ajustes: 0,
        config: 0,
        carreras: 0,
        gastos: 0,
        turnos: 0,
        proveedores: 0,
        conceptos: 0,
        talleres: 0,
        excepciones: 0,
        vales: 0,
        reminders: 0,
        expenseTemplates: 0,
        customReports: 0,
        otrosIngresos: 0
    };

    const totalSteps = 14; // Ajustes, Config, Carreras, Gastos, Turnos, Proveedores, Conceptos, Talleres, Excepciones, Vales, Reminders, Templates, Reports, OtrosIngresos
    let currentStep = 0;

    const reportProgress = (msg: string) => {
        if (onProgress) {
            const percent = Math.round((currentStep / totalSteps) * 100);
            onProgress(percent, msg);
        }
    };

    // LIMPIAR BASE DE DATOS ACTUAL antes de restaurar
    reportProgress("Limpiando base de datos actual...");
    await clearAllData();

    // Restaurar Ajustes
    reportProgress("Restaurando ajustes...");
    if (jsonData.ajustes) {
        // Enviar el objeto completo, saveAjustes ya no filtra
        await saveAjustes(jsonData.ajustes, true);

        // Mantener compatibilidad con backups antiguos que usaban "tam\u00f1oFuente"
        if (jsonData.ajustes['tam\u00f1oFuente'] && !jsonData.ajustes.tamanoFuente) {
            await saveAjustes({ tamanoFuente: jsonData.ajustes['tam\u00f1oFuente'] }, true);
        }
        stats.ajustes = 1;
    }
    currentStep++;

    // Restaurar Configuración de Descansos
    reportProgress("Restaurando configuración...");
    if (jsonData.breakConfiguration) {
        await saveBreakConfiguration(jsonData.breakConfiguration, true);
        stats.config = 1;
    }
    currentStep++;

    // Restaurar Carreras
    reportProgress("Restaurando carreras...");
    if (jsonData.carreras && Array.isArray(jsonData.carreras)) {
        const total = jsonData.carreras.length;
        for (let i = 0; i < total; i++) {
            const raw = jsonData.carreras[i];
            const normalized = {
                ...raw,
                fechaHora: apiParseDate(raw.fechaHora),
                taximetro: cleanN(raw.taximetro),
                cobrado: cleanN(raw.cobrado)
            };
            await restoreCarrera(normalized, true);
            stats.carreras++;
            if (i % 10 === 0 && onProgress) {
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
            const raw = jsonData.gastos[i];
            const normalized = {
                ...raw,
                fecha: apiParseDate(raw.fecha),
                importe: cleanN(raw.importe),
                baseImponible: cleanN(raw.baseImponible),
                ivaImporte: cleanN(raw.ivaImporte),
                ivaPorcentaje: cleanN(raw.ivaPorcentaje),
                kilometros: cleanN(raw.kilometros),
                kmParciales: cleanN(raw.kmParciales),
                litros: cleanN(raw.litros),
                descuento: cleanN(raw.descuento)
            };
            await restoreGasto(normalized, true);
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
            const raw = jsonData.turnos[i];
            const normalized = {
                ...raw,
                fechaInicio: apiParseDate(raw.fechaInicio),
                fechaFin: raw.fechaFin ? apiParseDate(raw.fechaFin) : undefined,
                kilometrosInicio: cleanN(raw.kilometrosInicio),
                kilometrosFin: raw.kilometrosFin ? cleanN(raw.kilometrosFin) : undefined
            };
            await restoreTurno(normalized, true);
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
            await restoreProveedor(jsonData.proveedores[i], true);
            stats.proveedores++;
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
            await restoreConcepto(jsonData.conceptos[i], true);
            stats.conceptos++;
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
            await restoreTaller(jsonData.talleres[i], true);
            stats.talleres++;
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
            await restoreExcepcion(jsonData.excepciones[i], true);
            stats.excepciones++;
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((8 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando excepciones (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Vales
    reportProgress("Restaurando directorio de vales...");
    if (jsonData.vales && Array.isArray(jsonData.vales)) {
        const total = jsonData.vales.length;
        for (let i = 0; i < total; i++) {
            await restoreValeDirectoryEntry(jsonData.vales[i], true);
            stats.vales++;
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((9 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando vales (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Recordatorios
    reportProgress("Restaurando recordatorios...");
    if (jsonData.reminders && Array.isArray(jsonData.reminders)) {
        const total = jsonData.reminders.length;
        for (let i = 0; i < total; i++) {
            await restoreReminder(jsonData.reminders[i], true);
            stats.reminders++;
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((10 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando recordatorios (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Plantillas de Gastos
    reportProgress("Restaurando plantillas de gastos...");
    if (jsonData.expenseTemplates && Array.isArray(jsonData.expenseTemplates)) {
        stats.expenseTemplates = restoreTemplates(jsonData.expenseTemplates);
    }
    currentStep++;

    // Restaurar Reportes Personalizados
    reportProgress("Restaurando reportes personalizados...");
    if (jsonData.customReports && Array.isArray(jsonData.customReports)) {
        const total = jsonData.customReports.length;
        for (let i = 0; i < total; i++) {
            await restoreCustomReport(jsonData.customReports[i], true);
            stats.customReports++;
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((12 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando reportes (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Otros Ingresos
    reportProgress("Restaurando otros ingresos...");
    if (jsonData.otrosIngresos && Array.isArray(jsonData.otrosIngresos)) {
        const total = jsonData.otrosIngresos.length;
        for (let i = 0; i < total; i++) {
            await restoreOtroIngreso(jsonData.otrosIngresos[i], true);
            stats.otrosIngresos++;
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((13 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando otros ingresos (${i + 1}/${total})...`);
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

const fmtDate = (d: Date | string) => {
    if (!d) return '';
    const date = d instanceof Date ? d : apiParseDate(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
};

const fmtTime = (d: Date | string) => {
    if (!d) return '';
    const date = d instanceof Date ? d : apiParseDate(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const exportToGoogleSheets = async (folderId?: string): Promise<{ spreadsheetId: string; url: string }> => {
    try {
        const data = await buildBackupPayload();
        const dateStr = new Date().toISOString().split('T')[0];

        // 0. Si no se pasa folderId, usar (o crear) la carpeta TAppXI por defecto
        let targetFolderId = folderId;
        if (!targetFolderId) {
            targetFolderId = await findOrCreateFolder('TAppXI');
        }

        // Usar exactamente los mismos nombres de hoja que syncService
        const sheetTitles = [
            'Carreras',
            'Gastos',
            'Detalle_Servicios',
            'Turnos',
            'Detalle_Descansos',
            'Proveedores',
            'Conceptos',
            'Talleres',
            'Ajustes',
            'Excepciones',
            'Directorio_Vales',
            'Recordatorios',
            'Plantillas_Gastos',
            'Informes_Personalizados',
            'Otros_Ingresos',
            'Vales_Carreras'
        ];

        const { spreadsheetId } = await createSpreadsheetWithSheets(`TAppXI Export ${dateStr}`, sheetTitles);

        // Si tenemos carpeta de destino, mover el archivo allí
        if (spreadsheetId && targetFolderId) {
            const gapi = (window as any).gapi;
            // Primero obtener los padres actuales para quitárselos
            const file = await gapi.client.drive.files.get({
                fileId: spreadsheetId,
                fields: 'parents'
            });
            const previousParents = (file.result.parents || []).join(',');
            
            // Mover el archivo
            await gapi.client.drive.files.update({
                fileId: spreadsheetId,
                addParents: targetFolderId,
                removeParents: previousParents,
                fields: 'id, parents'
            });
            console.log(`[Export] Hoja de cálculo movida a la carpeta ${targetFolderId}`);
        }

        if (!spreadsheetId) {
            throw new Error("No se recibió el ID de la hoja de cálculo creada.");
        }

        // Definir columnas EXACTAMENTE como en syncService.ts
        const headers = {
            carreras: ['Fecha', 'Hora', 'Taxímetro', 'Cobrado', 'Forma Pago', 'Tipo', 'Emisora', 'Aeropuerto', 'Estación', 'Notas', 'Empresa Vale', 'Cod. Empresa', 'Nº Despacho', 'Nº Albaran', 'Autoriza', 'ID Turno', 'ID'],
            gastos: ['Fecha', 'Concepto', 'Proveedor', 'NIF', 'Taller', 'Tipo', 'Categoria', 'Base', 'IVA %', 'IVA €', 'Total', 'Nº Factura', 'Forma Pago', 'Km Totales', 'Km Vehículo', 'Km Parciales', 'Litros', 'Precio/L', 'Descuento', 'Notas', 'ID Turno', 'ID'],
            servicios: ['Gasto ID', 'Referencia', 'Descripción', 'Importe', 'Cantidad', 'Desc. %', 'ID'],
            turnos: ['Fecha Inicio', 'Hora Inicio', 'Km Inicio', 'Fecha Fin', 'Hora Fin', 'Km Fin', 'Km Recorridos', 'ID'],
            descansos: ['Turno ID', 'Fecha Inicio', 'Hora Inicio', 'Km Inicio', 'Fecha Fin', 'Hora Fin', 'Km Fin', 'Duración (min)', 'ID'],
            proveedores: ['Nombre', 'NIF', 'Dirección', 'Teléfono', 'ID'],
            conceptos: ['Nombre', 'Descripción', 'Categoría', 'ID'],
            talleres: ['Nombre', 'NIF', 'Dirección', 'Teléfono', 'ID'],
            excepciones: ['Fecha Desde', 'Fecha Hasta', 'Tipo', 'Nueva Letra', 'Nota', 'Descripcion', 'ID'],
            vales: ['Empresa', 'Código', 'Dirección', 'Teléfono', 'ID'],
            recordatorios: ['Título', 'Tipo', 'Fecha Límite', 'Km Límite', 'Estado', 'ID'],
            plantillasGastos: ['Nombre', 'Tipo', 'Importe', 'Forma Pago', 'Proveedor', 'Concepto', 'Taller', 'Nº Factura', 'Base', 'IVA %', 'IVA €', 'Kilómetros', 'Km Vehículo', 'Descuento', 'Servicios (JSON)', 'Notas', 'Created At', 'Last Used', 'Use Count', 'ID'],
            informes: ['Nombre', 'Configuración (JSON)', 'ID'],
            ajustes: ['Clave', 'Valor'],
            otrosIngresos: ['Fecha', 'Concepto', 'Importe', 'Forma Pago', 'Notas', 'ID'],
            valesCarreras: ['ID Carrera', 'Empresa', 'Código', 'Despacho', 'Albarán', 'Autoriza', 'ID']
        };

        // Convertir datos a filas respetando los nuevos encabezados
        const carrerasRows: any[][] = [headers.carreras];
        const valesCarrerasRows: any[][] = [headers.valesCarreras];
        const sortedCarreras = [...(data.carreras || [])].sort((a: any, b: any) => (apiParseDate(a.fechaHora)?.getTime() || 0) - (apiParseDate(b.fechaHora)?.getTime() || 0));
        sortedCarreras.forEach((c: any) => {
            const date = c.fechaHora instanceof Date ? c.fechaHora : apiParseDate(c.fechaHora);
            carrerasRows.push([
                fmtDate(date),
                fmtTime(date),
                c.taximetro || 0,
                c.cobrado || 0,
                c.formaPago || '',
                c.tipoCarrera || 'Urbana',
                c.emisora ? 'Sí' : 'No',
                c.aeropuerto ? 'Sí' : 'No',
                c.estacion ? 'Sí' : 'No',
                c.notas || '',
                c.valeInfo?.empresa || '',
                c.valeInfo?.codigoEmpresa || '',
                c.valeInfo?.despacho || '',
                c.valeInfo?.numeroAlbaran || '',
                c.valeInfo?.autoriza || '',
                c.turnoId || '',
                c.id
            ]);

            if (c.formaPago === 'Vales' && c.valeInfo) {
                valesCarrerasRows.push([
                    c.id,
                    c.valeInfo.empresa || '',
                    c.valeInfo.codigoEmpresa || '',
                    c.valeInfo.despacho || '',
                    c.valeInfo.numeroAlbaran || '',
                    c.valeInfo.autoriza || '',
                    c.id + '_vale'
                ]);
            }
        });

        const gastosRows: any[][] = [headers.gastos];
        const serviciosRows: any[][] = [headers.servicios];
        const sortedGastos = [...(data.gastos || [])].sort((a: any, b: any) => (apiParseDate(a.fecha)?.getTime() || 0) - (apiParseDate(b.fecha)?.getTime() || 0));
        sortedGastos.forEach((g: any) => {
            gastosRows.push([
                fmtDate(g.fecha),
                g.concepto || '',
                g.proveedor || '',
                g.nif || '',
                g.taller || '',
                g.tipo || '',
                g.categoria || '',
                g.baseImponible || g.importe || 0,
                g.ivaPorcentaje || 0,
                g.ivaImporte || 0,
                g.importe || 0,
                g.numeroFactura || '',
                g.formaPago || '',
                g.kilometros || '',
                g.kilometrosVehiculo || '',
                g.kmParciales || '',
                g.litros || '',
                g.precioPorLitro || '',
                g.descuento || 0,
                g.notas || '',
                g.turnoId || '',
                g.id
            ]);

            if (g.servicios && Array.isArray(g.servicios)) {
                g.servicios.forEach((s: any, index: number) => {
                    serviciosRows.push([
                        g.id,
                        s.referencia || '',
                        s.descripcion || '',
                        s.importe || 0,
                        s.cantidad || 1,
                        s.descuentoPorcentaje || 0,
                        s.id || (g.id + '_s_' + index)
                    ]);
                });
            }
        });

        const turnosRows: any[][] = [headers.turnos];
        const descansosRows: any[][] = [headers.descansos];
        const sortedTurnos = [...(data.turnos || [])].sort((a: any, b: any) => (apiParseDate(a.fechaInicio)?.getTime() || 0) - (apiParseDate(b.fechaInicio)?.getTime() || 0));
        sortedTurnos.forEach((t: any) => {
            const start = t.fechaInicio instanceof Date ? t.fechaInicio : apiParseDate(t.fechaInicio);
            const end = t.fechaFin ? (t.fechaFin instanceof Date ? t.fechaFin : apiParseDate(t.fechaFin)) : null;
            const kmRec = (t.kilometrosFin && t.kilometrosInicio) ? t.kilometrosFin - t.kilometrosInicio : '';

            turnosRows.push([
                fmtDate(start),
                fmtTime(start),
                t.kilometrosInicio || 0,
                end ? fmtDate(end) : '',
                end ? fmtTime(end) : '',
                t.kilometrosFin || '',
                kmRec,
                t.id
            ]);

            if (t.descansos && Array.isArray(t.descansos)) {
                t.descansos.forEach((d: any, index: number) => {
                    const dStart = d.fechaInicio instanceof Date ? d.fechaInicio : apiParseDate(d.fechaInicio);
                    const dEnd = d.fechaFin ? (d.fechaFin instanceof Date ? d.fechaFin : apiParseDate(d.fechaFin)) : null;
                    const duration = (dEnd && dStart) ? Math.round((dEnd.getTime() - dStart.getTime()) / 60000) : '';

                    descansosRows.push([
                        t.id,
                        fmtDate(dStart),
                        fmtTime(dStart),
                        d.kilometrosInicio || '',
                        dEnd ? fmtDate(dEnd) : '',
                        dEnd ? fmtTime(dEnd) : '',
                        d.kilometrosFin || '',
                        duration,
                        d.id || (t.id + '_d_' + index)
                    ]);
                });
            }
        });

        const proveedoresRows: any[][] = [headers.proveedores];
        (data.proveedores || []).forEach((p: any) => {
            proveedoresRows.push([p.nombre, p.nif || '', p.direccion || '', p.telefono || '', p.id]);
        });

        const conceptosRows: any[][] = [headers.conceptos];
        (data.conceptos || []).forEach((co: any) => {
            conceptosRows.push([co.nombre, co.descripcion || '', co.categoria || '', co.id]);
        });

        const talleresRows: any[][] = [headers.talleres];
        (data.talleres || []).forEach((p: any) => {
            talleresRows.push([p.nombre, p.nif || '', p.direccion || '', p.telefono || '', p.id]);
        });

        const excepcionesRows: any[][] = [headers.excepciones];
        (data.excepciones || []).forEach((e: any) => {
            excepcionesRows.push([fmtDate(e.fechaDesde), fmtDate(e.fechaHasta), e.tipo, e.nuevaLetra || '', e.nota || '', e.descripcion || '', e.id]);
        });

        const valesRows: any[][] = [headers.vales];
        (data.vales || []).forEach((v: any) => {
            valesRows.push([v.empresa, v.codigo || v.codigoEmpresa, v.direccion || '', v.telefono || '', v.id]);
        });

        const remindersRows: any[][] = [headers.recordatorios];
        (data.reminders || []).forEach((r: any) => {
            remindersRows.push([r.titulo, r.tipo, r.fechaLimite, r.kilometrosLimite || '', r.completado ? 'Completado' : 'Pendiente', r.id]);
        });

        const expenseTemplatesRows: any[][] = [headers.plantillasGastos];
        (data.expenseTemplates || []).forEach((t: any) => {
            expenseTemplatesRows.push([
                t.nombre || '',
                t.tipo || '',
                t.importe || '',
                t.formaPago || '',
                t.proveedor || '',
                t.concepto || '',
                t.taller || '',
                t.numeroFactura || '',
                t.baseImponible || '',
                t.ivaPorcentaje || 0,
                t.ivaImporte || '',
                t.kilometros || '',
                t.kilometrosVehiculo || '',
                t.descuento || '',
                t.servicios ? JSON.stringify(t.servicios) : '',
                t.notas || '',
                t.createdAt || '',
                t.lastUsed || '',
                t.useCount || 0,
                t.id
            ]);
        });

        const customReportsRows: any[][] = [headers.informes];
        (data.customReports || []).forEach((i: any) => {
            const config = {
                descripcion: i.descripcion,
                filtros: i.filtros,
                tipoExportacion: i.tipoExportacion,
                agrupacion: i.agrupacion,
                createdAt: i.createdAt,
                lastUsed: i.lastUsed
            };
            customReportsRows.push([i.nombre, JSON.stringify(config), i.id]);
        });

        // Ajustes incluyendo breakConfiguration
        const ajustesRows: any[][] = [headers.ajustes];
        const allAjustes = { ...(data.ajustes || {}) };
        if (data.breakConfiguration) {
            allAjustes['breakConfiguration'] = data.breakConfiguration;
        }

        Object.entries(allAjustes).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                ajustesRows.push([key, '']);
            } else if (typeof value === 'object') {
                // Solo stringificar si es un objeto real (ej. datosFiscales)
                ajustesRows.push([key, JSON.stringify(value)]);
            } else {
                // Primitivos (boolean, number, string) se pasan tal cual para que Sheets los reconozca
                ajustesRows.push([key, value]);
            }
        });

        const otrosIngresosRows: any[][] = [headers.otrosIngresos];
        const sortedOtrosIngresos = [...(data.otrosIngresos || [])].sort((a: any, b: any) => (apiParseDate(a.fecha)?.getTime() || 0) - (apiParseDate(b.fecha)?.getTime() || 0));
        sortedOtrosIngresos.forEach((oi: any) => {
            otrosIngresosRows.push([
                fmtDate(oi.fecha),
                oi.concepto || '',
                oi.importe || 0,
                oi.formaPago || '',
                oi.notas || '',
                oi.id
            ]);
        });

        // Escribir cada hoja
        const writes = [
            { title: 'Carreras', rows: carrerasRows },
            { title: 'Gastos', rows: gastosRows },
            { title: 'Detalle_Servicios', rows: serviciosRows },
            { title: 'Turnos', rows: turnosRows },
            { title: 'Detalle_Descansos', rows: descansosRows },
            { title: 'Proveedores', rows: proveedoresRows },
            { title: 'Conceptos', rows: conceptosRows },
            { title: 'Talleres', rows: talleresRows },
            { title: 'Ajustes', rows: ajustesRows },
            { title: 'Excepciones', rows: excepcionesRows },
            { title: 'Directorio_Vales', rows: valesRows },
            { title: 'Recordatorios', rows: remindersRows },
            { title: 'Plantillas_Gastos', rows: expenseTemplatesRows },
            { title: 'Informes_Personalizados', rows: customReportsRows },
            { title: 'Otros_Ingresos', rows: otrosIngresosRows },
            { title: 'Vales_Carreras', rows: valesCarrerasRows }
        ];

        for (const write of writes) {
            if (write.rows.length >= 1) {
                await writeSheetValues(spreadsheetId, write.title, write.rows);
            }
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

const normalizeHeader = (header: string): string => {
    if (!header) return '';
    // Mapa de traducciones específicas para TAppXI_DB
    const mapping: Record<string, string> = {
        'taxímetro': 'taximetro',
        'código empresa': 'codigoEmpresa',
        'nº despacho': 'despacho',
        'nº albaran': 'numeroAlbaran',
        'empresa vale': 'empresa',
        'cod. empresa': 'codigoEmpresa',
        'nº albarán': 'numeroAlbaran',
        'base': 'baseImponible',
        'iva %': 'ivaPorcentaje',
        'iva €': 'ivaImporte',
        'iva (€)': 'ivaImporte',
        'iva (%)': 'ivaPorcentaje',
        'iva (importe)': 'ivaImporte',
        'ivaporc': 'ivaPorcentaje',
        'base imponible (€)': 'baseImponible',
        'total (€)': 'importe',
        'total': 'importe',
        'kilómetros totales': 'kilometros',
        'km vehículo': 'kilometrosVehiculo',
        'km parciales': 'kmParciales',
        'litros': 'litros',
        'precio/l': 'precioPorLitro',
        'descuento (€)': 'descuento',
        'nº factura': 'numeroFactura',
        'km': 'kilometros',
        'teléfono': 'telefono',
        'dirección': 'direccion',
        'categoría': 'categoria',
        'descripción': 'descripcion',
        'título': 'titulo',
        'fecha límite': 'fechaLimite',
        'km límite': 'kilometrosLimite',
        'fecha desde': 'fechaDesde',
        'fecha hasta': 'fechaHasta',
        'nueva letra': 'nuevaLetra',
        'configuración (json)': 'configuracion',
        'nif / cif': 'nif',
        'nif proveedor': 'nif',
        'razón social': 'nombre',
        'dirección fiscal': 'direccion',
        'email': 'email',
        'clave': 'clave',
        'valor': 'valor',
        'estación': 'estacion',
        'forma pago': 'formaPago',
        'forma de pago': 'formaPago',
        'created at': 'createdAt',
        'last used': 'lastUsed',
        'use count': 'useCount',
        'servicios (json)': 'servicios',
        'tipo': 'tipo',
        'tipo de gasto': 'tipo',
        'tipo de carrera': 'tipoCarrera',
        'tipo carrera': 'tipoCarrera',
        'categoría': 'categoria',
        'categoria': 'categoria',
        'dirección_vales': 'Vales',
        'plantillas_gastos': 'Plantillas_Gastos',
        'informes_personalizados': 'CustomReports',
        'detalle_servicios': 'Servicios',
        'vales_carreras': 'Vales_Carreras',
        'id carrera': 'carreraId',
        'albarán': 'numeroAlbaran',
        'código': 'codigoEmpresa',
        'id turno': 'turnoId',
        'id': 'id'
    };

    const lower = header.toLowerCase().trim();
    if (mapping[lower]) return mapping[lower];

    // Si no hay mapeo, normalizamos: quitar espacios y caracteres especiales
    return lower
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar tildes
        .replace(/[^a-z0-9]/g, ''); // Quitar todo lo que no sea letras o números
};

const fromRows = (rows: any[][]): any[] => {
    if (!rows || rows.length < 2) return [];
    const rawHeaders = rows[0];
    const normalizedHeaders = rawHeaders.map(h => normalizeHeader(String(h)));
    const data = rows.slice(1);

    return data.map((row) => {
        const obj: any = {};
        normalizedHeaders.forEach((header: string, index: number) => {
            if (!header) return;
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

const parseNumber = cleanN;

const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return val;
    }
    
    // Si es un número (probablemente fecha de Excel si no se parseó automáticamente)
    if (typeof val === 'number') {
        // Excel dates are days since 1899-12-30. 
        // 25569 is the difference between 1970-01-01 and 1899-12-30 in days.
        // If the number is > 30000, it's likely an Excel date.
        if (val > 30000) {
            const date = new Date((val - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) return date;
        }
        // De lo contrario, tratar como timestamp
        const date = new Date(val);
        if (!isNaN(date.getTime())) return date;
        return null;
    }

    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed || trimmed === '') return null;

        // FIRST: Try Spanish format DD/MM/YYYY or DD-MM-YYYY
        const spanishFormat = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(trimmed);
        if (spanishFormat) {
            const [, day, month, yearStr] = spanishFormat;
            let year = parseInt(yearStr);
            if (year < 100) {
                year = year <= 50 ? 2000 + year : 1900 + year;
            }
            const date = new Date(year, parseInt(month) - 1, parseInt(day));
            if (date.getFullYear() === year &&
                date.getMonth() === parseInt(month) - 1 &&
                date.getDate() === parseInt(day)) {
                return date;
            }
        }

        // SECOND: Try ISO or standard Date.parse
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            return date;
        }

        // THIRD: Try swapping MM/DD for DD/MM if it failed
        if (trimmed.includes('/')) {
            const parts = trimmed.split('/');
            if (parts.length >= 3) {
                const swapped = `${parts[1]}/${parts[0]}/${parts[2]}`;
                const dateSwapped = new Date(swapped);
                if (!isNaN(dateSwapped.getTime())) return dateSwapped;
            }
        }

        console.warn(`Failed to parse date string: "${trimmed}"`);
        return null;
    }
    return null;
};

const processSpreadsheetBackupData = async (rowsMap: Record<string, any[][]>, onProgress?: (progress: number, message: string) => void) => {
    const {
        carrerasRows = [],
        gastosRows = [],
        serviciosRows = [],
        turnosRows = [],
        proveedoresRows = [],
        conceptosRows = [],
        talleresRows = [],
        ajustesRows = [],
        excepcionesRows = [],
        valesRows = [],
        remindersRows = [],
        expenseTemplatesRows = [],
        customReportsRows = [],
        otrosIngresosRows = [],
        valesCarrerasRows = [],
        descansosRows = []
    } = rowsMap;

    // Usamos alias para compatibilidad si el archivo tiene nombres antiguos
    const getRows = (rows: any[][]) => fromRows(rows);

    const carrerasRaw = getRows(carrerasRows);
    const gastosRaw = getRows(gastosRows);
    const serviciosRaw = getRows(serviciosRows);
    const turnosRaw = getRows(turnosRows);
    const proveedoresRaw = getRows(proveedoresRows);
    const conceptosRaw = getRows(conceptosRows);
    const talleresRaw = getRows(talleresRows);
    const excepcionesRaw = getRows(excepcionesRows);
    const valesRaw = getRows(valesRows);
    const remindersRaw = getRows(remindersRows);
    const expenseTemplatesRaw = getRows(expenseTemplatesRows);
    const customReportsRaw = getRows(customReportsRows);
    const otrosIngresosRaw = getRows(otrosIngresosRows);
    const valesCarrerasRaw = getRows(valesCarrerasRows);
    const descansosRaw = getRows(descansosRows);

    console.log(`[Import] Filas detectadas: 
        Carreras: ${carrerasRaw.length}, 
        Gastos: ${gastosRaw.length}, 
        Turnos: ${turnosRaw.length}, 
        Plantillas: ${expenseTemplatesRaw.length},
        Ajustes: ${ajustesRows.length - 1}`);

    const processDateWithTime = (item: any, dateKey: string = 'fecha', timeKey: string = 'hora'): Date | null => {
        const dateStr = item[dateKey];
        const timeStr = item[timeKey];
        if (!dateStr) return null;
        const date = parseDate(dateStr);
        if (!date) return null;

        if (timeStr !== undefined && timeStr !== null) {
            if (typeof timeStr === 'string' && timeStr.includes(':')) {
                const [hours, minutes] = timeStr.split(':').map(n => parseInt(n, 10));
                if (!isNaN(hours) && !isNaN(minutes)) {
                    date.setHours(hours, minutes, 0, 0);
                }
            } else if (typeof timeStr === 'number') {
                // Manejar tiempo numérico de Excel/Google Sheets (fracción del día)
                const totalMinutes = Math.round(timeStr * 24 * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                date.setHours(hours, minutes, 0, 0);
            }
        }
        return date;
    };

    const carreras = carrerasRaw.map(c => {
        const fechaHora = c.fechahora ? parseDate(c.fechahora) : processDateWithTime(c, 'fecha', 'hora');
        let valeInfo = c.valeinfo;

        // 1. Intentar reconstruir desde columnas individuales (backups antiguos)
        if (!valeInfo && (c.empresa || c.empresavale)) {
            valeInfo = {
                empresa: c.empresa || c.empresavale,
                codigoEmpresa: c.codigoEmpresa || c.codempresa || c.codigo,
                despacho: c.despacho || c.ndespacho,
                numeroAlbaran: c.numeroAlbaran || c.nalbaran,
                autoriza: c.autoriza
            };
        }

        // 2. Intentar buscar en la nueva hoja Vales_Carreras
        if (!valeInfo) {
            const associatedVale = valesCarrerasRaw.find(v => v.carreraId === c.id);
            if (associatedVale) {
                valeInfo = {
                    empresa: associatedVale.empresa,
                    codigoEmpresa: associatedVale.codigoEmpresa,
                    despacho: associatedVale.despacho,
                    numeroAlbaran: associatedVale.numeroAlbaran,
                    autoriza: associatedVale.autoriza
                };
            }
        }

        return {
            ...c,
            id: c.id || crypto.randomUUID(),
            taximetro: parseNumber(c.taximetro),
            cobrado: parseNumber(c.cobrado),
            fechaHora: fechaHora, // No fallback to new Date()
            tipoCarrera: c.tipoCarrera || c.tipo || 'Urbana',
            valeInfo,
            turnoId: c.turnoId || c.idturno || undefined,
            emisora: c.emisora === 'Sí' || c.emisora === true,
            aeropuerto: c.aeropuerto === 'Sí' || c.aeropuerto === true,
            estacion: c.estacion === 'Sí' || c.estacion === true,
        };
    }).filter(c => {
        // Skip carreras with invalid dates
        if (!c.fechaHora) {
            console.warn(`[Import] Omitiendo carrera ID: ${c.id} por fecha inválida.`, c);
            return false;
        }
        return true;
    });

    console.log(`[Import] Carreras válidas tras procesado: ${carreras.length}`);

    const gastos = gastosRaw.map(g => {
        // Reconstruir servicios si existen en la hoja Detalle_Servicios
        const servicios = serviciosRaw
            .filter(s => s.gastoid === g.id)
            .map(s => ({
                id: s.id || crypto.randomUUID(),
                referencia: s.referencia,
                descripcion: s.descripcion,
                importe: parseNumber(s.importe),
                cantidad: parseNumber(s.cantidad),
                descuentoPorcentaje: parseNumber(s.descuentoPorcentaje || s['desc. %'])
            }));

        return {
            ...g,
            id: g.id || crypto.randomUUID(), // Asegurar que siempre hay ID
            tipo: String(g.tipo || g.tipoCarrera || g.tipodegasto || g.clase || '').trim(),
            categoria: String(g.categoria || g.categoriagasto || '').trim(),
            importe: parseNumber(g.importe || g.total || g.totale),
            baseImponible: parseNumber(g.baseImponible || g.baseimponible || g.base || g.baseimponiblee),
            ivaImporte: parseNumber(g.ivaImporte || g.ivaimporte || g.ivae),
            ivaPorcentaje: parseNumber(g.ivaPorcentaje || g.ivaporcentaje || g.ivaporc),
            kilometros: parseNumber(g.kilometros || g.km || g.kilometrostotales),
            kilometrosVehiculo: parseNumber(g.kilometrosVehiculo || g.kilometrosvehiculo || g.kmvehiculo),
            kmParciales: parseNumber(g.kmParciales || g.kmparciales),
            litros: parseNumber(g.litros),
            precioPorLitro: parseNumber(g.precioporlitro || g.preciol),
            descuento: parseNumber(g.descuento || g.descuentoe),
            fecha: parseDate(g.fecha), // No fallback
            servicios: servicios.length > 0 ? servicios : (g.servicios || [])
        };
    }).filter(g => {
        if (!g.fecha) {
            console.warn(`Skipping gasto ${g.id}: invalid date`);
            return false;
        }
        return true;
    });

    const turnos = turnosRaw.map(t => {
        const fechaInicio = processDateWithTime(t, 'fechainicio', 'horainicio');
        const fechaFin = processDateWithTime(t, 'fechafin', 'horafin');
        
        // Reconstruir descansos
        const descansos = descansosRaw
            .filter(d => d.turnoid === t.id)
            .map(d => ({
                id: d.id || (t.id + '_d_' + Math.random().toString(36).substr(2, 9)),
                fechaInicio: processDateWithTime(d, 'fechainicio', 'horainicio'),
                fechaFin: processDateWithTime(d, 'fechafin', 'horafin'),
                kilometrosInicio: parseNumber(d.kilometrosinicio || d.kminicio),
                kilometrosFin: parseNumber(d.kilometrosfin || d.kmfin)
            }))
            .filter(d => d.fechaInicio !== null);

        return {
            ...t,
            id: t.id || crypto.randomUUID(),
            kilometrosInicio: parseNumber(t.kilometrosInicio || t.kilometrosinicio || t.kminicio),
            kilometrosFin: (t.kilometrosFin || t.kilometrosfin || t.kmfin) ? parseNumber(t.kilometrosFin || t.kilometrosfin || t.kmfin) : null,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin || null,
            descansos: descansos.length > 0 ? descansos : (t.descansos || [])
        };
    }).filter(t => {
        if (!t.fechaInicio) {
            console.warn(`Skipping turno ${t.id}: invalid start date`);
            return false;
        }
        return true;
    });

    const cleanObject = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.map(cleanObject);
        if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const key in obj) {
                if (obj[key] !== undefined) cleaned[key] = cleanObject(obj[key]);
            }
            return cleaned;
        }
        return obj;
    };

    let ajustes = null;
    if (ajustesRows.length > 1) {
        ajustes = {};
        for (let i = 1; i < ajustesRows.length; i++) {
            const [key, value] = ajustesRows[i];
            if (key) {
                const keys = key.split('.');
                let current = ajustes;
                for (let j = 0; j < keys.length - 1; j++) {
                    if (!current[keys[j]]) current[keys[j]] = {};
                    current = current[keys[j]];
                }
                let finalValue = value;
                if (typeof value === 'string') {
                    let trimmed = value.trim();
                    // Si parece JSON (objeto, array o string con comillas), intentar parsear
                    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
                        try {
                            finalValue = JSON.parse(trimmed);
                        } catch (e) {
                            // Si falla el parseo de comillas, seguimos con el valor original
                        }
                    }
                    
                    // Re-evaluar el valor final (podría ser un string después de JSON.parse o el original)
                    if (typeof finalValue === 'string') {
                        let finalTrimmed = finalValue.trim();
                        if (finalTrimmed.toUpperCase() === 'TRUE') {
                            finalValue = true;
                        } else if (finalTrimmed.toUpperCase() === 'FALSE') {
                            finalValue = false;
                        } else if (!isNaN(Number(finalTrimmed)) && finalTrimmed !== '') {
                            finalValue = Number(finalTrimmed);
                        }
                    }
                }
                current[keys[keys.length - 1]] = finalValue;
            }
        }
        ajustes = cleanObject(ajustes);
    }

    let breakConfiguration = ajustes?.breakConfiguration || null;
    if (ajustes && ajustes.breakConfiguration) {
        delete ajustes.breakConfiguration;
    }

    const excepciones = excepcionesRaw.map(e => ({
        ...e,
        id: e.id || crypto.randomUUID(), // Asegurar que siempre hay ID
        fechaDesde: parseDate(e.fechaDesde || e.fechadesde),
        fechaHasta: parseDate(e.fechaHasta || e.fechahasta) || parseDate(e.fechaDesde || e.fechadesde),
        createdAt: parseDate(e.createdAt || e.createdat) || new Date(),
        tipo: e.tipo || 'Descanso'
    })).filter(e => {
        if (!e.fechaDesde) {
            console.warn(`[Import] Omitiendo excepcion ${e.id} por fecha desde inválida.`, e);
            return false;
        }
        return true;
    });

    const proveedores = proveedoresRaw.map(p => ({ ...p, id: p.id || crypto.randomUUID(), createdAt: apiParseDate(p.createdat) }));
    const conceptos = conceptosRaw.map(co => ({ ...co, id: co.id || crypto.randomUUID(), createdAt: apiParseDate(co.createdat) }));
    const talleres = talleresRaw.map(t => ({ ...t, id: t.id || crypto.randomUUID(), createdAt: apiParseDate(t.createdat) }));
    const vales = valesRaw.map(v => ({ ...v, id: v.id || crypto.randomUUID() }));
    const reminders = remindersRaw.map(r => ({
        ...r,
        id: r.id || crypto.randomUUID(),
        titulo: r.titulo || r.titulo || '',
        fechaLimite: r.fechaLimite || r.fechalimite,
        kilometrosLimite: parseNumber(r.kilometrosLimite || r.kilometroslimite || r.kmlimite),
        completado: r.estado === 'Completado' || r.completado === true
    }));
    const expenseTemplates = expenseTemplatesRaw.map(t => ({
        ...t,
        id: t.id || crypto.randomUUID(),
        nombre: t.nombre || '',
        tipo: t.tipo || t.tipoCarrera,
        importe: parseNumber(t.importe),
        baseImponible: parseNumber(t.baseImponible || t.base),
        ivaPorcentaje: parseNumber(t.ivaPorcentaje || t.ivaporcentaje || t.ivaporc),
        ivaImporte: parseNumber(t.ivaImporte || t.ivaimporte || t.ivae),
        kilometros: parseNumber(t.kilometros || t.km),
        kilometrosVehiculo: parseNumber(t.kilometrosVehiculo || t.kmvehiculo),
        descuento: parseNumber(t.descuento),
        useCount: parseNumber(t.useCount || t.usecount),
        createdAt: t.createdAt || t.createdat || new Date().toISOString(),
        lastUsed: t.lastUsed || t.lastused || undefined,
        servicios: Array.isArray(t.servicios) ? t.servicios : []
    })).filter(t => t.nombre);
    const customReports = customReportsRaw.map(cr => ({ ...cr, id: cr.id || crypto.randomUUID() }));
    const otrosIngresos = otrosIngresosRaw.map(oi => ({
        ...oi,
        id: oi.id || crypto.randomUUID(),
        fecha: processDateWithTime(oi, 'fecha', 'hora'),
        importe: parseNumber(oi.importe)
    })).filter(oi => {
        if (!oi.fecha) {
            console.warn(`Skipping otro ingreso ${oi.id}: invalid date`);
            return false;
        }
        return true;
    });

    if (onProgress) onProgress(90, "Guardando datos...");

    const fullPayload = {
        meta: { app: 'TAppXI', version: '1.0', createdAt: new Date().toISOString() },
        ajustes,
        breakConfiguration,
        excepciones,
        carreras,
        gastos,
        turnos,
        proveedores,
        conceptos,
        talleres,
        vales,
        reminders,
        expenseTemplates,
        customReports,
        otrosIngresos
    };

    const stats = await restoreBackup(fullPayload, onProgress);
    return stats;
};

export const restoreFromGoogleSheets = async (spreadsheetId: string, onProgress?: (progress: number, message: string) => void): Promise<any> => {
    try {
        console.log(`Iniciando restauración desde Sheet ID: ${spreadsheetId}`);
        if (onProgress) onProgress(0, "Descargando datos de Google Sheets...");

        const details = await getSpreadsheetDetails(spreadsheetId);
        const existingSheets = details.sheets.map((s: any) => s.properties.title);

        const safeRead = async (title: string, range: string = 'A:Z') => {
            if (existingSheets.includes(title)) {
                return readSheetValues(spreadsheetId, `${title}!${range}`).catch(() => []);
            }
            return [];
        };

        const [
            carrerasRows,
            gastosRows,
            serviciosRows,
            turnosRows,
            proveedoresRows,
            conceptosRows,
            talleresRows,
            ajustesRows,
            excepcionesRows,
            valesRows,
            remindersRows,
            expenseTemplatesRows,
            customReportsRows,
            otrosIngresosRows,
            valesCarrerasRows,
            descansosRows
        ] = await Promise.all([
            safeRead('Carreras'),
            safeRead('Gastos'),
            safeRead('Detalle_Servicios'),
            safeRead('Turnos'),
            safeRead('Proveedores'),
            safeRead('Conceptos'),
            safeRead('Talleres'),
            safeRead('Ajustes', 'A:B'),
            safeRead('Excepciones'),
            safeRead('Directorio_Vales'),
            safeRead('Recordatorios'),
            safeRead('Plantillas_Gastos'),
            safeRead('Informes_Personalizados'),
            safeRead('Otros_Ingresos'),
            safeRead('Vales_Carreras'),
            safeRead('Detalle_Descansos')
        ]);

        if (onProgress) onProgress(10, "Procesando datos...");

        return processSpreadsheetBackupData({
            carrerasRows,
            gastosRows,
            serviciosRows,
            turnosRows,
            proveedoresRows,
            conceptosRows,
            talleresRows,
            ajustesRows,
            excepcionesRows,
            valesRows,
            remindersRows,
            expenseTemplatesRows,
            customReportsRows,
            otrosIngresosRows,
            valesCarrerasRows,
            descansosRows
        }, onProgress);

    } catch (error: any) {
        console.error("Error en restoreFromGoogleSheets:", error);
        throw new Error(`Error al restaurar desde Google Sheets: ${error.message}`);
    }
};

export const restoreFromExcel = async (fileId: string, onProgress?: (progress: number, message: string) => void): Promise<any> => {
    try {
        console.log(`Iniciando restauración desde Excel ID: ${fileId}`);
        if (onProgress) onProgress(0, "Descargando archivo Excel...");

        const binary = await getFileBinary(fileId);
        const workbook = XLSX.read(binary, { type: 'array', cellDates: true });

        if (onProgress) onProgress(10, "Procesando hojas...");

        const safeRead = (sheetName: string): any[][] => {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) return [];
            return XLSX.utils.sheet_to_json(sheet, { header: 1 });
        };

        const rowsMap = {
            carrerasRows: safeRead('Carreras'),
            gastosRows: safeRead('Gastos'),
            serviciosRows: safeRead('Detalle_Servicios'),
            turnosRows: safeRead('Turnos'),
            proveedoresRows: safeRead('Proveedores'),
            conceptosRows: safeRead('Conceptos'),
            talleresRows: safeRead('Talleres'),
            ajustesRows: safeRead('Ajustes'),
            excepcionesRows: safeRead('Excepciones'),
            valesRows: safeRead('Directorio_Vales'),
            remindersRows: safeRead('Recordatorios'),
            expenseTemplatesRows: safeRead('Plantillas_Gastos'),
            customReportsRows: safeRead('Informes_Personalizados'),
            otrosIngresosRows: safeRead('Otros_Ingresos'),
            valesCarrerasRows: safeRead('Vales_Carreras'),
            descansosRows: safeRead('Detalle_Descansos')
        };

        return processSpreadsheetBackupData(rowsMap, onProgress);

    } catch (error: any) {
        console.error("Error en restoreFromExcel:", error);
        throw new Error(`Error al restaurar desde Excel: ${error.message}`);
    }
};


/**
 * Realiza una copia de seguridad automática en la carpeta "TAppXI" de Google Drive.
 * Mantiene un máximo de 3 copias, borrando la más antigua cuando se supera ese límite.
 * @param replaceToday Si true, reemplaza el backup de hoy (si existe) en lugar de acumularlo.
 */
export const autoBackupToDrive = async (replaceToday = false): Promise<void> => {
    const FOLDER_NAME = 'TAppXI';
    const MAX_BACKUPS = 3;

    // No intentar si no hay sesión de Google activa (evita errores en background)
    if (!isGoogleLoggedIn()) {
        console.log('[AutoBackup] Sin sesión de Google activa. Backup omitido.');
        return;
    }

    try {
        // 1. Obtener carpeta: primero intentar la seleccionada por el usuario en Ajustes
        let folderId = localStorage.getItem('tappxi_drive_export_folder');
        if (!folderId) {
            folderId = await findOrCreateFolder(FOLDER_NAME);
        }

        // 2. Listar archivos existentes (ASC: el más antiguo primero)
        let existing = await listFilesInFolder(folderId);

        // 3. Si replaceToday=true, buscar y eliminar el backup de hoy para reemplazarlo
        if (replaceToday) {
            const todayPrefix = `tappxi-backup-${new Date().toISOString().slice(0, 10)}`;
            const todayFiles = existing.filter(f => f.name.startsWith(todayPrefix));
            for (const f of todayFiles) {
                try {
                    await deleteFile(f.id);
                    console.log(`[AutoBackup] Backup de hoy reemplazado: ${f.name}`);
                } catch (e: any) {
                    // Si el archivo ya no existe (404), ignoramos el error ya que el objetivo de borrarlo se ha cumplido
                    const is404 = e?.status === 404 || e?.result?.error?.code === 404 || extractGapiErrorMessage(e).includes('404');
                    if (is404) {
                        console.warn(`[AutoBackup] El archivo de hoy ya no existía en Drive: ${f.name}`);
                    } else {
                        throw e;
                    }
                }
            }
            // Actualizar la lista tras el borrado
            existing = existing.filter(f => !f.name.startsWith(todayPrefix));
        }

        if (existing.length >= MAX_BACKUPS) {
            const oldest = existing[0];
            try {
                await deleteFile(oldest.id);
                console.log(`[AutoBackup] Copia antigua borrada: ${oldest.name}`);
            } catch (e: any) {
                // Si el archivo ya no existe, ignoramos
                const is404 = e?.status === 404 || e?.result?.error?.code === 404 || extractGapiErrorMessage(e).includes('404');
                if (is404) {
                    console.warn(`[AutoBackup] La copia antigua ya no existía en Drive: ${oldest.name}`);
                } else {
                    throw e;
                }
            }
        }

        // 5. Generar el JSON de backup
        const data = await buildBackupPayload();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `tappxi-backup-${dateStr}.json`;

        // 6. Subir el nuevo backup a la carpeta TAppXI
        await uploadFileToDrive({
            name: fileName,
            mimeType: 'application/json',
            content: blob,
            parents: [folderId],
        });

        // 7. Guardar registro del éxito para depuración
        localStorage.setItem('tappxi_last_auto_backup_status', `Success: ${new Date().toLocaleTimeString()} - ${fileName}`);
        localStorage.setItem('tappxi_last_auto_backup', new Date().toISOString());
        console.log(`[AutoBackup] Completado con éxito: ${fileName}`);
    } catch (error: any) {
        const errorMsg = extractGapiErrorMessage(error);
        localStorage.setItem('tappxi_last_auto_backup_status', `Error: ${new Date().toLocaleTimeString()} - ${errorMsg}`);
        console.error('[AutoBackup] Error crítico durante copia automática:', error);
        throw error;
    }
};

/**
 * Inicia el scheduler que ejecuta autoBackupToDrive cada noche a las 23:59.
 * Devuelve una función para cancelarlo (cleanup).
 */
/**
 * Comprueba si ya se hizo una copia hoy. Si no, la hace ahora.
 * Llamar al abrir la app como red de seguridad.
 */
export const backupIfMissedToday = async (): Promise<void> => {
    // No hacer nada si no hay sesión de Google activa
    if (!isGoogleLoggedIn()) {
        console.log('[AutoBackup] Sin sesión de Google. Comprobación diaria omitida.');
        return;
    }
    const last = localStorage.getItem('tappxi_last_auto_backup');
    if (last) {
        const lastDate = new Date(last).toDateString();
        const today = new Date().toDateString();
        if (lastDate === today) {
            // Ya se hizo hoy, no hacer nada
            return;
        }
    }
    console.log('[AutoBackup] No hay copia de hoy. Iniciando backup...');
    await autoBackupToDrive();
};

/**
 * Registra un listener en visibilitychange para hacer una copia al cerrar/ocultar la app.
 * También hace una copia de seguridad si no se hizo hoy al llamar a esta función (al abrir).
 * Devuelve una función de cleanup para eliminar el listener.
 */
export const startAutoBackupOnClose = (): (() => void) => {
    // Red de seguridad: comprobar al abrir si falta el backup de ayer
    backupIfMissedToday().catch(e => console.warn('[AutoBackup] Error en comprobación inicial:', e));

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            // Al cerrar/cambiar de pestaña: siempre reemplazar el backup de hoy
            // para que refleje el estado más actualizado de los datos
            console.log('[AutoBackup] App ocultada/cerrada. Reemplazando backup de hoy...');
            autoBackupToDrive(true).catch(e => console.warn('[AutoBackup] Error al cerrar:', e));
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Limpieza al desmontar
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
};

