// Servicio para gestionar recordatorios
// MIGRADO: Ahora utiliza Firebase a través de api.ts

import { addReminderFirebase, updateReminderFirebase, deleteReminderFirebase } from './api';

export interface Reminder {
    id: string;
    titulo: string;
    descripcion?: string;
    tipo: 'mantenimiento' | 'pago' | 'documentacion' | 'personalizado';
    fechaLimite: string; // ISO string
    horaRecordatorio?: string; // HH:MM formato
    fechaRecordatorio?: string; // ISO string - fecha para mostrar alerta antes
    sonidoActivo: boolean; // Si debe reproducir sonido
    completado: boolean;
    fechaCompletado?: string; // ISO string
    // Para mantenimiento por kilómetros
    kilometrosLimite?: number;
    kilometrosActuales?: number;
    // Metadatos
    createdAt: string;
    lastNotified?: string; // Última vez que se mostró la notificación
}

/**
 * @deprecated Use subscribeToReminders from api.ts instead
 */
export const getReminders = (): Reminder[] => {
    return []; // Deprecated, component should use subscription
};

/**
 * Helper para filtrar recordatorios pendientes (de una lista dada)
 */
export const filterPendingReminders = (reminders: Reminder[]): Reminder[] => {
    return reminders.filter(r => !r.completado);
};

/**
 * Obtener recordatorios que deben mostrarse hoy (filtro local)
 */
export const filterRemindersForToday = (reminders: Reminder[]): Reminder[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    return filterPendingReminders(reminders).filter(reminder => {
        const fechaLimite = new Date(reminder.fechaLimite);
        fechaLimite.setHours(0, 0, 0, 0);
        const fechaLimiteISO = fechaLimite.toISOString().split('T')[0];

        // Mostrar si es hoy o ya pasó
        if (fechaLimiteISO <= todayISO) {
            return true;
        }

        // Mostrar si hay fecha de recordatorio y es hoy o ya pasó
        if (reminder.fechaRecordatorio) {
            const fechaRecordatorio = new Date(reminder.fechaRecordatorio);
            fechaRecordatorio.setHours(0, 0, 0, 0);
            const fechaRecordatorioISO = fechaRecordatorio.toISOString().split('T')[0];
            if (fechaRecordatorioISO <= todayISO) {
                return true;
            }
        }

        return false;
    });
};

/**
 * DEPRECATED: Usa filterRemindersForToday pasando la lista de suscripción.
 * Mantenido por compatibilidad temporal si es necesario, pero devolverá vacío.
 */
export const getRemindersForToday = (): Reminder[] => {
    return [];
};


/**
 * Obtener recordatorios que deben sonar ahora (hora actual) - Filtro Local
 */
export const filterRemindersToSound = (reminders: Reminder[]): Reminder[] => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    return filterPendingReminders(reminders).filter(reminder => {
        // Solo recordatorios con sonido activo
        if (!reminder.sonidoActivo || !reminder.horaRecordatorio) {
            return false;
        }

        // Verificar que la fecha sea hoy
        const fechaLimite = new Date(reminder.fechaLimite);
        fechaLimite.setHours(0, 0, 0, 0);
        const fechaLimiteISO = fechaLimite.toISOString().split('T')[0];

        if (fechaLimiteISO === todayISO) {
            // Verificar si la hora coincide (con margen de 1 minuto)
            const [hora, minuto] = reminder.horaRecordatorio.split(':').map(Number);
            const diffMinutes = Math.abs((currentHour * 60 + currentMinute) - (hora * 60 + minuto));
            if (diffMinutes <= 1) {
                // Verificar que no se haya notificado en los últimos 5 minutos
                if (reminder.lastNotified) {
                    const lastNotified = new Date(reminder.lastNotified);
                    const diffMs = now.getTime() - lastNotified.getTime();
                    const diffMins = diffMs / (1000 * 60);
                    if (diffMins < 5) {
                        return false; // Ya se notificó recientemente
                    }
                }
                return true;
            }
        }

        return false;
    });
};

/**
 * Guardar un recordatorio (Firebase)
 */
export const saveReminder = async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completado' | 'sonidoActivo'> & { sonidoActivo?: boolean }): Promise<string> => {
    const newReminder: any = {
        ...reminder,
        sonidoActivo: reminder.sonidoActivo ?? false,
        completado: false,
    };
    return await addReminderFirebase(newReminder);
};

/**
 * Actualizar un recordatorio (Firebase)
 */
export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<void> => {
    await updateReminderFirebase(id, updates);
};

/**
 * Marcar recordatorio como completado (Firebase)
 */
export const completeReminder = async (id: string): Promise<void> => {
    await updateReminderFirebase(id, {
        completado: true,
        fechaCompletado: new Date().toISOString(),
    });
};

/**
 * Eliminar un recordatorio (Firebase)
 */
export const deleteReminder = async (id: string): Promise<void> => {
    await deleteReminderFirebase(id);
};

/**
 * Verificar recordatorios de mantenimiento por kilómetros (Filtro Local)
 */
export const checkMaintenanceReminders = (kilometrosActuales: number, reminders: Reminder[]): Reminder[] => {
    return filterPendingReminders(reminders).filter(reminder => {
        if (reminder.tipo === 'mantenimiento' && reminder.kilometrosLimite) {
            const kilometrosRestantes = reminder.kilometrosLimite - kilometrosActuales;
            // Alertar cuando falten 1000 km o menos
            return kilometrosRestantes <= 1000;
        }
        return false;
    });
};

/**
 * Marcar recordatorio como notificado (Firebase)
 */
export const markReminderAsNotified = async (id: string): Promise<void> => {
    await updateReminderFirebase(id, { lastNotified: new Date().toISOString() });
};


