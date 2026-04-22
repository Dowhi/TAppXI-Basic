import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, CarrerasResumen, CarreraVista, Turno } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import ScreenTopBar from '../components/ScreenTopBar';
import { subscribeToCarreras, subscribeToGastos, subscribeToActiveTurno, getAjustes, startBreak, endBreak } from '../services/api';
import { useToast } from '../components/Toast';

// Icons
// Icons (Tipo 2: Lineal Moderno, stroke-width=2)
const VisibilityIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const VisibilityOffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
);

const EuroIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 10h12" />
        <path d="M4 14h9" />
        <path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12a7.9 7.9 0 0 0 7.8 8 7.7 7.7 0 0 0 5.2-2" />
    </svg>
);

const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="1" y="4" width="22" height="16" rx="3" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const BizumIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <path d="M12 18h.01" />
        <path d="m13 8-4 4h6l-4 4" />
    </svg>
);

const ValesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <line x1="13" y1="5" x2="13" y2="19" />
    </svg>
);

const CellTowerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`text-white ${className || ''}`}>
        {/* Tower Base */}
        <path d="M12 8.5L5 22h2.5l1.5-3h6l1.5 3H19L12 8.5zm-2.2 8.5l1.2-2.5h2l1.2 2.5h-4.4z" />
        {/* Top Dot */}
        <circle cx="12" cy="7" r="2.2" />
        {/* Right Signal Waves */}
        <path d="M16.5 4.5a6.5 6.5 0 0 1 0 10l1.8 1.8a9 9 0 0 0 0-13.6l-1.8 1.8z" />
        <path d="M19.5 1.5a11 11 0 0 1 0 16l1.8 1.8a13.5 13.5 0 0 0 0-19.6l-1.8 1.8z" />
        {/* Left Signal Waves */}
        <path d="M7.5 14.5a6.5 6.5 0 0 1 0-10l-1.8-1.8a9 9 0 0 0 0 13.6l1.8-1.8z" />
        <path d="M4.5 17.5a11 11 0 0 1 0-16L2.7-0.3a13.5 13.5 0 0 0 0 19.6l1.8-1.8z" />
    </svg>
);

const RadioIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
        <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
    </svg>
);

const BroadcastIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 8a4 4 0 1 1 0 8" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="m4.93 4.93 2.83 2.83" />
        <path d="m16.24 16.24 2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="m4.93 19.07 2.83-2.83" />
        <path d="m16.24 7.76 2.83-2.83" />
    </svg>
);

const FlightTakeoffIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <title>{title}</title>
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l6 4-4 4-2.5-1-1.5 1.5 4.5 1.5 1.5 4.5 1.5-1.5-1-2.5 4-4 4 6l1.2-.7c.4-.2.7-.6.6-1.1Z" />
    </svg>
);

const TrainIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="16" height="16" x="4" y="3" rx="2" />
        <path d="M4 11h16" />
        <path d="M12 3v8" />
        <path d="m8 19-2 3" />
        <path d="m18 22-2-3" />
        <path d="M8 15h.01" />
        <path d="M16 15h.01" />
    </svg>
);

const InterurbanaIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <title>{title}</title>
        <rect x="7" y="2" width="4" height="8" rx="1" />
        <rect x="13" y="2" width="4" height="8" rx="1" />
        <rect x="2" y="11" width="20" height="2" rx="0.5" />
        <rect x="4" y="14" width="7" height="8" rx="1" />
        <rect x="13" y="14" width="7" height="8" rx="1" />
    </svg>
);

const AccessTimeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const AddIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const ExitToAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

const PlayArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const CustomTextField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => {
    const { isDark } = useTheme();
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">{label}</label>
            <input
                {...props}
                className={`w-full py-2 px-3 border transition-all rounded-xl text-sm font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-cyan-400 focus:border-cyan-500' : 'bg-zinc-100 border-zinc-200 text-blue-600 focus:border-blue-400'} outline-none`}
            />
        </div>
    );
};

