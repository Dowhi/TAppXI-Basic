import { Turno, CarreraVista } from '../types';
import { getRecentTurnos, getCarreras } from './api';
import { calculateTurnoTimes } from './timeUtils';

export interface Prediction {
    suggestedStart: string; // "08:00"
    suggestedDuration: number; // in hours
    projectedEarnings: number;
    projectedKms: number;
    optimalBreakTime?: string; // "14:00"
    reason: string;
    confidence: 'high' | 'medium' | 'low';
}

export const analyzeShiftPatterns = async (targetWeekday: number = new Date().getDay()): Promise<Prediction | null> => {
    try {
        const [turnos, allCarreras] = await Promise.all([
            getRecentTurnos(100), // More data for better stats
            getCarreras()
        ]);

        const sameDayShifts = turnos.filter(t => {
            const d = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
            return d.getDay() === targetWeekday && t.fechaFin; // Only completed shifts
        });

        if (sameDayShifts.length < 2) return null;

        let totalEarnings = 0;
        let totalDurationHours = 0;
        let totalKms = 0;
        const startHours: number[] = [];
        const breakStartHours: number[] = [];

        sameDayShifts.forEach(t => {
            // Duration
            const times = calculateTurnoTimes(t);
            totalDurationHours += times.horasBrutasMs / (1000 * 60 * 60);

            // Earnings for this shift
            const shiftCarreras = allCarreras.filter(c => c.turnoId === t.id);
            const shiftEarnings = shiftCarreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
            totalEarnings += shiftEarnings;

            // Kilometers
            if (t.kilometrosFin && t.kilometrosInicio) {
                totalKms += (t.kilometrosFin - t.kilometrosInicio);
            }

            // Start Hour
            startHours.push(new Date(t.fechaInicio).getHours());

            // Breaks
            if (t.descansos && t.descansos.length > 0) {
                t.descansos.forEach(d => {
                    breakStartHours.push(new Date(d.fechaInicio).getHours());
                });
            }
        });

        const count = sameDayShifts.length;
        
        // Find Mode for Start Hour
        const getMode = (arr: number[]) => {
            const counts: Record<number, number> = {};
            arr.forEach(h => counts[h] = (counts[h] || 0) + 1);
            return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a, ['-1', 0])[0];
        };

        const bestStartHour = parseInt(getMode(startHours));
        const bestBreakHour = breakStartHours.length > 0 ? parseInt(getMode(breakStartHours)) : undefined;

        const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

        return {
            suggestedStart: `${bestStartHour.toString().padStart(2, '0')}:00`,
            suggestedDuration: totalDurationHours / count,
            projectedEarnings: totalEarnings / count,
            projectedKms: totalKms / count,
            optimalBreakTime: bestBreakHour !== undefined ? `${bestBreakHour.toString().padStart(2, '0')}:00` : undefined,
            reason: `Basado en tus últimos ${count} ${dayNames[targetWeekday]}`,
            confidence: count > 8 ? 'high' : count > 4 ? 'medium' : 'low'
        };

    } catch (error) {
        console.error("Error analyzing shifts:", error);
        return null;
    }
};
