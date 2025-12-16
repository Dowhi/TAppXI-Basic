import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TAppXIDB extends DBSchema {
    carreras: { key: string; value: any };
    gastos: { key: string; value: any };
    turnos: { key: string; value: any };
    proveedores: { key: string; value: any };
    conceptos: { key: string; value: any };
    talleres: { key: string; value: any };
    reminders: { key: string; value: any };
    customReports: { key: string; value: any };
    settings: { key: string; value: any };
    excepciones: { key: string; value: any };
    vales: { key: string; value: any };
}

const DB_NAME = 'tappxi-db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<TAppXIDB>>;

export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<TAppXIDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    db.createObjectStore('carreras', { keyPath: 'id' });
                    db.createObjectStore('gastos', { keyPath: 'id' });
                    db.createObjectStore('turnos', { keyPath: 'id' });
                }
                if (oldVersion < 2) {
                    // Check if stores exist before creating to avoid errors if version mismatch occurred previously
                    if (!db.objectStoreNames.contains('proveedores')) db.createObjectStore('proveedores', { keyPath: 'id' });
                    if (!db.objectStoreNames.contains('conceptos')) db.createObjectStore('conceptos', { keyPath: 'id' });
                    if (!db.objectStoreNames.contains('talleres')) db.createObjectStore('talleres', { keyPath: 'id' });
                    if (!db.objectStoreNames.contains('reminders')) db.createObjectStore('reminders', { keyPath: 'id' });
                    if (!db.objectStoreNames.contains('customReports')) db.createObjectStore('customReports', { keyPath: 'id' });
                }
                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings', { keyPath: 'key' });
                    }
                    if (!db.objectStoreNames.contains('excepciones')) {
                        db.createObjectStore('excepciones', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('vales')) {
                        db.createObjectStore('vales', { keyPath: 'id' });
                    }

                    // Migrations for existing stores to ensure keyPath
                    const stores = ['carreras', 'gastos', 'turnos', 'proveedores', 'conceptos', 'talleres', 'reminders', 'customReports', 'settings', 'excepciones', 'vales'];
                }
            },
        });
    }
    return dbPromise;
}

export async function addItem<T>(storeName: keyof TAppXIDB, _key: string, value: T) {
    const db = await getDB();
    return db.put(storeName as any, value);
}

export async function getItem<T>(storeName: keyof TAppXIDB, key: string): Promise<T | undefined> {
    const db = await getDB();
    return db.get(storeName as any, key);
}

export async function getAllItems<T>(storeName: keyof TAppXIDB): Promise<T[]> {
    const db = await getDB();
    return db.getAll(storeName as any);
}

export async function deleteItem(storeName: keyof TAppXIDB, key: string) {
    const db = await getDB();
    return db.delete(storeName as any, key);
}
