import { getTurnosByDate } from './api';
import { Turno } from '../types';

/**
 * Calcula el número del turno basado en cuántos turnos hay en el mismo día
 * Útil para turnos antiguos que no tienen número asignado
 */
export const calcularNumeroTurno = async (turno: Turno): Promise<number> => {
    // Si el turno ya tiene número, usarlo
    if (turno.numero) {
        return turno.numero;
    }

    // Obtener todos los turnos del mismo día
    const fechaTurno = new Date(turno.fechaInicio);
    fechaTurno.setHours(0, 0, 0, 0);
    
    const turnosDelDia = await getTurnosByDate(fechaTurno);
    
    // Ordenar por fecha de inicio
    const turnosOrdenados = turnosDelDia.sort((a, b) => 
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
    );

    // Encontrar la posición de este turno en la lista ordenada
    const indice = turnosOrdenados.findIndex(t => t.id === turno.id);
    
    // Si no se encuentra, retornar 1 como fallback
    return indice >= 0 ? indice + 1 : 1;
};




