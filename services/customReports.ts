import { addItem, getAllItems, getItem, deleteItem } from '../src/lib/indexedDB';
import type { ExportFilter } from './exports';

export interface CustomReport {
    id: string;
    nombre: string;
    descripcion?: string;
    filtros: ExportFilter;
    tipoExportacion: 'excel' | 'pdf' | 'csv';
    agrupacion?: 'dia' | 'semana' | 'mes' | 'año' | 'ninguna';
    createdAt: Date;
    lastUsed?: Date;
}


/** IndexedDB store name for custom reports */
const STORE_NAME = 'customReports';

/** Helper to map stored data to CustomReport */
function mapToCustomReport(data: any): CustomReport {
    return {
        id: data.id,
        nombre: data.nombre,
        descripcion: data.descripcion ?? '',
        filtros: data.filtros ?? {},
        tipoExportacion: data.tipoExportacion ?? 'excel',
        agrupacion: data.agrupacion ?? 'ninguna',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        lastUsed: data.lastUsed ? new Date(data.lastUsed) : undefined,
    };
}

export const saveCustomReport = async (report: Omit<CustomReport, 'id' | 'createdAt'>): Promise<string> => {
    const id = crypto.randomUUID();
    const data = {
        id,
        ...report,
        createdAt: new Date().toISOString(),
        lastUsed: undefined,
    };
    await addItem(STORE_NAME, id, data);
    return id;
};

export const getCustomReports = async (): Promise<CustomReport[]> => {
    const items = await getAllItems(STORE_NAME);
    return items.map(mapToCustomReport);
};

export const updateCustomReport = async (id: string, updates: Partial<CustomReport>): Promise<void> => {
    const existing = await getItem<CustomReport>(STORE_NAME, id);
    if (!existing) throw new Error('CustomReport not found');
    const merged = { ...existing, ...updates, lastUsed: new Date().toISOString() };
    await addItem(STORE_NAME, id, merged);
};

export const deleteCustomReport = async (id: string): Promise<void> => {
    await deleteItem(STORE_NAME, id);
};

export const markReportAsUsed = async (id: string): Promise<void> => {
    const existing = await getItem<CustomReport>(STORE_NAME, id);
    if (!existing) throw new Error('CustomReport not found');
    const updated = { ...existing, lastUsed: new Date().toISOString() };
    await addItem(STORE_NAME, id, updated);
};


