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

export interface HourlyAverages {
    day: number; // 0-6
    dayName: string;
    hourlyData: {
        hour: number;
        average: number;
        count: number;
    }[];
}

export const calculateHourlyAveragesByDay = async (year?: number, month?: number): Promise<HourlyAverages[]> => {
    try {
        let carreras = await getCarreras();
        
        if (year !== undefined) {
            carreras = carreras.filter(c => {
                const date = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                return date.getFullYear() === year;
            });
        }
        
        if (month !== undefined) {
            carreras = carreras.filter(c => {
                const date = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                return date.getMonth() === month;
            });
        }
        
        // Agrupar carreras por día de la semana y turno
        // Estructura: [día][turnoId] = array de carreras ordenadas por hora
        const dayTurnoMap: Record<number, Record<string, CarreraVista[]>> = {};
        
        for (let day = 0; day < 7; day++) {
            dayTurnoMap[day] = {};
        }
        
        carreras.forEach(c => {
            const date = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
            const day = date.getDay();
            const turnoId = c.turnoId || 'sin-turno';
            
            if (!dayTurnoMap[day][turnoId]) {
                dayTurnoMap[day][turnoId] = [];
            }
            dayTurnoMap[day][turnoId].push(c);
        });
        
        // Para cada día y hora, calcular el acumulado promedio entre turnos
        const dayHourMap: Record<number, Record<number, { acumulados: number[]; count: number }>> = {};
        
        for (let day = 0; day < 7; day++) {
            dayHourMap[day] = {};
            for (let hour = 0; hour < 24; hour++) {
                dayHourMap[day][hour] = { acumulados: [], count: 0 };
            }
        }
        
        // Por cada turno de cada día
        for (let day = 0; day < 7; day++) {
            Object.values(dayTurnoMap[day]).forEach(carrerasDelTurno => {
                // Calcular acumulado por hora para este turno
                let acumulado = 0;
                const carrerasOrdenadas = [...carrerasDelTurno].sort((a, b) => {
                    const dateA = a.fechaHora instanceof Date ? a.fechaHora : new Date(a.fechaHora);
                    const dateB = b.fechaHora instanceof Date ? b.fechaHora : new Date(b.fechaHora);
                    return dateA.getTime() - dateB.getTime();
                });
                
                // Crear mapa de horas con acumulado
                const acumuladoPorHora: Record<number, number> = {};
                
                carrerasOrdenadas.forEach(c => {
                    const date = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                    const hour = date.getHours();
                    acumulado += c.cobrado || 0;
                    
                    // Guardar el acumulado para cada hora (se sobrescribe si hay varias carreras en la misma hora)
                    acumuladoPorHora[hour] = acumulado;
                });
                
                // Llenar las horas que faltan con el acumulado anterior
                let ultimoAcumulado = 0;
                for (let hour = 0; hour < 24; hour++) {
                    if (acumuladoPorHora[hour] !== undefined) {
                        ultimoAcumulado = acumuladoPorHora[hour];
                    }
                    if (ultimoAcumulado > 0 || hour === 0) {
                        dayHourMap[day][hour].acumulados.push(ultimoAcumulado);
                        dayHourMap[day][hour].count++;
                    }
                }
            });
        }
        
        // Construir resultado con promedios de acumulados
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const result: HourlyAverages[] = [];
        const order = [1, 2, 3, 4, 5, 6, 0]; // Lunes -> Domingo
        
        for (const day of order) {
            const hourlyData = [];
            for (let hour = 0; hour < 24; hour++) {
                const { acumulados, count } = dayHourMap[day][hour];
                const promedioAcumulado = count > 0 ? acumulados.reduce((a, b) => a + b, 0) / count : 0;
                hourlyData.push({
                    hour,
                    average: promedioAcumulado,
                    count
                });
            }
            result.push({
                day,
                dayName: dayNames[day],
                hourlyData
            });
        }
        
        return result;
    } catch (error) {
        console.error("Error calculating hourly averages:", error);
        return [];
    }
};

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

        // Agrupar turnos por día (Fecha YYYY-MM-DD)
        const dayStats: Record<string, { earnings: number; duration: number; kms: number; starts: number[]; breaks: number[] }> = {};
        
        sameDayShifts.forEach(t => {
            const date = new Date(t.fechaInicio);
            const dateKey = date.toISOString().split('T')[0];
            
            if (!dayStats[dateKey]) {
                dayStats[dateKey] = { earnings: 0, duration: 0, kms: 0, starts: [], breaks: [] };
            }
            
            // Earnings
            const shiftCarreras = allCarreras.filter(c => c.turnoId === t.id);
            const shiftEarnings = shiftCarreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
            dayStats[dateKey].earnings += shiftEarnings;
            
            // Duration
            const times = calculateTurnoTimes(t);
            dayStats[dateKey].duration += times.horasBrutasMs / (1000 * 60 * 60);
            
            // Kms
            if (t.kilometrosFin && t.kilometrosInicio) {
                dayStats[dateKey].kms += (t.kilometrosFin - t.kilometrosInicio);
            }
            
            // Collect start hours and breaks for mode calculation
            dayStats[dateKey].starts.push(date.getHours());
            if (t.descansos) {
                t.descansos.forEach(d => dayStats[dateKey].breaks.push(new Date(d.fechaInicio).getHours()));
            }
        });

        const dayKeys = Object.keys(dayStats);
        const dayCount = dayKeys.length;
        
        if (dayCount === 0) return null;

        // Averages per day
        const totalDailyEarnings = dayKeys.reduce((sum, key) => sum + dayStats[key].earnings, 0);
        const totalDailyDuration = dayKeys.reduce((sum, key) => sum + dayStats[key].duration, 0);
        const totalDailyKms = dayKeys.reduce((sum, key) => sum + dayStats[key].kms, 0);

        // All starts and breaks for mode
        const allStarts = Object.values(dayStats).flatMap(d => d.starts);
        const allBreaks = Object.values(dayStats).flatMap(d => d.breaks);

        const getMode = (arr: number[]) => {
            if (arr.length === 0) return '-1';
            const counts: Record<number, number> = {};
            arr.forEach(h => counts[h] = (counts[h] || 0) + 1);
            return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a, ['-1', 0])[0];
        };

        const bestStartHour = parseInt(getMode(allStarts));
        const bestBreakHour = allBreaks.length > 0 ? parseInt(getMode(allBreaks)) : undefined;

        const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

        return {
            suggestedStart: bestStartHour >= 0 ? `${bestStartHour.toString().padStart(2, '0')}:00` : "08:00",
            suggestedDuration: totalDailyDuration / dayCount,
            projectedEarnings: totalDailyEarnings / dayCount,
            projectedKms: totalDailyKms / dayCount,
            optimalBreakTime: bestBreakHour !== undefined ? `${bestBreakHour.toString().padStart(2, '0')}:00` : undefined,
            reason: `Basado en tus últimos ${dayCount} ${dayNames[targetWeekday]} trabajados`,
            confidence: dayCount > 6 ? 'high' : dayCount > 3 ? 'medium' : 'low'
        };

    } catch (error) {
        console.error("Error analyzing shifts:", error);
        return null;
    }
};
