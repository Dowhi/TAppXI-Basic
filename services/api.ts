
import { db } from '../firebaseConfig';
import { CarreraVista, Gasto, Turno, Proveedor, Concepto, Taller } from '../types';

// Type for data sent to Firestore (without id)
export type CarreraData = Omit<CarreraVista, 'id'>;
export interface ValeDirectoryEntry {
    codigoEmpresa: string;
    empresa: string;
}

const carrerasCollection = db.collection('carreras');
const gastosCollection = db.collection('gastos');
const turnosCollection = db.collection('turnos');
const talleresCollection = db.collection('talleres');
const proveedoresCollection = db.collection('proveedores');
const conceptosCollection = db.collection('conceptos');
const ajustesCollection = db.collection('ajustes');
const breakConfigurationsCollection = db.collection('breakConfigurations');
const excepcionesCollection = db.collection('excepciones');

// --- Converters ---

const docToCarrera = (doc: any): CarreraVista => {
    const data = doc.data();
    const valeInfo = data.valeInfo
        ? {
            despacho: data.valeInfo.despacho || '',
            numeroAlbaran: data.valeInfo.numeroAlbaran || '',
            empresa: data.valeInfo.empresa || '',
            codigoEmpresa: data.valeInfo.codigoEmpresa || '',
            autoriza: data.valeInfo.autoriza || '',
        }
        : null;
    return {
        id: doc.id,
        taximetro: data.taximetro,
        cobrado: data.cobrado,
        formaPago: data.formaPago,
        tipoCarrera: data.tipoCarrera || 'Urbana', // Por defecto 'Urbana' si no existe
        emisora: data.emisora,
        aeropuerto: data.aeropuerto,
        estacion: data.estacion || false, // Por defecto false si no existe
        fechaHora: data.fechaHora.toDate(), // Convert Firestore Timestamp to JS Date
        turnoId: data.turnoId || undefined, // ID del turno relacionado
        valeInfo,
        notas: data.notas || null,
    };
};

const docToGasto = (doc: any): Gasto => {
    const data = doc.data();
    return {
        id: doc.id,
        importe: data.importe,
        fecha: data.fecha.toDate(),
        tipo: data.tipo,
        categoria: data.categoria,
        formaPago: data.formaPago,
        proveedor: data.proveedor,
        concepto: data.concepto,
        taller: data.taller,
        numeroFactura: data.numeroFactura,
        baseImponible: data.baseImponible,
        ivaImporte: data.ivaImporte,
        ivaPorcentaje: data.ivaPorcentaje,
        kilometros: data.kilometros,
        kilometrosVehiculo: data.kilometrosVehiculo,
        descuento: data.descuento,
        servicios: data.servicios,
        notas: data.notas,
    };
};

const docToTurno = (doc: any): Turno => {
    const data = doc.data();
    return {
        id: doc.id,
        fechaInicio: data.fechaInicio.toDate(),
        kilometrosInicio: data.kilometrosInicio,
        fechaFin: data.fechaFin ? data.fechaFin.toDate() : undefined,
        kilometrosFin: data.kilometrosFin,
    };
};


// --- API Functions ---

// Carreras
export const getCarreras = async (): Promise<CarreraVista[]> => {
    // Mantener esta función para compatibilidad: devuelve todas las carreras ordenadas por fecha.
    // IMPORTANTE: Para listados de histórico usa mejor getCarrerasPaginadas para evitar cargar toda la colección.
    const snapshot = await carrerasCollection.orderBy('fechaHora', 'desc').get();
    return snapshot.docs.map(docToCarrera);
};

export const getCarrerasPaginadas = async (
    limit: number = 200,
    startAfterFecha?: Date
): Promise<CarreraVista[]> => {
    let query: any = carrerasCollection.orderBy('fechaHora', 'desc').limit(limit);

    if (startAfterFecha) {
        // @ts-ignore
        const startAfterTs = firebase.firestore.Timestamp.fromDate(startAfterFecha);
        query = query.startAfter(startAfterTs);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(docToCarrera);
};

export const getCarrerasByTurnoId = async (turnoId: string): Promise<CarreraVista[]> => {
    const snapshot = await carrerasCollection.where('turnoId', '==', turnoId).orderBy('fechaHora', 'desc').get();
    return snapshot.docs.map(docToCarrera);
};

export const getCarrera = async (id: string): Promise<CarreraVista | null> => {
    const doc = await carrerasCollection.doc(id).get();
    return doc.exists ? docToCarrera(doc) : null;
};

export const getValesDirectory = async (): Promise<ValeDirectoryEntry[]> => {
    const snapshot = await carrerasCollection.where('formaPago', '==', 'Vales').get();
    const directoryMap = new Map<string, string>();

    snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const codigoEmpresa = data?.valeInfo?.codigoEmpresa ? String(data.valeInfo.codigoEmpresa).trim() : '';
        if (!codigoEmpresa) {
            return;
        }
        if (!directoryMap.has(codigoEmpresa)) {
            directoryMap.set(codigoEmpresa, String(data.valeInfo?.empresa || '').trim());
        }
    });

    return Array.from(directoryMap.entries()).map(([codigoEmpresa, empresa]) => ({
        codigoEmpresa,
        empresa,
    }));
};

type CarreraInputData = Omit<CarreraData, 'fechaHora'> & { fechaHora?: Date; turnoId?: string };

