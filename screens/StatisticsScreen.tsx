import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, CarreraVista } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { getCarrerasByDate, getGastosByDate, isRestDay, getCarreras, getOtrosIngresosByDateRange, getTurnosByDate } from '../services/api';
import { analyzeZoneTimeStats, getTopHours, getTopZones, ZoneTimeAnalysis } from '../services/zoneTimeAnalysis';
import { calculateTurnoTimes } from '../services/timeUtils';

interface StatisticsScreenProps {
    navigateTo: (page: Seccion) => void;
}

interface DayData {
    date: Date;
    ingresos: number;
    gastos: number;
    balance: number;
    numCarreras: number;
    horasBrutasMs: number;
    horasNetasMs: number;
    isRestDay?: boolean;
}

// Constants for time conversions
const MS_PER_HOUR = 3600000;
const MS_PER_MINUTE = 60000;

const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ navigateTo }) => {
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | '3months'>('month');
    const [loading, setLoading] = useState(true);
    const [dayData, setDayData] = useState<DayData[]>([]);
    const [showZoneTimeAnalysis, setShowZoneTimeAnalysis] = useState(false);
    const [zoneTimeAnalysis, setZoneTimeAnalysis] = useState<ZoneTimeAnalysis | null>(null);
    const [loadingZoneTime, setLoadingZoneTime] = useState(false);

    // Calcular fechas según el período seleccionado
    const dateRange = useMemo(() => {
        const start = new Date();
        const end = new Date();

        switch (selectedPeriod) {
            case 'week':
                // Últimos 7 días: hoy + 6 días anteriores
                start.setDate(start.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'month':
                // Mes actual: del día 1 del mes en curso hasta el último día del mes
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(end.getMonth() + 1);
                end.setDate(0); // Get last day of current month
                end.setHours(23, 59, 59, 999);
                break;
            case '3months':
                // Últimos 3 meses: del día 1 de hace 2 meses hasta el último día del mes actual
                start.setMonth(start.getMonth() - 2);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(end.getMonth() + 1);
                end.setDate(0); // Get last day of current month
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { start, end };
    }, [selectedPeriod]);

    // Cargar datos
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const dates: Date[] = [];
                const cursor = new Date(dateRange.start);

                while (cursor <= dateRange.end) {
                    dates.push(new Date(cursor));
                    cursor.setDate(cursor.getDate() + 1);
                }

                // Removed debug logging for production

                const results = await Promise.all(
                    dates.map(async (date) => {
                        try {
                            const mañana = new Date(date);
                            mañana.setDate(date.getDate() + 1);

                            const [carreras, otrosIngresos, gastos, turnos] = await Promise.all([
                                getCarrerasByDate(date),
                                getOtrosIngresosByDateRange(date, mañana),
                                getGastosByDate(date),
                                getTurnosByDate(date),
                            ]);

                            // debug logging removed

                            const ingresosCarreras = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
                            const ingresosOtros = otrosIngresos.reduce((sum, oi) => sum + (oi.importe || 0), 0);
                            const totalIngresos = ingresosCarreras + ingresosOtros;
                            const totalGastos = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);

                            // debug logs removed

                            let diaHorasBrutasMs = 0;
                            let diaHorasNetasMs = 0;
                            turnos.forEach(t => {
                                const tTimes = calculateTurnoTimes(t);
                                diaHorasBrutasMs += tTimes.horasBrutasMs;
                                diaHorasNetasMs += tTimes.horasNetasMs;
                            });

                            // A day is a rest day if it's explicitly marked as such OR by letter logic inside isRestDay
                            const isExplicitRest = await isRestDay(date);
                            const isRestDayValue = isExplicitRest;

                            return {
                                date,
                                ingresos: totalIngresos,
                                gastos: totalGastos,
                                balance: totalIngresos - totalGastos,
                                numCarreras: carreras.length,
                                horasBrutasMs: diaHorasBrutasMs,
                                horasNetasMs: diaHorasNetasMs,
                                isRestDay: isRestDayValue,
                            } as DayData;
                        } catch (error) {
                            console.error(`Error cargando datos para ${date.toISOString()}:`, error);
                            return {
                                date,
                                ingresos: 0,
                                gastos: 0,
                                balance: 0,
                                numCarreras: 0,
                                horasBrutasMs: 0,
                                horasNetasMs: 0,
                                isRestDay: false, // Default to not rest day on error to avoid skewing stats
                            } as DayData;
                        }
                    })
                );

                setDayData(results);
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [dateRange]);

    // Cargar análisis de zonas y horarios
    useEffect(() => {
        const loadZoneTimeAnalysis = async () => {
            if (!showZoneTimeAnalysis) return;

            setLoadingZoneTime(true);
            try {
                const allCarreras = await getCarreras();
                const analysis = analyzeZoneTimeStats(allCarreras, dateRange.start, dateRange.end);
                setZoneTimeAnalysis(analysis);
            } catch (error) {
                console.error('Error cargando análisis de zonas y horarios:', error);
            } finally {
                setLoadingZoneTime(false);
            }
        };

        loadZoneTimeAnalysis();
    }, [showZoneTimeAnalysis, dateRange]);

    // Calcular estadísticas (solo días trabajados)
    const stats = useMemo(() => {
        // Días potenciales para trabajar = días que NO son descanso
        const potentialDays = dayData.filter((d: DayData) => !d.isRestDay);

        if (potentialDays.length === 0) {
            return {
                totalIngresos: 0,
                totalGastos: 0,
                totalBalance: 0,
                promedioDiarioIngresos: 0,
                promedioDiarioGastos: 0,
                promedioDiarioBalance: 0,
                totalCarreras: 0,
                promedioCarrerasPorDia: 0,
                mejorDia: null as DayData | null,
                peorDia: null as DayData | null,
                diasConIngresos: 0,
                diasConGastos: 0,
                diasPotenciales: 0,
                diasTrabajadosReal: 0,
                diasDescanso: 0,
                totalHorasBrutasMs: 0,
                totalHorasNetasMs: 0,
            };
        }
        const totalIngresos = potentialDays.reduce((sum, d) => sum + d.ingresos, 0);
        const totalGastos = potentialDays.reduce((sum, d) => sum + d.gastos, 0);
        const totalBalance = totalIngresos - totalGastos;
        const totalCarreras = potentialDays.reduce((sum, d) => sum + d.numCarreras, 0);

    // días con ingresos entre TODOS los días (incluyendo días marcados como descanso)
    const diasConIngresosAll = dayData.filter(d => d.ingresos > 0).length;
    const diasConIngresosPotenciales = potentialDays.filter(d => d.ingresos > 0).length;
    const diasConGastos = potentialDays.filter(d => d.gastos > 0).length;
    const diasPotenciales = potentialDays.length; // días donde podrías trabajar (no descanso)
    const diasTrabajadosReal = diasConIngresosAll; // días con ingresos (realmente trabajados)
        const diasDescanso = dayData.filter((d: DayData) => d.isRestDay).length;

        const totalHorasBrutasMs = potentialDays.reduce((sum, d) => sum + (d.horasBrutasMs || 0), 0);
        const totalHorasNetasMs = potentialDays.reduce((sum, d) => sum + (d.horasNetasMs || 0), 0);

        const mejorDia = potentialDays.reduce((best, current) =>
            current.balance > (best?.balance || -Infinity) ? current : best, null as DayData | null
        );

        const peorDia = potentialDays.reduce((worst, current) =>
            current.balance < (worst?.balance || Infinity) ? current : worst, null as DayData | null
        );

        // debug logs removed

        return {
            totalIngresos,
            totalGastos,
            totalBalance,
            promedioDiarioIngresos: diasPotenciales > 0 ? totalIngresos / diasPotenciales : 0,
            promedioDiarioGastos: diasPotenciales > 0 ? totalGastos / diasPotenciales : 0,
            promedioDiarioBalance: diasPotenciales > 0 ? totalBalance / diasPotenciales : 0,
            totalCarreras,
            promedioCarrerasPorDia: diasPotenciales > 0 ? totalCarreras / diasPotenciales : 0,
            mejorDia,
            peorDia,
            diasConIngresos: diasConIngresosAll,
            diasConGastos,
            diasConIngresosPotenciales,
            diasPotenciales,
            diasTrabajadosReal,
            diasDescanso,
            totalHorasBrutasMs,
            totalHorasNetasMs
        };
    }, [dayData]);

    // Función para renderizar gráfico de barras (solo días trabajados)
    const renderBarChart = (data: DayData[], maxValue: number, height: number = 150) => {
    // Filtrar días que se considerarán en el gráfico.
    // Incluimos los días que NO son descanso, y además cualquier día que tenga ingresos (aunque esté marcado como descanso),
    // para reflejar semanas/meses donde se han realizado carreras en días de descanso.
    const workingDays = data.filter((d: DayData) => !d.isRestDay || d.ingresos > 0);
        if (workingDays.length === 0) return null;

        const svgWidth = 400; // Ancho fijo para cálculos, se escalará con width="100%"
        const padding = 40;
        const chartWidth = svgWidth - (padding * 2);
        const barSpacing = chartWidth / workingDays.length;
        const barWidth = Math.max(2, barSpacing * 0.8);
        const maxBarHeight = height - 40;

        return (
            <div className="relative" style={{ height: `${height}px` }}>
                <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                    {/* Eje Y - líneas de referencia */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = height - 20 - (ratio * maxBarHeight);
                        const value = (maxValue * ratio).toFixed(0);
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

                    {/* Barras de ingresos y gastos (solo días trabajados) */}
                    {workingDays.map((day, index) => {
                        const x = padding + (index * barSpacing) + (barSpacing / 2) - (barWidth / 2);
                        const ingresosHeight = maxValue > 0 ? (day.ingresos / maxValue) * maxBarHeight : 0;
                        const gastosHeight = maxValue > 0 ? (day.gastos / maxValue) * maxBarHeight : 0;
                        const yBase = height - 20;

                        return (
                            <g key={index}>
                                {/* Barra de ingresos */}
                                {ingresosHeight > 0 && (
                                    <rect
                                        x={x}
                                        y={yBase - ingresosHeight}
                                        width={barWidth}
                                        height={ingresosHeight}
                                        fill="#00CFFF"
                                        opacity="0.8"
                                        rx="2"
                                    />
                                )}
                                {/* Barra de gastos */}
                                {gastosHeight > 0 && (
                                    <rect
                                        x={x}
                                        y={yBase - ingresosHeight}
                                        width={barWidth}
                                        height={gastosHeight}
                                        fill="#FF00D6"
                                        opacity="0.6"
                                        rx="2"
                                        transform={`translate(0, ${ingresosHeight})`}
                                    />
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Etiquetas del eje X */}
                <div className="flex justify-between mt-2 text-xs text-zinc-500 px-2">
                    {workingDays.length > 0 && (
                        <>
                            <span>
                                {workingDays[0].date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span>
                                {workingDays[Math.floor(workingDays.length / 2)].date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span>
                                {workingDays[workingDays.length - 1].date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Función para renderizar gráfico de línea de balance (solo días trabajados)
    const renderLineChart = (data: DayData[], height: number = 150) => {
    // Filtrar días que se considerarán en el gráfico.
    // Incluimos los días que NO son descanso, y además cualquier día que tenga ingresos (aunque esté marcado como descanso).
    const workingDays = data.filter((d: DayData) => !d.isRestDay || d.ingresos > 0);
        if (workingDays.length === 0) return null;

        const maxBalance = Math.max(...workingDays.map(d => Math.abs(d.balance)), 1);
        const minBalance = Math.min(...workingDays.map(d => d.balance), 0);
        const range = maxBalance - minBalance || 1;
        const maxBarHeight = height - 40;
        const centerY = height - 20 - (maxBarHeight / 2);
        const svgWidth = 400; // Ancho fijo para cálculos, se escalará con width="100%"
        const padding = 20;
        const chartWidth = svgWidth - (padding * 2);

        const points = workingDays.map((day, index) => {
            const xPercent = index / (workingDays.length - 1 || 1);
            const x = padding + (xPercent * chartWidth);
            const normalizedBalance = (day.balance - minBalance) / range;
            const y = centerY - ((normalizedBalance - 0.5) * maxBarHeight);
            return { x, y, balance: day.balance };
        });

        const pathData = points.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');

        return (
            <div className="relative" style={{ height: `${height}px` }}>
                <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                    {/* Línea de cero */}
                    <line
                        x1={padding}
                        y1={centerY}
                        x2={svgWidth - padding}
                        y2={centerY}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-zinc-700"
                        strokeDasharray="2,2"
                    />

                    {/* Línea del balance */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="#00FFB0"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Puntos */}
                    {points.map((point, index) => (
                        <circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill={point.balance >= 0 ? "#00FFB0" : "#FF00D6"}
                            stroke="#1a1a1a"
                            strokeWidth="2"
                        />
                    ))}
                </svg>

                {/* Etiquetas */}
                <div className="flex justify-between mt-2 text-xs text-zinc-500 px-2">
                    <span>0€</span>
                    <span className="text-green-400">+{maxBalance.toFixed(0)}€</span>
                    <span className="text-red-400">{minBalance.toFixed(0)}€</span>
                </div>
            </div>
        );
    };

    // Filtrar solo días trabajados para el gráfico
    const workingDaysForChart = dayData.filter((d: DayData) => !d.isRestDay);
    const maxValue = Math.max(
        ...workingDaysForChart.map(d => Math.max(d.ingresos, d.gastos)),
        1
    );

    return (
        <div className="bg-zinc-950 min-h-screen flex flex-col px-3 pt-3 pb-6 text-zinc-100 space-y-4">
            <ScreenTopBar title="Estadísticas" navigateTo={navigateTo} backTarget={Seccion.Home} className="flex-shrink-0" />

            {/* Selector de período */}
            <div className="bg-zinc-900 px-1 py-2 border border-zinc-800 rounded-lg">
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedPeriod('week')}
                        className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${selectedPeriod === 'week'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                        aria-label="Seleccionar período de 7 días"
                    >
                        7 Días
                    </button>
                    <button
                        onClick={() => setSelectedPeriod('month')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${selectedPeriod === 'month'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                        aria-label="Seleccionar período de 1 mes"
                    >
                        1 Mes
                    </button>
                    <button
                        onClick={() => setSelectedPeriod('3months')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${selectedPeriod === '3months'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                        aria-label="Seleccionar período de 3 meses"
                    >
                        3 Meses
                    </button>
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-zinc-400">Cargando estadísticas...</div>
                    </div>
                ) : (
                    <>
                        {/* Resumen de Totales */}
                        <div className="bg-zinc-900 rounded-xl p-2 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-3">Resumen del Período</h2>
                            <div className="grid grid-cols-3 gap-1">
                                <div className="bg-zinc-800 rounded-lg p-1 flex flex-col items-center justify-center">
                                    <div className="text-zinc-400 text-xs mb-1 text-center">Ingresos</div>
                                    <div className="text-green-400 text-lg  w-full text-center whitespace-nowrap">
                                        {stats.totalIngresos.toFixed(2)}€
                                    </div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-1 flex flex-col items-center justify-center">
                                    <div className="text-zinc-400 text-xs mb-1 text-center">Gastos</div>
                                    <div className="text-red-400 text-lg  w-full text-center whitespace-nowrap">
                                        {stats.totalGastos.toFixed(2)}€
                                    </div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-1 flex flex-col items-center justify-center">
                                    <div className="text-zinc-400 text-xs mb-1 text-center">Balance</div>
                                    <div
                                        className={`text-lg  w-full text-first whitespace-nowrap ${stats.totalBalance >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}
                                    >
                                        {stats.totalBalance.toFixed(2)}€
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Gráfico de Ingresos vs Gastos */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Ingresos vs Gastos</h2>
                            <div className="mb-4">
                                {renderBarChart(dayData, maxValue)}
                            </div>
                            <p className="text-xs text-zinc-500 text-center mt-2">
                                Solo días trabajados (excluyendo descansos)
                            </p>
                            <div className="flex gap-4 justify-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-cyan-400"></div>
                                    <span className="text-zinc-400">Ingresos</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-pink-500"></div>
                                    <span className="text-zinc-400">Gastos</span>
                                </div>
                            </div>
                        </div>

                        {/* Gráfico de Balance */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Evolución del Balance</h2>
                            <div className="mb-4">
                                {renderLineChart(dayData)}
                            </div>
                            <p className="text-xs text-zinc-500 text-center mt-2">
                                Solo días trabajados (excluyendo descansos)
                            </p>
                        </div>

                        {/* Estadísticas Detalladas */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <h2 className="text-cyan-400 text-lg font-bold mb-4">Estadísticas Detalladas</h2>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-1">Promedio Diario Ingresos</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.promedioDiarioIngresos.toFixed(2)}€
                                        </div>
                                    </div>
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-1">Promedio Diario Gastos</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.promedioDiarioGastos.toFixed(2)}€
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Horas Trabajadas (Brutas / Netas)</div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-white text-lg font-bold">
                                            {Math.floor(stats.totalHorasBrutasMs / MS_PER_HOUR)}h {Math.floor((stats.totalHorasBrutasMs % MS_PER_HOUR) / MS_PER_MINUTE)}m
                                            </div>
                                            <div className="text-zinc-500 text-xs">Total Turnos</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-emerald-400 text-lg font-bold">
                                                {Math.floor(stats.totalHorasNetasMs / MS_PER_HOUR)}h {Math.floor((stats.totalHorasNetasMs % MS_PER_HOUR) / MS_PER_MINUTE)}m
                                            </div>
                                            <div className="text-emerald-500 text-xs">Tiempo Real</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-1">Total Carreras</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.totalCarreras}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-1">Promedio Carreras/Día</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.promedioCarrerasPorDia.toFixed(1)}
                                        </div>
                                    </div>
                                </div>

                                {stats.mejorDia && (
                                    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                                        <div className="text-green-400 text-xs mb-1 font-semibold">Mejor Día</div>
                                        <div className="text-white text-sm mb-1">
                                            {stats.mejorDia.date.toLocaleDateString('es-ES', {
                                                weekday: 'long',
                                                day: '2-digit',
                                                month: 'long'
                                            })}
                                        </div>
                                        <div className="text-green-400 text-lg font-bold">
                                            +{stats.mejorDia.balance.toFixed(2)}€
                                        </div>
                                        <div className="text-zinc-400 text-xs mt-1">
                                            Ingresos: {stats.mejorDia.ingresos.toFixed(2)}€ |
                                            Gastos: {stats.mejorDia.gastos.toFixed(2)}€ |
                                            Carreras: {stats.mejorDia.numCarreras}
                                        </div>
                                    </div>
                                )}

                                {stats.peorDia && (
                                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                                        <div className="text-red-400 text-xs mb-1 font-semibold">Peor Día</div>
                                        <div className="text-white text-sm mb-1">
                                            {stats.peorDia.date.toLocaleDateString('es-ES', {
                                                weekday: 'long',
                                                day: '2-digit',
                                                month: 'long'
                                            })}
                                        </div>
                                        <div className="text-red-400 text-lg font-bold">
                                            {stats.peorDia.balance.toFixed(2)}€
                                        </div>
                                        <div className="text-zinc-400 text-xs mt-1">
                                            Ingresos: {stats.peorDia.ingresos.toFixed(2)}€ |
                                            Gastos: {stats.peorDia.gastos.toFixed(2)}€ |
                                            Carreras: {stats.peorDia.numCarreras}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-1">Días Potenciales</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.diasPotenciales || 0}
                                        </div>
                                        <div className="text-zinc-500 text-xs mt-1">
                                            Trabajados: {stats.diasTrabajadosReal || 0} • Potenciales: {stats.diasPotenciales || 0} • Descanso: {stats.diasDescanso || 0}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-1">Días con Ingresos</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.diasConIngresos} / {stats.diasPotenciales || 0}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-zinc-800 rounded-lg p-3">
                                    <div className="text-zinc-400 text-xs mb-1">Días con Gastos</div>
                                    <div className="text-white text-lg font-bold">
                                        {stats.diasConGastos} / {stats.diasPotenciales || 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Análisis de Zonas y Horarios */}
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-cyan-400 text-lg font-bold">Análisis de Zonas y Horarios</h2>
                                <button
                                    onClick={() => setShowZoneTimeAnalysis(!showZoneTimeAnalysis)}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold"
                                    aria-label={showZoneTimeAnalysis ? 'Ocultar análisis de zonas y horarios' : 'Mostrar análisis de zonas y horarios'}
                                >
                                    {showZoneTimeAnalysis ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>

                            {showZoneTimeAnalysis && (
                                <>
                                    {loadingZoneTime ? (
                                        <div className="text-center py-8 text-zinc-400">Cargando análisis...</div>
                                    ) : zoneTimeAnalysis ? (
                                        <div className="space-y-6">
                                            {/* Top Horas */}
                                            <div>
                                                <h3 className="text-cyan-300 text-base font-bold mb-3">⏰ Mejores Horas del Día</h3>
                                                <div className="space-y-2">
                                                    {getTopHours(zoneTimeAnalysis, 5).map((hour, index) => (
                                                        <div key={hour.hour} className="bg-zinc-800 rounded-lg p-3">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-cyan-400 font-bold text-lg">
                                                                        {String(hour.hour).padStart(2, '0')}:00
                                                                    </span>
                                                                    <span className="text-zinc-500 text-xs">
                                                                        {hour.numCarreras} {hour.numCarreras === 1 ? 'carrera' : 'carreras'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-white font-bold">
                                                                        {hour.totalIngresos.toFixed(2)}€
                                                                    </div>
                                                                    <div className="text-zinc-400 text-xs">
                                                                        {hour.promedioPorCarrera.toFixed(2)}€/carrera
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-zinc-700 rounded-full h-2 mt-2">
                                                                <div
                                                                    className="bg-cyan-500 h-2 rounded-full transition-all"
                                                                    style={{ width: `${hour.porcentajeDelTotal}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="text-zinc-500 text-xs mt-1">
                                                                {hour.porcentajeDelTotal.toFixed(1)}% del total
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Top Días de la Semana */}
                                            <div>
                                                <h3 className="text-cyan-300 text-base font-bold mb-3">📅 Rendimiento por Día de la Semana</h3>
                                                <div className="space-y-2">
                                                    {zoneTimeAnalysis.mejoresDias
                                                        .filter(d => d.numCarreras > 0)
                                                        .sort((a, b) => b.totalIngresos - a.totalIngresos)
                                                        .map((day) => (
                                                            <div key={day.dayNumber} className="bg-zinc-800 rounded-lg p-3">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-cyan-400 font-bold">
                                                                            {day.day}
                                                                        </span>
                                                                        <span className="text-zinc-500 text-xs">
                                                                            {day.numCarreras} {day.numCarreras === 1 ? 'carrera' : 'carreras'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-white font-bold">
                                                                            {day.totalIngresos.toFixed(2)}€
                                                                        </div>
                                                                        <div className="text-zinc-400 text-xs">
                                                                            {day.promedioPorCarrera.toFixed(2)}€/carrera
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="w-full bg-zinc-700 rounded-full h-2 mt-2">
                                                                    <div
                                                                        className="bg-green-500 h-2 rounded-full transition-all"
                                                                        style={{ width: `${day.porcentajeDelTotal}%` }}
                                                                    ></div>
                                                                </div>
                                                                <div className="text-zinc-500 text-xs mt-1">
                                                                    {day.porcentajeDelTotal.toFixed(1)}% del total
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>

                                            {/* Estadísticas de Zonas */}
                                            <div>
                                                <h3 className="text-cyan-300 text-base font-bold mb-3">📍 Rendimiento por Zona</h3>
                                                <div className="space-y-2">
                                                    {getTopZones(zoneTimeAnalysis, 10).map((zone) => (
                                                        <div key={zone.zona} className="bg-zinc-800 rounded-lg p-3">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-cyan-400 font-bold">
                                                                        {zone.zona}
                                                                    </span>
                                                                    <span className="text-zinc-500 text-xs">
                                                                        {zone.numCarreras} ({zone.porcentajeCarreras.toFixed(1)}%)
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-white font-bold">
                                                                        {zone.totalIngresos.toFixed(2)}€
                                                                    </div>
                                                                    <div className="text-zinc-400 text-xs">
                                                                        {zone.promedioPorCarrera.toFixed(2)}€/carrera
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-zinc-700 rounded-full h-2 mt-2">
                                                                <div
                                                                    className="bg-yellow-500 h-2 rounded-full transition-all"
                                                                    style={{ width: `${zone.porcentajeDelTotal}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="text-zinc-500 text-xs mt-1">
                                                                {zone.porcentajeDelTotal.toFixed(1)}% del total de ingresos
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Resumen del Análisis */}
                                            <div className="bg-zinc-800 rounded-lg p-4 border border-cyan-500/30">
                                                <h3 className="text-cyan-300 text-base font-bold mb-3">📊 Resumen del Análisis</h3>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <div className="text-zinc-400">Total Ingresos</div>
                                                        <div className="text-white font-bold">
                                                            {zoneTimeAnalysis.totalIngresos.toFixed(2)}€
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-400">Total Carreras</div>
                                                        <div className="text-white font-bold">
                                                            {zoneTimeAnalysis.totalCarreras}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-400">Promedio por Carrera</div>
                                                        <div className="text-white font-bold">
                                                            {zoneTimeAnalysis.totalCarreras > 0
                                                                ? (zoneTimeAnalysis.totalIngresos / zoneTimeAnalysis.totalCarreras).toFixed(2)
                                                                : '0.00'}€
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-400">Período</div>
                                                        <div className="text-white font-bold text-xs">
                                                            {zoneTimeAnalysis.periodo.desde.toLocaleDateString('es-ES')} - {zoneTimeAnalysis.periodo.hasta.toLocaleDateString('es-ES')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-zinc-400">
                                            No hay datos suficientes para el análisis
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StatisticsScreen;