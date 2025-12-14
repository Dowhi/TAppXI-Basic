import React, { useState, useEffect } from 'react';
import { Seccion } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { useTheme } from '../contexts/ThemeContext';
import { getStationInfo, startStationUpdates, StationInfo, TrainArrival, TrainDeparture } from '../services/trainStation';

interface TrainStationScreenProps {
    navigateTo: (page: Seccion) => void;
}

const TrainStationScreen: React.FC<TrainStationScreenProps> = ({ navigateTo }) => {
    const { isDark } = useTheme();
    const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'llegadas' | 'salidas'>('llegadas');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        // Cargar información inicial
        const loadInitialData = async () => {
            try {
                const info = await getStationInfo();
                setStationInfo(info);
            } catch (err: any) {
                console.error('Error cargando información de estación:', err);
                setError('No se pudo cargar la información de la estación. Por favor, intenta de nuevo.');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        // Iniciar actualizaciones automáticas cada 60 segundos
        const stopUpdates = startStationUpdates((info) => {
            setStationInfo(info);
            setError(null);
        }, 60000);

        return () => {
            stopUpdates();
        };
    }, []);

    const formatTime = (timeStr: string | null): string => {
        if (!timeStr) return '--:--';
        return timeStr;
    };

    const getStatusColor = (estado: string, retraso: number): string => {
        if (estado === 'cancelado' || estado === 'salido' || estado === 'llegado') {
            return isDark ? 'text-zinc-500' : 'text-gray-500';
        }
        if (retraso > 0) {
            return isDark ? 'text-red-400' : 'text-red-600';
        }
        return isDark ? 'text-green-400' : 'text-green-600';
    };

    const getStatusText = (estado: string, retraso: number): string => {
        if (estado === 'cancelado') return 'Cancelado';
        if (estado === 'salido') return 'Salido';
        if (estado === 'llegado') return 'Llegado';
        if (retraso > 0) return `+${retraso} min`;
        return 'A tiempo';
    };

    const renderTrainRow = (train: TrainArrival | TrainDeparture, isArrival: boolean) => {
        const bgColor = isDark ? 'bg-zinc-800' : 'bg-white';
        const borderColor = isDark ? 'border-zinc-700' : 'border-gray-200';
        const textColor = isDark ? 'text-zinc-100' : 'text-gray-900';
        const secondaryTextColor = isDark ? 'text-zinc-400' : 'text-gray-600';

        return (
            <div
                key={train.id}
                className={`${bgColor} ${borderColor} border rounded-lg p-3 mb-2 transition-colors`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold ${textColor}`}>
                                {train.numeroTren}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-100 text-gray-700'}`}>
                                {train.tipoTren}
                            </span>
                        </div>
                        <div className={`text-sm ${secondaryTextColor} mb-1`}>
                            {isArrival ? (
                                <>
                                    <span className="font-semibold">{train.origen}</span>
                                    <span className="mx-2">→</span>
                                    <span>{train.destino}</span>
                                </>
                            ) : (
                                <>
                                    <span>{train.origen}</span>
                                    <span className="mx-2">→</span>
                                    <span className="font-semibold">{train.destino}</span>
                                </>
                            )}
                        </div>
                        {train.via && (
                            <div className={`text-xs ${secondaryTextColor}`}>
                                {train.via}
                            </div>
                        )}
                    </div>
                    <div className="text-right ml-4">
                        <div className={`text-lg font-bold ${getStatusColor(train.estado, train.retraso)}`}>
                            {formatTime(train.horaProgramada)}
                        </div>
                        {train.horaEstimada && train.retraso > 0 && (
                            <div className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                Est: {formatTime(train.horaEstimada)}
                            </div>
                        )}
                        <div className={`text-xs mt-1 ${getStatusColor(train.estado, train.retraso)}`}>
                            {getStatusText(train.estado, train.retraso)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const bgColor = isDark ? 'bg-zinc-950' : 'bg-gray-50';
    const cardBg = isDark ? 'bg-zinc-900' : 'bg-white';
    const textColor = isDark ? 'text-zinc-100' : 'text-gray-900';
    const secondaryTextColor = isDark ? 'text-zinc-400' : 'text-gray-600';

    return (
        <div className={`${bgColor} min-h-screen flex flex-col`}>
            <ScreenTopBar 
                title="Estación Santa Justa" 
                navigateTo={navigateTo} 
                backTarget={Seccion.Home} 
            />

            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className={`${secondaryTextColor}`}>Cargando información de trenes...</div>
                    </div>
                ) : error ? (
                    <div className={`${cardBg} rounded-lg p-6 border ${isDark ? 'border-red-500/50' : 'border-red-300'}`}>
                        <div className={`${isDark ? 'text-red-400' : 'text-red-600'} font-bold mb-2`}>
                            ⚠️ Error
                        </div>
                        <div className={secondaryTextColor}>{error}</div>
                        <div className={`${secondaryTextColor} text-xs mt-4`}>
                            <p className="mb-2">Nota: Esta funcionalidad requiere acceso a una API de información de trenes.</p>
                            <p>Actualmente se muestran datos de ejemplo. Para datos reales, se necesita:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>API oficial de ADIF/Renfe (no disponible públicamente)</li>
                                <li>Servicio backend propio con scraping</li>
                                <li>API de terceros que proporcione esta información</li>
                            </ul>
                        </div>
                    </div>
                ) : stationInfo ? (
                    <>
                        {/* Información de la estación */}
                        <div className={`${cardBg} rounded-lg p-4 mb-4 border ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className={`${textColor} font-bold text-lg mb-1`}>
                                        🚂 {stationInfo.nombre}
                                    </h2>
                                    <div className={`${secondaryTextColor} text-xs`}>
                                        Código ADIF: {stationInfo.codigo}
                                    </div>
                                    <div className={`${secondaryTextColor} text-xs`}>
                                        Última actualización: {stationInfo.ultimaActualizacion.toLocaleTimeString('es-ES', { 
                                            hour: '2-digit', 
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {stationInfo && stationInfo.isRealData ? (
                                        <div className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                            ✅ Datos Reales
                                        </div>
                                    ) : (
                                        <div className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                            📋 Horarios Aproximados
                                        </div>
                                    )}
                                    <div className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                        En vivo
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className={`${cardBg} rounded-lg p-1 mb-4 border ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveTab('llegadas')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                                        activeTab === 'llegadas'
                                            ? isDark
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-blue-600 text-white'
                                            : isDark
                                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Llegadas ({stationInfo.llegadas.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('salidas')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                                        activeTab === 'salidas'
                                            ? isDark
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-blue-600 text-white'
                                            : isDark
                                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Salidas ({stationInfo.salidas.length})
                                </button>
                            </div>
                        </div>

                        {/* Lista de trenes */}
                        <div>
                            {activeTab === 'llegadas' ? (
                                <>
                                    <h3 className={`${textColor} font-bold text-base mb-3`}>
                                        Próximas Llegadas
                                    </h3>
                                    {stationInfo.llegadas.length === 0 ? (
                                        <div className={`${secondaryTextColor} text-center py-8`}>
                                            No hay llegadas programadas
                                        </div>
                                    ) : (
                                        stationInfo.llegadas.map(train => renderTrainRow(train, true))
                                    )}
                                </>
                            ) : (
                                <>
                                    <h3 className={`${textColor} font-bold text-base mb-3`}>
                                        Próximas Salidas
                                    </h3>
                                    {stationInfo.salidas.length === 0 ? (
                                        <div className={`${secondaryTextColor} text-center py-8`}>
                                            No hay salidas programadas
                                        </div>
                                    ) : (
                                        stationInfo.salidas.map(train => renderTrainRow(train, false))
                                    )}
                                </>
                            )}
                        </div>

                        {/* Nota informativa */}
                        <div className={`${cardBg} rounded-lg p-3 mt-4 border ${isDark ? 'border-blue-500/30 bg-blue-900/10' : 'border-blue-300 bg-blue-50'}`}>
                            <div className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                                <p className="font-semibold mb-1">ℹ️ Información</p>
                                <p className="mb-2">
                                    Los datos se actualizan automáticamente cada minuto. 
                                    Los horarios mostrados son aproximados basados en servicios típicos de Renfe.
                                </p>
                                <p>
                                    <strong>Para información oficial en tiempo real:</strong> Consulta la web de 
                                    <a href="https://www.adif.es/es/-/51003-sevilla-sta.-justa" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                                        ADIF
                                    </a> o 
                                    <a href="https://www.renfe.com" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                                        Renfe
                                    </a>.
                                </p>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default TrainStationScreen;