export const addCarrera = async (carrera: CarreraInputData) => {
    // Si no se proporciona turnoId, obtener el turno activo automáticamente
    let turnoId = carrera.turnoId;
    if (!turnoId) {
        const turnoActivo = await getActiveTurno();
        if (turnoActivo) {
            turnoId = turnoActivo.id;
        }
    }

    const dataToAdd: any = {
        taximetro: carrera.taximetro,
        cobrado: carrera.cobrado,
        formaPago: carrera.formaPago,
        tipoCarrera: carrera.tipoCarrera || 'Urbana', // Por defecto 'Urbana'
        emisora: carrera.emisora,
        aeropuerto: carrera.aeropuerto,
        estacion: carrera.estacion || false, // Por defecto false
        // @ts-ignore
        fechaHora: carrera.fechaHora ? firebase.firestore.Timestamp.fromDate(carrera.fechaHora) : firebase.firestore.FieldValue.serverTimestamp()
    };

    if (carrera.valeInfo && carrera.formaPago === 'Vales') {
        dataToAdd.valeInfo = carrera.valeInfo;
    } else {
        dataToAdd.valeInfo = null;
    }

    if (carrera.notas) {
        dataToAdd.notas = carrera.notas;
    } else {
        dataToAdd.notas = null;
    }

    // Agregar turnoId si existe
    if (turnoId) {
        dataToAdd.turnoId = turnoId;
    }

    const docRef = await carrerasCollection.add(dataToAdd);
    return docRef.id;
};

// Gastos
export const addGasto = async (gasto: Omit<Gasto, 'id'>) => {
    const dataToAdd: any = {
        importe: gasto.importe,
        // @ts-ignore
        fecha: gasto.fecha ? firebase.firestore.Timestamp.fromDate(gasto.fecha) : firebase.firestore.FieldValue.serverTimestamp(),
        // Campos opcionales
        ...(gasto.tipo && { tipo: gasto.tipo }),
        ...(gasto.categoria && { categoria: gasto.categoria }),
        ...(gasto.formaPago && { formaPago: gasto.formaPago }),
        ...(gasto.proveedor && { proveedor: gasto.proveedor }),
        ...(gasto.concepto && { concepto: gasto.concepto }),
        ...(gasto.taller && { taller: gasto.taller }),
        ...(gasto.numeroFactura && { numeroFactura: gasto.numeroFactura }),
        ...(gasto.baseImponible !== undefined && { baseImponible: gasto.baseImponible }),
        ...(gasto.ivaImporte !== undefined && { ivaImporte: gasto.ivaImporte }),
        ...(gasto.ivaPorcentaje !== undefined && { ivaPorcentaje: gasto.ivaPorcentaje }),
        ...(gasto.kilometros !== undefined && { kilometros: gasto.kilometros }),
        ...(gasto.kilometrosVehiculo !== undefined && { kilometrosVehiculo: gasto.kilometrosVehiculo }),
        ...(gasto.descuento !== undefined && { descuento: gasto.descuento }),
        ...(gasto.servicios && { servicios: gasto.servicios }),
        ...(gasto.notas && { notas: gasto.notas }),
    };
    const docRef = await gastosCollection.add(dataToAdd);
    return docRef.id;
};

export const updateCarrera = async (id: string, carrera: Partial<CarreraInputData>) => {
    const updates: any = { ...carrera };
    if ('formaPago' in updates) {
        if (updates.formaPago === 'Vales') {
            if (updates.valeInfo) {
                updates.valeInfo = updates.valeInfo;
            } else {
                updates.valeInfo = null;
            }
        } else {
            updates.valeInfo = null;
        }
    } else if ('valeInfo' in updates && updates.valeInfo === undefined) {
        delete updates.valeInfo;
    }
    if ('notas' in updates) {
        updates.notas = updates.notas ? updates.notas : null;
    }
    await carrerasCollection.doc(id).update(updates);
};

export const deleteCarrera = (id: string) => {
    return carrerasCollection.doc(id).delete();
};


// Home Screen Data
export const getIngresosForCurrentMonth = async (): Promise<number> => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    // Usar la función que ya filtra días de descanso
    return getIngresosByMonthYear(month, year);
};

export const getGastos = async (): Promise<Gasto[]> => {
    // @ts-ignore
    const snapshot = await gastosCollection.orderBy('fecha', 'desc').get();
    return snapshot.docs.map(docToGasto);
};

export const getGastosForCurrentMonth = async (): Promise<number> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const snapshot = await gastosCollection
        .where('fecha', '>=', startOfMonth)
        .where('fecha', '<=', endOfMonth)
        .get();

    return snapshot.docs.reduce((total, doc) => total + doc.data().importe, 0);
};

// Obtener ingresos por año (retorna array de 12 elementos, uno por mes)
export const getIngresosByYear = async (year: number): Promise<number[]> => {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfYear);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfYear);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .get();

    // Inicializar array con 12 meses
    const ingresosPorMes = new Array(12).fill(0);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const fechaHora = data.fechaHora.toDate();
        const mes = fechaHora.getMonth(); // 0-11
        const cobrado = data.cobrado || 0;
        ingresosPorMes[mes] += cobrado;
    });

    return ingresosPorMes;
};

