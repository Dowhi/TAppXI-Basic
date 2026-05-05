// services/api.ts - Reimplemented using IndexedDB
import { addItem, getAllItems, getItem, deleteItem, clearStore } from '../src/lib/indexedDB';
import { firebaseSync } from './firebaseSync';

// Types (import from types.ts)
import type { CarreraVista, Gasto, Turno, Proveedor, Concepto, Taller, Reminder, Ajustes, OtroIngreso, Excepcion } from '../types';
import { getCustomReports } from './customReports';
import { calculateTurnoTimes } from './timeUtils';

// Event system for real subscriptions
type Listener<T> = (data: T) => void;
const listeners = {
    activeTurno: new Set<Listener<Turno | null>>(),
    carreras: new Set<Listener<CarreraVista[]>>(),
    gastos: new Set<Listener<Gasto[]>>(),
    reminders: new Set<Listener<Reminder[]>>()
};

function notifyActiveTurno() {
    getActiveTurno().then(turno => {
        listeners.activeTurno.forEach(l => l(turno));
    });
}

function notifyCarreras() {
    getCarreras().then(carreras => {
        listeners.carreras.forEach(l => l(carreras));
    });
}

function notifyGastos() {
    getGastos().then(gastos => {
        listeners.gastos.forEach(l => l(gastos));
    });
}

function notifyReminders() {
    getReminders().then(reminders => {
        listeners.reminders.forEach(l => l(reminders));
    });
}

/** Helpers para normalización de tipos */
export const cleanN = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim();
    if (!s) return 0;
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    s = s.replace(/[^\d.-]/g, '');
    return parseFloat(s) || 0;
};

/**
 * Filtra una colección por un rango de fechas.
 */
export function filterByDateRange<T>(items: T[], dateGetter: (item: T) => any, start: Date, end: Date): T[] {
    return items.filter(item => {
        const d = dateGetter(item);
        const date = d instanceof Date ? d : new Date(d);
        return date >= start && date <= end;
    });
}

export const parseDate = (d: any): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
    let s = String(d).trim();
    if (!s || s === '') return new Date();

    // FIRST: Try Spanish format DD/MM/YYYY or DD/MM/YY
    const spanishFormat = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2}))?/.exec(s);
    if (spanishFormat) {
        let [, day, month, yearStr, hour, minute] = spanishFormat;
        let year = parseInt(yearStr);
        if (year < 100) {
            year = year <= 50 ? 2000 + year : 1900 + year;
        }
        const date = new Date(year, parseInt(month) - 1, parseInt(day), Number(hour || 0), Number(minute || 0));
        if (!isNaN(date.getTime())) return date;
    }

    // SECOND: Try standard formats
    let parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;

    return new Date();
};

const normalizeCarrera = (c: any): CarreraVista => ({
    ...c,
    taximetro: cleanN(c.taximetro),
    cobrado: cleanN(c.cobrado),
    fechaHora: parseDate(c.fechaHora),
    emisora: !!c.emisora,
    aeropuerto: !!c.aeropuerto,
    estacion: !!c.estacion
});

const normalizeGasto = (g: any): Gasto => ({
    ...g,
    importe: cleanN(g.importe),
    fecha: parseDate(g.fecha),
    baseImponible: cleanN(g.baseImponible),
    ivaImporte: cleanN(g.ivaImporte),
    ivaPorcentaje: cleanN(g.ivaPorcentaje),
    kilometros: cleanN(g.kilometros),
    kilometrosVehiculo: cleanN(g.kilometrosVehiculo),
    kmParciales: cleanN(g.kmParciales),
    litros: cleanN(g.litros),
    precioPorLitro: cleanN(g.precioPorLitro),
    descuento: cleanN(g.descuento)
});

const normalizeTurno = (t: any): Turno => ({
    ...t,
    fechaInicio: parseDate(t.fechaInicio),
    fechaFin: t.fechaFin ? parseDate(t.fechaFin) : undefined,
    kilometrosInicio: cleanN(t.kilometrosInicio),
    kilometrosFin: t.kilometrosFin ? cleanN(t.kilometrosFin) : undefined,
    descansos: t.descansos ? t.descansos.map((d: any) => ({
        ...d,
        fechaInicio: parseDate(d.fechaInicio),
        fechaFin: d.fechaFin ? parseDate(d.fechaFin) : undefined,
        kilometrosInicio: cleanN(d.kilometrosInicio),
        kilometrosFin: d.kilometrosFin ? cleanN(d.kilometrosFin) : undefined,
    })) : []
});

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
    const raw = await getAllItems<any>('carreras');
    return raw.map(normalizeCarrera);
}

