import React, { useEffect, useState } from 'react';
import { calculateHourlyAveragesByDay, HourlyAverages } from '../services/predictions';
import { useTheme } from '../contexts/ThemeContext';

const AveragesTableWidget: React.FC = () => {
    const { isDark } = useTheme();
    const [data, setData] = useState<HourlyAverages[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDay, setExpandedDay] = useState<number | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await calculateHourlyAveragesByDay();
                setData(result);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

    if (loading) {
        return (
            <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-2xl p-5 mb-4 shadow-xl`}>
                <div className={`animate-pulse h-8 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} rounded`}></div>
            </div>
        );
    }

    const today = new Date().getDay();
    
    // Filtrar solo horas con datos (8:00 - 22:00 usualmente)
    const getActiveHours = () => {
        const hoursWithData = new Set<number>();
        data.forEach(dayData => {
            dayData.hourlyData.forEach(h => {
                if (h.count > 0) hoursWithData.add(h.hour);
            });
        });
        return Array.from(hoursWithData).sort((a, b) => a - b);
    };

    const activeHours = getActiveHours();
    if (activeHours.length === 0) {
        return null;
    }

    const minHour = Math.max(0, Math.min(...activeHours) - 1);
    const maxHour = Math.min(24, Math.max(...activeHours) + 1);

    return (
        <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-2xl p-5 mb-4 shadow-xl overflow-x-auto`}>
            {/* Header */}
            <div className="mb-4">
                <h3 className={`font-bold text-xl ${isDark ? 'text-cyan-300' : 'text-cyan-900'}`}>
                    📊 Promedios por Hora
                </h3>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Según tus turnos de semanas anteriores
                </p>
            </div>

            {/* Tabla compacta */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className={`text-left px-2 py-2 font-bold sticky left-0 z-10 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                                Día
                            </th>
                            {Array.from({ length: maxHour - minHour }).map((_, i) => {
                                const hour = minHour + i;
                                return (
                                    <th
                                        key={hour}
                                        className={`px-2 py-2 font-bold text-center ${
                                            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                                        }`}
                                    >
                                        {hour}:00
                                    </th>
                                );
                            })}
                            <th className={`px-2 py-2 font-bold text-center ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                                Avg
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((dayData) => {
                            const dayAverage = dayData.hourlyData
                                .filter(h => h.count > 0)
                                .reduce((sum, h) => sum + h.average, 0) / 
                                dayData.hourlyData.filter(h => h.count > 0).length || 0;
                            
                            const isToday = dayData.day === today;

                            return (
                                <tr
                                    key={dayData.day}
                                    className={`border-t cursor-pointer transition ${
                                        isToday
                                            ? isDark ? 'bg-indigo-900/30 border-indigo-700' : 'bg-indigo-50 border-indigo-200'
                                            : isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-zinc-200 hover:bg-zinc-50'
                                    }`}
                                    onClick={() => setExpandedDay(expandedDay === dayData.day ? null : dayData.day)}
                                >
                                    <td className={`px-2 py-2 font-bold sticky left-0 z-10 ${
                                        isToday ? (isDark ? 'bg-indigo-900/30' : 'bg-indigo-50') : (isDark ? 'bg-zinc-900' : 'bg-white')
                                    }`}>
                                        {dayData.dayName} {isToday ? '📍' : ''}
                                    </td>
                                    {Array.from({ length: maxHour - minHour }).map((_, i) => {
                                        const hour = minHour + i;
                                        const hourData = dayData.hourlyData[hour];
                                        const hasData = hourData.count > 0;
                                        const percentage = dayAverage > 0 ? (hourData.average / dayAverage) * 100 : 0;

                                        return (
                                            <td
                                                key={hour}
                                                className={`px-2 py-2 text-center font-semibold relative transition ${
                                                    !hasData
                                                        ? isDark ? 'bg-zinc-800/30 text-zinc-600' : 'bg-zinc-100/30 text-zinc-400'
                                                        : isDark ? 'text-zinc-100' : 'text-zinc-900'
                                                }`}
                                                style={{
                                                    backgroundImage: hasData
                                                        ? `linear-gradient(to top, ${isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)'}, transparent)`
                                                        : 'none',
                                                    backgroundSize: `100% ${percentage}%`,
                                                    backgroundPosition: 'bottom',
                                                    backgroundRepeat: 'no-repeat'
                                                }}
                                            >
                                                {hasData ? formatCurrency(hourData.average) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className={`px-2 py-2 text-center font-bold ${isDark ? 'bg-zinc-800/50 text-cyan-300' : 'bg-cyan-50 text-cyan-700'}`}>
                                        {formatCurrency(dayAverage)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Vista expandida para día seleccionado */}
            {expandedDay !== null && (
                <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            Detalle: {data[expandedDay]?.dayName}
                        </h4>
                        <button
                            onClick={() => setExpandedDay(null)}
                            className={`text-sm px-2 py-1 rounded ${isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100' : 'bg-zinc-300 hover:bg-zinc-200 text-zinc-900'}`}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {data[expandedDay]?.hourlyData
                            .filter(h => h.count > 0)
                            .map(h => (
                                <div
                                    key={h.hour}
                                    className={`p-2 rounded border ${
                                        isDark
                                            ? 'bg-zinc-700/50 border-zinc-600 text-zinc-100'
                                            : 'bg-white border-zinc-200 text-zinc-900'
                                    }`}
                                >
                                    <div className="text-xs font-bold text-zinc-500 mb-1">{h.hour}:00</div>
                                    <div className="font-black text-sm">{formatCurrency(h.average)}</div>
                                    <div className="text-[10px] text-zinc-400">({h.count} veces)</div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AveragesTableWidget;