// Obtener gastos por año (retorna array de 12 elementos, uno por mes)
export const getGastosByYear = async (year: number): Promise<number[]> => {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfYear);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfYear);

    const snapshot = await gastosCollection
        .where('fecha', '>=', startTimestamp)
        .where('fecha', '<=', endTimestamp)
        .get();

    // Inicializar array con 12 meses
    const gastosPorMes = new Array(12).fill(0);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const fecha = data.fecha.toDate();
        const mes = fecha.getMonth(); // 0-11
        const importe = data.importe || 0;
        gastosPorMes[mes] += importe;
    });

    return gastosPorMes;
};

// Talleres
export const addTaller = async (taller: { nombre: string; direccion?: string | null; telefono?: string | null }) => {
    const dataToAdd = {
        ...taller,
        // @ts-ignore - `firebase` is declared globally in firebaseConfig.ts
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await talleresCollection.add(dataToAdd);
    return docRef.id;
};

export const addProveedor = async (proveedor: { nombre: string; direccion?: string | null; telefono?: string | null; nif?: string | null }) => {
    const dataToAdd = {
        ...proveedor,
        // @ts-ignore
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await proveedoresCollection.add(dataToAdd);
    return docRef.id;
};

export const addConcepto = async (concepto: { nombre: string; descripcion?: string | null; categoria?: string | null }) => {
    const dataToAdd = {
        ...concepto,
        // @ts-ignore
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await conceptosCollection.add(dataToAdd);
    return docRef.id;
};

// Get functions for dropdowns
export const getProveedores = async (): Promise<Proveedor[]> => {
    const snapshot = await proveedoresCollection.orderBy('nombre').get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre,
        direccion: doc.data().direccion || null,
        telefono: doc.data().telefono || null,
        nif: doc.data().nif || null,
    }));
};

export const getConceptos = async (): Promise<Concepto[]> => {
    const snapshot = await conceptosCollection.orderBy('nombre').get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre,
        descripcion: doc.data().descripcion || null,
        categoria: doc.data().categoria || null,
    }));
};

export const getTalleres = async (): Promise<Taller[]> => {
    const snapshot = await talleresCollection.orderBy('nombre').get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre,
        direccion: doc.data().direccion || null,
        telefono: doc.data().telefono || null,
    }));
};


// Turnos
export const getActiveTurno = async (): Promise<Turno | null> => {
    const snapshot = await turnosCollection
        .where('kilometrosFin', '==', null)
        .limit(1)
        .get();
    
    if (snapshot.empty) {
        return null;
    }
    
    return docToTurno(snapshot.docs[0]);
};

export const addTurno = async (kilometrosInicio: number): Promise<string> => {
    // @ts-ignore
    const dataToAdd = {
        kilometrosInicio: kilometrosInicio,
        // @ts-ignore
        fechaInicio: firebase.firestore.FieldValue.serverTimestamp(),
        kilometrosFin: null,
        fechaFin: null
    };
    const docRef = await turnosCollection.add(dataToAdd);
    return docRef.id;
};

export const getTurno = async (id: string): Promise<Turno | null> => {
    const doc = await turnosCollection.doc(id).get();
    return doc.exists ? docToTurno(doc) : null;
};

export const updateTurno = async (
    turnoId: string, 
    updates: {
        fechaInicio?: Date;
        kilometrosInicio?: number;
        fechaFin?: Date;
        kilometrosFin?: number;
    }
): Promise<void> => {
    const updateData: any = {};
    
    if (updates.fechaInicio !== undefined) {
        // @ts-ignore
        updateData.fechaInicio = firebase.firestore.Timestamp.fromDate(updates.fechaInicio);
    }
    if (updates.kilometrosInicio !== undefined) {
        updateData.kilometrosInicio = updates.kilometrosInicio;
    }
    if (updates.fechaFin !== undefined) {
        // @ts-ignore
        updateData.fechaFin = updates.fechaFin ? firebase.firestore.Timestamp.fromDate(updates.fechaFin) : null;
    }
    if (updates.kilometrosFin !== undefined) {
        updateData.kilometrosFin = updates.kilometrosFin;
    }
    
    // @ts-ignore
    await turnosCollection.doc(turnoId).update(updateData);
};

export const closeTurno = async (turnoId: string, kilometrosFin: number): Promise<void> => {
    // @ts-ignore
    await turnosCollection.doc(turnoId).update({
        kilometrosFin: kilometrosFin,
        fechaFin: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const getRecentTurnos = async (limit: number = 10): Promise<Turno[]> => {
    // Obtener todos los turnos y filtrar/ordenar en memoria
    // Esto es necesario porque Firestore no permite usar != con orderBy fácilmente
    const snapshot = await turnosCollection.get();
    const turnos = snapshot.docs
        .map(docToTurno)
        .filter(t => t.kilometrosFin !== undefined && t.fechaFin !== undefined)
        .sort((a, b) => {
            if (!a.fechaFin || !b.fechaFin) return 0;
            return b.fechaFin.getTime() - a.fechaFin.getTime();
        })
        .slice(0, limit);
    return turnos;
};

export const getTurnosByDate = async (date: Date): Promise<Turno[]> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfDay);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfDay);

    const snapshot = await turnosCollection
        .where('fechaInicio', '>=', startTimestamp)
        .where('fechaInicio', '<=', endTimestamp)
        .orderBy('fechaInicio', 'asc')
        .get();

    return snapshot.docs.map(docToTurno);
};

export const getCarrerasByDate = async (date: Date): Promise<CarreraVista[]> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfDay);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfDay);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .orderBy('fechaHora', 'desc')
        .get();

    return snapshot.docs.map(docToCarrera);
};

export const getGastosByDate = async (date: Date): Promise<number> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfDay);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfDay);

    const snapshot = await gastosCollection
        .where('fecha', '>=', startTimestamp)
        .where('fecha', '<=', endTimestamp)
        .get();

    return snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        return total + (data.importe || 0);
    }, 0);
};

// Obtener carreras por mes (mes y año)
export const getCarrerasByMonth = async (month: number, year: number): Promise<CarreraVista[]> => {
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfMonth);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfMonth);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .orderBy('fechaHora', 'desc')
        .get();

    return snapshot.docs.map(docToCarrera);
};

// Obtener gastos por mes (mes y año)
export const getGastosByMonth = async (month: number, year: number): Promise<Gasto[]> => {
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfMonth);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfMonth);

    const snapshot = await gastosCollection
        .where('fecha', '>=', startTimestamp)
        .where('fecha', '<=', endTimestamp)
        .orderBy('fecha', 'desc')
        .get();

    return snapshot.docs.map(docToGasto);
};

// Obtener turnos por mes (mes y año)
export const getTurnosByMonth = async (month: number, year: number): Promise<Turno[]> => {
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfMonth);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfMonth);

    const snapshot = await turnosCollection
        .where('fechaInicio', '>=', startTimestamp)
        .where('fechaInicio', '<=', endTimestamp)
        .orderBy('fechaInicio', 'asc')
        .get();

    return snapshot.docs.map(docToTurno);
};

// Gastos - Get total gastos for today
export const getGastosForToday = async (): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // @ts-ignore
    const todayTimestamp = firebase.firestore.Timestamp.fromDate(today);
    // @ts-ignore
    const tomorrowTimestamp = firebase.firestore.Timestamp.fromDate(tomorrow);

    const snapshot = await gastosCollection
        .where('fecha', '>=', todayTimestamp)
        .where('fecha', '<', tomorrowTimestamp)
        .get();

    return snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        return total + (data.importe || 0);
    }, 0);
};

// Real-time subscriptions
export const subscribeToCarreras = (
    callback: (carreras: CarreraVista[]) => void,
    errorCallback?: (error: any) => void
): () => void => {
    const unsubscribe = carrerasCollection
        .orderBy('fechaHora', 'desc')
        .onSnapshot((snapshot: any) => {
            try {
                const carreras = snapshot.docs.map(docToCarrera);
                callback(carreras);
            } catch (error) {
                console.error("Error processing carreras:", error);
                if (errorCallback) errorCallback(error);
            }
        }, (error: any) => {
            console.error("Error subscribing to carreras:", error);
            if (errorCallback) errorCallback(error);
        });
    return unsubscribe;
};

export const subscribeToGastos = (
    callback: (total: number) => void,
    errorCallback?: (error: any) => void
): () => void => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // @ts-ignore
    const todayTimestamp = firebase.firestore.Timestamp.fromDate(today);
    // @ts-ignore
    const tomorrowTimestamp = firebase.firestore.Timestamp.fromDate(tomorrow);

    const unsubscribe = gastosCollection
        .where('fecha', '>=', todayTimestamp)
        .where('fecha', '<', tomorrowTimestamp)
        .onSnapshot((snapshot: any) => {
            try {
                const total = snapshot.docs.reduce((sum: number, doc: any) => {
                    const data = doc.data();
                    return sum + (data.importe || 0);
                }, 0);
                callback(total);
            } catch (error) {
                console.error("Error processing gastos:", error);
                callback(0);
                if (errorCallback) errorCallback(error);
            }
        }, (error: any) => {
            console.error("Error subscribing to gastos:", error);
            callback(0);
            if (errorCallback) errorCallback(error);
        });
    return unsubscribe;
};

export const subscribeToActiveTurno = (
    callback: (turno: Turno | null) => void,
    errorCallback?: (error: any) => void
): () => void => {
    const unsubscribe = turnosCollection
        .where('kilometrosFin', '==', null)
        .limit(1)
        .onSnapshot((snapshot: any) => {
            try {
                if (snapshot.empty) {
                    callback(null);
                } else {
                    callback(docToTurno(snapshot.docs[0]));
                }
            } catch (error) {
                console.error("Error processing turno:", error);
                callback(null);
                if (errorCallback) errorCallback(error);
            }
        }, (error: any) => {
            console.error("Error subscribing to active turno:", error);
            callback(null);
            if (errorCallback) errorCallback(error);
        });
    return unsubscribe;
};

// --- Ajustes ---

export interface Ajustes {
    temaOscuro: boolean;
    tamanoFuente: number;
    letraDescanso: string;
    objetivoDiario: number;
}

export const saveAjustes = async (ajustes: Ajustes): Promise<void> => {
    try {
        const ajustesSnapshot = await ajustesCollection.limit(1).get();
        const dataToSave = {
            ...ajustes,
            // escribir ambos nombres de campo por compatibilidad
            tamanoFuente: ajustes.tamanoFuente,
            "tam\u00f1oFuente": ajustes.tamanoFuente,
        } as any;

        if (!ajustesSnapshot.empty) {
            const docId = ajustesSnapshot.docs[0].id;
            await ajustesCollection.doc(docId).set(dataToSave, { merge: true });
        } else {
            await ajustesCollection.add(dataToSave);
        }
    } catch (error) {
        console.error('Error guardando ajustes:', error);
        throw error;
    }
};

