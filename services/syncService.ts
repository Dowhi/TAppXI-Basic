import {
    createSpreadsheetWithSheets,
    findSpreadsheetByName,
    appendValues,
    readSheetValues,
    updateValues,
    clearRange,
    addSheet,
    getSpreadsheetDetails
} from './google';
import {
    CarreraVista,
    Gasto,
    Turno,
    Proveedor,
    Concepto,
    Taller,
    Reminder,
    Ajustes
} from '../types';

const SPREADSHEET_NAME = 'TAppXI_DB';
const STORAGE_KEY_SPREADSHEET_ID = 'tappxi_google_sheet_id';

// Definición de hojas y encabezados
const SHEETS = {
    Carreras: {
        title: 'Carreras',
        headers: ['Fecha', 'Hora', 'Taxímetro', 'Cobrado', 'Forma Pago', 'Tipo', 'Emisora', 'Aeropuerto', 'Estación', 'Notas', 'ID Turno', 'ID']
    },
    Gastos: {
        title: 'Gastos',
        headers: ['Fecha', 'Concepto', 'Proveedor', 'Taller', 'Base', 'IVA %', 'IVA €', 'Total', 'Nº Factura', 'Forma Pago', 'Km', 'Notas', 'ID']
    },
    Incisos: { // Detalle Servicios
        title: 'Detalle_Servicios',
        headers: ['Gasto ID', 'Referencia', 'Descripción', 'Importe', 'Cantidad', 'Desc. %', 'ID']
    },
    Turnos: {
        title: 'Turnos',
        headers: ['Fecha Inicio', 'Hora Inicio', 'Km Inicio', 'Fecha Fin', 'Hora Fin', 'Km Fin', 'Km Recorridos', 'ID']
    },
    Proveedores: {
        title: 'Proveedores',
        headers: ['Nombre', 'NIF', 'Dirección', 'Teléfono', 'ID']
    },
    Conceptos: {
        title: 'Conceptos',
        headers: ['Nombre', 'Descripción', 'Categoría', 'ID']
    },
    Talleres: {
        title: 'Talleres',
        headers: ['Nombre', 'NIF', 'Dirección', 'Teléfono', 'ID']
    },
    Recordatorios: {
        title: 'Recordatorios',
        headers: ['Título', 'Tipo', 'Fecha Límite', 'Km Límite', 'Estado', 'ID']
    },
    Excepciones: {
        title: 'Excepciones',
        headers: ['Fecha Desde', 'Fecha Hasta', 'Tipo', 'Nueva Letra', 'Nota', 'Descripcion', 'ID']
    },
    Vales: {
        title: 'Directorio_Vales',
        headers: ['Empresa', 'Código', 'Dirección', 'Teléfono', 'ID']
    },
    Informes: {
        title: 'Informes_Personalizados',
        headers: ['Nombre', 'Configuración (JSON)', 'ID']
    },
    Ajustes: {
        title: 'Ajustes',
        headers: ['Clave', 'Valor']
    },
    OtrosIngresos: {
        title: 'Otros_Ingresos',
        headers: ['Fecha', 'Concepto', 'Importe', 'Forma Pago', 'Notas', 'ID']
    },
    Vales_Carreras: {
        title: 'Vales_Carreras',
        headers: ['ID Carrera', 'Empresa', 'Código', 'Despacho', 'Albarán', 'Autoriza', 'ID']
    }
};

class SyncService {
    private spreadsheetId: string | null = null;
    private initialized = false;

