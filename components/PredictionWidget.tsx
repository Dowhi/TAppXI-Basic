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
                const currentHour = now.getHours();
                const currentDay = now.getDay();

                // Si son las 15:00 o más, sugerir para el día siguiente
                const targetDay = currentHour >= 15 ? (currentDay + 1) % 7 : currentDay;

                const result = await analyzeShiftPatterns(targetDay);
                setPrediction(result);
            } finally {
                setLoading(false);
            }
        };
        loadPrediction();
    }, []);

    if (loading || !prediction) return null;

    return (
        <div className={`${isDark ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500/30' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'} border rounded-xl p-4 mb-4 relative overflow-hidden`}>
            {/* Decorative Icon Background */}
            <div className="absolute -right-4 -bottom-4 text-9xl opacity-5 select-none pointer-events-none">
                🧠
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className={`p-3 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                </div>

                <div className="flex-1">
                    <h3 className={`font-bold text-lg ${isDark ? 'text-indigo-200' : 'text-indigo-900'}`}>
                        Sugerencia de Jornada
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-indigo-300/80' : 'text-indigo-800/80'}`}>
                        {prediction.reason}, deberías empezar a las <span className="font-bold underline">{prediction.suggestedStart}</span> para maximizar ingresos.
                    </p>
                </div>

                <div className="hidden sm:block">
                    <button className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isDark
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}>
                        Ver Estadísticas
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PredictionWidget;
