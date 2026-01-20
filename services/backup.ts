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
} from './api';
import { getCustomReports, restoreCustomReport } from './customReports';
import { uploadFileToDrive, createSpreadsheetWithSheets, writeSheetValues, readSheetValues, getSpreadsheetDetails } from './google';

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

    const totalSteps = 13; // Ajustes, Config, Carreras, Gastos, Turnos, Proveedores, Conceptos, Talleres, Excepciones, Vales, Reminders, Reports, OtrosIngresos
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
        await saveAjustes(jsonData.ajustes, true);

        // Mantener compatibilidad con backups antiguos que usaban "tam\u00f1oFuente"
        if (jsonData.ajustes['tam\u00f1oFuente'] && !jsonData.ajustes.tamanoFuente) {
            await saveAjustes({ tamanoFuente: jsonData.ajustes['tam\u00f1oFuente'] }, true);
        }
    }
    currentStep++;

    // Restaurar Configuración de Descansos
    reportProgress("Restaurando configuración...");
    if (jsonData.breakConfiguration) {
        await saveBreakConfiguration(jsonData.breakConfiguration, true);
    }
    currentStep++;

    // Restaurar Carreras
    reportProgress("Restaurando carreras...");
    if (jsonData.carreras && Array.isArray(jsonData.carreras)) {
        const total = jsonData.carreras.length;
        for (let i = 0; i < total; i++) {
            await restoreCarrera(jsonData.carreras[i], true);
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
            await restoreGasto(jsonData.gastos[i], true);
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
            await restoreTurno(jsonData.turnos[i], true);
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
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((10 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando recordatorios (${i + 1}/${total})...`);
            }
        }
    }
    currentStep++;

    // Restaurar Reportes Personalizados
    reportProgress("Restaurando reportes personalizados...");
    if (jsonData.customReports && Array.isArray(jsonData.customReports)) {
        const total = jsonData.customReports.length;
        for (let i = 0; i < total; i++) {
            await restoreCustomReport(jsonData.customReports[i], true);
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((11 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando reportes (${i + 1}/${total})...`);
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
            if (i % 10 === 0 && onProgress) {
                onProgress(Math.round((12 / totalSteps) * 100 + (i / total) * (100 / totalSteps)), `Restaurando otros ingresos (${i + 1}/${total})...`);
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
    const date = d instanceof Date ? d : new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
};

const fmtTime = (d: Date | string) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const exportToGoogleSheets = async (): Promise<{ spreadsheetId: string; url: string }> => {
    try {
        const data = await buildBackupPayload();
        const dateStr = new Date().toISOString().split('T')[0];

        // Usar exactamente los mismos nombres de hoja que syncService
        const sheetTitles = [
            'Carreras',
            'Gastos',
            'Detalle_Servicios',
            'Turnos',
            'Proveedores',
            'Conceptos',
            'Talleres',
            'Ajustes',
            'Excepciones',
            'Directorio_Vales',
            'Recordatorios',
            'Informes_Personalizados',
            'Otros_Ingresos',
            'Vales_Carreras'
        ];

        const { spreadsheetId } = await createSpreadsheetWithSheets(`TAppXI Export ${dateStr}`, sheetTitles);

        if (!spreadsheetId) {
            throw new Error("No se recibió el ID de la hoja de cálculo creada.");
        }

        // Definir columnas EXACTAMENTE como en syncService.ts
        const headers = {
            carreras: ['Fecha', 'Hora', 'Taxímetro', 'Cobrado', 'Forma Pago', 'Tipo', 'Emisora', 'Aeropuerto', 'Estación', 'Notas', 'Empresa Vale', 'Cod. Empresa', 'Nº Despacho', 'Nº Albaran', 'Autoriza', 'ID Turno', 'ID'],
            gastos: ['Fecha', 'Concepto', 'Proveedor', 'Taller', 'Base', 'IVA %', 'IVA €', 'Total', 'Nº Factura', 'Forma Pago', 'Km', 'Notas', 'ID'],
            servicios: ['Gasto ID', 'Referencia', 'Descripción', 'Importe', 'Cantidad', 'Desc. %', 'ID'],
            turnos: ['Fecha Inicio', 'Hora Inicio', 'Km Inicio', 'Fecha Fin', 'Hora Fin', 'Km Fin', 'Km Recorridos', 'ID'],
            proveedores: ['Nombre', 'NIF', 'Dirección', 'Teléfono', 'ID'],
            conceptos: ['Nombre', 'Descripción', 'Categoría', 'ID'],
            talleres: ['Nombre', 'NIF', 'Dirección', 'Teléfono', 'ID'],
            excepciones: ['Fecha Desde', 'Fecha Hasta', 'Tipo', 'Nueva Letra', 'Nota', 'Descripcion', 'ID'],
            vales: ['Empresa', 'Código', 'Dirección', 'Teléfono', 'ID'],
            recordatorios: ['Título', 'Tipo', 'Fecha Límite', 'Km Límite', 'Estado', 'ID'],
            informes: ['Nombre', 'Configuración (JSON)', 'ID'],
            ajustes: ['Clave', 'Valor'],
            otrosIngresos: ['Fecha', 'Concepto', 'Importe', 'Forma Pago', 'Notas', 'ID'],
            valesCarreras: ['ID Carrera', 'Empresa', 'Código', 'Despacho', 'Albarán', 'Autoriza', 'ID']
        };

        // Convertir datos a filas respetando los nuevos encabezados
        const carrerasRows: any[][] = [headers.carreras];
        const valesCarrerasRows: any[][] = [headers.valesCarreras];
        (data.carreras || []).forEach((c: any) => {
            const date = new Date(c.fechaHora);
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
                    crypto.randomUUID()
                ]);
            }
        });

        const gastosRows: any[][] = [headers.gastos];
        const serviciosRows: any[][] = [headers.servicios];
        (data.gastos || []).forEach((g: any) => {
            gastosRows.push([
                fmtDate(g.fecha),
                g.concepto || '',
                g.proveedor || '',
                g.taller || '',
                g.baseImponible || g.importe || 0,
                g.ivaPorcentaje || 0,
                g.ivaImporte || 0,
                g.importe || 0,
                g.numeroFactura || '',
                g.formaPago || '',
                g.kilometros || '',
                g.notas || '',
                g.id
            ]);

            if (g.servicios && Array.isArray(g.servicios)) {
                g.servicios.forEach((s: any) => {
                    serviciosRows.push([
                        g.id,
                        s.referencia || '',
                        s.descripcion || '',
                        s.importe || 0,
                        s.cantidad || 1,
                        s.descuentoPorcentaje || 0,
                        s.id || crypto.randomUUID()
                    ]);
                });
            }
        });

        const turnosRows: any[][] = [headers.turnos];
        (data.turnos || []).forEach((t: any) => {
            const kmRec = (t.kilometrosFin && t.kilometrosInicio) ? t.kilometrosFin - t.kilometrosInicio : '';
            turnosRows.push([
                fmtDate(t.fechaInicio),
                fmtTime(t.fechaInicio),
                t.kilometrosInicio,
                t.fechaFin ? fmtDate(t.fechaFin) : '',
                t.fechaFin ? fmtTime(t.fechaFin) : '',
                t.kilometrosFin || '',
                kmRec,
                t.id
            ]);
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
            ajustesRows.push([key, JSON.stringify(value)]);
        });

        const otrosIngresosRows: any[][] = [headers.otrosIngresos];
        (data.otrosIngresos || []).forEach((oi: any) => {
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
            { title: 'Proveedores', rows: proveedoresRows },
            { title: 'Conceptos', rows: conceptosRows },
            { title: 'Talleres', rows: talleresRows },
            { title: 'Ajustes', rows: ajustesRows },
            { title: 'Excepciones', rows: excepcionesRows },
            { title: 'Directorio_Vales', rows: valesRows },
            { title: 'Recordatorios', rows: remindersRows },
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
        'total': 'importe',
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
        'razón social': 'nombre',
        'dirección fiscal': 'direccion',
        'email': 'email',
        'clave': 'clave',
        'valor': 'valor',
        'estación': 'estacion',
        'forma pago': 'formaPago',
        'tipo': 'tipoCarrera',
        'dirección_vales': 'Vales',
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

const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'string') {
        const clean = val.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    }
    return 0;
};

const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return val;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed || trimmed === '') return null;

        // FIRST: Try Spanish format DD/MM/YYYY or DD/MM/YY
        const spanishFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(trimmed);
        if (spanishFormat) {
            const [, day, month, yearStr] = spanishFormat;
            let year = parseInt(yearStr);
            // Handle 2-digit years: 00-50 = 2000-2050, 51-99 = 1951-1999
            if (year < 100) {
                year = year <= 50 ? 2000 + year : 1900 + year;
            }
            const date = new Date(year, parseInt(month) - 1, parseInt(day));
            // Validate the date is real (e.g., not Feb 31)
            if (date.getFullYear() === year &&
                date.getMonth() === parseInt(month) - 1 &&
                date.getDate() === parseInt(day)) {
                return date;
            }
            console.warn(`Invalid Spanish date: ${trimmed} parsed to ${date.toISOString()}`);
        }

        // SECOND: Try ISO format or other standard formats
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            return date;
        }

        console.warn(`Failed to parse date: "${trimmed}"`);
        return null;
    }
    if (typeof val === 'number') {
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
            customReportsRows,
            otrosIngresosRows,
            valesCarrerasRows
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
            safeRead('Informes_Personalizados'),
            safeRead('Otros_Ingresos'),
            safeRead('Vales_Carreras')
        ]);

        if (onProgress) onProgress(10, "Procesando datos...");

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
        const customReportsRaw = getRows(customReportsRows);
        const otrosIngresosRaw = getRows(otrosIngresosRows);
        const valesCarrerasRaw = getRows(valesCarrerasRows);

        const processDateWithTime = (item: any, dateKey: string = 'fecha', timeKey: string = 'hora'): Date | null => {
            const dateStr = item[dateKey];
            const timeStr = item[timeKey];
            if (!dateStr) return null;
            const date = parseDate(dateStr);
            if (!date) return null;
            if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) {
                const [hours, minutes] = timeStr.split(':').map(n => parseInt(n, 10));
                if (!isNaN(hours) && !isNaN(minutes)) {
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
                valeInfo,
                turnoId: c.turnoId || c.idturno || undefined,
                emisora: c.emisora === 'Sí' || c.emisora === true,
                aeropuerto: c.aeropuerto === 'Sí' || c.aeropuerto === true,
                estacion: c.estacion === 'Sí' || c.estacion === true,
            };
        }).filter(c => {
            // Skip carreras with invalid dates
            if (!c.fechaHora) {
                console.warn(`Skipping carrera ${c.id}: invalid date`);
                return false;
            }
            return true;
        });

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
                importe: parseNumber(g.importe || g.total),
                baseImponible: parseNumber(g.baseimponible || g.base),
                ivaImporte: parseNumber(g.ivaimporte || g.ivae),
                ivaPorcentaje: parseNumber(g.ivaporcentaje || g.ivaporc),
                kilometros: parseNumber(g.kilometros || g.km),
                fecha: parseDate(g.fecha) || new Date(),
                servicios: servicios.length > 0 ? servicios : (g.servicios || [])
            };
        });

        const turnos = turnosRaw.map(t => {
            const fechaInicio = t.fechainicio ? parseDate(t.fechainicio) : processDateWithTime(t, 'fechainicio', 'horainicio');
            const fechaFin = t.fechafin ? parseDate(t.fechafin) : processDateWithTime(t, 'fechafin', 'horafin');
            return {
                ...t,
                id: t.id || crypto.randomUUID(), // Asegurar que siempre hay ID
                kilometrosInicio: parseNumber(t.kilometrosinicio || t.kminicio),
                kilometrosFin: (t.kilometrosfin || t.kmfin) ? parseNumber(t.kilometrosfin || t.kmfin) : null,
                fechaInicio: fechaInicio || new Date(),
                fechaFin: fechaFin || null,
            };
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
                    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                        try { finalValue = JSON.parse(value); } catch { }
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
            fechaDesde: parseDate(e.fechadesde) || new Date(),
            fechaHasta: parseDate(e.fechahasta) || new Date(),
            createdAt: parseDate(e.createdat) || new Date(),
        }));

        const proveedores = proveedoresRaw.map(p => ({ ...p, id: p.id || crypto.randomUUID(), createdAt: parseDate(p.createdat) || new Date() }));
        const conceptos = conceptosRaw.map(c => ({ ...c, id: c.id || crypto.randomUUID(), createdAt: parseDate(c.createdat) || new Date() }));
        const talleres = talleresRaw.map(t => ({ ...t, id: t.id || crypto.randomUUID(), createdAt: parseDate(t.createdat) || new Date() }));
        const vales = valesRaw.map(v => ({ ...v, id: v.id || crypto.randomUUID() }));
        const reminders = remindersRaw.map(r => ({ ...r, id: r.id || crypto.randomUUID() }));
        const customReports = customReportsRaw.map(cr => ({ ...cr, id: cr.id || crypto.randomUUID() }));
        const otrosIngresos = otrosIngresosRaw.map(oi => ({
            ...oi,
            id: oi.id || crypto.randomUUID(),
            fecha: parseDate(oi.fecha) || new Date(),
            importe: parseNumber(oi.importe)
        }));

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
            customReports,
            otrosIngresos
        };

        const stats = await restoreBackup(fullPayload, onProgress);
        return stats;

    } catch (error: any) {
        console.error("Error en restoreFromGoogleSheets:", error);
        throw new Error(`Error al restaurar desde Google Sheets: ${error.message}`);
    }
};