    constructor() {
        this.spreadsheetId = localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID);
    }

    /**
     * Inicializa la conexión con Google Sheets
     * Busca la hoja o crea una nueva si no existe
     */
    async init(): Promise<string> {
        if (this.initialized && this.spreadsheetId) return this.spreadsheetId;

        try {
            // 1. Intentar buscar por ID guardado (validar si existe)
            if (this.spreadsheetId) {
                try {
                    await getSpreadsheetDetails(this.spreadsheetId);
                    this.initialized = true;
                    // Asegurar que existan todas las pestañas (por si se agregaron nuevas en updates)
                    await this.ensureSheetsExist();
                    return this.spreadsheetId;
                } catch (e) {
                    console.log("Cached Spreadsheet ID is invalid or inaccessible.");
                    this.spreadsheetId = null;
                    localStorage.removeItem(STORAGE_KEY_SPREADSHEET_ID);
                }
            }

            // 2. Buscar por nombre
            const existing = await findSpreadsheetByName(SPREADSHEET_NAME);
            if (existing) {
                this.spreadsheetId = existing.id;
                this.initialized = true;
                localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, existing.id);
                // Asegurar que existan todas las pestañas
                await this.ensureSheetsExist();
                return this.spreadsheetId;
            }

            // 3. Crear nueva
            const sheetTitles = Object.values(SHEETS).map(s => s.title);
            const result = await createSpreadsheetWithSheets(SPREADSHEET_NAME, sheetTitles);
            this.spreadsheetId = result.spreadsheetId;
            localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, this.spreadsheetId);
            this.initialized = true;

            // 4. Escribir encabezados en la nueva hoja
            await this.writeHeaders();

            return this.spreadsheetId;
        } catch (error) {
            console.error("Error initializing SyncService:", error);
            throw error;
        }
    }

    private async ensureSheetsExist() {
        if (!this.spreadsheetId) return;
        // Obtenemos las hojas actuales y añadimos las que falten
        const details = await getSpreadsheetDetails(this.spreadsheetId);
        const existingTitles = details.sheets.map((s: any) => s.properties.title);

        for (const sheetDef of Object.values(SHEETS)) {
            if (!existingTitles.includes(sheetDef.title)) {
                await addSheet(this.spreadsheetId, sheetDef.title);
                // Escribir headers para la nueva hoja
                await appendValues(this.spreadsheetId, `${sheetDef.title}!A1`, [sheetDef.headers]);
            }
        }
    }

    private async writeHeaders() {
        if (!this.spreadsheetId) return;
        for (const sheetDef of Object.values(SHEETS)) {
            await appendValues(this.spreadsheetId, `${sheetDef.title}!A1`, [sheetDef.headers]);
        }
    }

    /**
     * Sincroniza (Create) una entidad
     */
    async create(collection: keyof typeof SHEETS, data: any): Promise<void> {
        try {
            await this.init();
            if (!this.spreadsheetId) return;

            const sheetDef = SHEETS[collection];
            const row = this.mapDataToRow(collection, data);
            await appendValues(this.spreadsheetId, sheetDef.title, [row]);
        } catch (e) {
            console.error(`Sync Create Error (${collection}):`, e);
            // No propagar error para no detener la app local offline
        }
    }

    /**
     * Sincroniza (Update) una entidad
     * Requiere buscar la fila por ID primero
     */
    async update(collection: keyof typeof SHEETS, data: any): Promise<void> {
        try {
            await this.init();
            if (!this.spreadsheetId) return;

            const sheetDef = SHEETS[collection];
            const id = data.id || data.clave; // Ajustes usa 'clave' como pseudo-id
            if (!id) return;

            const rowIndex = await this.findRowIndexById(sheetDef.title, id);

            if (rowIndex !== -1) {
                const row = this.mapDataToRow(collection, data);
                // A1 notation: Sheet!A{row}
                const range = `${sheetDef.title}!A${rowIndex}`;
                await updateValues(this.spreadsheetId, range, [row]);
            } else {
                // Si no existe, lo creamos
                await this.create(collection, data);
            }

        } catch (e) {
            console.error(`Sync Update Error (${collection}):`, e);
        }
    }

    /**
     * Sincroniza (Delete) una entidad
     */
    async delete(collection: keyof typeof SHEETS, id: string): Promise<void> {
        try {
            await this.init();
            if (!this.spreadsheetId) return;

            const sheetDef = SHEETS[collection];
            const rowIndex = await this.findRowIndexById(sheetDef.title, id);

            if (rowIndex !== -1) {
                // Borrar contenido (dejando la fila vacía para no romper índices complejos si los hubiera, 
                // o podríamos usar deleteDimension pero es más complejo de implementar con raw API)
                // updateValues con strings vacíos es lo más seguro y simple
                const emptyRow = new Array(sheetDef.headers.length).fill("");
                const range = `${sheetDef.title}!A${rowIndex}`;
                await updateValues(this.spreadsheetId, range, [emptyRow]);
            }
        } catch (e) {
            console.error(`Sync Delete Error (${collection}):`, e);
        }
    }

    /**
     * Sube TODOS los datos locales a la hoja de cálculo.
     * Útil para sincronización inicial o "Force Sync".
     */
    async uploadAllData(
        carreras: any[],
        gastos: any[],
        turnos: any[],
        proveedores: any[],
        conceptos: any[],
        talleres: any[],
        recordatorios: any[],
        ajustes: any,
        excepciones: any[],
        vales: any[],
        informes: any[],
        breakConfig: any,
        otrosIngresos: any[]
    ): Promise<string | null> {
        try {
            await this.init();
            if (!this.spreadsheetId) return null;

            // 1. Crear filas para cada colección
            const carrerasRows = carreras.map(c => this.mapDataToRow('Carreras', c));
            const gastosRows = gastos.map(g => this.mapDataToRow('Gastos', g));
            const turnosRows = turnos.map(t => this.mapDataToRow('Turnos', t));
            const proveedoresRows = proveedores.map(p => this.mapDataToRow('Proveedores', p));
            const conceptosRows = conceptos.map(c => this.mapDataToRow('Conceptos', c));
            const talleresRows = talleres.map(t => this.mapDataToRow('Talleres', t));
            const recordatoriosRows = recordatorios.map(r => this.mapDataToRow('Recordatorios', r));
            const excepcionesRows = excepciones.map(e => this.mapDataToRow('Excepciones', e));
            const valesRows = vales.map(v => this.mapDataToRow('Vales', v));
            const informesRows = informes.map(i => this.mapDataToRow('Informes', i));
            const otrosIngresosRows = otrosIngresos.map(oi => this.mapDataToRow('OtrosIngresos', oi));

            // Vales_Carreras: Extraer de carreras
            const valesCarrerasRows: any[] = [];
            carreras.forEach(c => {
                if (c.formaPago === 'Vales' && c.valeInfo) {
                    valesCarrerasRows.push(this.mapDataToRow('Vales_Carreras', { ...c.valeInfo, carreraId: c.id, id: crypto.randomUUID() }));
                }
            });

            // Ajustes: Merge ajustes generales + breakConfig
            const allAjustes = { ...(ajustes || {}) };
            if (breakConfig) {
                allAjustes['breakConfiguration'] = breakConfig;
            }

            const ajustesRows = Object.entries(allAjustes).map(([key, value]) =>
                this.mapDataToRow('Ajustes', { clave: key, valor: value })
            );

            // Detalle Servicios (extraer de gastos)
            const serviciosRows: any[] = [];
            gastos.forEach(g => {
                if (g.servicios && Array.isArray(g.servicios)) {
                    g.servicios.forEach((s: any) => {
                        serviciosRows.push(this.mapDataToRow('Incisos', { ...s, gastoId: g.id, id: s.id || crypto.randomUUID() }));
                    });
                }
            });

            // 2. Limpiar hojas (para evitar duplicados al subir todo)
            // PRECAUCIÓN: Esto borra todo lo que haya en la nube y lo reemplaza con lo local.
            await clearRange(this.spreadsheetId, `${SHEETS.Carreras.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Gastos.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Incisos.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Turnos.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Proveedores.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Conceptos.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Talleres.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Recordatorios.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Excepciones.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Vales.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Informes.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Ajustes.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.OtrosIngresos.title}!A2:Z`);
            await clearRange(this.spreadsheetId, `${SHEETS.Vales_Carreras.title}!A2:Z`);

            // 2.5 Asegurar que los headers estén actualizados (por si cambiaron)
            for (const sheetDef of Object.values(SHEETS)) {
                await updateValues(this.spreadsheetId, `${sheetDef.title}!A1`, [sheetDef.headers]);
            }

            // 3. Subir en batch (appendValues)
            if (carrerasRows.length) await appendValues(this.spreadsheetId, SHEETS.Carreras.title, carrerasRows);
            if (gastosRows.length) await appendValues(this.spreadsheetId, SHEETS.Gastos.title, gastosRows);
            if (serviciosRows.length) await appendValues(this.spreadsheetId, SHEETS.Incisos.title, serviciosRows);
            if (turnosRows.length) await appendValues(this.spreadsheetId, SHEETS.Turnos.title, turnosRows);
            if (proveedoresRows.length) await appendValues(this.spreadsheetId, SHEETS.Proveedores.title, proveedoresRows);
            if (conceptosRows.length) await appendValues(this.spreadsheetId, SHEETS.Conceptos.title, conceptosRows);
            if (talleresRows.length) await appendValues(this.spreadsheetId, SHEETS.Talleres.title, talleresRows);
            if (recordatoriosRows.length) await appendValues(this.spreadsheetId, SHEETS.Recordatorios.title, recordatoriosRows);
            if (excepcionesRows.length) await appendValues(this.spreadsheetId, SHEETS.Excepciones.title, excepcionesRows);
            if (valesRows.length) await appendValues(this.spreadsheetId, SHEETS.Vales.title, valesRows);
            if (informesRows.length) await appendValues(this.spreadsheetId, SHEETS.Informes.title, informesRows);
            if (ajustesRows.length) await appendValues(this.spreadsheetId, SHEETS.Ajustes.title, ajustesRows);
            if (otrosIngresosRows.length) await appendValues(this.spreadsheetId, SHEETS.OtrosIngresos.title, otrosIngresosRows);
            if (valesCarrerasRows.length) await appendValues(this.spreadsheetId, SHEETS.Vales_Carreras.title, valesCarrerasRows);

            console.log("Upload All Data Completed Successfully");
            return this.spreadsheetId;

        } catch (e: any) {
            console.error("Error in uploadAllData:", e);

            // Retry logic for 404/Invalid Spreadsheet
            // Try to detect if error is related to authentication or missing sheet
            // typically error.result.error.code === 404 or similar
            // For now, retry once for ANY error if it looks like a sync failure and we haven't retried yet.
            // But we need a flag. Let's assume if we are here, we might want to try re-initializing.

            // Checking if we already retried? 
            // We can't easily pass a flag without changing signature exposed to API.
            // Let's modify init to verify? No, too slow.

            // Let's check if we can simply reset and throw, and let the USER try again?
            // "Pulso el boton... ahora no me la crea". The user is trying again manually.
            // If they try again manually, `this.initialized` is still true in the JS memory!
            // So we MUST reset `this.initialized = false` on error here.

            this.initialized = false;
            this.spreadsheetId = null;
            localStorage.removeItem(STORAGE_KEY_SPREADSHEET_ID);

            // If the user presses the button AGAIN after this failure, it will work because init() will be forced.
            // But we can also auto-retry once here for better UX.
            // Let's NOT auto-retry recursively to avoid infinite loops without a counter, 
            // UNLESS we are sure it's a auth/missing error.
            // Safe bet: just reset state so NEXT click works.

            // Wait, if I reset state, the current call fails. The user sees "Error".
            // Then they click again -> Works.
            // Can we make it work on the FIRST click?
            // Yes, if we retry internally.

            // To do that safely without recursion param in interface:
            // Break logic into `private async _performUpload(...)`.
            // But that's a big refactor.

            // Minimal fix: Reset state on error. User might need to click twice?
            // "no me la crea de nuevo" implies they might have tried multiple times? 
            // If the app wasn't reloaded, `initialized` is true. 
            // Resetting it here is crucial.

            throw e;
        }
    }

    // --- Helpers ---

    private async findRowIndexById(sheetTitle: string, id: string): Promise<number> {
        if (!this.spreadsheetId) return -1;

        // TODO: Optimizar esto leyendo columnas específicas o cacheando
        // Leemos TODA la hoja. Para producción masiva esto es lento, pero para un taxi ( < 5000 filas/año) es aceptable.
        const values = await readSheetValues(this.spreadsheetId, sheetTitle);

        // Asumimos que el ID siempre es la ÚLTIMA columna definida en los headers
        // Ajustes es especial (key based), resto son ID based
        const isAjustes = sheetTitle === SHEETS.Ajustes.title;
        const idColIndex = isAjustes ? 0 : values[0]?.length - 1; // Ajustes Clave es col 0, Entities ID es col final

        if (idColIndex < 0) return -1;

        // Empezamos en 1 para saltar header
        for (let i = 1; i < values.length; i++) {
            if (values[i][idColIndex] === id) {
                return i + 1; // 1-based index para Sheets
            }
        }
        return -1;
    }

    private mapDataToRow(collection: keyof typeof SHEETS, data: any): any[] {
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

        switch (collection) {
            case 'Carreras':
                const c = data as CarreraVista;
                return [
                    fmtDate(c.fechaHora),
                    fmtTime(c.fechaHora),
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
                ];
            case 'Gastos':
                const g = data as Gasto;
                return [
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
                ];
            case 'Incisos': // Detalle Servicios
                // Este es un caso especial, data es un objeto del array servicios { ...servicio, gastoId, id }
                return [
                    data.gastoId,
                    data.referencia || '',
                    data.descripcion || '',
                    data.importe || 0,
                    data.cantidad || 1,
                    data.descuentoPorcentaje || 0,
                    data.id || crypto.randomUUID()
                ];
            case 'Turnos':
                const t = data as Turno;
                const kmRec = (t.kilometrosFin && t.kilometrosInicio) ? t.kilometrosFin - t.kilometrosInicio : '';
                return [
                    fmtDate(t.fechaInicio),
                    fmtTime(t.fechaInicio),
                    t.kilometrosInicio,
                    t.fechaFin ? fmtDate(t.fechaFin) : '',
                    t.fechaFin ? fmtTime(t.fechaFin) : '',
                    t.kilometrosFin || '',
                    kmRec,
                    t.id
                ];
            case 'Proveedores':
            case 'Talleres':
                const p = data as Proveedor | Taller;
                return [p.nombre, p.nif || '', p.direccion || '', p.telefono || '', p.id];
            case 'Conceptos':
                const co = data as Concepto;
                return [co.nombre, co.descripcion || '', co.categoria || '', co.id];
            case 'Recordatorios':
                const r = data as Reminder;
                return [r.titulo, r.tipo, r.fechaLimite, r.kilometrosLimite || '', r.completado ? 'Completado' : 'Pendiente', r.id];
            case 'Excepciones':
                // 'Fecha Desde', 'Fecha Hasta', 'Tipo', 'Nueva Letra', 'Nota', 'Descripcion', 'ID'
                return [fmtDate(data.fechaDesde), fmtDate(data.fechaHasta), data.tipo, data.nuevaLetra || '', data.nota || '', data.descripcion || '', data.id];
            case 'Vales':
                // 'Empresa', 'Código', 'Dirección', 'Teléfono', 'ID'
                return [data.empresa, data.codigoEmpresa, data.direccion || '', data.telefono || '', data.id];
            case 'Informes':
                // 'Nombre', 'Configuración (JSON)', 'ID'
                // data is CustomReport { nombre, descripcion, filtros, ... }
                const config = {
                    descripcion: data.descripcion,
                    filtros: data.filtros,
                    tipoExportacion: data.tipoExportacion,
                    agrupacion: data.agrupacion,
                    createdAt: data.createdAt,
                    lastUsed: data.lastUsed
                };
                return [data.nombre, JSON.stringify(config), data.id];
            case 'Ajustes':
                // data es { clave, valor }
                return [data.clave, JSON.stringify(data.valor)];
            case 'OtrosIngresos':
                return [
                    fmtDate(data.fecha),
                    data.concepto || '',
                    data.importe || 0,
                    data.formaPago || '',
                    data.notas || '',
                    data.id
                ];
            case 'Vales_Carreras':
                return [
                    data.carreraId,
                    data.empresa || '',
                    data.codigoEmpresa || '',
                    data.despacho || '',
                    data.numeroAlbaran || '',
                    data.autoriza || '',
                    data.id || crypto.randomUUID()
                ];
            default:
                return [];
        }
    }
}

export const syncService = new SyncService();
