import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, Turno } from '../types';
import { getActiveTurno, addTurno, subscribeToActiveTurno, getRecentTurnos, deleteTurno } from '../services/api';
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Icons
const TaxiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" /></svg>;

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
    const { showToast } = useToast();
    const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
    const [turnosRecientes, setTurnosRecientes] = useState<Turno[]>([]);
    const [kmsIniciales, setKmsIniciales] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingTurnos, setLoadingTurnos] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Función helper para formatear fecha y hora de forma consistente (DD/MM/YYYY HH:MM)
    // Usa métodos locales explícitos para garantizar formato DD/MM/YYYY
    const formatDateTime = (date: Date): string => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        // getDate(), getMonth(), getFullYear() ya devuelven valores en zona horaria local
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        // Formato explícito: DD/MM/YYYY HH:MM
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    // Función helper para formatear solo la fecha (DD/MM/YYYY)
    const formatDate = (date: Date): string => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        // Formato explícito: DD/MM/YYYY
        return `${day}/${month}/${year}`;
    };

    // Función helper para formatear solo la hora (HH:MM)
    const formatTime = (date: Date): string => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return 'Hora inválida';
        }
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        // Formato explícito: HH:MM
        return `${hours}:${minutes}`;
    };

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
            await addTurno({
                fechaInicio: new Date(),
                kilometrosInicio: kmsInicio
            });
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

    const handleDeleteTurno = async (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer.')) {
            try {
                await deleteTurno(id);
                // Recargar la lista después de eliminar
                loadTurnosRecientes();
                showToast('Turno eliminado correctamente', 'success');
            } catch (err) {
                ErrorHandler.handle(err, 'ShiftsScreen - handleDeleteTurno');
            }
        }
    };

    const topBar = (
        <ScreenTopBar
            title="Gestión de Turnos"
            navigateTo={navigateTo}
            backTarget={Seccion.Home}
            className="mb-4"
        />
    );

    if (loading) {
        return (
            <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-6 space-y-4">
                {topBar}
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner text="Cargando turnos..." size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-6 space-y-4">
            {topBar}

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
                        <p><span className="font-semibold text-zinc-400">Fecha inicio:</span> {formatDate(turnoActivo.fechaInicio)}</p>
                        <p><span className="font-semibold text-zinc-400">Hora inicio:</span> {formatTime(turnoActivo.fechaInicio)}</p>
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
                    <div className="flex items-center justify-center p-4">
                        <LoadingSpinner text="Cargando turnos..." size="sm" />
                    </div>
                ) : turnosRecientes.length === 0 ? (
                    <div className="text-center p-4 text-zinc-500 text-sm">No hay turnos cerrados aún</div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {turnosRecientes.map(turno => {
                            // Asegurar que las fechas son objetos Date válidos
                            const fechaInicio = turno.fechaInicio instanceof Date ? turno.fechaInicio : new Date(turno.fechaInicio);
                            const fechaFin = turno.fechaFin instanceof Date ? turno.fechaFin : (turno.fechaFin ? new Date(turno.fechaFin) : null);

                            return (
                                <Card key={turno.id} className="p-3 text-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p><span className="font-semibold text-zinc-400">Inicio:</span> {formatDateTime(fechaInicio)}</p>
                                            {fechaFin && (
                                                <p><span className="font-semibold text-zinc-400">Fin:</span> {formatDateTime(fechaFin)}</p>
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
                                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTurno(turno.id)}
                                            className="ml-2 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                                            title="Eliminar turno"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
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