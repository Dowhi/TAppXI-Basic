// services/api.ts - Reimplemented using IndexedDB
import { addItem, getAllItems, getItem, deleteItem, clearStore } from '../src/lib/indexedDB';
import { syncService } from './syncService';

// Types (import from types.ts)
import type { CarreraVista, Gasto, Turno, Proveedor, Concepto, Taller, Reminder, Ajustes, OtroIngreso } from '../types';
import { getCustomReports } from './customReports';

/** General DB operations */
export async function clearAllData(): Promise<void> {
    const stores: (any)[] = [
        'carreras', 'gastos', 'turnos', 'proveedores', 'conceptos',
        'talleres', 'reminders', 'customReports', 'excepciones', 'vales', 'otrosIngresos'
    ];
    for (const store of stores) {
        await clearStore(store);
    }
}

/** Carreras */
export async function getCarreras(): Promise<CarreraVista[]> {
    const carreras = await getAllItems<CarreraVista>('carreras');
    // Normalizar valores booleanos para carreras antiguas que no tienen estos campos
    return carreras.map(c => ({
        ...c,
        emisora: c.emisora === true,
        aeropuerto: c.aeropuerto === true,
        estacion: c.estacion === true
    }));
}

export async function getCarrera(id: string): Promise<CarreraVista | undefined> {
    return getItem<CarreraVista>('carreras', id);
}

export async function addCarrera(carrera: Omit<CarreraVista, 'id'> & { id?: string }): Promise<string> {
    const key = carrera.id ?? crypto.randomUUID();
    await addItem('carreras', key, { ...carrera, id: key });
    syncService.create('Carreras', { ...carrera, id: key });
    return key;
}

export async function updateCarrera(id: string, updates: Partial<CarreraVista>): Promise<void> {
    const existing = await getItem<CarreraVista>('carreras', id);
    if (!existing) throw new Error('Carrera not found');
    const updated = { ...existing, ...updates };
    await addItem('carreras', id, updated);
    syncService.update('Carreras', updated);
}

export async function deleteCarrera(id: string): Promise<void> {
    await deleteItem('carreras', id);
    syncService.delete('Carreras', id);
}

