import React, { useState, useEffect, useMemo } from 'react';
import { Seccion } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { getCarrerasByDate, getGastosByDate } from '../services/api';

interface StatisticsScreenProps {
    navigateTo: (page: Seccion) => void;
}

interface DayData {
    date: Date;
    ingresos: number;
    gastos: number;
    balance: number;
    numCarreras: number;
}

const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ navigateTo }) => {
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | '3months'>('month');
    const [loading, setLoading] = useState(true);
    const [dayData, setDayData] = useState<DayData[]>([]);

    // Calcular fechas según el período seleccionado
    const dateRange = useMemo(() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date();
        
        switch (selectedPeriod) {
            case 'week':
                start.setDate(start.getDate() - 7);
                break;
            case 'month':
                start.setMonth(start.getMonth() - 1);
                break;
            case '3months':
                start.setMonth(start.getMonth() - 3);
                break;
        }
        start.setHours(0, 0, 0, 0);
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

                const results = await Promise.all(
                    dates.map(async (date) => {
                        try {
                            const [carreras, gastos] = await Promise.all([
                                getCarrerasByDate(date),
                                getGastosByDate(date),
                            ]);

                            const ingresos = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);

                            return {
                                date,
                                ingresos,
                                gastos,
                                balance: ingresos - gastos,
                                numCarreras: carreras.length,
                            } as DayData;
                        } catch (error) {
                            console.error(`Error cargando datos para ${date.toISOString()}:`, error);
                            return {
                                date,
                                ingresos: 0,
                                gastos: 0,
                                balance: 0,
                                numCarreras: 0,
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

    // Calcular estadísticas
    const stats = useMemo(() => {
        if (dayData.length === 0) {
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
                diasConGastos: 0
            };
        }

        const totalIngresos = dayData.reduce((sum, d) => sum + d.ingresos, 0);
        const totalGastos = dayData.reduce((sum, d) => sum + d.gastos, 0);
        const totalBalance = totalIngresos - totalGastos;
        const totalCarreras = dayData.reduce((sum, d) => sum + d.numCarreras, 0);
        
        const diasConIngresos = dayData.filter(d => d.ingresos > 0).length;
        const diasConGastos = dayData.filter(d => d.gastos > 0).length;
        
        const mejorDia = dayData.reduce((best, current) => 
            current.balance > (best?.balance || -Infinity) ? current : best, null as DayData | null
        );
        
        const peorDia = dayData.reduce((worst, current) => 
            current.balance < (worst?.balance || Infinity) ? current : worst, null as DayData | null
        );

        return {
            totalIngresos,
            totalGastos,
            totalBalance,
            promedioDiarioIngresos: totalIngresos / dayData.length,
            promedioDiarioGastos: totalGastos / dayData.length,
            promedioDiarioBalance: totalBalance / dayData.length,
            totalCarreras,
            promedioCarrerasPorDia: totalCarreras / dayData.length,
            mejorDia,
            peorDia,
            diasConIngresos,
            diasConGastos
        };
    }, [dayData]);

    // Función para renderizar gráfico de barras
    const renderBarChart = (data: DayData[], maxValue: number, height: number = 150) => {
        if (data.length === 0) return null;
        
        const svgWidth = 400; // Ancho fijo para cálculos, se escalará con width="100%"
        const padding = 40;
        const chartWidth = svgWidth - (padding * 2);
        const barSpacing = chartWidth / data.length;
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
                    
                    {/* Barras de ingresos y gastos */}
                    {data.map((day, index) => {
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
                    {data.length > 0 && (
                        <>
                            <span>
                                {data[0].date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span>
                                {data[Math.floor(data.length / 2)].date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span>
                                {data[data.length - 1].date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Función para renderizar gráfico de línea de balance
    const renderLineChart = (data: DayData[], height: number = 150) => {
        if (data.length === 0) return null;
        
        const maxBalance = Math.max(...data.map(d => Math.abs(d.balance)), 1);
        const minBalance = Math.min(...data.map(d => d.balance), 0);
        const range = maxBalance - minBalance || 1;
        const maxBarHeight = height - 40;
        const centerY = height - 20 - (maxBarHeight / 2);
        const svgWidth = 400; // Ancho fijo para cálculos, se escalará con width="100%"
        const padding = 20;
        const chartWidth = svgWidth - (padding * 2);
        
        const points = data.map((day, index) => {
            const xPercent = index / (data.length - 1 || 1);
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

    const maxValue = Math.max(
        ...dayData.map(d => Math.max(d.ingresos, d.gastos)),
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
                        className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                            selectedPeriod === 'week'
                                ? 'bg-cyan-500 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                    >
                        7 Días
                    </button>
                    <button
                        onClick={() => setSelectedPeriod('month')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                            selectedPeriod === 'month'
                                ? 'bg-cyan-500 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                    >
                        1 Mes
                    </button>
                    <button
                        onClick={() => setSelectedPeriod('3months')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                            selectedPeriod === '3months'
                                ? 'bg-cyan-500 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
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
                                        className={`text-lg  w-full text-first whitespace-nowrap ${
                                            stats.totalBalance >= 0 ? 'text-green-400' : 'text-red-400'
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
                                        <div className="text-zinc-400 text-xs mb-1">Días con Ingresos</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.diasConIngresos} / {dayData.length}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-1">Días con Gastos</div>
                                        <div className="text-white text-lg font-bold">
                                            {stats.diasConGastos} / {dayData.length}
                                        </div>
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

export default StatisticsScreen;