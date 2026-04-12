import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8bWJ0RPlhWyJPiWA6Qc9huE9EkFmzKZM",
  authDomain: "tappxi-21346.firebaseapp.com",
  projectId: "tappxi-21346",
  storageBucket: "tappxi-21346.firebasestorage.app",
  messagingSenderId: "673476741503",
  appId: "1:673476741503:web:3a5889a3ae8ebd6e34b24a",
  measurementId: "G-D9B359QTKC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const cleanForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(cleanForFirestore);
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v !== undefined) {
                newObj[k] = cleanForFirestore(v);
            }
        }
        return newObj;
    }
    return obj;
};

const COLLECTION_MAP: Record<string, string> = {
    'Carreras': 'carreras',
    'Gastos': 'gastos',
    'Incisos': 'incisos',
    'Turnos': 'turnos',
    'Proveedores': 'proveedores',
    'Conceptos': 'conceptos',
    'Talleres': 'talleres',
    'Recordatorios': 'recordatorios',
    'Excepciones': 'excepciones',
    'Vales': 'vales',
    'Informes': 'informes',
    'Ajustes': 'ajustes',
    'OtrosIngresos': 'otrosIngresos'
};

class FirebaseSync {
    async create(collection: string, data: any) {
        try {
            const col = COLLECTION_MAP[collection] || collection.toLowerCase();
            const id = data.id || data.clave || crypto.randomUUID();
            const docRef = doc(db, col, id);
            await setDoc(docRef, cleanForFirestore(data), { merge: true });
        } catch (e) {
            console.error(`Error de guardado pasivo (Firebase) en ${collection}:`, e);
        }
    }

    async update(collection: string, data: any) {
        try {
            const col = COLLECTION_MAP[collection] || collection.toLowerCase();
            const id = data.id || data.clave;
            if (!id) return;
            const docRef = doc(db, col, id);
            await setDoc(docRef, cleanForFirestore(data), { merge: true });
        } catch (e) {
            console.error(`Error de update pasivo (Firebase) en ${collection}:`, e);
        }
    }

    async delete(collection: string, id: string) {
        try {
            const col = COLLECTION_MAP[collection] || collection.toLowerCase();
            const docRef = doc(db, col, id);
            await deleteDoc(docRef);
        } catch (e) {
            console.error(`Error de borrado pasivo (Firebase) en ${collection}:`, e);
        }
    }
}

export const firebaseSync = new FirebaseSync();