export async function getCarrera(id: string): Promise<CarreraVista | undefined> {
    const raw = await getItem<any>('carreras', id);
    return raw ? normalizeCarrera(raw) : undefined;
}

export async function addCarrera(carrera: Omit<CarreraVista, 'id'> & { id?: string }): Promise<string> {
    const key = carrera.id ?? crypto.randomUUID();
    await addItem('carreras', key, { ...carrera, id: key });
    firebaseSync.create('Carreras', { ...carrera, id: key });
    notifyCarreras();
    return key;
}

export async function updateCarrera(id: string, updates: Partial<CarreraVista>): Promise<void> {
    const existing = await getItem<CarreraVista>('carreras', id);
    if (!existing) throw new Error('Carrera not found');
    const updated = { ...existing, ...updates };
    await addItem('carreras', id, updated);
    firebaseSync.update('Carreras', updated);
    notifyCarreras();
}

export async function deleteCarrera(id: string): Promise<void> {
    await deleteItem('carreras', id);
    firebaseSync.delete('Carreras', id);
    notifyCarreras();
}

export async function getCarrerasByDate(date: Date): Promise<CarreraVista[]> {
    const all = await getCarreras();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return filterByDateRange(all, c => c.fechaHora, startOfDay, endOfDay);
}

/** Gastos */
export async function getGastos(): Promise<Gasto[]> {
    const raw = await getAllItems<any>('gastos');
    return raw.map(normalizeGasto);
}

export async function getGasto(id: string): Promise<Gasto | undefined> {
    const raw = await getItem<any>('gastos', id);
    return raw ? normalizeGasto(raw) : undefined;
}

export async function addGasto(gasto: Omit<Gasto, 'id'> & { id?: string }): Promise<string> {
    const key = gasto.id ?? crypto.randomUUID();
    await addItem('gastos', key, { ...gasto, id: key });

    // Sync Gasto
    const fullGasto = { ...gasto, id: key };
    firebaseSync.create('Gastos', fullGasto);
    notifyGastos();

    // Sync Servicios (Nested)
    if (gasto.servicios && gasto.servicios.length > 0) {
        // gasto.servicios.forEach(s => {
        //     firebaseSync.create('Incisos', { ...s, gastoId: key, id: crypto.randomUUID() });
        // });
    }

    return key;
}

export async function updateGasto(id: string, updates: Partial<Gasto>): Promise<void> {
    const existing = await getItem<Gasto>('gastos', id);
    if (!existing) throw new Error('Gasto not found');
    const updated = { ...existing, ...updates };
    await addItem('gastos', id, updated);

    firebaseSync.update('Gastos', updated);
    notifyGastos();
}

export async function deleteGasto(id: string): Promise<void> {
    await deleteItem('gastos', id);
    firebaseSync.delete('Gastos', id);
    notifyGastos();
}

export async function getGastosByDate(date: Date): Promise<Gasto[]> {
    const all = await getGastos();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return filterByDateRange(all, g => g.fecha, startOfDay, endOfDay);
}

/** Turnos */
export async function getTurnos(): Promise<Turno[]> {
    const raw = await getAllItems<any>('turnos');
    return raw.map(normalizeTurno);
}

export async function getTurno(id: string): Promise<Turno | undefined> {
    const raw = await getItem<any>('turnos', id);
    return raw ? normalizeTurno(raw) : undefined;
}

export async function addTurno(turno: Omit<Turno, 'id'> & { id?: string }): Promise<string> {
    const key = turno.id ?? crypto.randomUUID();
    await addItem('turnos', key, { ...turno, id: key });
    firebaseSync.create('Turnos', { ...turno, id: key });
    notifyActiveTurno();
    return key;
}

