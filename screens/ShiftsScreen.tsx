import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, Turno } from '../types';
import { getActiveTurno, addTurno, subscribeToActiveTurno, getRecentTurnos, deleteTurno, getMaintenanceIntervals, getGastos, reopenTurno, startBreak, endBreak } from '../services/api';
import { useToast } from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
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
    const { isDark } = useTheme();
    const { showToast } = useToast();
    const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
    const [turnosRecientes, setTurnosRecientes] = useState<Turno[]>([]);
    const [kmsIniciales, setKmsIniciales] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingTurnos, setLoadingTurnos] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [kmsBreak, setKmsBreak] = useState('');
    const [isStartingBreak, setIsStartingBreak] = useState(true); // true for start, false for end

    const parseSafeDate = (dateAny: any): Date => {
        if (!dateAny) return new Date();
        if (dateAny instanceof Date) {
            return isNaN(dateAny.getTime()) ? new Date() : dateAny;
        }
        const parsed = new Date(dateAny);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    // Función helper para formatear fecha y hora de forma consistente (DD/MM/YYYY HH:MM)
    // Usa métodos locales explícitos para garantizar formato DD/MM/YYYY
    const formatDateTime = (dateAny: any): string => {
        const date = parseSafeDate(dateAny);
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
    const formatDate = (dateAny: any): string => {
        const date = parseSafeDate(dateAny);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        // Formato explícito: DD/MM/YYYY
        return `${day}/${month}/${year}`;
    };

    // Función helper para formatear solo la hora (HH:MM)
    const formatTime = (dateAny: any): string => {
        const date = parseSafeDate(dateAny);
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

        // Verificación de mantenimiento inteligente
        try {
            const intervals = await getMaintenanceIntervals();
            const allGastos = await getGastos();
            const maintenanceGastos = allGastos.filter(g =>
                (g.concepto || '').toLowerCase().includes('aceite') ||
                (g.concepto || '').toLowerCase().includes('rueda') ||
                (g.concepto || '').toLowerCase().includes('neumatico') ||
                (g.concepto || '').toLowerCase().includes('filtro') ||
                (g.concepto || '').toLowerCase().includes('pastilla') ||
                (g.concepto || '').toLowerCase().includes('freno')
            );

            // Mantenimientos críticos detectados
            const alertas: string[] = [];
            const margin = 100;

            // Revisar cada tipo
            const check = (keywords: string[], limit: number, label: string) => {
                const latest = maintenanceGastos
                    .filter(g => keywords.some(k => (g.concepto || '').toLowerCase().includes(k)))
                    .sort((a, b) => (b.kilometrosVehiculo || 0) - (a.kilometrosVehiculo || 0))[0];

                if (latest && latest.kilometrosVehiculo) {
                    const nextChange = latest.kilometrosVehiculo + limit;
                    if (kmsInicio >= (nextChange - margin)) {
                        alertas.push(`¡OJO! ${label} toca pronto (Límite: ${nextChange} km)`);
                    }
                }
            };

            check(['aceite'], intervals.aceite, 'Aceite');
            check(['rueda', 'neumatico'], intervals.ruedas, 'Neumáticos');
            check(['filtro'], intervals.filtros, 'Filtros');
            check(['pastilla', 'freno'], intervals.frenos, 'Frenos');

            if (alertas.length > 0) {
                if (!window.confirm(`${alertas.join('\n')}\n\n¿Quieres iniciar el turno de todas formas?`)) {
                    return;
                }
            }
        } catch (err) {
            console.error("Error checking maintenance:", err);
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

    const handleReopenTurno = async (id: string) => {
        try {
            await reopenTurno(id);
            showToast("Turno reabierto con éxito", "success");
        } catch (err) {
            showToast("Error al reabrir el turno", "error");
        }
    };

    const handleBreakAction = async () => {
        if (!kmsBreak) return;
        const kms = parseFloat(kmsBreak);
        if (isNaN(kms)) {
            showToast("Ingresa un valor numérico válido", "warning");
            return;
        }

        try {
            if (isStartingBreak) {
                await startBreak(turnoActivo!.id, kms);
                showToast("Pausa iniciada", "success");
            } else {
                await endBreak(turnoActivo!.id, kms);
                showToast("Pausa terminada", "success");
            }
            setShowBreakModal(false);
            setKmsBreak('');
        } catch (err) {
            showToast("Error al procesar la pausa", "error");
        }
    };

    const activeBreak = turnoActivo?.descansos?.find(d => !d.fechaFin);

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
                            className={`w-full p-3 font-bold rounded-lg transition-colors ${isDark ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:bg-zinc-800 disabled:text-zinc-500`}
                        >
                            {isCreating ? 'Creando turno...' : 'Iniciar turno'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/50">
                            <div>
                                <h3 className={`text-lg font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{activeBreak ? 'TURNO EN PAUSA' : 'TURNO ACTIVO'}</h3>
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Desde {formatTime(turnoActivo.fechaInicio)} • {formatDate(turnoActivo.fechaInicio)}</p>
                            </div>
                            <div className={`w-3 h-3 rounded-full animate-pulse ${activeBreak ? 'bg-orange-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-50 border border-zinc-100'}`}>
                                <p className="text-[8px] uppercase font-bold text-zinc-500 mb-0.5">KM Inicio</p>
                                <p className="text-sm font-black">{turnoActivo.kilometrosInicio} km</p>
                            </div>
                            <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-50 border border-zinc-100'}`}>
                                <p className="text-[8px] uppercase font-bold text-zinc-500 mb-0.5">Km Parciales</p>
                                <p className="text-sm font-black text-emerald-400">En desarrollo...</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {activeBreak ? (
                                <button
                                    onClick={() => {
                                        setIsStartingBreak(false);
                                        setShowBreakModal(true);
                                    }}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-emerald-900/20"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    REANUDAR
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsStartingBreak(true);
                                        setShowBreakModal(true);
                                    }}
                                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-orange-900/20"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                    PAUSAR
                                </button>
                            )}
                            <button
                                onClick={() => navigateTo(Seccion.CerrarTurno)}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-red-900/20"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                                TERMINAR
                            </button>
                        </div>
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
                        {turnosRecientes.map((turno, idx) => {
                            // Asegurar que las fechas son objetos Date válidos
                            const fechaInicio = turno.fechaInicio instanceof Date ? turno.fechaInicio : new Date(turno.fechaInicio);
                            const fechaFin = turno.fechaFin instanceof Date ? turno.fechaFin : (turno.fechaFin ? new Date(turno.fechaFin) : null);

                            return (
                                <Card key={turno.id} className="p-3 text-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-xs font-black text-zinc-400">{formatDate(fechaInicio)}</p>
                                                {idx === 0 && turno.fechaFin && (
                                                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-black">Reciente</span>
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-1.5 mb-1.5">
                                                <span className="text-base font-black text-zinc-100">{formatTime(fechaInicio)}</span>
                                                <span className="text-zinc-600 text-[10px] font-bold">→</span>
                                                <span className={`text-sm font-black ${fechaFin ? 'text-zinc-400' : 'text-emerald-400'}`}>{fechaFin ? formatTime(fechaFin) : 'ACTIVO'}</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] uppercase text-zinc-500 font-bold">Ruta</span>
                                                    <span className="text-[10px] font-black text-zinc-300">{turno.kilometrosInicio} - {turno.kilometrosFin || '...'} km</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] uppercase text-zinc-500 font-bold">Total</span>
                                                    <span className="text-[10px] font-black text-emerald-500/80">{(turno.kilometrosFin || 0) - turno.kilometrosInicio} km</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 flex-col">
                                            <div className="flex gap-1.5">
                                                {idx === 0 && turno.fechaFin && (
                                                    <button
                                                        onClick={() => handleReopenTurno(turno.id)}
                                                        className="p-2 rounded-lg bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 transition-all active:scale-90"
                                                        title="Reabrir"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigateTo(Seccion.EditarTurno, turno.id)}
                                                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-all active:scale-90"
                                                    title="Editar"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTurno(turno.id)}
                                                    className="p-2 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-all active:scale-90"
                                                    title="Eliminar"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Kilómetros para Pausa/Reanudación */}
            {showBreakModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-3xl p-6 ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'} shadow-2xl space-y-4`}>
                        <div className="text-center">
                            <h3 className={`text-xl font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{isStartingBreak ? 'Iniciar Pausa' : 'Terminar Pausa'}</h3>
                            <p className="text-zinc-500 text-sm mt-1">Ingresa los kilómetros del vehículo</p>
                        </div>

                        <div className="space-y-4">
                            <CustomTextField
                                label="Kilómetros Actuales"
                                type="number"
                                value={kmsBreak}
                                onChange={(e) => setKmsBreak(e.target.value)}
                                placeholder="Ej: 154231"
                                autoFocus
                            />

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowBreakModal(false)}
                                    className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleBreakAction}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20"
                                >
                                    CONFIRMAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftsScreen;