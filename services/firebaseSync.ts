import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
export const auth = getAuth(app);
export const db = getFirestore(app);


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
    private getPath(collectionName: string, id: string) {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');
        const col = COLLECTION_MAP[collectionName] || collectionName.toLowerCase();
        return doc(db, 'usuarios', user.uid, col, id);
    }

    async ensureUserProfile() {
        const user = auth.currentUser;
        if (!user) return null;
        
        const userRef = doc(db, 'usuarios', user.uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
            const profile = {
                email: user.email,
                displayName: user.displayName,
                createdAt: new Date().toISOString(),
                isPremium: false,
                trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
            };
            await setDoc(userRef, profile);
            return profile;
        }
        return snap.data();
    }

    async create(collection: string, data: any) {
        try {
            if (!auth.currentUser) return;
            const id = data.id || data.clave || crypto.randomUUID();
            const docRef = this.getPath(collection, id);
            await setDoc(docRef, cleanForFirestore(data), { merge: true });
        } catch (e) {
            console.error(`Error de guardado pasivo (Firebase) en ${collection}:`, e);
        }
    }

    async update(collection: string, data: any) {
        try {
            if (!auth.currentUser) return;
            const id = data.id || data.clave;
            if (!id) return;
            const docRef = this.getPath(collection, id);
            await setDoc(docRef, cleanForFirestore(data), { merge: true });
        } catch (e) {
            console.error(`Error de update pasivo (Firebase) en ${collection}:`, e);
        }
    }

    async delete(collection: string, id: string) {
        try {
            if (!auth.currentUser) return;
            const docRef = this.getPath(collection, id);
            await deleteDoc(docRef);
        } catch (e) {
            console.error(`Error de borrado pasivo (Firebase) en ${collection}:`, e);
        }
    }

    async downloadAll(): Promise<Record<string, any[]>> {
        const user = auth.currentUser;
        if (!user) return {};
        
        const results: Record<string, any[]> = {};
        for (const [key, colName] of Object.entries(COLLECTION_MAP)) {
            try {
                const querySnapshot = await getDocs(collection(db, 'usuarios', user.uid, colName));
                results[key] = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            } catch (e) {
                console.error(`Error descargando coleccion ${colName}:`, e);
                results[key] = [];
            }
        }
        return results;
    }
}

export const firebaseSync = new FirebaseSync();

