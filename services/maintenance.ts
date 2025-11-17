import { db } from '../firebaseConfig';

// @ts-ignore - `firebase` está disponible globalmente por el SDK v8 cargado en index.html
declare const firebase: any;

const BATCH_LIMIT = 400;

export interface ArchiveResult {
    collection: string;
    moved: number;
}

interface ArchiveParams {
    collection: string;
    dateField: string;
    cutoffDate: Date;
    deleteOriginals?: boolean;
}

const archiveCollectionName = (collection: string) => `${collection}_archivo`;

const archiveOldDocuments = async ({
    collection,
    dateField,
    cutoffDate,
    deleteOriginals = true,
}: ArchiveParams): Promise<ArchiveResult> => {
    const cutoff = firebase.firestore.Timestamp.fromDate(cutoffDate);
    let moved = 0;
    const sourceCollection = db.collection(collection);
    const targetCollection = db.collection(archiveCollectionName(collection));

    // Procesar en lotes para evitar exceder límites de Firestore
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const snapshot = await sourceCollection
            .where(dateField, '<', cutoff)
            .orderBy(dateField, 'asc')
            .limit(BATCH_LIMIT)
            .get();

        if (snapshot.empty) {
            break;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            const archiveRef = targetCollection.doc(doc.id);
            batch.set(archiveRef, data, { merge: false });
            if (deleteOriginals) {
                batch.delete(doc.ref);
            }
        });

        await batch.commit();
        moved += snapshot.size;

        if (snapshot.size < BATCH_LIMIT) {
            break;
        }
    }

    return { collection, moved };
};

/**
 * Archivar y limpiar datos antiguos de colecciones principales:
 * - carreras (campo fechaHora)
 * - gastos (campo fecha)
 * - turnos (campo fechaInicio)
 *
 * Los documentos se copian a colecciones *_archivo y, por defecto, se eliminan
 * de las colecciones operativas para mejorar rendimiento y coste.
 */
export const archiveOperationalDataOlderThan = async (cutoffDate: Date): Promise<ArchiveResult[]> => {
    const [carreras, gastos, turnos] = await Promise.all([
        archiveOldDocuments({
            collection: 'carreras',
            dateField: 'fechaHora',
            cutoffDate,
        }),
        archiveOldDocuments({
            collection: 'gastos',
            dateField: 'fecha',
            cutoffDate,
        }),
        archiveOldDocuments({
            collection: 'turnos',
            dateField: 'fechaInicio',
            cutoffDate,
        }),
    ]);

    return [carreras, gastos, turnos];
};

/**
 * Devuelve una fecha de corte relativa (por ejemplo, hace 12 meses).
 */
export const getRelativeCutoffDate = (monthsAgo: number): Date => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() - monthsAgo;
    const day = now.getDate();
    const cutoff = new Date(year, month, day);
    cutoff.setHours(0, 0, 0, 0);
    return cutoff;
};