export async function updateTurno(id: string, updates: Partial<Turno>): Promise<void> {
    const existing = await getItem<Turno>('turnos', id);
    if (!existing) throw new Error('Turno not found');
    await addItem('turnos', id, { ...existing, ...updates });
    notifyActiveTurno();
}

export async function deleteTurno(id: string): Promise<void> {
    // 1. Borrar carreras asociadas para evitar datos huérfanos
    const allCarreras = await getCarreras();
    const relatedCarreras = allCarreras.filter(c => c.turnoId === id);
    for (const carrera of relatedCarreras) {
        await deleteCarrera(carrera.id);
    }

    // 2. Borrar el turno
    await deleteItem('turnos', id);
    notifyActiveTurno();
}

export async function getTurnosByDate(date: Date): Promise<Turno[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return getTurnosByDateRange(start, end);
}

export async function getTurnosByDateRange(start: Date, end: Date): Promise<Turno[]> {
    const raw = await getAllItems<any>('turnos');
    const startTime = start.getTime();
    const endTime = end.getTime();
    return raw
        .map(normalizeTurno)
        .filter(t => {
            const tTime = t.fechaInicio.getTime();
            return tTime >= startTime && tTime <= endTime;
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
    firebaseSync.create('Proveedores', { ...proveedor, id: key });
    return key;
}

export async function updateProveedor(id: string, updates: Partial<Proveedor>): Promise<void> {
    const existing = await getItem<Proveedor>('proveedores', id);
    if (!existing) throw new Error('Proveedor not found');
    const updated = { ...existing, ...updates };
    await addItem('proveedores', id, updated);
    firebaseSync.update('Proveedores', updated);
}

export async function deleteProveedor(id: string): Promise<void> {
    await deleteItem('proveedores', id);
    firebaseSync.delete('Proveedores', id);
}

/** Conceptos */
export async function getConceptos(): Promise<Concepto[]> {
    return getAllItems('conceptos');
}

export async function addConcepto(concepto: Omit<Concepto, 'id'> & { id?: string }): Promise<string> {
    const key = concepto.id ?? crypto.randomUUID();
    await addItem('conceptos', key, { ...concepto, id: key });
    firebaseSync.create('Conceptos', { ...concepto, id: key });
    return key;
}

export async function updateConcepto(id: string, updates: Partial<Concepto>): Promise<void> {
    const existing = await getItem<Concepto>('conceptos', id);
    if (!existing) throw new Error('Concepto not found');
    const updated = { ...existing, ...updates };
    await addItem('conceptos', id, updated);
    firebaseSync.update('Conceptos', updated);
}

export async function deleteConcepto(id: string): Promise<void> {
    await deleteItem('conceptos', id);
    firebaseSync.delete('Conceptos', id);
}
export async function getTalleres(): Promise<Taller[]> {
    return getAllItems('talleres');
}

export async function addTaller(taller: Omit<Taller, 'id'> & { id?: string }): Promise<string> {
    const key = taller.id ?? crypto.randomUUID();
    await addItem('talleres', key, { ...taller, id: key });
    firebaseSync.create('Talleres', { ...taller, id: key });
    return key;
}

export async function updateTaller(id: string, updates: Partial<Taller>): Promise<void> {
    const existing = await getItem<Taller>('talleres', id);
    if (!existing) throw new Error('Taller not found');
    const updated = { ...existing, ...updates };
    await addItem('talleres', id, updated);
    firebaseSync.update('Talleres', updated);
}

export async function deleteTaller(id: string): Promise<void> {
    await deleteItem('talleres', id);
    firebaseSync.delete('Talleres', id);
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
    firebaseSync.update('Turnos', updatedTurno);
    notifyActiveTurno();
}

export async function reopenTurno(id: string): Promise<void> {
    const turno = await getItem<Turno>('turnos', id);
    if (!turno) throw new Error('Turno no encontrado');

    const updatedTurno: Turno = {
        ...turno,
        fechaFin: undefined,
        kilometrosFin: undefined
    };

    await addItem('turnos', id, updatedTurno);
    notifyActiveTurno();
}

export async function startBreak(turnoId: string, kilometrosInicio: number): Promise<void> {
    const turno = await getItem<Turno>('turnos', turnoId);
    if (!turno) throw new Error('Turno no encontrado');

    const nuevoDescanso = {
        id: crypto.randomUUID(),
        fechaInicio: new Date(),
        kilometrosInicio
    };

    const updatedTurno: Turno = {
        ...turno,
        descansos: [...(turno.descansos || []), nuevoDescanso]
    };

    await addItem('turnos', turnoId, updatedTurno);
    notifyActiveTurno();
}

export async function endBreak(turnoId: string, kilometrosFin: number): Promise<void> {
    const turno = await getItem<Turno>('turnos', turnoId);
    if (!turno) throw new Error('Turno no encontrado');

    const descansos = turno.descansos || [];
    const activeBreakIdx = descansos.findIndex(d => !d.fechaFin);
    if (activeBreakIdx === -1) throw new Error('No hay descanso activo');

    const updatedDescansos = [...descansos];
    updatedDescansos[activeBreakIdx] = {
        ...updatedDescansos[activeBreakIdx],
        fechaFin: new Date(),
        kilometrosFin
    };

    const updatedTurno: Turno = {
        ...turno,
        descansos: updatedDescansos
    };

    await addItem('turnos', turnoId, updatedTurno);
    notifyActiveTurno();
}

/** Reminders */
export async function getReminders(): Promise<Reminder[]> {
    return getAllItems('reminders');
}

export async function addReminder(reminder: Reminder): Promise<string> {
    const key = reminder.id ?? crypto.randomUUID();
    await addItem('reminders', key, { ...reminder, id: key });
    firebaseSync.create('Recordatorios', { ...reminder, id: key });
    notifyReminders();
    return key;
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<void> {
    const existing = await getItem<Reminder>('reminders', id);
    if (!existing) throw new Error('Reminder not found');
    const updated = { ...existing, ...updates };
    await addItem('reminders', id, updated);
    firebaseSync.update('Recordatorios', updated);
    notifyReminders();
}

export async function deleteReminder(id: string): Promise<void> {
    await deleteItem('reminders', id);
    firebaseSync.delete('Recordatorios', id);
    notifyReminders();
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
    firebaseSync.create('OtrosIngresos', { ...entry, id: key });
    return key;
}

export async function updateOtroIngreso(id: string, updates: Partial<OtroIngreso>): Promise<void> {
    const existing = await getItem<OtroIngreso>('otrosIngresos', id);
    if (!existing) throw new Error('OtroIngreso not found');
    const updated = { ...existing, ...updates };
    await addItem('otrosIngresos', id, updated);
    firebaseSync.update('OtrosIngresos', updated);
}

export async function deleteOtroIngreso(id: string): Promise<void> {
    await deleteItem('otrosIngresos', id);
    firebaseSync.delete('OtrosIngresos', id);
}

export async function getOtrosIngresosByDateRange(start: Date, end: Date): Promise<OtroIngreso[]> {
    const all = await getOtrosIngresos();
    return filterByDateRange(all, oi => oi.fecha, start, end);
}

export async function restoreOtroIngreso(entry: any, skipSync = false): Promise<void> {
    await addItem('otrosIngresos', entry.id, entry);
    if (!skipSync) firebaseSync.create('OtrosIngresos', { ...entry, id: entry.id });
}

// ...
export function subscribeToReminders(callback: (reminders: Reminder[]) => void, errorCallback?: (error: any) => void): () => void {
    getReminders().then(callback).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });
    
    listeners.reminders.add(callback);
    return () => {
        listeners.reminders.delete(callback);
    };
}

/** Subscriptions (Mock for Local DB) */
export function subscribeToActiveTurno(callback: (turno: Turno | null) => void, errorCallback?: (error: any) => void): () => void {
    getActiveTurno().then(callback).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });

    listeners.activeTurno.add(callback);
    return () => {
        listeners.activeTurno.delete(callback);
    };
}

