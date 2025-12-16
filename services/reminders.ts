// Servicio para gestionar recordatorios
// MIGRADO: Ahora utiliza IndexedDB a través de api.ts

import { addReminder, updateReminder as apiUpdateReminder, deleteReminder as apiDeleteReminder } from './api';
import type { Reminder } from '../types';

/**
 * @deprecated Use getReminders from api.ts instead (async)
 */
export const getReminders = (): Reminder[] => {
    return []; // Deprecated
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
 * Guardar un recordatorio (IndexedDB)
 */
export const saveReminder = async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completado' | 'sonidoActivo'> & { sonidoActivo?: boolean }): Promise<string> => {
    // Generate temporary ID if needed, but addReminder will handle it
    const newReminder: Reminder = {
        id: crypto.randomUUID(),
        ...reminder,
        sonidoActivo: reminder.sonidoActivo ?? false,
        completado: false,
        createdAt: new Date().toISOString(),
    };
    return await addReminder(newReminder);
};

/**
 * Actualizar un recordatorio (IndexedDB)
 */
export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<void> => {
    await apiUpdateReminder(id, updates);
};

/**
 * Marcar recordatorio como completado (IndexedDB)
 */
export const completeReminder = async (id: string): Promise<void> => {
    await apiUpdateReminder(id, {
        completado: true,
        fechaCompletado: new Date().toISOString(),
    });
};

/**
 * Eliminar un recordatorio (IndexedDB)
 */
export const deleteReminder = async (id: string): Promise<void> => {
    await apiDeleteReminder(id);
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
 * Marcar recordatorio como notificado (IndexedDB)
 */
export const markReminderAsNotified = async (id: string): Promise<void> => {
    await apiUpdateReminder(id, { lastNotified: new Date().toISOString() });
};


