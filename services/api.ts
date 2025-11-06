
import { db } from '../firebaseConfig';
import { CarreraVista, Gasto, Turno, Proveedor, Concepto, Taller } from '../types';

// Type for data sent to Firestore (without id)
export type CarreraData = Omit<CarreraVista, 'id'>;

const carrerasCollection = db.collection('carreras');
const gastosCollection = db.collection('gastos');
const turnosCollection = db.collection('turnos');
const talleresCollection = db.collection('talleres');
const proveedoresCollection = db.collection('proveedores');
const conceptosCollection = db.collection('conceptos');
const ajustesCollection = db.collection('ajustes');

// --- Converters ---

const docToCarrera = (doc: any): CarreraVista => {
    const data = doc.data();
    return {
        id: doc.id,
        taximetro: data.taximetro,
        cobrado: data.cobrado,
        formaPago: data.formaPago,
        emisora: data.emisora,
        aeropuerto: data.aeropuerto,
        fechaHora: data.fechaHora.toDate(), // Convert Firestore Timestamp to JS Date
        turnoId: data.turnoId || undefined, // ID del turno relacionado
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
    const snapshot = await carrerasCollection.orderBy('fechaHora', 'desc').get();
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
        emisora: carrera.emisora,
        aeropuerto: carrera.aeropuerto,
        // @ts-ignore
        fechaHora: carrera.fechaHora ? firebase.firestore.Timestamp.fromDate(carrera.fechaHora) : firebase.firestore.FieldValue.serverTimestamp()
    };

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
    await carrerasCollection.doc(id).update(carrera);
};

export const deleteCarrera = (id: string) => {
    return carrerasCollection.doc(id).delete();
};


// Home Screen Data
export const getIngresosForCurrentMonth = async (): Promise<number> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const snapshot = await carrerasCollection
        .where('fechaHora', '>=', startOfMonth)
        .where('fechaHora', '<=', endOfMonth)
        .get();

    return snapshot.docs.reduce((total, doc) => total + doc.data().cobrado, 0);
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
    tamañoFuente: number;
    letraDescanso: string;
    objetivoDiario: number;
}

export const saveAjustes = async (ajustes: Ajustes): Promise<void> => {
    try {
        // Obtener el documento de ajustes (si existe)
        const ajustesSnapshot = await ajustesCollection.limit(1).get();
        
        if (!ajustesSnapshot.empty) {
            // Actualizar el documento existente
            const docId = ajustesSnapshot.docs[0].id;
            await ajustesCollection.doc(docId).update(ajustes);
        } else {
            // Crear un nuevo documento
            await ajustesCollection.add(ajustes);
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
        return snapshot.docs[0].data() as Ajustes;
    } catch (error) {
        console.error('Error obteniendo ajustes:', error);
        return null;
    }
};
