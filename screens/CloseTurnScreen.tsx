import React, { useState, useEffect } from 'react';
import { Seccion, Turno } from '../types';
import KineticHeader from '../components/KineticHeader';
import ScreenTopBar from '../components/ScreenTopBar';
import { getActiveTurno, closeTurno, subscribeToActiveTurno } from '../services/api';

interface CloseTurnScreenProps {
    navigateTo: (page: Seccion) => void;
}

const CloseTurnScreen: React.FC<CloseTurnScreenProps> = ({ navigateTo }) => {
    const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
    const [kilometrosFin, setKilometrosFin] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cargar turno activo
        const loadTurno = async () => {
            try {
                setLoading(true);
                const turno = await getActiveTurno();
                setTurnoActivo(turno);
                if (turno) {
                    // Suscripción en tiempo real
                    const unsubscribe = subscribeToActiveTurno((turno) => {
                        setTurnoActivo(turno);
                    });
                    return () => unsubscribe();
                }
            } catch (err) {
                console.error("Error loading turno:", err);
                setError("Error al cargar el turno activo");
            } finally {
                setLoading(false);
            }
        };
        loadTurno();
    }, []);

    const handleCloseTurno = async () => {
        if (!turnoActivo) {
            setError("No hay un turno activo para cerrar");
            return;
        }

        const kmsFin = parseFloat(kilometrosFin);
        if (!kilometrosFin || isNaN(kmsFin) || kmsFin <= 0) {
            setError("Por favor, ingresa un valor válido de kilómetros finales");
            return;
        }

        if (kmsFin <= turnoActivo.kilometrosInicio) {
            setError("Los kilómetros finales deben ser mayores a los iniciales");
            return;
        }

        setIsClosing(true);
        setError(null);

        try {
            await closeTurno(turnoActivo.id, kmsFin);
            // Navegar de vuelta a la pantalla de carreras
            navigateTo(Seccion.VistaCarreras);
        } catch (err) {
            console.error("Error closing turno:", err);
            setError("Error al cerrar el turno. Por favor, inténtalo de nuevo.");
        } finally {
            setIsClosing(false);
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-center p-8 text-zinc-400">Cargando turno activo...</div>;
        }

        if (!turnoActivo) {
            return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                    <p className="text-zinc-400 mb-4">No hay un turno activo para cerrar</p>
                    <button
                        onClick={() => navigateTo(Seccion.VistaCarreras)}
                        className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        Volver
                    </button>
                </div>
            );
        }

        const fechaInicio = turnoActivo.fechaInicio;
        const fechaInicioStr = fechaInicio.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const horaInicioStr = fechaInicio.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
                {/* Información del turno */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-zinc-100">Información del Turno</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Estado:</span>
                            <span className="text-emerald-400 font-semibold">Activo</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Fecha inicio:</span>
                            <span className="text-zinc-100">{fechaInicioStr}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Hora inicio:</span>
                            <span className="text-zinc-100">{horaInicioStr}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Kilómetros iniciales:</span>
                            <span className="text-zinc-100 font-semibold">{turnoActivo.kilometrosInicio}</span>
                        </div>
                    </div>
                </div>

                {/* Campo de kilómetros finales */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-400">
                        Kilómetros finales *
                    </label>
                    <input
                        type="number"
                        value={kilometrosFin}
                        onChange={(e) => {
                            setKilometrosFin(e.target.value);
                            setError(null);
                        }}
                        placeholder={`Mínimo: ${turnoActivo.kilometrosInicio + 1}`}
                        min={turnoActivo.kilometrosInicio + 1}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Error message */}
                {error && (
                    <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                        {error}
                    </div>
                )}

                {/* Botón de cerrar */}
                <button
                    onClick={handleCloseTurno}
                    disabled={isClosing || !kilometrosFin}
                    className="w-full py-4 px-4 rounded-lg bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-colors disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
                >
                    {isClosing ? 'Cerrando turno...' : 'Cerrar Turno'}
                </button>
            </div>
        );
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 py-4 space-y-4">
            <ScreenTopBar
                title="Cerrar Turno"
                navigateTo={navigateTo}
                backTarget={Seccion.VistaCarreras}
            />

            <KineticHeader title="Cerrar Turno" />
            {renderContent()}
        </div>
    );
};

export default CloseTurnScreen;