const ResumenBox: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="flex-1 text-center">
        <p className="text-base text-zinc-400">{title}</p>
        <p className="font-bold text-xl text-zinc-100">{value}</p>
    </div>
);

const ResumenBoxGrande: React.FC<{ title: string; value: string; valueNumeric: number; }> = ({ title, value, valueNumeric }) => {
    let displayTitle = title;
    let valueColor = "text-zinc-100";

    if (title.toLowerCase() === 'pendiente') {
        // Si totalCobrado > objetivoDiario (valueNumeric < 0): "Excede" en verde (se queda como está)
        // Si totalCobrado < objetivoDiario (valueNumeric > 0): "Faltan" en rojo (cambios)
        if (valueNumeric < 0) {
            displayTitle = 'Excede';
            valueColor = 'text-emerald-400';
        } else if (valueNumeric > 0) {
            displayTitle = 'Faltan';
            valueColor = 'text-red-400';
        } else {
            displayTitle = 'Pendiente';
            valueColor = 'text-zinc-100';
        }
    } else {
        valueColor = 'text-emerald-400';
    }

    const cardBg = 'bg-zinc-900 dark:bg-zinc-900 bg-white';
    const cardBorder = 'border-zinc-800 dark:border-zinc-800 border-zinc-200';
    const textColor = 'text-zinc-100 dark:text-zinc-100 text-zinc-900';

    return (
        <div className="bg-zinc-900 dark:bg-zinc-900 bg-white border border-zinc-800 dark:border-zinc-800 border-zinc-200 rounded-lg p-3 flex-1 flex flex-col justify-center items-center text-center">
            <p className="text-xl font-bold text-zinc-100 dark:text-zinc-100 text-zinc-900">{displayTitle}</p>
            <p className={`text-4xl font-bold ${valueColor}`}>{value}</p>
        </div>
    );
};

interface IncomeScreenProps {
    navigateTo: (page: Seccion) => void;
    navigateToEditRace: (id: string) => void;
}