export function subscribeToCarreras(callback: (carreras: CarreraVista[]) => void, errorCallback?: (error: any) => void): () => void {
    getCarreras().then(callback).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });

    listeners.carreras.add(callback);
    return () => {
        listeners.carreras.delete(callback);
    };
}

// ...
export function subscribeToGastos(callback: (total: number) => void, errorCallback?: (error: any) => void): () => void {
    const internalCallback = (gastos: Gasto[]) => {
        const total = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
        callback(total);
    };

    getGastos().then(internalCallback).catch(err => {
        console.error(err);
        if (errorCallback) errorCallback(err);
    });

    listeners.gastos.add(internalCallback);
    return () => {
        listeners.gastos.delete(internalCallback);
    };
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
        monthly[month] += (c.cobrado || 0);
    });
    otros.forEach(oi => {
        const d = oi.fecha instanceof Date ? oi.fecha : new Date(oi.fecha);
        const month = d.getMonth();
        monthly[month] += (oi.importe || 0);
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

export async function getTurnosByYear(year: number): Promise<Turno[]> {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return getTurnosByDateRange(start, end);
}

export async function getHorasByYear(year: number): Promise<Array<{ brutaMs: number, netaMs: number }>> {
    const turnos = await getTurnosByYear(year);
    const monthly = new Array(12).fill(null).map(() => ({ brutaMs: 0, netaMs: 0 }));

    turnos.forEach(t => {
        const d = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
        const month = d.getMonth();
        const times = calculateTurnoTimes(t);
        monthly[month].brutaMs += times.horasBrutasMs;
        monthly[month].netaMs += times.horasNetasMs;
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
    const all = await getTurnos();
    return filterByDateRange(all, t => t.fechaInicio, start, end);
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
            firebaseSync.update('Ajustes', { clave: key, valor: value });
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
    if (!skipSync) firebaseSync.update('Ajustes', { clave: 'breakConfiguration', valor: config });
}

/** Maintenance Intervals */
export interface MaintenanceIntervals {
    aceite: number;
    ruedas: number;
    filtros: number;
    frenos: number;
    inspeccion: number;
}

const DEFAULT_MAINTENANCE: MaintenanceIntervals = {
    aceite: 15000,
    ruedas: 40000,
    filtros: 15000,
    frenos: 30000,
    inspeccion: 50000
};

export async function getMaintenanceIntervals(): Promise<MaintenanceIntervals> {
    const config = await getItem<MaintenanceIntervals>('settings', 'maintenanceIntervals');
    return config || DEFAULT_MAINTENANCE;
}

export async function saveMaintenanceIntervals(intervals: MaintenanceIntervals): Promise<void> {
    await addItem('settings', 'maintenanceIntervals', { ...intervals, key: 'maintenanceIntervals' });
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
    firebaseSync.create('Vales', { ...entry, id: key });
    return key;
}

export async function updateValeDirectoryEntry(id: string, updates: Partial<ValeDirectoryEntry>): Promise<void> {
    const existing = await getItem<ValeDirectoryEntry>('vales', id);
    if (!existing) throw new Error('Vale directory entry not found');
    const updated = { ...existing, ...updates };
    await addItem('vales', id, updated);
    firebaseSync.update('Vales', updated);
}

export async function deleteValeDirectoryEntry(id: string): Promise<void> {
    await deleteItem('vales', id);
    firebaseSync.delete('Vales', id);
}

export async function getExcepciones(): Promise<Excepcion[]> {
    return getAllItems('excepciones');
}

export async function addExcepcion(excepcion: Omit<Excepcion, 'id'> & { id?: string }): Promise<string> {
    const key = excepcion.id ?? crypto.randomUUID();
    await addItem('excepciones', key, { ...excepcion, id: key });
    firebaseSync.create('Excepciones', { ...excepcion, id: key });
    return key;
}

export async function updateExcepcion(id: string, updates: Partial<Excepcion>): Promise<void> {
    const existing = await getItem<Excepcion>('excepciones', id);
    if (!existing) throw new Error('Excepcion not found');
    const updated = { ...existing, ...updates };
    await addItem('excepciones', id, updated);
    firebaseSync.update('Excepciones', updated);
}

export async function deleteExcepcion(id: string): Promise<void> {
    await deleteItem('excepciones', id);
    firebaseSync.delete('Excepciones', id);
}

export async function restoreExcepcion(excepcion: any, skipSync = false): Promise<void> {
    await addItem('excepciones', excepcion.id, excepcion);
    if (!skipSync) firebaseSync.create('Excepciones', { ...excepcion, id: excepcion.id });
}

export async function isRestDay(date: Date): Promise<boolean> {
    try {
        const excepciones = await getExcepciones();
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Check for explicit "Descanso" exceptions (in case any exist)
        const hasDescansoException = excepciones.some((e: any) => {
            if (e.tipo !== 'Descanso') return false;
            try {
                const start = e.fechaDesde instanceof Date ? e.fechaDesde : new Date(e.fechaDesde);
                const end = e.fechaHasta instanceof Date ? e.fechaHasta : new Date(e.fechaHasta);
                
                const s = new Date(start); s.setHours(0, 0, 0, 0);
                const en = new Date(end); en.setHours(23, 59, 59, 999);
                
                return targetDate.getTime() >= s.getTime() && targetDate.getTime() <= en.getTime();
            } catch {
                return false;
            }
        });

        if (hasDescansoException) return true;

        // Check if it's a rest day by comparing taxi letters with user break letter
        try {
            const breakConfig = await getBreakConfiguration();
            if (!breakConfig || !breakConfig.startDate || !breakConfig.userBreakLetter) {
                return false;
            }

            // Parse start date
            const [ds, ms, ys] = breakConfig.startDate.split('/');
            const startDate = new Date(parseInt(ys), parseInt(ms) - 1, parseInt(ds));
            startDate.setHours(0, 0, 0, 0);

            // Calculate taxi letter for this date
            const lettersArray = ['A', 'B', 'C', 'D'];
            const diffTime = targetDate.getTime() - startDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            let taxiLetter = '';
            if (diffDays >= 0) {
                const startLetter = breakConfig.startDayLetter || breakConfig.initialBreakLetter || 'A';
                const startIdx = lettersArray.indexOf(startLetter);
                const startDow = startDate.getDay();
                const startWd = startDow === 0 ? 6 : startDow - 1;
                const mod = (v: number, d: number) => ((v % d) + d) % d;
                const startWkMondayIdx = mod(startIdx - startWd, 4);

                const dow = targetDate.getDay();
                const isSat = dow === 6;
                const isSun = dow === 0;

                if (isSat || isSun) {
                    // Weekend - parse weekend pattern
                    const weekendPatternStr = breakConfig.weekendPattern || '';
                    const normalizedPattern = weekendPatternStr
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase();

                    const saturdayMatch = normalizedPattern.match(/sabado\s*:\s*([a-z]+)/);
                    const sundayMatch = normalizedPattern.match(/domingo\s*:\s*([a-z]+)/);

                    const saturdayLetter = (saturdayMatch?.[1] ?? 'ac').toUpperCase();
                    const sundayLetter = (sundayMatch?.[1] ?? 'bd').toUpperCase();
                    
                    const weekNum = Math.floor((diffDays + startWd) / 7);
                    const swap = weekNum % 2 === 1;
                    taxiLetter = isSat
                        ? (swap ? sundayLetter : saturdayLetter)
                        : (swap ? saturdayLetter : sundayLetter);
                } else {
                    // Weekday
                    const weekNum = Math.floor((diffDays + startWd) / 7);
                    const wd = dow === 0 ? 6 : dow - 1;
                    const mondayIdx = mod(startWkMondayIdx + weekNum, 4);
                    const finalIdx = mod(mondayIdx + wd, 4);
                    taxiLetter = lettersArray[finalIdx];
                }
            }

            // Compare taxi letter with user break letter
            if (!taxiLetter) return false;

            const userLetter = breakConfig.userBreakLetter.toUpperCase();
            const tl = taxiLetter.toUpperCase();

            // Check if taxi letter matches user break letter
            const isRest = tl === userLetter ||
                (tl === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                (tl === 'BD' && (userLetter === 'B' || userLetter === 'D'));

            return isRest;
        } catch (error) {
            console.error('Error calculating rest day by letter:', error);
            return false;
        }
    } catch (error) {
        console.error('Error in isRestDay:', error);
        return false;
    }
}

/** Restore Functions (Wrappers) */
export async function restoreCarrera(carrera: any, skipSync = false): Promise<void> {
    await addItem('carreras', carrera.id, carrera);
    if (!skipSync) firebaseSync.create('Carreras', { ...carrera, id: carrera.id });
}
export async function restoreGasto(gasto: any, skipSync = false): Promise<void> {
    await addItem('gastos', gasto.id, gasto);
    if (!skipSync) {
        // Sync Gasto
        firebaseSync.create('Gastos', { ...gasto, id: gasto.id });
        // Sync Servicios (Nested)
        if (gasto.servicios && gasto.servicios.length > 0) {
            gasto.servicios.forEach((s: any) => {
                firebaseSync.create('Incisos', { ...s, gastoId: gasto.id, id: s.id || crypto.randomUUID() });
            });
        }
    }
}
export async function restoreTurno(turno: any, skipSync = false): Promise<void> {
    await addItem('turnos', turno.id, turno);
    if (!skipSync) firebaseSync.create('Turnos', { ...turno, id: turno.id });
}
export async function restoreProveedor(proveedor: any, skipSync = false): Promise<void> {
    await addItem('proveedores', proveedor.id, proveedor);
    if (!skipSync) firebaseSync.create('Proveedores', { ...proveedor, id: proveedor.id });
}
export async function restoreConcepto(concepto: any, skipSync = false): Promise<void> {
    await addItem('conceptos', concepto.id, concepto);
    if (!skipSync) firebaseSync.create('Conceptos', { ...concepto, id: concepto.id });
}
export async function restoreTaller(taller: any, skipSync = false): Promise<void> {
    await addItem('talleres', taller.id, taller);
    if (!skipSync) firebaseSync.create('Talleres', { ...taller, id: taller.id });
}
export async function restoreValeDirectoryEntry(entry: any, skipSync = false): Promise<void> {
    await addItem('vales', entry.id, entry);
    if (!skipSync) firebaseSync.create('OtrosIngresos', { ...entry, id: entry.id });
}
export async function restoreReminder(reminder: any, skipSync = false): Promise<void> {
    await addItem('reminders', reminder.id, reminder);
    if (!skipSync) firebaseSync.create('Recordatorios', { ...reminder, id: reminder.id });
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
    const [carreras, turnos] = await Promise.all([
        getCarreras(),
        getTurnos()
    ]);
    const dayData: Set<string> = new Set();

    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        if (d >= startDate && d <= endDate) {
            dayData.add(d.toISOString().split('T')[0]);
        }
    });

    turnos.forEach(t => {
        const d = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
        if (d >= startDate && d <= endDate) {
            dayData.add(d.toISOString().split('T')[0]);
        }
    });

    return Array.from(dayData).sort().map(d => new Date(d));
}

// Helper for ranges
export async function getCarrerasByDateRange(start: Date, end: Date): Promise<CarreraVista[]> {
    const raw = await getAllItems<any>('carreras');
    const startTime = start.getTime();
    const endTime = end.getTime();
    return raw
        .map(normalizeCarrera)
        .filter(c => {
            const cTime = c.fechaHora.getTime();
            return cTime >= startTime && cTime <= endTime;
        });
}


export async function getGastosByDateRange(start: Date, end: Date): Promise<Gasto[]> {
    const all = await getGastos();
    return filterByDateRange(all, g => g.fecha, start, end);
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

        const items = await getAllItems(storeName);
        for (const item of items) {
            const key = (item as any).id || (item as any).key;
            if (key) await deleteItem(storeName, key);
        }
    }

    if (onProgress) {
        onProgress({ percentage: 100, message: 'Completado' });
    }
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
    const carreras = await getCarrerasByDateRange(startDate, endDate);
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);
    const uniqueDays = new Set<string>();

    carreras.forEach(c => {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        dayTotals[d.getDay()] += (c.cobrado || 0);
        uniqueDays.add(d.toISOString().split('T')[0]);
    });

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

export async function getHorasByMonthYear(month: number, year: number): Promise<{ brutasMs: number, netasMs: number }> {
    const turnos = await getTurnosByMonth(month, year);
    let brutasMs = 0;
    let netasMs = 0;
    turnos.forEach(t => {
        const times = calculateTurnoTimes(t);
        brutasMs += times.horasBrutasMs;
        netasMs += times.horasNetasMs;
    });
    return { brutasMs, netasMs };
}

export async function getHorasByYearTotal(year: number): Promise<{ brutasMs: number, netasMs: number }> {
    const turnos = await getTurnosByYear(year);
    let brutasMs = 0;
    let netasMs = 0;
    turnos.forEach(t => {
        const times = calculateTurnoTimes(t);
        brutasMs += times.horasBrutasMs;
        netasMs += times.horasNetasMs;
    });
    return { brutasMs, netasMs };
}

export async function removeDuplicates(): Promise<{ gastosRemoved: number, carrerasRemoved: number }> {
    const allGastos = await getGastos();
    const uniqueGastosMap = new Map<string, string>();
    const gastosToDelete: string[] = [];

    for (const g of allGastos) {
        const d = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
        const hash = `${d.toISOString()}_${g.importe}_${(g.concepto || '').trim()}_${(g.proveedor || '').trim()}_${(g.taller || '').trim()}`;
        if (uniqueGastosMap.has(hash)) {
            gastosToDelete.push(g.id);
        } else {
            uniqueGastosMap.set(hash, g.id);
        }
    }

    for (const id of gastosToDelete) {
        await deleteGasto(id);
    }

    const allCarreras = await getCarreras();
    const uniqueCarrerasMap = new Map<string, string>();
    const carrerasToDelete: string[] = [];

    for (const c of allCarreras) {
        const d = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
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

export async function deleteMonthlyData(month: number, year: number): Promise<void> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const [carreras, gastos, otros, turnos] = await Promise.all([
        getCarrerasByDateRange(start, end),
        getGastosByDateRange(start, end),
        getOtrosIngresosByDateRange(start, end),
        getTurnosByMonth(month, year)
    ]);

    for (const c of carreras) await deleteCarrera(c.id);
    for (const g of gastos) await deleteItem('gastos', g.id);
    for (const o of otros) await deleteOtroIngreso(o.id);
    for (const t of turnos) await deleteItem('turnos', t.id);
}

export async function syncFromFirestore(onProgress?: (progress: number, message: string) => void): Promise<void> {
    if (onProgress) onProgress(0, "Iniciando descarga de Firestore...");
    
    const cloudData = await firebaseSync.downloadAll();
    
    const steps = [
        { key: 'Ajustes', msg: 'Sincronizando ajustes...', restore: async (data: any) => {
            const ajustesObj: any = {};
            data.forEach((item: any) => { if (item.clave) ajustesObj[item.clave] = item.valor; });
            if (Object.keys(ajustesObj).length > 0) await saveAjustes(ajustesObj, true);
        }},
        { key: 'Carreras', msg: 'Sincronizando carreras...', restore: async (item: any) => restoreCarrera(item, true) },
        { key: 'Gastos', msg: 'Sincronizando gastos...', restore: async (item: any) => restoreGasto(item, true) },
        { key: 'Turnos', msg: 'Sincronizando turnos...', restore: async (item: any) => restoreTurno(item, true) },
        { key: 'Proveedores', msg: 'Sincronizando proveedores...', restore: async (item: any) => restoreProveedor(item, true) },
        { key: 'Conceptos', msg: 'Sincronizando conceptos...', restore: async (item: any) => restoreConcepto(item, true) },
        { key: 'Talleres', msg: 'Sincronizando talleres...', restore: async (item: any) => restoreTaller(item, true) },
        { key: 'Recordatorios', msg: 'Sincronizando recordatorios...', restore: async (item: any) => restoreReminder(item, true) },
        { key: 'Excepciones', msg: 'Sincronizando excepciones...', restore: async (item: any) => restoreExcepcion(item, true) },
        { key: 'Vales', msg: 'Sincronizando vales...', restore: async (item: any) => restoreValeDirectoryEntry(item, true) },
        { key: 'OtrosIngresos', msg: 'Sincronizando otros ingresos...', restore: async (item: any) => restoreOtroIngreso(item, true) }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (onProgress) onProgress(Math.round((i / steps.length) * 100), step.msg);
        
        const data = cloudData[step.key] || [];
        if (step.key === 'Ajustes') {
            await (step.restore as any)(data);
        } else {
            for (const item of data) {
                await step.restore(item);
            }
        }
    }

    if (onProgress) onProgress(100, "Sincronización completada.");
}
