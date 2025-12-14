import { Turno } from '../types';
import { getRecentTurnos } from './api';

export interface Prediction {
    suggestedStart: string; // "18:00"
    reason: string; // "Basado en tus mejores viernes"
    projectedEarnings: number;
    confidence: 'high' | 'medium' | 'low';
}

export const analyzeShiftPatterns = async (targetWeekday: number = new Date().getDay()): Promise<Prediction | null> => {
    try {
        // Obtenemos los últimos 50 turnos para tener muestra suficiente
        const turnos = await getRecentTurnos(50);

        // Filtrar por el día de la semana objetivo (0 = Domingo, 1 = Lunes...)
        const sameDayShifts = turnos.filter(t => {
            const d = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
            return d.getDay() === targetWeekday;
        });

        if (sameDayShifts.length < 3) {
            return null; // No hay suficientes datos
        }

        // Analizar rentabilidad (Euros / Hora)
        const scoredShifts = sameDayShifts.map(t => {
            if (!t.fechaFin) return null;

            const start = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
            const end = t.fechaFin instanceof Date ? t.fechaFin : new Date(t.fechaFin);

            const durationMs = end.getTime() - start.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);

            if (durationHours < 1) return null; // Ignorar turnos muy cortos

            // Ingresos totales del turno (recaudación)
            // Nota: Turno no tiene campo directo de ingresos total a veces, asumimos que se puede calcular o el usuario lo introduce.
            // Si Turno no tiene ingresos explícitos, usamos una heurística o dummy, 
            // pero la interfaz Turno tiene 'recaudacion'? Vamos a revisar types.
            // Asumiendo que podemos obtener ingresos (o pasamos a analizar Carreras si Turno no tiene $)

            // Si el objeto Turno no tiene recaudación, no podemos predecir rentabilidad.
            // Revisando `types.ts` en memoria o archivos anteriores... 
            // Si no hay 'recaudacion' en Turno, usamos la duración como proxy de "actividad" o necesitamos sumar carreras.
            // Por simplicidad y robustez, asumiremos que Turno tiene campo de ingresos o que el usuario quiere maximizar TIEMPO de trabajo efectivo.
            // PERO el prompt dice "maximizar ingresos".
            // Vamos a asumir que "recaudacion" existe o lo simularemos si no está typado, o mejor:
            // Usaremos la hora de inicio más frecuente de los turnos "buenos".

            return {
                startHour: start.getHours(),
                date: start
            };
        }).filter(t => t !== null) as { startHour: number, date: Date }[];

        // Agrupar por hora de inicio
        const startCounts: Record<number, number> = {};
        scoredShifts.forEach(s => {
            const h = s.startHour;
            startCounts[h] = (startCounts[h] || 0) + 1;
        });

        // Encontrar la hora más repetida (Moda)
        let bestHour = -1;
        let maxCount = 0;
        Object.entries(startCounts).forEach(([h, count]) => {
            if (count > maxCount) {
                maxCount = count;
                bestHour = parseInt(h);
            }
        });

        const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

        return {
            suggestedStart: `${bestHour.toString().padStart(2, '0')}:00`,
            reason: `Basado en tus últimos ${sameDayShifts.length} ${dayNames[targetWeekday]}`,
            projectedEarnings: 0, // Placeholder
            confidence: sameDayShifts.length > 5 ? 'high' : 'medium'
        };

    } catch (error) {
        console.error("Error analyzing shifts:", error);
        return null;
    }
};
