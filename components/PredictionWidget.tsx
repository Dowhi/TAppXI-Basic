import React, { useEffect, useState } from 'react';
import { analyzeShiftPatterns, Prediction } from '../services/predictions';
import { useTheme } from '../contexts/ThemeContext';

const PredictionWidget: React.FC = () => {
    const { isDark } = useTheme();
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPrediction = async () => {
            try {
                const now = new Date();
                const currentDay = now.getDay();
                const targetDay = (currentDay + 1) % 7;

                const result = await analyzeShiftPatterns(targetDay);
                setPrediction(result);
            } finally {
                setLoading(false);
            }
        };
        loadPrediction();
    }, []);

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const tomorrowIndex = (new Date().getDay() + 1) % 7;
    const tomorrowName = dayNames[tomorrowIndex];

    if (loading) return null;

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

    return (
        <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-2xl p-5 mb-4 relative overflow-hidden shadow-xl`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className={`font-bold text-xl ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
                        Sugerencia para Mañana ({tomorrowName})
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {prediction ? prediction.reason : 'Recopilando datos de tus turnos...'}
                    </p>
                </div>
                {prediction && (
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        prediction.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                        prediction.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                        Confianza {prediction.confidence === 'high' ? 'Alta' : prediction.confidence === 'medium' ? 'Media' : 'Baja'}
                    </div>
                )}
            </div>

            {/* Grid de Sugerencias */}
            {prediction ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Hora Inicio */}
                    <div className={`${isDark ? 'bg-zinc-800/50' : 'bg-indigo-50/50'} p-3 rounded-xl border ${isDark ? 'border-zinc-700' : 'border-indigo-100'}`}>
                        <span className="block text-[10px] uppercase font-bold text-indigo-500 mb-1">Inicio Óptimo</span>
                        <span className={`text-lg font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{prediction.suggestedStart}</span>
                    </div>

                    {/* Duración */}
                    <div className={`${isDark ? 'bg-zinc-800/50' : 'bg-emerald-50/50'} p-3 rounded-xl border ${isDark ? 'border-zinc-700' : 'border-emerald-100'}`}>
                        <span className="block text-[10px] uppercase font-bold text-emerald-500 mb-1">Duración Media</span>
                        <span className={`text-lg font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{prediction.suggestedDuration.toFixed(1)}h</span>
                    </div>

                    {/* Ingresos */}
                    <div className={`${isDark ? 'bg-zinc-800/50' : 'bg-amber-50/50'} p-3 rounded-xl border ${isDark ? 'border-zinc-700' : 'border-amber-100'}`}>
                        <span className="block text-[10px] uppercase font-bold text-amber-500 mb-1">Euros Esperados</span>
                        <span className={`text-lg font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{formatCurrency(prediction.projectedEarnings)}</span>
                    </div>

                    {/* Kilómetros */}
                    <div className={`${isDark ? 'bg-zinc-800/50' : 'bg-blue-50/50'} p-3 rounded-xl border ${isDark ? 'border-zinc-700' : 'border-blue-100'}`}>
                        <span className="block text-[10px] uppercase font-bold text-blue-500 mb-1">Kms Estimados</span>
                        <span className={`text-lg font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{Math.round(prediction.projectedKms)} km</span>
                    </div>

                    {/* Descanso */}
                    {prediction.optimalBreakTime && (
                        <div className={`${isDark ? 'bg-zinc-800/50' : 'bg-purple-50/50'} p-3 rounded-xl border ${isDark ? 'border-zinc-700' : 'border-purple-100'}`}>
                            <span className="block text-[10px] uppercase font-bold text-purple-500 mb-1">Descanso Ideal</span>
                            <span className={`text-lg font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{prediction.optimalBreakTime}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-zinc-800/30' : 'bg-indigo-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-indigo-600'}`}>
                        ⚠️ <strong>Faltan datos</strong><br/>
                        Necesitas al menos 2 turnos completados en el mismo día de la semana<br/>
                        para generar sugerencias. ¡Sigue trabajando y vuelve mañana!
                    </p>
                </div>
            )}
        </div>
    );
};

export default PredictionWidget;
