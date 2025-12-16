// services/api.ts - Reimplemented using IndexedDB
import { addItem, getAllItems, getItem, deleteItem } from '../src/lib/indexedDB';

// Types (import from types.ts)
import type { CarreraVista, Gasto, Turno, Proveedor, Concepto, Taller, Reminder, Ajustes } from '../types';

// Helper functions to map data structures if needed (currently identity)

/** Carreras */
export async function getCarreras(): Promise<CarreraVista[]> {
    return getAllItems('carreras');
}

export async function getCarrera(id: string): Promise<CarreraVista | undefined> {
    return getItem<CarreraVista>('carreras', id);
}

export async function addCarrera(carrera: Omit<CarreraVista, 'id'> & { id?: string }): Promise<string> {
    const key = carrera.id ?? crypto.randomUUID();
    await addItem('carreras', key, { ...carrera, id: key });
    return key;
}

export async function updateCarrera(id: string, updates: Partial<CarreraVista>): Promise<void> {
    const existing = await getItem<CarreraVista>('carreras', id);
    if (!existing) throw new Error('Carrera not found');
    await addItem('carreras', id, { ...existing, ...updates });
}

export async function deleteCarrera(id: string): Promise<void> {
    await deleteItem('carreras', id);
}

export async function getCarrerasByDate(date: Date): Promise<CarreraVista[]> {
    const all = await getCarreras();
    const targetISO = date.toISOString().split('T')[0];
    return all.filter(c => {
        const cDate = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        return cDate.toISOString().split('T')[0] === targetISO;
    });
}

/** Gastos */
export async function getGastos(): Promise<Gasto[]> {
    return getAllItems('gastos');
}

export async function getGasto(id: string): Promise<Gasto | undefined> {
    return getItem<Gasto>('gastos', id);
}

export async function addGasto(gasto: Omit<Gasto, 'id'> & { id?: string }): Promise<string> {
    const key = gasto.id ?? crypto.randomUUID();
    await addItem('gastos', key, { ...gasto, id: key });
    return key;
}

export async function updateGasto(id: string, updates: Partial<Gasto>): Promise<void> {
    const existing = await getItem<Gasto>('gastos', id);
    if (!existing) throw new Error('Gasto not found');
    await addItem('gastos', id, { ...existing, ...updates });
}

export async function deleteGasto(id: string): Promise<void> {
    await deleteItem('gastos', id);
}

export async function getGastosByDate(date: Date): Promise<Gasto[]> {
    const all = await getGastos();
    const targetISO = date.toISOString().split('T')[0];
    return all.filter(g => {
        const gDate = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
        return gDate.toISOString().split('T')[0] === targetISO;
    });
}

/** Turnos */
export async function getTurnos(): Promise<Turno[]> {
    return getAllItems('turnos');
}

export async function getTurno(id: string): Promise<Turno | undefined> {
    return getItem<Turno>('turnos', id);
}

export async function addTurno(turno: Omit<Turno, 'id'> & { id?: string }): Promise<string> {
    const key = turno.id ?? crypto.randomUUID();
    // @ts-ignore - id is optional in input but required in Turno
    await addItem('turnos', key, { ...turno, id: key });
    return key;
}

export async function updateTurno(id: string, updates: Partial<Turno>): Promise<void> {
    const existing = await getItem<Turno>('turnos', id);
    if (!existing) throw new Error('Turno not found');
    await addItem('turnos', id, { ...existing, ...updates });
}

export async function deleteTurno(id: string): Promise<void> {
    await deleteItem('turnos', id);
}

export async function getTurnosByDate(date: Date): Promise<Turno[]> {
    const allTurnos = await getTurnos();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetISO = targetDate.toISOString().split('T')[0];

    return allTurnos.filter(t => {
        const tDate = new Date(t.fechaInicio);
        tDate.setHours(0, 0, 0, 0);
        return tDate.toISOString().split('T')[0] === targetISO;
    });
}

export async function getRecentTurnos(limit: number): Promise<Turno[]> {
    const allTurnos = await getTurnos();
    return allTurnos
        .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
        .slice(0, limit);
}

export async function getActiveTurno(): Promise<Turno | null> {
    const allTurnos = await getTurnos();
    return allTurnos.find(t => !t.fechaFin) || null;
}

/** Proveedores */
export async function getProveedores(): Promise<Proveedor[]> {
    return getAllItems('proveedores');
}

