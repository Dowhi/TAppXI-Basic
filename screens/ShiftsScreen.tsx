import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import KineticHeader from '../components/KineticHeader';
import AnimatedIcon3D from '../components/AnimatedIcon3D';
import BackButton from '../components/BackButton';
import { Seccion, Turno } from '../types';
import { getActiveTurno, addTurno, subscribeToActiveTurno, getRecentTurnos } from '../services/api';

// Icons
const TaxiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>;

const CustomTextField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-400">{label}</label>
        <input
            {...props}
            className="block w-full px-3 py-2 text-sm text-zinc-100 bg-zinc-900 rounded-md border border-zinc-700 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
);


interface ShiftsScreenProps {
    navigateTo: (page: Seccion, id?: string) => void;
}

const ShiftsScreen: React.FC<ShiftsScreenProps> = ({ navigateTo }) => {
    const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
    const [turnosRecientes, setTurnosRecientes] = useState<Turno[]>([]);
    const [kmsIniciales, setKmsIniciales] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingTurnos, setLoadingTurnos] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Cargar turnos recientes
    const loadTurnosRecientes = React.useCallback(async () => {
        try {
            setLoadingTurnos(true);
            const turnos = await getRecentTurnos(10);
            setTurnosRecientes(turnos);
        } catch (err) {
            console.error("Error loading recent turnos:", err);
        } finally {
            setLoadingTurnos(false);
        }
    }, []);

    // Cargar turno activo al montar el componente
    useEffect(() => {
        const loadTurno = async () => {
            try {
                setLoading(true);
                const turno = await getActiveTurno();
                setTurnoActivo(turno);
                
                // Suscripción en tiempo real
                const unsubscribe = subscribeToActiveTurno((turno) => {
                    setTurnoActivo(turno);
                    // Recargar turnos recientes cuando cambie el turno activo (se cierra)
                    if (!turno) {
                        loadTurnosRecientes();
                    }
                });
                
                return () => unsubscribe();
            } catch (err) {
                console.error("Error loading turno:", err);
                setError("Error al cargar el turno activo");
            } finally {
                setLoading(false);
            }
        };
        loadTurno();
    }, [loadTurnosRecientes]);

    useEffect(() => {
        loadTurnosRecientes();
    }, [loadTurnosRecientes]);
    
    const handleStartTurno = async () => {
        if (!kmsIniciales) {
            setError("Por favor, ingresa los kilómetros iniciales");
            return;
        }

        const kmsInicio = parseFloat(kmsIniciales);
        if (isNaN(kmsInicio) || kmsInicio <= 0) {
            setError("Por favor, ingresa un valor válido de kilómetros");
            return;
        }

        // Verificar si ya hay un turno activo
        if (turnoActivo) {
            setError("Ya existe un turno activo. Debes cerrarlo antes de crear uno nuevo.");
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            await addTurno(kmsInicio);
            setKmsIniciales('');
            // La suscripción actualizará automáticamente el estado
            navigateTo(Seccion.VistaCarreras);
        } catch (err) {
            console.error("Error creating turno:", err);
            setError("Error al crear el turno. Por favor, inténtalo de nuevo.");
        } finally {
            setIsCreating(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <header className="flex items-center space-x-3">
                    <BackButton navigateTo={navigateTo} />
                    <AnimatedIcon3D><TaxiIcon /></AnimatedIcon3D>
                    <KineticHeader title="Gestión de Turnos" />
                </header>
                <div className="text-center p-8 text-zinc-400">Cargando...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <header className="flex items-center space-x-3">
                <BackButton navigateTo={navigateTo} />
                <AnimatedIcon3D><TaxiIcon /></AnimatedIcon3D>
                <KineticHeader title="Gestión de Turnos" />
            </header>
            
            <Card>
                {!turnoActivo ? (
                    <div className="space-y-4">
                        <CustomTextField 
                            label="Kilómetros iniciales" 
                            type="number" 
                            value={kmsIniciales} 
                            onChange={(e) => {
                                setKmsIniciales(e.target.value);
                                setError(null);
                            }}
                            placeholder="Ej: 45000"
                        />
                        {error && (
                            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                                {error}
                            </div>
                        )}
                        <button 
                            onClick={handleStartTurno}
                            disabled={!kmsIniciales || isCreating}
                            className="w-full p-3 bg-zinc-50 text-zinc-900 font-bold rounded-lg disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors hover:bg-zinc-200"
                        >
                            {isCreating ? 'Creando turno...' : 'Iniciar turno'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 text-sm">
                        <p><span className="font-semibold text-emerald-400">Estado:</span> Activo</p>
                        <p><span className="font-semibold text-zinc-400">Fecha inicio:</span> {turnoActivo.fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        <p><span className="font-semibold text-zinc-400">Hora inicio:</span> {turnoActivo.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p><span className="font-semibold text-zinc-400">Km inicio:</span> {turnoActivo.kilometrosInicio}</p>
                        <p className="text-zinc-500 text-xs mt-4">
                            Ve a "Carreras" para añadir carreras a este turno. 
                            Para cerrar el turno, usa el botón de abajo a la izquierda en la pantalla de Carreras.
                        </p>
                    </div>
                )}
            </Card>
            
             <div>
                <h2 className="text-zinc-100 text-lg font-bold mb-2 tracking-tight">Turnos recientes</h2>
                {loadingTurnos ? (
                    <div className="text-center p-4 text-zinc-400 text-sm">Cargando turnos...</div>
                ) : turnosRecientes.length === 0 ? (
                    <div className="text-center p-4 text-zinc-500 text-sm">No hay turnos cerrados aún</div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {turnosRecientes.map(turno => {
                            const fechaInicio = turno.fechaInicio.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                            const horaInicio = turno.fechaInicio.toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            const fechaFin = turno.fechaFin ? turno.fechaFin.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            }) : '';
                            const horaFin = turno.fechaFin ? turno.fechaFin.toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : '';
                            
                            return (
                                <Card key={turno.id} className="p-3 text-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p><span className="font-semibold text-zinc-400">Inicio:</span> {fechaInicio} {horaInicio}</p>
                                            {turno.fechaFin && (
                                                <p><span className="font-semibold text-zinc-400">Fin:</span> {fechaFin} {horaFin}</p>
                                            )}
                                            <p><span className="font-semibold text-zinc-400">Kms:</span> {turno.kilometrosInicio} - {turno.kilometrosFin || 'N/A'}</p>
                                            <p><span className="font-semibold text-zinc-500">Estado:</span> {turno.kilometrosFin ? 'Finalizado' : 'Activo'}</p>
                                        </div>
                                        <button
                                            onClick={() => navigateTo(Seccion.EditarTurno, turno.id)}
                                            className="ml-2 p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                                            title="Editar turno"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                            </svg>
                                        </button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftsScreen;