import React, { useState, useEffect, useMemo } from 'react';
import { Seccion } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import {
    getIngresosByHour,
    getIngresosByDayOfWeek,
    getTotalIngresosByDayOfWeek,
    getIngresosByMonthYear,
    getGastosByMonthYear,
    getTotalIngresosByYear,
    getTotalGastosByYear,
    getAjustes,
    getWorkingDays,
} from '../services/api';

interface AnalisisAvanzadoScreenProps {
    navigateTo: (page: Seccion) => void;
}

const AnalisisAvanzadoScreen: React.FC<AnalisisAvanzadoScreenProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<'horarios' | 'comparativas'>('horarios');
    const [loading, setLoading] = useState(true);
    const [ingresosPorHora, setIngresosPorHora] = useState<number[]>([]);
    const [ingresosPorDiaSemana, setIngresosPorDiaSemana] = useState<number[]>([]);
    const [totalIngresosPorDiaSemana, setTotalIngresosPorDiaSemana] = useState<number[]>([]);
    const [objetivoDiario, setObjetivoDiario] = useState<number>(100);
    
    // Comparativas
    const [mesActual, setMesActual] = useState({ ingresos: 0, gastos: 0 });
    const [mesAnterior, setMesAnterior] = useState({ ingresos: 0, gastos: 0 });
    const [añoActual, setAñoActual] = useState({ ingresos: 0, gastos: 0 });
    const [añoAnterior, setAñoAnterior] = useState({ ingresos: 0, gastos: 0 });
    const [metasVsLogros, setMetasVsLogros] = useState({
        objetivoMensual: 0,
        objetivoHastaAhora: 0,
        ingresosHastaAhora: 0,
        porcentajeCumplimiento: 0,
        proyeccionMensual: 0,
        diferencia: 0,
        diasTrabajadosHastaAhora: 0,
        totalDiasTrabajadosMes: 0,
    });

    // Calcular rango de fechas para análisis (últimos 3 meses)
    const dateRange = useMemo(() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        return { start, end };
    }, []);

    // Cargar datos de horarios
    useEffect(() => {
        const loadHorariosData = async () => {
            setLoading(true);
            try {
                const [porHora, porDiaPromedio, porDiaTotal] = await Promise.all([
                    getIngresosByHour(dateRange.start, dateRange.end),
                    getIngresosByDayOfWeek(dateRange.start, dateRange.end),
                    getTotalIngresosByDayOfWeek(dateRange.start, dateRange.end),
                ]);
                setIngresosPorHora(porHora);
                setIngresosPorDiaSemana(porDiaPromedio);
                setTotalIngresosPorDiaSemana(porDiaTotal);
            } catch (error) {
                console.error('Error cargando datos de horarios:', error);
            } finally {
                setLoading(false);
            }
        };

        if (activeTab === 'horarios') {
            loadHorariosData();
        }
    }, [activeTab, dateRange]);

    // Cargar datos de comparativas
    useEffect(() => {
        const loadComparativasData = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                // Mes anterior
                const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

                // Año anterior
                const prevYearFull = currentYear - 1;

                const [
                    ingresosMesActual,
                    gastosMesActual,
                    ingresosMesAnterior,
                    gastosMesAnterior,
                    ingresosAñoActual,
                    gastosAñoActual,
                    ingresosAñoAnterior,
                    gastosAñoAnterior,
                    ajustes,
                ] = await Promise.all([
                    getIngresosByMonthYear(currentMonth, currentYear),
                    getGastosByMonthYear(currentMonth, currentYear),
                    getIngresosByMonthYear(prevMonth, prevYear),
                    getGastosByMonthYear(prevMonth, prevYear),
                    getTotalIngresosByYear(currentYear),
                    getTotalGastosByYear(currentYear),
                    getTotalIngresosByYear(prevYearFull),
                    getTotalGastosByYear(prevYearFull),
                    getAjustes(),
                ]);

                setMesActual({ ingresos: ingresosMesActual, gastos: gastosMesActual });
                setMesAnterior({ ingresos: ingresosMesAnterior, gastos: gastosMesAnterior });
                setAñoActual({ ingresos: ingresosAñoActual, gastos: gastosAñoActual });
                setAñoAnterior({ ingresos: ingresosAñoAnterior, gastos: gastosAñoAnterior });
                
                if (ajustes && ajustes.objetivoDiario) {
                    setObjetivoDiario(ajustes.objetivoDiario);
                }

                // Calcular metas vs logros (solo días trabajados)
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                
                const diasTrabajados = await getWorkingDays(startOfMonth, endOfMonth);
                const diasTrabajadosHastaAhora = diasTrabajados.filter(d => d <= now).length;
                const totalDiasTrabajadosMes = diasTrabajados.length;
                
                const objetivoDiarioValue = ajustes?.objetivoDiario || 100;
                const objetivoMensual = objetivoDiarioValue * totalDiasTrabajadosMes;
                const objetivoHastaAhora = objetivoDiarioValue * diasTrabajadosHastaAhora;
                const ingresosHastaAhora = ingresosMesActual;
                
                const porcentajeCumplimiento = objetivoHastaAhora > 0 
                    ? (ingresosHastaAhora / objetivoHastaAhora) * 100 
                    : 0;
                
                const proyeccionMensual = diasTrabajadosHastaAhora > 0 
                    ? (ingresosHastaAhora / diasTrabajadosHastaAhora) * totalDiasTrabajadosMes 
                    : 0;

                setMetasVsLogros({
                    objetivoMensual,
                    objetivoHastaAhora,
                    ingresosHastaAhora,
                    porcentajeCumplimiento,
                    proyeccionMensual,
                    diferencia: ingresosHastaAhora - objetivoHastaAhora,
                    diasTrabajadosHastaAhora,
                    totalDiasTrabajadosMes,
                });
            } catch (error) {
                console.error('Error cargando datos de comparativas:', error);
            } finally {
                setLoading(false);
            }
        };

        if (activeTab === 'comparativas') {
            loadComparativasData();
        }
    }, [activeTab]);

    // Calcular mejores horarios
    const mejoresHorarios = useMemo(() => {
        if (ingresosPorHora.length === 0) return [];
        
        const horariosConIngresos = ingresosPorHora.map((ingresos, hora) => ({
            hora,
            ingresos,
        })).filter(h => h.ingresos > 0);

        // Ordenar por ingresos descendente y tomar top 5
        return horariosConIngresos
            .sort((a, b) => b.ingresos - a.ingresos)
            .slice(0, 5);
    }, [ingresosPorHora]);

    // Calcular días más rentables
    const diasMasRentables = useMemo(() => {
        if (totalIngresosPorDiaSemana.length === 0) return [];
        
        const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        const diasConIngresos = totalIngresosPorDiaSemana.map((ingresos, dia) => ({
            dia,
            nombre: diasNombres[dia],
            ingresos,
        })).filter(d => d.ingresos > 0);

        return diasConIngresos.sort((a, b) => b.ingresos - a.ingresos);
    }, [totalIngresosPorDiaSemana]);

    // Sugerencias de horarios
    const sugerenciasHorarios = useMemo(() => {
        const sugerencias: string[] = [];
        
        if (mejoresHorarios.length > 0) {
            const mejorHora = mejoresHorarios[0];
            sugerencias.push(`Mejor hora: ${mejorHora.hora}:00 - ${mejorHora.hora + 1}:00 (${mejorHora.ingresos.toFixed(2)}€ promedio)`);
        }

        if (diasMasRentables.length > 0) {
            const mejorDia = diasMasRentables[0];
            sugerencias.push(`Mejor día: ${mejorDia.nombre} (${mejorDia.ingresos.toFixed(2)}€ promedio)`);
        }

        // Analizar franjas horarias
        const mañana = ingresosPorHora.slice(6, 12).reduce((sum, val) => sum + val, 0);
        const tarde = ingresosPorHora.slice(12, 18).reduce((sum, val) => sum + val, 0);
        const noche = ingresosPorHora.slice(18, 24).reduce((sum, val) => sum + val, 0);
        const madrugada = ingresosPorHora.slice(0, 6).reduce((sum, val) => sum + val, 0);

        const mejorFranja = [
            { nombre: 'Mañana (6-12h)', total: mañana },
            { nombre: 'Tarde (12-18h)', total: tarde },
            { nombre: 'Noche (18-24h)', total: noche },
            { nombre: 'Madrugada (0-6h)', total: madrugada },
        ].sort((a, b) => b.total - a.total)[0];

        if (mejorFranja.total > 0) {
            sugerencias.push(`Mejor franja: ${mejorFranja.nombre} (${mejorFranja.total.toFixed(2)}€ total)`);
        }

        return sugerencias;
    }, [mejoresHorarios, diasMasRentables, ingresosPorHora]);

    // Renderizar gráfico de barras por hora
    const renderHourChart = () => {
        if (ingresosPorHora.length === 0) return null;

        const maxIngresos = Math.max(...ingresosPorHora, 1);
        const height = 200;
        const svgWidth = 400;
        const padding = 40;
        const chartWidth = svgWidth - (padding * 2);
        const barWidth = chartWidth / 24;
        const maxBarHeight = height - 60;

        return (
            <div className="relative" style={{ height: `${height}px` }}>
                <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                    {/* Eje Y */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = height - 40 - (ratio * maxBarHeight);
                        const value = (maxIngresos * ratio).toFixed(0);
                        return (
                            <g key={ratio}>
                                <line
                                    x1={padding}
                                    y1={y}
                                    x2={svgWidth - padding}
                                    y2={y}
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    className="text-zinc-700"
                                    strokeDasharray="2,2"
                                />
                                <text
                                    x={padding - 5}
                                    y={y + 4}
                                    className="text-xs fill-zinc-500"
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {value}€
                                </text>
                            </g>
                        );
                    })}

                    {/* Barras por hora */}
                    {ingresosPorHora.map((ingresos, hora) => {
                        const x = padding + (hora * barWidth);
                        const barHeight = maxIngresos > 0 ? (ingresos / maxIngresos) * maxBarHeight : 0;
                        const y = height - 40 - barHeight;
                        const isTopHour = mejoresHorarios.some(h => h.hora === hora);

                        return (
                            <g key={hora}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth * 0.8}
                                    height={barHeight}
                                    fill={isTopHour ? "#00FFB0" : "#00CFFF"}
                                    opacity="0.8"
                                    rx="2"
                                />
                                {hora % 4 === 0 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={height - 20}
                                        className="text-xs fill-zinc-400"
                                        fontSize="9"
                                        textAnchor="middle"
                                    >
                                        {hora}h
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };

    // Renderizar gráfico de días de la semana
    const renderDayOfWeekChart = () => {
        if (ingresosPorDiaSemana.length === 0) return null;

        const maxIngresos = Math.max(...ingresosPorDiaSemana, 1);
        const height = 200;
        const svgWidth = 400;
        const padding = 40;
        const chartWidth = svgWidth - (padding * 2);
        const barWidth = chartWidth / 7;
        const maxBarHeight = height - 60;

        const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        return (
            <div className="relative" style={{ height: `${height}px` }}>
                <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                    {/* Eje Y */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = height - 40 - (ratio * maxBarHeight);
                        const value = (maxIngresos * ratio).toFixed(0);
                        return (
                            <g key={ratio}>
                                <line
                                    x1={padding}
                                    y1={y}
                                    x2={svgWidth - padding}
                                    y2={y}
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    className="text-zinc-700"
                                    strokeDasharray="2,2"
                                />
                                <text
                                    x={padding - 5}
                                    y={y + 4}
                                    className="text-xs fill-zinc-500"
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {value}€
                                </text>
                            </g>
                        );
                    })}

                    {/* Barras por día */}
                    {ingresosPorDiaSemana.map((ingresos, dia) => {
                        const x = padding + (dia * barWidth);
                        const barHeight = maxIngresos > 0 ? (ingresos / maxIngresos) * maxBarHeight : 0;
                        const y = height - 40 - barHeight;
                        const isTopDay = diasMasRentables[0]?.dia === dia;

                        return (
                            <g key={dia}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth * 0.8}
                                    height={barHeight}
                                    fill={isTopDay ? "#00FFB0" : "#00CFFF"}
                                    opacity="0.8"
                                    rx="2"
                                />
                                <text
                                    x={x + barWidth / 2}
                                    y={height - 20}
                                    className="text-xs fill-zinc-400"
                                    fontSize="9"
                                    textAnchor="middle"
                                >
                                    {diasNombres[dia]}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };

    // Calcular comparativas
    const comparativaMes = useMemo(() => {
        const diferenciaIngresos = mesActual.ingresos - mesAnterior.ingresos;
        const diferenciaGastos = mesActual.gastos - mesAnterior.gastos;
        const diferenciaBalance = (mesActual.ingresos - mesActual.gastos) - (mesAnterior.ingresos - mesAnterior.gastos);
        const porcentajeIngresos = mesAnterior.ingresos > 0 
            ? ((diferenciaIngresos / mesAnterior.ingresos) * 100) 
            : 0;

        return {
            diferenciaIngresos,
            diferenciaGastos,
            diferenciaBalance,
            porcentajeIngresos,
        };
    }, [mesActual, mesAnterior]);

    const comparativaAño = useMemo(() => {
        const diferenciaIngresos = añoActual.ingresos - añoAnterior.ingresos;
        const diferenciaGastos = añoActual.gastos - añoAnterior.gastos;
        const diferenciaBalance = (añoActual.ingresos - añoActual.gastos) - (añoAnterior.ingresos - añoAnterior.gastos);
        const porcentajeIngresos = añoAnterior.ingresos > 0 
            ? ((diferenciaIngresos / añoAnterior.ingresos) * 100) 
            : 0;

        return {
            diferenciaIngresos,
            diferenciaGastos,
            diferenciaBalance,
            porcentajeIngresos,
        };
    }, [añoActual, añoAnterior]);


    return (
        <div className="bg-zinc-950 min-h-screen flex flex-col px-3 pt-3 pb-6 text-zinc-100">
            <ScreenTopBar title="Análisis Avanzado" navigateTo={navigateTo} backTarget={Seccion.Home} className="mb-4" />

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg mb-4">
                <button
                    onClick={() => setActiveTab('horarios')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                        activeTab === 'horarios'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                >
                    Horarios Óptimos
                </button>
                <button
                    onClick={() => setActiveTab('comparativas')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                        activeTab === 'comparativas'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                >
                    Comparativas
                </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-zinc-400">Cargando análisis...</div>
                    </div>
                ) : activeTab === 'horarios' ? (
                    <>
                        {/* Ingresos por Hora */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Ingresos por Hora del Día</h2>
                            {renderHourChart()}
                            <p className="text-xs text-zinc-500 mt-2 text-center">
                                Datos basados en los últimos 3 meses (solo días trabajados)
                            </p>
                        </div>

                        {/* Ingresos por Día de la Semana */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Promedio de Ingresos por Día de la Semana</h2>
                            {renderDayOfWeekChart()}
                            <p className="text-xs text-zinc-500 mt-2 text-center">
                                Promedio diario basado en los últimos 3 meses (solo días trabajados)
                            </p>
                        </div>

                        {/* Mejores Horarios */}
                        {mejoresHorarios.length > 0 && (
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                <h2 className="text-cyan-400 text-lg font-bold mb-4">Top 5 Mejores Horarios</h2>
                                <div className="space-y-2">
                                    {mejoresHorarios.map((horario, index) => (
                                        <div key={horario.hora} className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="text-white font-semibold">
                                                        {horario.hora}:00 - {horario.hora + 1}:00
                                                    </div>
                                                    <div className="text-xs text-zinc-400">
                                                        {horario.ingresos.toFixed(2)}€ promedio
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Días Más Rentables */}
                        {diasMasRentables.length > 0 && (
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                <h2 className="text-cyan-400 text-lg font-bold mb-4">Días Más Rentables</h2>
                                <div className="space-y-2">
                                    {diasMasRentables.map((dia, index) => (
                                        <div key={dia.dia} className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="text-white font-semibold">{dia.nombre}</div>
                                                    <div className="text-xs text-zinc-400">
                                                        {dia.ingresos.toFixed(2)}€ promedio
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sugerencias */}
                        {sugerenciasHorarios.length > 0 && (
                            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-500/50">
                                <h2 className="text-cyan-400 text-lg font-bold mb-4">💡 Sugerencias de Horarios</h2>
                                <div className="space-y-2">
                                    {sugerenciasHorarios.map((sugerencia, index) => (
                                        <div key={index} className="text-zinc-200 text-sm flex items-start gap-2">
                                            <span className="text-cyan-400">•</span>
                                            <span>{sugerencia}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Comparativa Mes Actual vs Anterior */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Comparativa Mensual</h2>
                            <p className="text-xs text-zinc-500 mb-4 text-center">
                                Datos calculados solo sobre días trabajados (excluyendo descansos)
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Mes Actual</div>
                                    <div className="text-white text-lg font-bold">{mesActual.ingresos.toFixed(2)}€</div>
                                    <div className="text-zinc-500 text-xs mt-1">Gastos: {mesActual.gastos.toFixed(2)}€</div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Mes Anterior</div>
                                    <div className="text-white text-lg font-bold">{mesAnterior.ingresos.toFixed(2)}€</div>
                                    <div className="text-zinc-500 text-xs mt-1">Gastos: {mesAnterior.gastos.toFixed(2)}€</div>
                                </div>
                            </div>
                            <div className="bg-zinc-800 rounded-lg p-3">
                                <div className="text-zinc-400 text-xs mb-2">Diferencia</div>
                                <div className={`text-lg font-bold ${comparativaMes.diferenciaIngresos >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {comparativaMes.diferenciaIngresos >= 0 ? '+' : ''}{comparativaMes.diferenciaIngresos.toFixed(2)}€
                                    {comparativaMes.porcentajeIngresos !== 0 && (
                                        <span className="text-sm ml-2">
                                            ({comparativaMes.porcentajeIngresos >= 0 ? '+' : ''}{comparativaMes.porcentajeIngresos.toFixed(1)}%)
                                        </span>
                                    )}
                                </div>
                                <div className="text-zinc-500 text-xs mt-2">
                                    Balance: {comparativaMes.diferenciaBalance >= 0 ? '+' : ''}{comparativaMes.diferenciaBalance.toFixed(2)}€
                                </div>
                            </div>
                        </div>

                        {/* Comparativa Año Actual vs Anterior */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Comparativa Anual</h2>
                            <p className="text-xs text-zinc-500 mb-4 text-center">
                                Datos calculados solo sobre días trabajados (excluyendo descansos)
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Año Actual</div>
                                    <div className="text-white text-lg font-bold">{añoActual.ingresos.toFixed(2)}€</div>
                                    <div className="text-zinc-500 text-xs mt-1">Gastos: {añoActual.gastos.toFixed(2)}€</div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Año Anterior</div>
                                    <div className="text-white text-lg font-bold">{añoAnterior.ingresos.toFixed(2)}€</div>
                                    <div className="text-zinc-500 text-xs mt-1">Gastos: {añoAnterior.gastos.toFixed(2)}€</div>
                                </div>
                            </div>
                            <div className="bg-zinc-800 rounded-lg p-3">
                                <div className="text-zinc-400 text-xs mb-2">Diferencia</div>
                                <div className={`text-lg font-bold ${comparativaAño.diferenciaIngresos >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {comparativaAño.diferenciaIngresos >= 0 ? '+' : ''}{comparativaAño.diferenciaIngresos.toFixed(2)}€
                                    {comparativaAño.porcentajeIngresos !== 0 && (
                                        <span className="text-sm ml-2">
                                            ({comparativaAño.porcentajeIngresos >= 0 ? '+' : ''}{comparativaAño.porcentajeIngresos.toFixed(1)}%)
                                        </span>
                                    )}
                                </div>
                                <div className="text-zinc-500 text-xs mt-2">
                                    Balance: {comparativaAño.diferenciaBalance >= 0 ? '+' : ''}{comparativaAño.diferenciaBalance.toFixed(2)}€
                                </div>
                            </div>
                        </div>

                        {/* Metas vs Logros */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Metas vs Logros</h2>
                            <p className="text-xs text-zinc-500 mb-4 text-center">
                                Objetivos calculados sobre {metasVsLogros.totalDiasTrabajadosMes} días trabajados del mes
                            </p>
                            <div className="space-y-3">
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Objetivo Diario</div>
                                    <div className="text-white text-lg font-bold">{objetivoDiario.toFixed(2)}€</div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Objetivo Mensual</div>
                                    <div className="text-white text-lg font-bold">{metasVsLogros.objetivoMensual.toFixed(2)}€</div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Ingresos Hasta Ahora</div>
                                    <div className="text-white text-lg font-bold">{metasVsLogros.ingresosHastaAhora.toFixed(2)}€</div>
                                    <div className="text-zinc-500 text-xs mt-1">
                                        Objetivo hasta ahora: {metasVsLogros.objetivoHastaAhora.toFixed(2)}€
                                    </div>
                                </div>
                                <div className={`rounded-lg p-3 ${metasVsLogros.porcentajeCumplimiento >= 100 ? 'bg-green-900/30 border border-green-500/50' : 'bg-zinc-800'}`}>
                                    <div className="text-zinc-400 text-xs mb-2">Cumplimiento del Objetivo</div>
                                    <div className={`text-2xl font-bold ${metasVsLogros.porcentajeCumplimiento >= 100 ? 'text-green-400' : 'text-white'}`}>
                                        {metasVsLogros.porcentajeCumplimiento.toFixed(1)}%
                                    </div>
                                    <div className={`text-sm mt-2 ${metasVsLogros.diferencia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {metasVsLogros.diferencia >= 0 ? '+' : ''}{metasVsLogros.diferencia.toFixed(2)}€
                                    </div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Proyección Mensual</div>
                                    <div className="text-white text-lg font-bold">{metasVsLogros.proyeccionMensual.toFixed(2)}€</div>
                                    <div className="text-zinc-500 text-xs mt-1">
                                        Basado en el ritmo actual
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AnalisisAvanzadoScreen;