export async function addProveedor(proveedor: Omit<Proveedor, 'id'> & { id?: string }): Promise<string> {
    const key = proveedor.id ?? crypto.randomUUID();
    await addItem('proveedores', key, { ...proveedor, id: key });
    return key;
}

export async function deleteProveedor(id: string): Promise<void> {
    await deleteItem('proveedores', id);
}

/** Conceptos */
export async function getConceptos(): Promise<Concepto[]> {
    return getAllItems('conceptos');
}

export async function addConcepto(concepto: Omit<Concepto, 'id'> & { id?: string }): Promise<string> {
    const key = concepto.id ?? crypto.randomUUID();
    await addItem('conceptos', key, { ...concepto, id: key });
    return key;
}

/** Talleres */
export async function getTalleres(): Promise<Taller[]> {
    return getAllItems('talleres');
}

export async function addTaller(taller: Omit<Taller, 'id'> & { id?: string }): Promise<string> {
    const key = taller.id ?? crypto.randomUUID();
    await addItem('talleres', key, { ...taller, id: key });
    return key;
}

export async function closeTurno(id: string, kilometrosFin: number): Promise<void> {
    const turno = await getItem<Turno>('turnos', id);
    if (!turno) throw new Error('Turno no encontrado');

    const updatedTurno: Turno = {
        ...turno,
        fechaFin: new Date(),
        kilometrosFin
    };

    await addItem('turnos', id, updatedTurno);
}

/** Reminders */
export async function getReminders(): Promise<Reminder[]> {
    return getAllItems('reminders');
}

export async function addReminder(reminder: Reminder): Promise<string> {
    const key = reminder.id ?? crypto.randomUUID();
    await addItem('reminders', key, { ...reminder, id: key });
    return key;
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<void> {
    const existing = await getItem<Reminder>('reminders', id);
    if (!existing) throw new Error('Reminder not found');
    await addItem('reminders', id, { ...existing, ...updates });
}

export async function deleteReminder(id: string): Promise<void> {
    await deleteItem('reminders', id);
}

// ...
export function subscribeToReminders(callback: (reminders: Reminder[]) => void, errorCallback?: (error: any) => void): () => void {
    getReminders().then(callback).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });
    return () => { };
}

/** Subscriptions (Mock for Local DB) */
export function subscribeToActiveTurno(callback: (turno: Turno | null) => void, errorCallback?: (error: any) => void): () => void {
    getTurnos().then(turnos => {
        // Find open turno (no fechaFin)
        const active = turnos.find(t => !t.fechaFin) || null;
        callback(active);
    }).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });
    return () => { };
}

export function subscribeToCarreras(callback: (carreras: CarreraVista[]) => void, errorCallback?: (error: any) => void): () => void {
    getCarreras().then(callback).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });
    return () => { };
}

// ...
export function subscribeToGastos(callback: (total: number) => void, errorCallback?: (error: any) => void): () => void {
    getGastos().then(gastos => {
        const total = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
        callback(total);
    }).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });
    return () => { };
}

export async function getGastosByMonth(month: number, year: number): Promise<Gasto[]> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return getGastosByDateRange(start, end);
}

export async function getCarrerasByMonth(month: number, year: number): Promise<CarreraVista[]> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return getCarrerasByDateRange(start, end);
}

export async function getIngresosByYear(year: number): Promise<number[]> {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    const carreras = await getCarrerasByDateRange(start, end);

    const monthly = new Array(12).fill(0);
    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        const month = d.getMonth();
        monthly[month] += (c.cobrado || 0);
    });
    return monthly;
}

export async function getGastosByYear(year: number): Promise<number[]> {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    const gastos = await getGastosByDateRange(start, end);

    const monthly = new Array(12).fill(0);
    gastos.forEach(g => {
        const d = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
        const month = d.getMonth();
        monthly[month] += (g.importe || 0);
    });
    return monthly;
}

export async function getRecentCarreras(limit: number): Promise<CarreraVista[]> {
    const carreras = await getCarreras();
    return carreras
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
        .slice(0, limit);
}

export async function getTurnosByMonth(month: number, year: number): Promise<Turno[]> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Create a helper for turnos range if not exists, or inline
    const all = await getTurnos();
    return all.filter(t => {
        const d = new Date(t.fechaInicio);
        return d >= start && d <= end;
    });
}