export const getAjustes = async (): Promise<Ajustes | null> => {
    try {
        const snapshot = await ajustesCollection.limit(1).get();
        if (snapshot.empty) {
            return null;
        }

        const raw = snapshot.docs[0].data() as any;
        return {
            temaOscuro: raw.temaOscuro ?? false,
            tamanoFuente: raw.tamanoFuente ?? raw['tam\u00f1oFuente'] ?? 14,
            letraDescanso: raw.letraDescanso ?? '',
            objetivoDiario: raw.objetivoDiario ?? 100,
        };
    } catch (error) {
        console.error('Error obteniendo ajustes:', error);
        return null;
    }
};

export interface BreakConfiguration {
    startDate: string;
    startDayLetter: string;
    weekendPattern: string;
    userBreakLetter: string;
    updatedAt: Date | null;
}

export const saveBreakConfiguration = async (config: Omit<BreakConfiguration, 'updatedAt'>): Promise<void> => {
    try {
        const snapshot = await breakConfigurationsCollection.limit(1).get();
        const dataToSave = {
            startDate: config.startDate,
            startDayLetter: config.startDayLetter,
            weekendPattern: config.weekendPattern,
            userBreakLetter: config.userBreakLetter,
            // @ts-ignore
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await breakConfigurationsCollection.doc(docId).set(dataToSave, { merge: true });
        } else {
            await breakConfigurationsCollection.add(dataToSave);
        }
    } catch (error) {
        console.error('Error guardando configuracion de descansos:', error);
        throw error;
    }
};

export const getBreakConfiguration = async (): Promise<BreakConfiguration | null> => {
    try {
        const snapshot = await breakConfigurationsCollection.limit(1).get();
        if (snapshot.empty) {
            return null;
        }

        const data = snapshot.docs[0].data() as any;
        return {
            startDate: data.startDate ?? '',
            startDayLetter: data.startDayLetter ?? 'A',
            weekendPattern: data.weekendPattern ?? 'Sabado: AC / Domingo: BD',
            userBreakLetter: data.userBreakLetter ?? 'A',
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
        };
    } catch (error) {
        console.error('Error obteniendo configuracion de descansos:', error);
        return null;
    }
};

// --- Excepciones de Descanso ---

export interface Excepcion {
    id: string;
    fechaDesde: Date;
    fechaHasta: Date;
    tipo: string;
    aplicaPar: boolean;
    aplicaImpar: boolean;
    descripcion?: string;
    nuevaLetra?: string;
    createdAt: Date;
}

export type ExcepcionData = Omit<Excepcion, 'id' | 'createdAt'>;

const docToExcepcion = (doc: any): Excepcion => {
    const data = doc.data();
    return {
        id: doc.id,
        fechaDesde: data.fechaDesde.toDate(),
        fechaHasta: data.fechaHasta.toDate(),
        tipo: data.tipo,
        aplicaPar: data.aplicaPar || false,
        aplicaImpar: data.aplicaImpar || false,
        descripcion: data.descripcion || '',
        nuevaLetra: data.nuevaLetra || undefined,
        createdAt: data.createdAt.toDate(),
    };
};