export async function getCarrerasByDate(date: Date): Promise<CarreraVista[]> {
    const all = await getCarreras();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return all.filter(c => {
        const cDate = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        return cDate >= startOfDay && cDate <= endOfDay;
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

    // Sync Gasto
    const fullGasto = { ...gasto, id: key };
    syncService.create('Gastos', fullGasto);

    // Sync Servicios (Nested)
    if (gasto.servicios && gasto.servicios.length > 0) {
        gasto.servicios.forEach(s => {
            syncService.create('Incisos', { ...s, gastoId: key, id: crypto.randomUUID() });
        });
    }

    return key;
}

export async function updateGasto(id: string, updates: Partial<Gasto>): Promise<void> {
    const existing = await getItem<Gasto>('gastos', id);
    if (!existing) throw new Error('Gasto not found');
    const updated = { ...existing, ...updates };
    await addItem('gastos', id, updated);

    syncService.update('Gastos', updated);
}

export async function deleteGasto(id: string): Promise<void> {
    await deleteItem('gastos', id);
    syncService.delete('Gastos', id);
}

export async function getGastosByDate(date: Date): Promise<Gasto[]> {
    const all = await getGastos();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return all.filter(g => {
        const gDate = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
        return gDate >= startOfDay && gDate <= endOfDay;
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
    await addItem('turnos', key, { ...turno, id: key });
    syncService.create('Turnos', { ...turno, id: key });
    return key;
}

export async function updateTurno(id: string, updates: Partial<Turno>): Promise<void> {
    const existing = await getItem<Turno>('turnos', id);
    if (!existing) throw new Error('Turno not found');
    await addItem('turnos', id, { ...existing, ...updates });
}

export async function deleteTurno(id: string): Promise<void> {
    await deleteItem('turnos', id);
    syncService.delete('Turnos', id);
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
    syncService.create('Proveedores', { ...proveedor, id: key });
    return key;
}

export async function updateProveedor(id: string, updates: Partial<Proveedor>): Promise<void> {
    const existing = await getItem<Proveedor>('proveedores', id);
    if (!existing) throw new Error('Proveedor not found');
    const updated = { ...existing, ...updates };
    await addItem('proveedores', id, updated);
    syncService.update('Proveedores', updated);
}

export async function deleteProveedor(id: string): Promise<void> {
    await deleteItem('proveedores', id);
    syncService.delete('Proveedores', id);
}

/** Conceptos */
export async function getConceptos(): Promise<Concepto[]> {
    return getAllItems('conceptos');
}

export async function addConcepto(concepto: Omit<Concepto, 'id'> & { id?: string }): Promise<string> {
    const key = concepto.id ?? crypto.randomUUID();
    await addItem('conceptos', key, { ...concepto, id: key });
    syncService.create('Conceptos', { ...concepto, id: key });
    return key;
}

export async function updateConcepto(id: string, updates: Partial<Concepto>): Promise<void> {
    const existing = await getItem<Concepto>('conceptos', id);
    if (!existing) throw new Error('Concepto not found');
    const updated = { ...existing, ...updates };
    await addItem('conceptos', id, updated);
    syncService.update('Conceptos', updated);
}

export async function deleteConcepto(id: string): Promise<void> {
    await deleteItem('conceptos', id);
    syncService.delete('Conceptos', id);
}
export async function getTalleres(): Promise<Taller[]> {
    return getAllItems('talleres');
}

export async function addTaller(taller: Omit<Taller, 'id'> & { id?: string }): Promise<string> {
    const key = taller.id ?? crypto.randomUUID();
    await addItem('talleres', key, { ...taller, id: key });
    syncService.create('Talleres', { ...taller, id: key });
    return key;
}

export async function updateTaller(id: string, updates: Partial<Taller>): Promise<void> {
    const existing = await getItem<Taller>('talleres', id);
    if (!existing) throw new Error('Taller not found');
    const updated = { ...existing, ...updates };
    await addItem('talleres', id, updated);
    syncService.update('Talleres', updated);
}

export async function deleteTaller(id: string): Promise<void> {
    await deleteItem('talleres', id);
    syncService.delete('Talleres', id);
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
    syncService.update('Turnos', updatedTurno);
}

/** Reminders */
export async function getReminders(): Promise<Reminder[]> {
    return getAllItems('reminders');
}

export async function addReminder(reminder: Reminder): Promise<string> {
    const key = reminder.id ?? crypto.randomUUID();
    await addItem('reminders', key, { ...reminder, id: key });
    syncService.create('Recordatorios', { ...reminder, id: key });
    return key;
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<void> {
    const existing = await getItem<Reminder>('reminders', id);
    if (!existing) throw new Error('Reminder not found');
    const updated = { ...existing, ...updates };
    await addItem('reminders', id, updated);
    syncService.update('Recordatorios', updated);
}

export async function deleteReminder(id: string): Promise<void> {
    await deleteItem('reminders', id);
    syncService.delete('Recordatorios', id);
}

/** Otros Ingresos */
export async function getOtrosIngresos(): Promise<OtroIngreso[]> {
    return getAllItems('otrosIngresos');
}

export async function getOtroIngreso(id: string): Promise<OtroIngreso | undefined> {
    return getItem<OtroIngreso>('otrosIngresos', id);
}

export async function addOtroIngreso(entry: Omit<OtroIngreso, 'id'> & { id?: string }): Promise<string> {
    const key = entry.id ?? crypto.randomUUID();
    await addItem('otrosIngresos', key, { ...entry, id: key });
    syncService.create('OtrosIngresos', { ...entry, id: key });
    return key;
}

export async function updateOtroIngreso(id: string, updates: Partial<OtroIngreso>): Promise<void> {
    const existing = await getItem<OtroIngreso>('otrosIngresos', id);
    if (!existing) throw new Error('OtroIngreso not found');
    const updated = { ...existing, ...updates };
    await addItem('otrosIngresos', id, updated);
    syncService.update('OtrosIngresos', updated);
}

export async function deleteOtroIngreso(id: string): Promise<void> {
    await deleteItem('otrosIngresos', id);
    syncService.delete('OtrosIngresos', id);
}

export async function getOtrosIngresosByDateRange(start: Date, end: Date): Promise<OtroIngreso[]> {
    const all = await getOtrosIngresos();
    return all.filter(oi => {
        const d = oi.fecha instanceof Date ? oi.fecha : new Date(oi.fecha);
        return d >= start && d <= end;
    });
}

export async function restoreOtroIngreso(entry: any, skipSync = false): Promise<void> {
    await addItem('otrosIngresos', entry.id, entry);
    if (!skipSync) syncService.create('OtrosIngresos', { ...entry, id: entry.id });
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
    const [carreras, otros] = await Promise.all([
        getCarrerasByDateRange(start, end),
        getOtrosIngresosByDateRange(start, end)
    ]);

    const monthly = new Array(12).fill(0);
    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        const month = d.getMonth();
        const carreraYear = d.getFullYear();

        // Debug logging for Nov/Dec
        if (year === 2025 && (month === 10 || month === 11)) {
            console.log(`Carrera encontrada: ${d.toISOString()}, Año: ${carreraYear}, Mes: ${month}, Cobrado: ${c.cobrado}`);
        }

        monthly[month] += (c.cobrado || 0);
    });
    otros.forEach(oi => {
        const d = oi.fecha instanceof Date ? oi.fecha : new Date(oi.fecha);
        const month = d.getMonth();
        monthly[month] += (oi.importe || 0);
    });

    // Debug summary
    if (year === 2025) {
        console.log('Resumen 2025 - Nov:', monthly[10], 'Dic:', monthly[11]);
    }

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

export async function saveAjustes(ajustes: any, skipSync = false): Promise<void> {
    await addItem('settings', 'ajustes', { ...ajustes, key: 'ajustes' });
    if (!skipSync) {
        // Sync each setting key individually
        for (const [key, value] of Object.entries(ajustes)) {
            syncService.update('Ajustes', { clave: key, valor: value });
        }
    }
}

/** Break Configuration */
export async function getBreakConfiguration(): Promise<any> {
    const config = await getItem<any>('settings', 'breakConfig');
    return config || null;
}

export async function saveBreakConfiguration(config: any, skipSync = false): Promise<void> {
    await addItem('settings', 'breakConfig', { ...config, key: 'breakConfig' });
    if (!skipSync) syncService.update('Ajustes', { clave: 'breakConfiguration', valor: config });
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
    syncService.create('Vales', { ...entry, id: key });
    return key;
}

export async function updateValeDirectoryEntry(id: string, updates: Partial<ValeDirectoryEntry>): Promise<void> {
    const existing = await getItem<ValeDirectoryEntry>('vales', id);
    if (!existing) throw new Error('Vale directory entry not found');
    const updated = { ...existing, ...updates };
    await addItem('vales', id, updated);
    syncService.update('Vales', updated);
}

export async function deleteValeDirectoryEntry(id: string): Promise<void> {
    await deleteItem('vales', id);
    syncService.delete('Vales', id);
}

export async function getExcepciones(): Promise<Excepcion[]> {
    return getAllItems('excepciones');
}

export async function addExcepcion(excepcion: Omit<Excepcion, 'id'> & { id?: string }): Promise<string> {
    const key = excepcion.id ?? crypto.randomUUID();
    await addItem('excepciones', key, { ...excepcion, id: key });
    syncService.create('Excepciones', { ...excepcion, id: key });
    return key;
}

export async function updateExcepcion(id: string, updates: Partial<Excepcion>): Promise<void> {
    const existing = await getItem<Excepcion>('excepciones', id);
    if (!existing) throw new Error('Excepcion not found');
    const updated = { ...existing, ...updates };
    await addItem('excepciones', id, updated);
    syncService.update('Excepciones', updated);
}

export async function deleteExcepcion(id: string): Promise<void> {
    await deleteItem('excepciones', id);
    syncService.delete('Excepciones', id);
}

export async function restoreExcepcion(excepcion: any, skipSync = false): Promise<void> {
    await addItem('excepciones', excepcion.id, excepcion);
    if (!skipSync) syncService.create('Excepciones', { ...excepcion, id: excepcion.id });
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
export async function restoreCarrera(carrera: any, skipSync = false): Promise<void> {
    await addItem('carreras', carrera.id, carrera);
    if (!skipSync) syncService.create('Carreras', { ...carrera, id: carrera.id });
}
export async function restoreGasto(gasto: any, skipSync = false): Promise<void> {
    await addItem('gastos', gasto.id, gasto);
    if (!skipSync) {
        // Sync Gasto
        syncService.create('Gastos', { ...gasto, id: gasto.id });
        // Sync Servicios (Nested)
        if (gasto.servicios && gasto.servicios.length > 0) {
            gasto.servicios.forEach((s: any) => {
                syncService.create('Incisos', { ...s, gastoId: gasto.id, id: s.id || crypto.randomUUID() });
            });
        }
    }
}
export async function restoreTurno(turno: any, skipSync = false): Promise<void> {
    await addItem('turnos', turno.id, turno);
    if (!skipSync) syncService.create('Turnos', { ...turno, id: turno.id });
}
export async function restoreProveedor(proveedor: any, skipSync = false): Promise<void> {
    await addItem('proveedores', proveedor.id, proveedor);
    if (!skipSync) syncService.create('Proveedores', { ...proveedor, id: proveedor.id });
}
export async function restoreConcepto(concepto: any, skipSync = false): Promise<void> {
    await addItem('conceptos', concepto.id, concepto);
    if (!skipSync) syncService.create('Conceptos', { ...concepto, id: concepto.id });
}
export async function restoreTaller(taller: any, skipSync = false): Promise<void> {
    await addItem('talleres', taller.id, taller);
    if (!skipSync) syncService.create('Talleres', { ...taller, id: taller.id });
}
export async function restoreValeDirectoryEntry(entry: any, skipSync = false): Promise<void> {
    await addItem('vales', entry.id, entry);
    if (!skipSync) syncService.create('Vales', { ...entry, id: entry.id });
}
export async function restoreReminder(reminder: any, skipSync = false): Promise<void> {
    await addItem('reminders', reminder.id, reminder);
    if (!skipSync) syncService.create('Recordatorios', { ...reminder, id: reminder.id });
}

/** Statistics Helpers */
export async function getIngresosForCurrentMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [carreras, otros] = await Promise.all([
        getCarrerasByDateRange(startOfMonth, endOfMonth),
        getOtrosIngresosByDateRange(startOfMonth, endOfMonth)
    ]);
    const taxiIngresos = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
    const otrosIngresos = otros.reduce((sum, oi) => sum + (oi.importe || 0), 0);
    return taxiIngresos + otrosIngresos;
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
    const stores = ['carreras', 'gastos', 'turnos', 'proveedores', 'conceptos', 'talleres', 'reminders', 'customReports', 'settings', 'excepciones', 'vales', 'otrosIngresos'];
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
    const [carreras, otros] = await Promise.all([
        getCarrerasByDateRange(start, end),
        getOtrosIngresosByDateRange(start, end)
    ]);
    const totalCarreras = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
    const totalOtros = otros.reduce((sum, oi) => sum + (oi.importe || 0), 0);
    return totalCarreras + totalOtros;
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
export async function forceCloudSync(): Promise<string | null> {
    const carreras = await getCarreras();
    const gastos = await getGastos();
    const turnos = await getTurnos();
    const proveedores = await getProveedores();
    const conceptos = await getConceptos();
    const talleres = await getTalleres();
    const recordatorios = await getReminders();
    const ajustes = await getAjustes();
    const excepciones = await getExcepciones();
    const vales = await getValesDirectory();
    const informes = await getCustomReports();
    const breakConfig = await getBreakConfiguration();
    const otrosIngresos = await getOtrosIngresos();

    return await syncService.uploadAllData(
        carreras,
        gastos,
        turnos,
        proveedores,
        conceptos,
        talleres,
        recordatorios,
        ajustes,
        excepciones,
        vales,
        informes,
        breakConfig,
        otrosIngresos
    );
}

export async function removeDuplicates(): Promise<{ gastosRemoved: number, carrerasRemoved: number }> {
    // Gastos
    const allGastos = await getGastos();
    const uniqueGastosMap = new Map<string, string>(); // hash -> id to keep
    const gastosToDelete: string[] = [];

    for (const g of allGastos) {
        const d = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
        // Create a unique hash for the content
        const hash = `${d.toISOString()}_${g.importe}_${(g.concepto || '').trim()}_${(g.proveedor || '').trim()}_${(g.taller || '').trim()}`;

        if (uniqueGastosMap.has(hash)) {
            // Found a duplicate, mark for deletion
            gastosToDelete.push(g.id);
        } else {
            // First time seeing this content, keep it
            uniqueGastosMap.set(hash, g.id);
        }
    }

    for (const id of gastosToDelete) {
        await deleteGasto(id);
    }

    // Carreras
    const allCarreras = await getCarreras();
    const uniqueCarrerasMap = new Map<string, string>();
    const carrerasToDelete: string[] = [];

    for (const c of allCarreras) {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        // Create a unique hash for the content
        const hash = `${d.toISOString()}_${c.cobrado}_${c.taximetro}_${c.formaPago}_${c.emisora}_${c.aeropuerto}`;

        if (uniqueCarrerasMap.has(hash)) {
            carrerasToDelete.push(c.id);
        } else {
            uniqueCarrerasMap.set(hash, c.id);
        }
    }

    for (const id of carrerasToDelete) {
        await deleteCarrera(id);
    }

    return { gastosRemoved: gastosToDelete.length, carrerasRemoved: carrerasToDelete.length };
}