export function subscribeToGastosByMonth(month: number, year: number, callback: (gastos: Gasto[]) => void, errorCallback?: (error: any) => void): () => void {
    getGastosByMonth(month, year).then(callback).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });
    return () => { };
}

/** Settings / Ajustes */
export async function getAjustes(): Promise<Ajustes | null> {
    const settings = await getItem<Ajustes>('settings', 'ajustes');
    return settings || null;
}

export async function saveAjustes(ajustes: any): Promise<void> {
    await addItem('settings', 'ajustes', { ...ajustes, key: 'ajustes' });
}

/** Break Configuration */
export async function getBreakConfiguration(): Promise<any> {
    const config = await getItem<any>('settings', 'breakConfig');
    return config || null;
}

export async function saveBreakConfiguration(config: any): Promise<void> {
    await addItem('settings', 'breakConfig', { ...config, key: 'breakConfig' });
}

/** Excepciones */
export interface Excepcion {
    id: string;
    fechaDesde: string | Date;
    fechaHasta: string | Date;
    tipo: string;
    nuevaLetra?: string;
    nota?: string;
    descripcion?: string;
    aplicaPar?: boolean;
    aplicaImpar?: boolean;
}

/** Vales Directory */
export interface ValeDirectoryEntry {
    id: string;
    empresa: string;
    codigoEmpresa: string;
    direccion?: string;
    telefono?: string;
}

export async function getValesDirectory(): Promise<ValeDirectoryEntry[]> {
    return getAllItems('vales');
}

export async function addValeDirectoryEntry(entry: Omit<ValeDirectoryEntry, 'id'> & { id?: string }): Promise<string> {
    const key = entry.id ?? crypto.randomUUID();
    await addItem('vales', key, { ...entry, id: key });
    return key;
}

export async function deleteValeDirectoryEntry(id: string): Promise<void> {
    await deleteItem('vales', id);
}

export async function getExcepciones(): Promise<Excepcion[]> {
    return getAllItems('excepciones');
}

export async function addExcepcion(excepcion: Omit<Excepcion, 'id'> & { id?: string }): Promise<string> {
    const key = excepcion.id ?? crypto.randomUUID();
    await addItem('excepciones', key, { ...excepcion, id: key });
    return key;
}

export async function updateExcepcion(id: string, updates: Partial<Excepcion>): Promise<void> {
    const existing = await getItem<Excepcion>('excepciones', id);
    if (!existing) throw new Error('Excepcion not found');
    await addItem('excepciones', id, { ...existing, ...updates });
}

export async function deleteExcepcion(id: string): Promise<void> {
    await deleteItem('excepciones', id);
}

export async function restoreExcepcion(excepcion: any): Promise<void> {
    await addItem('excepciones', excepcion.id, excepcion);
}

export async function isRestDay(date: Date): Promise<boolean> {
    // Simplified: Only check exceptions for now. 
    // Logic for letter-based rest days requires re-implementation.
    const excepciones = await getExcepciones();
    const dateStr = date.toISOString().split('T')[0];

    return excepciones.some((e: any) => {
        try {
            const eDate = e.fecha instanceof Date ? e.fecha : new Date(e.fecha);
            return eDate.toISOString().split('T')[0] === dateStr;
        } catch {
            return false;
        }
    });
}

/** Restore Functions (Wrappers) */
export async function restoreCarrera(carrera: any): Promise<void> {
    await addItem('carreras', carrera.id, carrera);
}
export async function restoreGasto(gasto: any): Promise<void> {
    await addItem('gastos', gasto.id, gasto);
}
export async function restoreTurno(turno: any): Promise<void> {
    await addItem('turnos', turno.id, turno);
}
export async function restoreProveedor(proveedor: any): Promise<void> {
    await addItem('proveedores', proveedor.id, proveedor);
}
export async function restoreConcepto(concepto: any): Promise<void> {
    await addItem('conceptos', concepto.id, concepto);
}
// ... existing code ...
export async function restoreTaller(taller: any): Promise<void> {
    await addItem('talleres', taller.id, taller);
}

/** Statistics Helpers */
export async function getIngresosForCurrentMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const carreras = await getCarrerasByDateRange(startOfMonth, endOfMonth);
    return carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
}

export async function getGastosForCurrentMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const gastos = await getGastosByDateRange(startOfMonth, endOfMonth);
    return gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
}

