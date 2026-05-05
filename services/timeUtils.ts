export const parseSafeDate = (d: any): Date => {
    if (d instanceof Date) return d;
    if (!d) return new Date(0);

    if (typeof d === 'string' && d.includes('/')) {
        const parts = d.split(' ')[0].split('/'); // Handle 'DD/MM/YYYY HH:MM' or 'DD/MM/YYYY'
        const timeParts = d.includes(' ') ? d.split(' ')[1].split(':') : ['0', '0'];
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            return new Date(year, month, day, hours, minutes);
        }
    }

    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export const calculateTurnoTimes = (turno: any) => {
    if (!turno || !turno.fechaInicio) {
        return {
            horasBrutasMs: 0,
            horasDescansoMs: 0,
            horasNetasMs: 0,
            horasBrutasFormateadas: '0h 0m',
            horasDescansoFormateadas: '0h 0m',
            horasNetasFormateadas: '0h 0m',
            isActivo: false
        };
    }

    const inicio = parseSafeDate(turno.fechaInicio).getTime();
    const isActivo = !turno.fechaFin;
    const fin = isActivo ? new Date().getTime() : parseSafeDate(turno.fechaFin).getTime();
    
    // Check for invalid dates
    if (inicio === 0 || fin === 0) {
        return {
            horasBrutasMs: 0,
            horasDescansoMs: 0,
            horasNetasMs: 0,
            horasBrutasFormateadas: '0h 0m',
            horasDescansoFormateadas: '0h 0m',
            horasNetasFormateadas: '0h 0m',
            isActivo
        };
    }

    let horasBrutasMs = fin - inicio;
    if (horasBrutasMs < 0) horasBrutasMs = 0;

    let horasDescansoMs = 0;

    if (turno.descansos && Array.isArray(turno.descansos)) {
        turno.descansos.forEach((d: any) => {
            if (d.fechaInicio) {
                const dInicio = parseSafeDate(d.fechaInicio).getTime();
                const dFin = d.fechaFin ? parseSafeDate(d.fechaFin).getTime() : new Date().getTime();
                
                if (dInicio !== 0 && dFin !== 0) {
                    let dDuracion = dFin - dInicio;
                    if (dDuracion < 0) dDuracion = 0;
                    horasDescansoMs += dDuracion;
                }
            }
        });
    }

    let horasNetasMs = horasBrutasMs - horasDescansoMs;
    if (horasNetasMs < 0) horasNetasMs = 0;

    const formatMs = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    return {
        horasBrutasMs,
        horasDescansoMs,
        horasNetasMs,
        horasBrutasFormateadas: formatMs(horasBrutasMs),
        horasDescansoFormateadas: formatMs(horasDescansoMs),
        horasNetasFormateadas: formatMs(horasNetasMs),
        isActivo
    };
};
