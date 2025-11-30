// Servicio para gestionar recordatorios
// Almacena recordatorios en localStorage

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

const STORAGE_KEY = 'reminders';

/**
 * Obtener todos los recordatorios
 */
export const getReminders = (): Reminder[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error leyendo recordatorios:', error);
        return [];
    }
};

/**
 * Obtener recordatorios pendientes (no completados)
 */
export const getPendingReminders = (): Reminder[] => {
    return getReminders().filter(r => !r.completado);
};

/**
 * Obtener recordatorios que deben mostrarse hoy
 */
export const getRemindersForToday = (): Reminder[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    return getPendingReminders().filter(reminder => {
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
 * Obtener recordatorios que deben sonar ahora (hora actual)
 */
export const getRemindersToSound = (): Reminder[] => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    return getPendingReminders().filter(reminder => {
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
 * Guardar un recordatorio
 */
export const saveReminder = (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completado' | 'sonidoActivo'> & { sonidoActivo?: boolean }): string => {
    const reminders = getReminders();
    const newReminder: Reminder = {
        ...reminder,
        sonidoActivo: reminder.sonidoActivo ?? false,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        completado: false,
    };
    reminders.push(newReminder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    return newReminder.id;
};

/**
 * Actualizar un recordatorio
 */
export const updateReminder = (id: string, updates: Partial<Reminder>): boolean => {
    const reminders = getReminders();
    const index = reminders.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    reminders[index] = { ...reminders[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    return true;
};

/**
 * Marcar recordatorio como completado
 */
export const completeReminder = (id: string): boolean => {
    return updateReminder(id, {
        completado: true,
        fechaCompletado: new Date().toISOString(),
    });
};

/**
 * Eliminar un recordatorio
 */
export const deleteReminder = (id: string): boolean => {
    const reminders = getReminders();
    const filtered = reminders.filter(r => r.id !== id);
    if (filtered.length === reminders.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
};

/**
 * Verificar recordatorios de mantenimiento por kilómetros
 */
export const checkMaintenanceReminders = (kilometrosActuales: number): Reminder[] => {
    return getPendingReminders().filter(reminder => {
        if (reminder.tipo === 'mantenimiento' && reminder.kilometrosLimite) {
            const kilometrosRestantes = reminder.kilometrosLimite - kilometrosActuales;
            // Alertar cuando falten 1000 km o menos
            return kilometrosRestantes <= 1000;
        }
        return false;
    });
};

/**
 * Marcar recordatorio como notificado (para evitar spam de sonidos)
 */
export const markReminderAsNotified = (id: string): void => {
    const reminders = getReminders();
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.lastNotified = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    }
};