const IncomeScreen: React.FC<IncomeScreenProps> = ({ navigateTo, navigateToEditRace }) => {
    const { isDark } = useTheme();
    const [hideValues, setHideValues] = useState(false);
    const [rawCarreras, setRawCarreras] = useState<CarreraVista[]>([]);
    // const [carreras, setCarreras] = useState<CarreraVista[]>([]); // Removed: derived from allCarreras
    // Actually, let's just use 'carreras' as the derived value in the render, but we need to change how state is used.
    // To minimize changes, I will keep 'carreras' as a derived value using useMemo, but I need to remove the state declaration for it if I do that.
    // However, the rest of the component uses 'carreras'.

    // Let's change the state definition first.
    // We need to see the full file context to do this cleanly.
    // I will replace the state declarations and the effects.

    const [gastosTotal, setGastosTotal] = useState<number>(0);
    const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [objetivoDiario, setObjetivoDiario] = useState<number>(100);
    const { showToast } = useToast();

    // Pause state logic
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [kmsBreak, setKmsBreak] = useState('');
    const [isStartingBreak, setIsStartingBreak] = useState(true);

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

    const parseSafeDate = (dateAny: any): Date => {
        if (!dateAny) return new Date();
        if (dateAny instanceof Date) {
            return isNaN(dateAny.getTime()) ? new Date() : dateAny;
        }
        const parsed = new Date(dateAny);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    // New state for raw data
    const [allCarreras, setAllCarreras] = useState<CarreraVista[]>([]);

    // Real-time subscription to carreras - carga UNA VEZ
    useEffect(() => {
        setLoading(true);
        setError(null);
        const unsubscribe = subscribeToCarreras((data) => {
            setAllCarreras(data);
            setLoading(false);
            setError(null);
        }, (error) => {
            console.error("Error loading carreras:", error);
            setError("Error al cargar las carreras desde la base de datos");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []); // Empty dependency array = runs once on mount

    // Derived state: Filtered carreras
    // This replaces the 'carreras' state. We will use a variable 'carreras' in the render scope?
    // No, 'carreras' is used in many places. It's better to assign it here.

    const carreras = useMemo(() => {
        if (loading) return []; // Or keep previous?

        let carrerasFiltradas = allCarreras;

        if (turnoActivo) {
            // Si hay turno activo, filtrar por turnoId
            carrerasFiltradas = allCarreras.filter(c => c.turnoId === turnoActivo.id);
        } else {
            // Si no hay turno activo, filtrar por fecha del día actual
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            carrerasFiltradas = allCarreras.filter(c => {
                const fechaCarrera = new Date(c.fechaHora);
                return fechaCarrera >= today && fechaCarrera < tomorrow;
            });
        }

        // ORDENAR: Más reciente primero (descendente)
        return carrerasFiltradas.sort((a, b) => {
            const dateA = a.fechaHora instanceof Date ? a.fechaHora : new Date(a.fechaHora);
            const dateB = b.fechaHora instanceof Date ? b.fechaHora : new Date(b.fechaHora);
            return dateB.getTime() - dateA.getTime();
        });
    }, [allCarreras, turnoActivo, loading]);

    // Real-time subscription to gastos - carga desde la base de datos
    useEffect(() => {
        const unsubscribe = subscribeToGastos((total) => {
            setGastosTotal(total);
        }, (error) => {
            console.error("Error loading gastos:", error);
            setGastosTotal(0);
        });
        return () => unsubscribe();
    }, []);

    // Real-time subscription to active turno - carga desde la base de datos
    useEffect(() => {
        const unsubscribe = subscribeToActiveTurno((turno) => {
            setTurnoActivo(turno);
        }, (error) => {
            console.error("Error loading turno:", error);
            setTurnoActivo(null);
        });
        return () => unsubscribe();
    }, []);

    // Cargar objetivoDiario desde Firestore
    useEffect(() => {
        const cargarObjetivoDiario = async () => {
            try {
                const ajustes = await getAjustes();
                if (ajustes && ajustes.objetivoDiario) {
                    setObjetivoDiario(ajustes.objetivoDiario);
                    // También actualizar localStorage como respaldo
                    localStorage.setItem('objetivoDiario', ajustes.objetivoDiario.toString());
                } else {
                    // Si no hay ajustes en Firestore, usar localStorage
                    const objetivoLocal = parseFloat(localStorage.getItem('objetivoDiario') || '100');
                    setObjetivoDiario(objetivoLocal);
                }
            } catch (error) {
                console.error('Error cargando objetivo diario:', error);
                // Fallback a localStorage
                const objetivoLocal = parseFloat(localStorage.getItem('objetivoDiario') || '100');
                setObjetivoDiario(objetivoLocal);
            }
        };
        cargarObjetivoDiario();
    }, []);

    // Force re-render every minute to update horaTrabajo when there's an active turno
    useEffect(() => {
        if (turnoActivo) {
            const interval = setInterval(() => {
                setCurrentTime(new Date());
            }, 60000); // Update every minute
            return () => clearInterval(interval);
        }
    }, [turnoActivo]);

    const resumen: CarrerasResumen = useMemo(() => {
        const total = carreras.reduce((sum, c) => sum + c.taximetro, 0);
        const totalCobrado = carreras.reduce((sum, c) => sum + c.cobrado, 0);
        const propinaTotal = carreras.reduce((sum, c) => sum + (c.cobrado - c.taximetro), 0);
        const tarjetaRaces = carreras.filter(c => c.formaPago === 'Tarjeta');

        // Calcular pendiente: objetivoDiario - totalCobrado
        const pendienteValor = objetivoDiario - totalCobrado;
        // Si totalCobrado > objetivoDiario (pendienteValor < 0): mostrar con signo + (se queda como está)
        // Si totalCobrado < objetivoDiario (pendienteValor > 0): mostrar valor absoluto (lo que falta)
        const pendiente = pendienteValor > 0
            ? `${Math.abs(pendienteValor).toFixed(2)}€`
            : `+${Math.abs(pendienteValor).toFixed(2)}€`;

        // Calcular horaInicio: del turno activo o de la primera carrera del día
        let horaInicio = "00:00";
        if (turnoActivo) {
            const fechaInicio = parseSafeDate(turnoActivo.fechaInicio);
            horaInicio = fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (carreras.length > 0) {
            // Si no hay turno activo, usar la primera carrera del día
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const carrerasHoy = carreras.filter(c => {
                const fechaCarrera = parseSafeDate(c.fechaHora);
                return fechaCarrera >= today;
            });
            if (carrerasHoy.length > 0) {
                const primeraCarrera = carrerasHoy[carrerasHoy.length - 1]; // La más antigua
                horaInicio = parseSafeDate(primeraCarrera.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            }
        }

        // Calcular horaTrabajo: diferencia entre ahora y horaInicio, restando descansos
        let horaTrabajo = "00:00";
        if (turnoActivo) {
            const fechaInicio = parseSafeDate(turnoActivo.fechaInicio);
            const ahora = currentTime;
            let diffMs = ahora.getTime() - fechaInicio.getTime();

            // Restar descansos finalizados
            (turnoActivo.descansos || []).forEach(d => {
                if (d.fechaInicio && d.fechaFin) {
                    const startD = parseSafeDate(d.fechaInicio);
                    const endD = parseSafeDate(d.fechaFin);
                    diffMs -= (endD.getTime() - startD.getTime());
                } else if (d.fechaInicio && !d.fechaFin) {
                    // Si hay un descanso activo, el tiempo de trabajo se para en el inicio del descanso
                    const startD = parseSafeDate(d.fechaInicio);
                    const pauseDuration = ahora.getTime() - startD.getTime();
                    diffMs -= pauseDuration;
                }
            });

            const diffHoras = Math.floor(Math.max(0, diffMs) / (1000 * 60 * 60));
            const diffMinutos = Math.floor((Math.max(0, diffMs) % (1000 * 60 * 60)) / (1000 * 60));
            horaTrabajo = `${String(diffHoras).padStart(2, '0')}:${String(diffMinutos).padStart(2, '0')}`;
        } else if (carreras.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const carrerasHoy = carreras.filter(c => {
                const fechaCarrera = parseSafeDate(c.fechaHora);
                return fechaCarrera >= today;
            });
            if (carrerasHoy.length > 0) {
                const primeraCarrera = parseSafeDate(carrerasHoy[carrerasHoy.length - 1]); // La más antigua
                const ultimaCarrera = parseSafeDate(carrerasHoy[0]); // La más reciente
                const diffMs = ultimaCarrera.getTime() - primeraCarrera.getTime();
                const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                horaTrabajo = `${String(diffHoras).padStart(2, '0')}:${String(diffMinutos).padStart(2, '0')}`;
            }
        }

        // Kms inicio: del turno activo
        let kmsInicio = "0";
        if (turnoActivo) {
            kmsInicio = turnoActivo.kilometrosInicio.toString();
        }

        return {
            total: `${totalCobrado.toFixed(2)}€`,
            carreras: carreras.length.toString(),
            tarjeta: tarjetaRaces.length.toString(),
            propina: `${propinaTotal.toFixed(2)}€`,
            totalTarjeta: `${tarjetaRaces.reduce((sum, c) => sum + c.cobrado, 0).toFixed(2)}€`,
            pendiente,
            pendienteValor,
            horaInicio,
            horaTrabajo,
            kmsInicio,
        };
    }, [carreras, gastosTotal, turnoActivo, currentTime, objetivoDiario]);


    const getPaymentIconComponent = (formaPago: CarreraVista['formaPago']): React.FC<{ className?: string }> => {
        if (hideValues) return EuroIcon;
        switch (formaPago) {
            case 'Bizum': return BizumIcon;
            case 'Vales': return ValesIcon;
            case 'Tarjeta': return CreditCardIcon;
            case 'Efectivo': default: return EuroIcon;
        }
    };

    const getPaymentColorClass = (formaPago: CarreraVista['formaPago']): string => {
        switch (formaPago) {
            case 'Efectivo':
                return 'text-emerald-400';
            case 'Tarjeta':
                return 'text-blue-400';
            case 'Bizum':
                return 'text-purple-400';
            case 'Vales':
                return 'text-amber-300';
            default:
                return 'text-zinc-300';
        }
    };

    const bgColor = isDark ? 'bg-zinc-950' : 'bg-zinc-50';
    const textColor = isDark ? 'text-zinc-100' : 'text-zinc-900';
    const cardBg = isDark ? 'bg-zinc-900' : 'bg-white';
    const cardBorder = isDark ? 'border-zinc-800' : 'border-zinc-200';
    const cardBgHover = isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50';
    const sectionBg = isDark ? 'bg-zinc-900/50' : 'bg-zinc-100/50';

    return (
        <div className={`${bgColor} min-h-screen ${textColor} px-3 pt-3 pb-24 space-y-1.5`}>
            <ScreenTopBar
                title="Ingresos"
                navigateTo={navigateTo}
                backTarget={Seccion.Home}
                className="mb-2"
                rightSlot={
                    <button
                        onClick={() => setHideValues(!hideValues)}
                        className="p-1.5 text-zinc-900 hover:text-zinc-700 transition-colors focus:outline-none"
                        aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
                    >
                        {hideValues ? <VisibilityOffIcon className="w-5 h-5" /> : <VisibilityIcon className="w-5 h-5" />}
                    </button>
                }
            />

            <section className={`${sectionBg} border ${cardBorder} rounded-xl p-2 space-y-1.5`}>
                <div className="flex space-x-2">
                    <ResumenBoxGrande title="Pendiente" value={hideValues ? '****' : resumen.pendiente} valueNumeric={resumen.pendienteValor} />
                    <ResumenBoxGrande title="TOTAL" value={hideValues ? '****' : resumen.total} valueNumeric={parseFloat(resumen.total)} />
                </div>
                <div className={`flex space-x-2 ${cardBg} border ${cardBorder} rounded-lg p-2.5`}>
                    <ResumenBox title="Carr." value={hideValues ? '****' : resumen.carreras} />
                    <ResumenBox title="Tarjeta" value={hideValues ? '****' : resumen.tarjeta} />
                    <ResumenBox title="H.Inic." value={hideValues ? '****' : resumen.horaInicio} />
                    <ResumenBox title="H.Trab" value={hideValues ? '****' : resumen.horaTrabajo} />
                </div>
                <div className={`flex space-x-2 ${cardBg} border ${cardBorder} rounded-lg p-2.5`}>
                    <ResumenBox title="Kms. Ini" value={hideValues ? '****' : resumen.kmsInicio} />
                    {parseFloat(resumen.propina) > 0 && <ResumenBox title="Propina" value={hideValues ? '****' : resumen.propina} />}
                    <ResumenBox title="Tarjeta" value={hideValues ? '****' : resumen.totalTarjeta} />
                </div>
            </section>

            <section>
                <div className="border-b border-zinc-800 p-2 flex items-center text-zinc-400 font-semibold text-center text-base">
                    <span className="flex-1 flex justify-center items-center"><EuroIcon className="w-5 h-5" /></span>
                    <span className="flex-1 flex justify-center items-center"><EuroIcon className="w-5 h-5" /></span>
                    <span className="flex-1">Propinas</span>
                    <span className="flex-1 flex justify-center items-center" title="Emisora"><CellTowerIcon className="w-6 h-6 text-pink-400" /></span>
                    <span className="flex-1 flex justify-center items-center" title="Interurbana / Aeropuerto / Estación"></span>
                    <span className="flex-1 flex justify-center items-center"><AccessTimeIcon className="w-5 h-5" /></span>
                </div>
                {loading && <div className="text-center p-2 text-zinc-400 text-base">Cargando carreras...</div>}
                {error && <div className="text-center p-2 text-red-400 text-base">{error}</div>}
                {!loading && !error && (
                    <div className="space-y-1 max-h-80 overflow-y-auto pt-0.5">
                        {carreras.map(carrera => {
                            const PaymentIcon = getPaymentIconComponent(carrera.formaPago);
                            const propina = carrera.cobrado - carrera.taximetro;
                            return (
                                <div key={carrera.id} onClick={() => navigateToEditRace(carrera.id)} className={`${cardBg} border ${cardBorder} rounded-lg p-3 flex items-center text-center cursor-pointer ${cardBgHover} transition-colors`}>
                                    <span className="flex-1 font-bold text-zinc-100 text-xl">{hideValues ? '****' : `${carrera.cobrado.toFixed(2)}€`}</span>
                                    <span className={`flex-1 flex justify-center items-center ${getPaymentColorClass(carrera.formaPago)}`}>
                                        <PaymentIcon className="w-6 h-6" />
                                    </span>
                                    <span className="flex-1 text-emerald-400 text-base">{propina > 0 ? (hideValues ? '****' : `${propina.toFixed(2)}€`) : ''}</span>
                                    <span className="flex-1 text-pink-400 flex justify-center items-center">
                                        {carrera.emisora ? <CellTowerIcon className="w-6 h-6 text-pink-400" /> : null}
                                    </span>
                                    <span className="flex-1 flex justify-center items-center">
                                        {(carrera.tipoCarrera || 'Urbana') === 'Interurbana' ? (
                                            <InterurbanaIcon className="w-7 h-7 text-orange-400" title="Interurbana" />
                                        ) : carrera.aeropuerto ? (
                                            <FlightTakeoffIcon className="w-7 h-7 text-blue-400" title="Aeropuerto" />
                                        ) : carrera.estacion ? (
                                            <TrainIcon className="w-7 h-7 text-amber-400" title="Estación" />
                                        ) : null}
                                    </span>
                                    <span className="flex-1 text-base text-zinc-400">{hideValues ? '****' : parseSafeDate(carrera.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <div className="fixed bottom-2 left-6 z-20 flex gap-2">
                <button
                    onClick={() => navigateTo(Seccion.CerrarTurno)}
                    className={`${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300'} border w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors`}
                    title="Cerrar Turno"
                >
                    <ExitToAppIcon className="w-5 h-5" />
                </button>
                {turnoActivo && (
                    <button
                        onClick={() => {
                            setIsStartingBreak(!activeBreak);
                            setShowBreakModal(true);
                        }}
                        className={`border w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeBreak
                            ? 'bg-orange-500 text-white border-orange-400 animate-pulse'
                            : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300')
                            }`}
                        title={activeBreak ? "Reanudar Turno" : "Pausar Turno"}
                    >
                        {activeBreak ? <PlayArrowIcon className="w-6 h-6" /> : <PauseIcon className="w-5 h-5" />}
                    </button>
                )}
            </div>
            <div className="fixed bottom-2 right-6 z-20">
                <button
                    onClick={() => {
                        if (activeBreak) {
                            showToast("Turno en pausa. Reanuda para añadir carreras.", "warning");
                            return;
                        }
                        navigateTo(Seccion.IntroducirCarrera);
                    }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeBreak ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-200'}`}
                >
                    <AddIcon className="w-9 h-9" />
                </button>
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
                                    className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${isStartingBreak ? 'bg-orange-500 shadow-orange-500/20' : 'bg-blue-600 shadow-blue-600/20'}`}
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

export default IncomeScreen;