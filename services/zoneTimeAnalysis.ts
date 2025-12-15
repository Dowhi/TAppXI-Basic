import { CarreraVista } from '../types';

export interface HourlyStats {
    hour: number;
    totalIngresos: number;
    numCarreras: number;
    promedioPorCarrera: number;
    porcentajeDelTotal: number;
}

export interface DayOfWeekStats {
    day: string;
    dayNumber: number;
    totalIngresos: number;
    numCarreras: number;
    promedioPorCarrera: number;
    porcentajeDelTotal: number;
}

export interface ZoneStats {
    zona: string;
    totalIngresos: number;
    numCarreras: number;
    promedioPorCarrera: number;
    porcentajeDelTotal: number;
    porcentajeCarreras: number;
}

export interface ZoneTimeAnalysis {
    mejoresHoras: HourlyStats[];
    mejoresDias: DayOfWeekStats[];
    estadisticasZonas: ZoneStats[];
    totalIngresos: number;
    totalCarreras: number;
    periodo: {
        desde: Date;
        hasta: Date;
    };
}

/**
 * Analiza las carreras para obtener estadísticas de horarios y zonas
 */
export const analyzeZoneTimeStats = (
    carreras: CarreraVista[],
    fechaDesde?: Date,
    fechaHasta?: Date
): ZoneTimeAnalysis => {
    // Filtrar por fechas si se proporcionan
    let carrerasFiltradas = carreras;
    if (fechaDesde || fechaHasta) {
        carrerasFiltradas = carreras.filter(c => {
            const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
            if (fechaDesde && fecha < fechaDesde) return false;
            if (fechaHasta && fecha > fechaHasta) return false;
            return true;
        });
    }

    const totalIngresos = carrerasFiltradas.reduce((sum, c) => sum + (c.cobrado || 0), 0);
    const totalCarreras = carrerasFiltradas.length;

    // ========== ANÁLISIS POR HORAS ==========
    const horasMap = new Map<number, { ingresos: number; carreras: number }>();

    carrerasFiltradas.forEach(c => {
        const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        const hora = fecha.getHours();
        const ingresos = c.cobrado || 0;

        const actual = horasMap.get(hora) || { ingresos: 0, carreras: 0 };
        horasMap.set(hora, {
            ingresos: actual.ingresos + ingresos,
            carreras: actual.carreras + 1,
        });
    });

    const mejoresHoras: HourlyStats[] = Array.from(horasMap.entries())
        .map(([hour, data]) => ({
            hour,
            totalIngresos: data.ingresos,
            numCarreras: data.carreras,
            promedioPorCarrera: data.carreras > 0 ? data.ingresos / data.carreras : 0,
            porcentajeDelTotal: totalIngresos > 0 ? (data.ingresos / totalIngresos) * 100 : 0,
        }))
        .sort((a, b) => b.totalIngresos - a.totalIngresos);

    // Completar horas faltantes con 0
    for (let h = 0; h < 24; h++) {
        if (!horasMap.has(h)) {
            mejoresHoras.push({
                hour: h,
                totalIngresos: 0,
                numCarreras: 0,
                promedioPorCarrera: 0,
                porcentajeDelTotal: 0,
            });
        }
    }
    mejoresHoras.sort((a, b) => a.hour - b.hour);

    // ========== ANÁLISIS POR DÍAS DE LA SEMANA ==========
    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diasMap = new Map<number, { ingresos: number; carreras: number }>();

    carrerasFiltradas.forEach(c => {
        const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
        const diaSemana = fecha.getDay();
        const ingresos = c.cobrado || 0;

        const actual = diasMap.get(diaSemana) || { ingresos: 0, carreras: 0 };
        diasMap.set(diaSemana, {
            ingresos: actual.ingresos + ingresos,
            carreras: actual.carreras + 1,
        });
    });

    const mejoresDias: DayOfWeekStats[] = Array.from(diasMap.entries())
        .map(([dayNumber, data]) => ({
            day: diasNombres[dayNumber],
            dayNumber,
            totalIngresos: data.ingresos,
            numCarreras: data.carreras,
            promedioPorCarrera: data.carreras > 0 ? data.ingresos / data.carreras : 0,
            porcentajeDelTotal: totalIngresos > 0 ? (data.ingresos / totalIngresos) * 100 : 0,
        }))
        .sort((a, b) => b.totalIngresos - a.totalIngresos);

    // Completar días faltantes con 0
    for (let d = 0; d < 7; d++) {
        if (!diasMap.has(d)) {
            mejoresDias.push({
                day: diasNombres[d],
                dayNumber: d,
                totalIngresos: 0,
                numCarreras: 0,
                promedioPorCarrera: 0,
                porcentajeDelTotal: 0,
            });
        }
    }
    mejoresDias.sort((a, b) => a.dayNumber - b.dayNumber);

    // ========== ANÁLISIS POR ZONAS ==========
    const zonasMap = new Map<string, { ingresos: number; carreras: number }>();

    carrerasFiltradas.forEach(c => {
        const ingresos = c.cobrado || 0;
        let zona = '';

        // Determinar zona basándose en características
        if (c.aeropuerto) {
            zona = 'Aeropuerto';
        } else if (c.estacion) {
            zona = 'Estación';
        } else if (c.emisora) {
            zona = 'Emisora';
        } else if (c.tipoCarrera === 'Interurbana') {
            zona = 'Interurbana';
        } else {
            zona = 'Urbana';
        }

        const actual = zonasMap.get(zona) || { ingresos: 0, carreras: 0 };
        zonasMap.set(zona, {
            ingresos: actual.ingresos + ingresos,
            carreras: actual.carreras + 1,
        });
    });

    const estadisticasZonas: ZoneStats[] = Array.from(zonasMap.entries())
        .map(([zona, data]) => ({
            zona,
            totalIngresos: data.ingresos,
            numCarreras: data.carreras,
            promedioPorCarrera: data.carreras > 0 ? data.ingresos / data.carreras : 0,
            porcentajeDelTotal: totalIngresos > 0 ? (data.ingresos / totalIngresos) * 100 : 0,
            porcentajeCarreras: totalCarreras > 0 ? (data.carreras / totalCarreras) * 100 : 0,
        }))
        .sort((a, b) => b.totalIngresos - a.totalIngresos);

    return {
        mejoresHoras,
        mejoresDias,
        estadisticasZonas,
        totalIngresos,
        totalCarreras,
        periodo: {
            desde: fechaDesde || new Date(Math.min(...carrerasFiltradas.map(c => {
                const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                return fecha.getTime();
            }))),
            hasta: fechaHasta || new Date(Math.max(...carrerasFiltradas.map(c => {
                const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                return fecha.getTime();
            }))),
        },
    };
};

/**
 * Obtiene las top N horas con mejor rendimiento
 */
export const getTopHours = (analysis: ZoneTimeAnalysis, topN: number = 5): HourlyStats[] => {
    return analysis.mejoresHoras
        .filter(h => h.numCarreras > 0)
        .sort((a, b) => b.totalIngresos - a.totalIngresos)
        .slice(0, topN);
};

/**
 * Obtiene las top N zonas con mejor rendimiento
 */
export const getTopZones = (analysis: ZoneTimeAnalysis, topN: number = 5): ZoneStats[] => {
    return analysis.estadisticasZonas
        .filter(z => z.numCarreras > 0)
        .sort((a, b) => b.totalIngresos - a.totalIngresos)
        .slice(0, topN);
};
















