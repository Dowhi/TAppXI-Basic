/** Stub implementation for maintenance functions after removing Firebase dependencies. */

export interface ArchiveResult {
    collection: string;
    moved: number;
}

/**
 * Archive operational data older than cutoffDate.
 * Since IndexedDB does not require archiving, this returns an empty array.
 */
export const archiveOperationalDataOlderThan = async (cutoffDate: Date): Promise<ArchiveResult[]> => {
    // No archiving needed for local IndexedDB storage.
    return [];
};

/**
 * Returns a relative cutoff date (e.g., monthsAgo months before today).
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