export const addExcepcion = async (excepcion: ExcepcionData): Promise<string> => {
    const dataToAdd: any = {
        // @ts-ignore
        fechaDesde: firebase.firestore.Timestamp.fromDate(excepcion.fechaDesde),
        // @ts-ignore
        fechaHasta: firebase.firestore.Timestamp.fromDate(excepcion.fechaHasta),
        tipo: excepcion.tipo,
        aplicaPar: excepcion.aplicaPar,
        aplicaImpar: excepcion.aplicaImpar,
        descripcion: excepcion.descripcion || '',
        // @ts-ignore
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (excepcion.nuevaLetra) {
        dataToAdd.nuevaLetra = excepcion.nuevaLetra;
    }
    
    const docRef = await excepcionesCollection.add(dataToAdd);
    return docRef.id;
};

export const getExcepciones = async (): Promise<Excepcion[]> => {
    const snapshot = await excepcionesCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(docToExcepcion);
};

export const updateExcepcion = async (id: string, excepcion: ExcepcionData): Promise<void> => {
    const dataToUpdate: any = {
        // @ts-ignore
        fechaDesde: firebase.firestore.Timestamp.fromDate(excepcion.fechaDesde),
        // @ts-ignore
        fechaHasta: firebase.firestore.Timestamp.fromDate(excepcion.fechaHasta),
        tipo: excepcion.tipo,
        aplicaPar: excepcion.aplicaPar,
        aplicaImpar: excepcion.aplicaImpar,
        descripcion: excepcion.descripcion || '',
    };
    
    if (excepcion.nuevaLetra) {
        dataToUpdate.nuevaLetra = excepcion.nuevaLetra;
    } else {
        // Si no hay nuevaLetra, eliminarla del documento
        dataToUpdate.nuevaLetra = firebase.firestore.FieldValue.delete();
    }
    
    await excepcionesCollection.doc(id).update(dataToUpdate);
};

export const deleteExcepcion = async (id: string): Promise<void> => {
    await excepcionesCollection.doc(id).delete();
};

// --- Análisis Avanzado ---

// --- Funciones auxiliares para determinar días de descanso ---

// Función auxiliar para parsear el patrón de fin de semana
const parseWeekendPattern = (patternRaw: string) => {
    const normalized = (patternRaw || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const saturdayMatch = normalized.match(/sabado\s*:\s*([a-z]+)/);
    const sundayMatch = normalized.match(/domingo\s*:\s*([a-z]+)/);

    return {
        saturday: (saturdayMatch?.[1] ?? 'ac').toUpperCase(),
        sunday: (sundayMatch?.[1] ?? 'bd').toUpperCase(),
    };
};

// Calcular la letra de un día específico
const calculateDayLetter = (
    date: Date,
    breakConfig: BreakConfiguration,
    excepciones: Excepcion[]
): string | null => {
    if (!breakConfig || !breakConfig.startDate) return null;

    try {
        const [dayStr, monthStr, yearStr] = breakConfig.startDate.split('/');
        const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
        const lettersArray = ['A', 'B', 'C', 'D'];
        const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;
        const weekendPattern = parseWeekendPattern(breakConfig.weekendPattern || '');

        const startLetter = breakConfig.startDayLetter || 'A';
        const startLetterIndex = lettersArray.indexOf(startLetter);
        if (startLetterIndex === -1) return null;

        const startDayOfWeek = startDate.getDay();
        const startWeekday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        const mondayOfStartWeekLetterIndex = mod(startLetterIndex - startWeekday, 4);

        // Verificar excepciones primero
        const dayDate = new Date(date);
        dayDate.setHours(0, 0, 0, 0);
        
        for (const excepcion of excepciones) {
            const fechaDesde = new Date(excepcion.fechaDesde);
            fechaDesde.setHours(0, 0, 0, 0);
            const fechaHasta = new Date(excepcion.fechaHasta);
            fechaHasta.setHours(23, 59, 59, 999);
            
            if (dayDate >= fechaDesde && dayDate <= fechaHasta) {
                if (excepcion.tipo === 'Cambio de Letra' && excepcion.nuevaLetra) {
                    return excepcion.nuevaLetra;
                }
            }
        }

        const diffTime = dayDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return null;

        const dayOfWeek = dayDate.getDay();
        const isSaturday = dayOfWeek === 6;
        const isSunday = dayOfWeek === 0;

        if (isSaturday || isSunday) {
            const weekNumber = Math.floor((diffDays + startWeekday) / 7);
            const swapPattern = weekNumber % 2 === 1;
            const saturdayLetters = swapPattern ? weekendPattern.sunday : weekendPattern.saturday;
            const sundayLetters = swapPattern ? weekendPattern.saturday : weekendPattern.sunday;
            return isSaturday ? saturdayLetters : sundayLetters;
        } else {
            const weekday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const weekNumber = Math.floor((diffDays + startWeekday) / 7);
            const mondayLetterIndex = mod(mondayOfStartWeekLetterIndex + weekNumber, 4);
            const letterIndex = mod(mondayLetterIndex + weekday, 4);
            return lettersArray[letterIndex];
        }
    } catch (error) {
        console.error('Error calculando letra del día:', error);
        return null;
    }
};

// Determinar si un día es de descanso
export const isRestDay = async (date: Date): Promise<boolean> => {
    try {
        const [breakConfig, excepciones] = await Promise.all([
            getBreakConfiguration(),
            getExcepciones(),
        ]);

        if (!breakConfig || !breakConfig.userBreakLetter) {
            return false; // Si no hay configuración, no es día de descanso
        }

        // Verificar si es vacaciones
        const dayDate = new Date(date);
        dayDate.setHours(0, 0, 0, 0);
        
        for (const excepcion of excepciones) {
            if (excepcion.tipo === 'Vacaciones') {
                const fechaDesde = new Date(excepcion.fechaDesde);
                fechaDesde.setHours(0, 0, 0, 0);
                const fechaHasta = new Date(excepcion.fechaHasta);
                fechaHasta.setHours(23, 59, 59, 999);
                
                if (dayDate >= fechaDesde && dayDate <= fechaHasta) {
                    return true;
                }
            }
        }

        const dayLetter = calculateDayLetter(date, breakConfig, excepciones);
        if (!dayLetter) return false;

        const userLetter = breakConfig.userBreakLetter.toUpperCase();
        const dayLetterUpper = dayLetter.toUpperCase();

        // Verificar si coincide con la letra del usuario
        return (
            dayLetterUpper === userLetter ||
            (dayLetterUpper === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
            (dayLetterUpper === 'BD' && (userLetter === 'B' || userLetter === 'D'))
        );
    } catch (error) {
        console.error('Error determinando si es día de descanso:', error);
        return false;
    }
};

// Obtener lista de días trabajados en un rango de fechas
export const getWorkingDays = async (startDate: Date, endDate: Date): Promise<Date[]> => {
    const workingDays: Date[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
        const isRest = await isRestDay(new Date(current));
        if (!isRest) {
            workingDays.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return workingDays;
};

// Obtener ingresos por hora del día (0-23) para un rango de fechas (solo días trabajados)
export const getIngresosByHour = async (startDate: Date, endDate: Date): Promise<number[]> => {
    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .get();

    const ingresosPorHora = new Array(24).fill(0);
    const [breakConfig, excepciones] = await Promise.all([
        getBreakConfiguration(),
        getExcepciones(),
    ]);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const fechaHora = data.fechaHora.toDate();
        
        // Verificar si es día de descanso
        const fechaDia = new Date(fechaHora);
        fechaDia.setHours(0, 0, 0, 0);
        
        // Verificar vacaciones
        let isVacaciones = false;
        for (const excepcion of excepciones) {
            if (excepcion.tipo === 'Vacaciones') {
                const fechaDesde = new Date(excepcion.fechaDesde);
                fechaDesde.setHours(0, 0, 0, 0);
                const fechaHasta = new Date(excepcion.fechaHasta);
                fechaHasta.setHours(23, 59, 59, 999);
                if (fechaDia >= fechaDesde && fechaDia <= fechaHasta) {
                    isVacaciones = true;
                    break;
                }
            }
        }
        
        if (isVacaciones) return; // Saltar días de vacaciones
        
        // Verificar letra de descanso
        if (breakConfig && breakConfig.userBreakLetter) {
            const dayLetter = calculateDayLetter(fechaDia, breakConfig, excepciones);
            if (dayLetter) {
                const userLetter = breakConfig.userBreakLetter.toUpperCase();
                const dayLetterUpper = dayLetter.toUpperCase();
                const isRest = (
                    dayLetterUpper === userLetter ||
                    (dayLetterUpper === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                    (dayLetterUpper === 'BD' && (userLetter === 'B' || userLetter === 'D'))
                );
                if (isRest) return; // Saltar días de descanso
            }
        }
        
        const hora = fechaHora.getHours(); // 0-23
        const cobrado = data.cobrado || 0;
        ingresosPorHora[hora] += cobrado;
    });

    return ingresosPorHora;
};

// Obtener ingresos por día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) - solo días trabajados
export const getIngresosByDayOfWeek = async (startDate: Date, endDate: Date): Promise<number[]> => {
    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .get();

    const ingresosPorDia = new Array(7).fill(0);
    const contadorPorDia = new Array(7).fill(0);
    const [breakConfig, excepciones] = await Promise.all([
        getBreakConfiguration(),
        getExcepciones(),
    ]);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const fechaHora = data.fechaHora.toDate();
        
        // Verificar si es día de descanso
        const fechaDia = new Date(fechaHora);
        fechaDia.setHours(0, 0, 0, 0);
        
        // Verificar vacaciones
        let isVacaciones = false;
        for (const excepcion of excepciones) {
            if (excepcion.tipo === 'Vacaciones') {
                const fechaDesde = new Date(excepcion.fechaDesde);
                fechaDesde.setHours(0, 0, 0, 0);
                const fechaHasta = new Date(excepcion.fechaHasta);
                fechaHasta.setHours(23, 59, 59, 999);
                if (fechaDia >= fechaDesde && fechaDia <= fechaHasta) {
                    isVacaciones = true;
                    break;
                }
            }
        }
        
        if (isVacaciones) return; // Saltar días de vacaciones
        
        // Verificar letra de descanso
        if (breakConfig && breakConfig.userBreakLetter) {
            const dayLetter = calculateDayLetter(fechaDia, breakConfig, excepciones);
            if (dayLetter) {
                const userLetter = breakConfig.userBreakLetter.toUpperCase();
                const dayLetterUpper = dayLetter.toUpperCase();
                const isRest = (
                    dayLetterUpper === userLetter ||
                    (dayLetterUpper === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                    (dayLetterUpper === 'BD' && (userLetter === 'B' || userLetter === 'D'))
                );
                if (isRest) return; // Saltar días de descanso
            }
        }
        
        const diaSemana = fechaHora.getDay(); // 0-6
        const cobrado = data.cobrado || 0;
        ingresosPorDia[diaSemana] += cobrado;
        contadorPorDia[diaSemana] += 1;
    });

    // Calcular promedio por día
    return ingresosPorDia.map((total, index) => 
        contadorPorDia[index] > 0 ? total / contadorPorDia[index] : 0
    );
};

// Obtener total de ingresos por día de la semana (sin promediar) - solo días trabajados
export const getTotalIngresosByDayOfWeek = async (startDate: Date, endDate: Date): Promise<number[]> => {
    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .get();

    const ingresosPorDia = new Array(7).fill(0);
    const [breakConfig, excepciones] = await Promise.all([
        getBreakConfiguration(),
        getExcepciones(),
    ]);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const fechaHora = data.fechaHora.toDate();
        
        // Verificar si es día de descanso
        const fechaDia = new Date(fechaHora);
        fechaDia.setHours(0, 0, 0, 0);
        
        // Verificar vacaciones
        let isVacaciones = false;
        for (const excepcion of excepciones) {
            if (excepcion.tipo === 'Vacaciones') {
                const fechaDesde = new Date(excepcion.fechaDesde);
                fechaDesde.setHours(0, 0, 0, 0);
                const fechaHasta = new Date(excepcion.fechaHasta);
                fechaHasta.setHours(23, 59, 59, 999);
                if (fechaDia >= fechaDesde && fechaDia <= fechaHasta) {
                    isVacaciones = true;
                    break;
                }
            }
        }
        
        if (isVacaciones) return; // Saltar días de vacaciones
        
        // Verificar letra de descanso
        if (breakConfig && breakConfig.userBreakLetter) {
            const dayLetter = calculateDayLetter(fechaDia, breakConfig, excepciones);
            if (dayLetter) {
                const userLetter = breakConfig.userBreakLetter.toUpperCase();
                const dayLetterUpper = dayLetter.toUpperCase();
                const isRest = (
                    dayLetterUpper === userLetter ||
                    (dayLetterUpper === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                    (dayLetterUpper === 'BD' && (userLetter === 'B' || userLetter === 'D'))
                );
                if (isRest) return; // Saltar días de descanso
            }
        }
        
        const diaSemana = fechaHora.getDay(); // 0-6
        const cobrado = data.cobrado || 0;
        ingresosPorDia[diaSemana] += cobrado;
    });

    return ingresosPorDia;
};

// Obtener ingresos de un mes específico (solo días trabajados)
export const getIngresosByMonthYear = async (month: number, year: number): Promise<number> => {
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfMonth);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfMonth);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .get();

    const [breakConfig, excepciones] = await Promise.all([
        getBreakConfiguration(),
        getExcepciones(),
    ]);

    return snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        const fechaHora = data.fechaHora.toDate();
        
        // Verificar si es día de descanso
        const fechaDia = new Date(fechaHora);
        fechaDia.setHours(0, 0, 0, 0);
        
        // Verificar vacaciones
        for (const excepcion of excepciones) {
            if (excepcion.tipo === 'Vacaciones') {
                const fechaDesde = new Date(excepcion.fechaDesde);
                fechaDesde.setHours(0, 0, 0, 0);
                const fechaHasta = new Date(excepcion.fechaHasta);
                fechaHasta.setHours(23, 59, 59, 999);
                if (fechaDia >= fechaDesde && fechaDia <= fechaHasta) {
                    return total; // Saltar días de vacaciones
                }
            }
        }
        
        // Verificar letra de descanso
        if (breakConfig && breakConfig.userBreakLetter) {
            const dayLetter = calculateDayLetter(fechaDia, breakConfig, excepciones);
            if (dayLetter) {
                const userLetter = breakConfig.userBreakLetter.toUpperCase();
                const dayLetterUpper = dayLetter.toUpperCase();
                const isRest = (
                    dayLetterUpper === userLetter ||
                    (dayLetterUpper === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                    (dayLetterUpper === 'BD' && (userLetter === 'B' || userLetter === 'D'))
                );
                if (isRest) return total; // Saltar días de descanso
            }
        }
        
        return total + (data.cobrado || 0);
    }, 0);
};

