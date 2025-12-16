// Servicio para gestionar avisos sonoros de recordatorios

import { filterRemindersToSound, markReminderAsNotified } from './reminders';
import { Reminder } from '../types';
import { subscribeToReminders } from './api';

let soundCheckInterval: NodeJS.Timeout | null = null;
let lastCheckedTime = '';
let currentReminders: Reminder[] = [];
let unsubscribeReminders: (() => void) | null = null;

/**
 * Reproducir sonido de notificación
 */
const playNotificationSound = (): void => {
    try {
        // Crear un audio context para generar un sonido
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configurar el sonido (beep agradable)
        oscillator.frequency.value = 800; // Frecuencia en Hz
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // Repetir 2 veces para que sea más notorio
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();
            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);
            oscillator2.frequency.value = 800;
            oscillator2.type = 'sine';
            gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.5);
        }, 600);
    } catch (error) {
        console.error('Error reproduciendo sonido:', error);
        // Fallback: usar beep del sistema si está disponible
        if ((window as any).beep) {
            (window as any).beep();
        }
    }
};

/**
 * Verificar y reproducir sonidos de recordatorios
 */
const checkAndPlaySounds = (): void => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Solo verificar una vez por minuto
    if (currentTime === lastCheckedTime) {
        return;
    }

    lastCheckedTime = currentTime;

    // Usar la lista en memoria (actualizada por la suscripción)
    const remindersToSound = filterRemindersToSound(currentReminders);

    if (remindersToSound.length > 0) {
        // Reproducir sonido
        playNotificationSound();

        // Marcar como notificados para evitar spam
        remindersToSound.forEach(reminder => {
            markReminderAsNotified(reminder.id);
        });

        // Mostrar notificación visual si el navegador lo permite
        if ('Notification' in window && Notification.permission === 'granted') {
            remindersToSound.forEach(reminder => {
                new Notification(`Recordatorio: ${reminder.titulo}`, {
                    body: reminder.descripcion || 'Tienes un recordatorio pendiente',
                    icon: '/pwa-192x192.png',
                    tag: reminder.id,
                });
            });
        }
    }
};

/**
 * Iniciar verificación periódica de recordatorios con sonido
 */
export const startReminderSoundCheck = (): void => {
    // Verificar cada minuto
    if (soundCheckInterval) {
        clearInterval(soundCheckInterval);
    }

    // Suscribirse a los recordatorios si no existe suscripción activa
    if (!unsubscribeReminders) {
        unsubscribeReminders = subscribeToReminders((data: any[]) => {
            currentReminders = data;
            // Opcional: verificar al recibir nuevos datos (aunque mejor respetar el intervalo de minuto)
        });
    }

    // Verificar inmediatamente (esperar un poco a que cargue la suscripción si es la primera vez)
    setTimeout(() => {
        checkAndPlaySounds();
    }, 2000);

    // Luego verificar cada minuto
    soundCheckInterval = setInterval(() => {
        checkAndPlaySounds();
    }, 60000); // 60 segundos
};

/**
 * Detener verificación de recordatorios con sonido
 */
export const stopReminderSoundCheck = (): void => {
    if (soundCheckInterval) {
        clearInterval(soundCheckInterval);
        soundCheckInterval = null;
    }

    if (unsubscribeReminders) {
        unsubscribeReminders();
        unsubscribeReminders = null;
    }
};

/**
 * Solicitar permiso para notificaciones (si el navegador lo soporta)
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};
















