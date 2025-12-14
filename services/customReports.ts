import { db } from '../firebaseConfig';
import { ExportFilter } from './exports';

// @ts-ignore
declare const firebase: any;

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

const customReportsCollection = db.collection('customReports');

const docToCustomReport = (doc: any): CustomReport => {
    const data = doc.data();

    // Parse filters to ensure Dates are Dates (handling Firestore Timestamps)
    const filtros = data.filtros || {};
    if (filtros.fechaDesde && typeof filtros.fechaDesde.toDate === 'function') {
        filtros.fechaDesde = filtros.fechaDesde.toDate();
    } else if (filtros.fechaDesde && !(filtros.fechaDesde instanceof Date)) {
        // Fallback for strings
        filtros.fechaDesde = new Date(filtros.fechaDesde);
    }

    if (filtros.fechaHasta && typeof filtros.fechaHasta.toDate === 'function') {
        filtros.fechaHasta = filtros.fechaHasta.toDate();
    } else if (filtros.fechaHasta && !(filtros.fechaHasta instanceof Date)) {
        // Fallback for strings
        filtros.fechaHasta = new Date(filtros.fechaHasta);
    }

    return {
        id: doc.id,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        filtros: filtros,
        tipoExportacion: data.tipoExportacion || 'excel',
        agrupacion: data.agrupacion || 'ninguna',
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        lastUsed: data.lastUsed ? data.lastUsed.toDate() : undefined,
    };
};

/**
 * Guarda un reporte personalizado favorito
 */
export const saveCustomReport = async (report: Omit<CustomReport, 'id' | 'createdAt'>): Promise<string> => {
    const dataToAdd: any = {
        nombre: report.nombre,
        descripcion: report.descripcion || '',
        filtros: report.filtros,
        tipoExportacion: report.tipoExportacion,
        agrupacion: report.agrupacion || 'ninguna',
        // @ts-ignore
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await customReportsCollection.add(dataToAdd);
    return docRef.id;
};

/**
 * Obtiene todos los reportes personalizados guardados
 */
export const getCustomReports = async (): Promise<CustomReport[]> => {
    const snapshot = await customReportsCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(docToCustomReport);
};

/**
 * Actualiza un reporte personalizado
 */
export const updateCustomReport = async (id: string, updates: Partial<CustomReport>): Promise<void> => {
    const updateData: any = {};

    if (updates.nombre !== undefined) updateData.nombre = updates.nombre;
    if (updates.descripcion !== undefined) updateData.descripcion = updates.descripcion;
    if (updates.filtros !== undefined) updateData.filtros = updates.filtros;
    if (updates.tipoExportacion !== undefined) updateData.tipoExportacion = updates.tipoExportacion;
    if (updates.agrupacion !== undefined) updateData.agrupacion = updates.agrupacion;

    // @ts-ignore
    updateData.lastUsed = firebase.firestore.FieldValue.serverTimestamp();

    await customReportsCollection.doc(id).update(updateData);
};

/**
 * Elimina un reporte personalizado
 */
export const deleteCustomReport = async (id: string): Promise<void> => {
    await customReportsCollection.doc(id).delete();
};

/**
 * Marca un reporte como usado (actualiza lastUsed)
 */
export const markReportAsUsed = async (id: string): Promise<void> => {
    // @ts-ignore
    await customReportsCollection.doc(id).update({
        // @ts-ignore
        lastUsed: firebase.firestore.FieldValue.serverTimestamp(),
    });
};