// Obtener gastos de un mes específico
export const getGastosByMonthYear = async (month: number, year: number): Promise<number> => {
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfMonth);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfMonth);

    const snapshot = await gastosCollection
        .where('fecha', '>=', startTimestamp)
        .where('fecha', '<=', endTimestamp)
        .get();

    return snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        return total + (data.importe || 0);
    }, 0);
};

// Obtener total de ingresos de un año específico (retorna número, no array) - solo días trabajados
export const getTotalIngresosByYear = async (year: number): Promise<number> => {
    const startOfYear = new Date(year, 0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfYear);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfYear);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startTimestamp)
        .where('fechaHora', '<=', endTimestamp)
        .get();

    const [breakConfig, excepciones] = await Promise.all([
        getBreakConfiguration(),
        getExcepciones(),
    ]);

    return snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        const fechaHora = data.fechaHora.toDate();
        
        // Verificar si es día de descanso
        const fechaDia = new Date(fechaHora);
        fechaDia.setHours(0, 0, 0, 0);
        
        // Verificar vacaciones
        for (const excepcion of excepciones) {
            if (excepcion.tipo === 'Vacaciones') {
                const fechaDesde = new Date(excepcion.fechaDesde);
                fechaDesde.setHours(0, 0, 0, 0);
                const fechaHasta = new Date(excepcion.fechaHasta);
                fechaHasta.setHours(23, 59, 59, 999);
                if (fechaDia >= fechaDesde && fechaDia <= fechaHasta) {
                    return total; // Saltar días de vacaciones
                }
            }
        }
        
        // Verificar letra de descanso
        if (breakConfig && breakConfig.userBreakLetter) {
            const dayLetter = calculateDayLetter(fechaDia, breakConfig, excepciones);
            if (dayLetter) {
                const userLetter = breakConfig.userBreakLetter.toUpperCase();
                const dayLetterUpper = dayLetter.toUpperCase();
                const isRest = (
                    dayLetterUpper === userLetter ||
                    (dayLetterUpper === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                    (dayLetterUpper === 'BD' && (userLetter === 'B' || userLetter === 'D'))
                );
                if (isRest) return total; // Saltar días de descanso
            }
        }
        
        return total + (data.cobrado || 0);
    }, 0);
};

// Obtener total de gastos de un año específico (retorna número, no array)
export const getTotalGastosByYear = async (year: number): Promise<number> => {
    const startOfYear = new Date(year, 0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    // @ts-ignore
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startOfYear);
    // @ts-ignore
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endOfYear);

    const snapshot = await gastosCollection
        .where('fecha', '>=', startTimestamp)
        .where('fecha', '<=', endTimestamp)
        .get();

    return snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        return total + (data.importe || 0);
    }, 0);
};