export async function getWorkingDays(startDate: Date, endDate: Date): Promise<Date[]> {
    const dayData: Set<string> = new Set();
    const cursor = new Date(startDate);

    // Naively iterate? Better to get all carreras and extract unique dates
    const allCarreras = await getCarreras();

    allCarreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        if (d >= startDate && d <= endDate) {
            dayData.add(d.toISOString().split('T')[0]);
        }
    });

    return Array.from(dayData).map(d => new Date(d));
}

// Duplicates removed

// Helper for ranges
async function getCarrerasByDateRange(start: Date, end: Date): Promise<CarreraVista[]> {
    const all = await getCarreras();
    return all.filter(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        return d >= start && d <= end;
    });
}

export interface DeleteProgress {
    percentage: number;
    message: string;
}

export async function deleteAllData(onProgress?: (progress: DeleteProgress) => void): Promise<void> {
    const stores = ['carreras', 'gastos', 'turnos', 'proveedores', 'conceptos', 'talleres', 'reminders', 'customReports', 'settings', 'excepciones', 'vales'];
    const total = stores.length;

    for (let i = 0; i < total; i++) {
        const storeName = stores[i];
        if (onProgress) {
            onProgress({
                percentage: Math.round((i / total) * 100),
                message: `Eliminando ${storeName}...`
            });
        }

        // We don't have clearStore in api.ts but we can implement it or use deleteItem in loop
        // But better to expose clearStore or just implement it here using existing primitives if possible
        // Actually, IndexedDB has clear() method on objectStore.
        // My library abstraction doesn't expose clearStore.
        // I should probably add clearStore to lib/indexedDB.ts or just iterate and delete.
        // For now, I'll naively get all keys and delete them.

        const items = await getAllItems(storeName);
        for (const item of items) {
            // Assuming items have 'id' or 'key'
            const key = (item as any).id || (item as any).key;
            if (key) await deleteItem(storeName, key);
        }
    }

    if (onProgress) {
        onProgress({ percentage: 100, message: 'Completado' });
    }
}

async function getGastosByDateRange(start: Date, end: Date): Promise<Gasto[]> {
    const all = await getGastos();
    return all.filter(g => {
        const d = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
        return d >= start && d <= end;
    });
}

/** Advanced Statistics Helpers */

export async function getIngresosByHour(startDate: Date, endDate: Date): Promise<number[]> {
    const carreras = await getCarrerasByDateRange(startDate, endDate);
    const hours = new Array(24).fill(0);
    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        hours[d.getHours()] += (c.cobrado || 0);
    });
    return hours;
}

export async function getIngresosByDayOfWeek(startDate: Date, endDate: Date): Promise<number[]> {
    // Average earnings per day of week
    const carreras = await getCarrerasByDateRange(startDate, endDate);
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);
    const uniqueDays = new Set<string>();

    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        // 0=Sunday, 1=Monday...
        dayTotals[d.getDay()] += (c.cobrado || 0);
        uniqueDays.add(d.toISOString().split('T')[0]);
    });

    // Count occurrences of each weekday in the unique days
    uniqueDays.forEach(dateStr => {
        const d = new Date(dateStr);
        dayCounts[d.getDay()]++;
    });

    return dayTotals.map((total, i) => dayCounts[i] > 0 ? total / dayCounts[i] : 0);
}

export async function getTotalIngresosByDayOfWeek(startDate: Date, endDate: Date): Promise<number[]> {
    const carreras = await getCarrerasByDateRange(startDate, endDate);
    const dayTotals = new Array(7).fill(0);
    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        dayTotals[d.getDay()] += (c.cobrado || 0);
    });
    return dayTotals;
}

export async function getIngresosByMonthYear(month: number, year: number): Promise<number> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const carreras = await getCarrerasByDateRange(start, end);
    return carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
}

export async function getGastosByMonthYear(month: number, year: number): Promise<number> {
    const gastos = await getGastosByMonth(month, year);
    return gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
}

export async function getTotalIngresosByYear(year: number): Promise<number> {
    const monthly = await getIngresosByYear(year);
    return monthly.reduce((sum, val) => sum + val, 0);
}

export async function getTotalGastosByYear(year: number): Promise<number> {
    const monthly = await getGastosByYear(year);
    return monthly.reduce((sum, val) => sum + val, 0);
}
