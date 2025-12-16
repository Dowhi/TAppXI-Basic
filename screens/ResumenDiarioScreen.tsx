import React, { useState, useEffect, useMemo, useRef } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, Turno, CarreraVista } from '../types';
import { getTurnosByDate, getCarrerasByDate, getGastosByDate } from '../services/api';

// Icons
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
);

interface ResumenDiarioScreenProps {
    navigateTo: (page: Seccion) => void;
}

const ResumenDiarioScreen: React.FC<ResumenDiarioScreenProps> = ({ navigateTo }) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [carreras, setCarreras] = useState<CarreraVista[]>([]);
    const [gastosTotal, setGastosTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [turnosData, carrerasData, gastosData] = await Promise.all([
                    getTurnosByDate(selectedDate),
                    getCarrerasByDate(selectedDate),
                    getGastosByDate(selectedDate)
                ]);
                setTurnos(turnosData);
                setCarreras(carrerasData);
                setGastosTotal(gastosData);
            } catch (error) {
                console.error("Error loading daily summary:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedDate]);


    // Calcular estadísticas por turno
    const turnosConEstadisticas = useMemo(() => {
        // Ordenar turnos por fecha de inicio para calcular números correctos
        const turnosOrdenados = [...turnos].sort((a, b) =>
            new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        );

        return turnosOrdenados.map((turno, index) => {
            // Filtrar carreras que pertenecen a este turno
            const carrerasDelTurno = carreras.filter(c => {
                // Si la carrera tiene turnoId, debe coincidir
                if (c.turnoId) {
                    return c.turnoId === turno.id;
                }
                // Si no tiene turnoId, verificar por fecha (para carreras antiguas sin turnoId)
                const carreraDate = new Date(c.fechaHora);
                const turnoStart = new Date(turno.fechaInicio);
                const turnoEnd = turno.fechaFin ? new Date(turno.fechaFin) : new Date();

                return carreraDate >= turnoStart && carreraDate <= turnoEnd;
            });

            const total = carrerasDelTurno.reduce((sum, c) => sum + (c.cobrado || 0), 0);
            const cTarjeta = carrerasDelTurno.filter(c => c.formaPago === 'Tarjeta').length;
            const cEmisora = carrerasDelTurno.filter(c => c.emisora === true).length;
            const sumaTarjetas = carrerasDelTurno
                .filter(c => c.formaPago === 'Tarjeta')
                .reduce((sum, c) => sum + (c.cobrado || 0), 0);
            const sumaEmisora = carrerasDelTurno
                .filter(c => c.emisora === true)
                .reduce((sum, c) => sum + (c.cobrado || 0), 0);
            const cVales = carrerasDelTurno.filter(c => c.formaPago === 'Vales').length;
            const sumaVales = carrerasDelTurno
                .filter(c => c.formaPago === 'Vales')
                .reduce((sum, c) => sum + (c.cobrado || 0), 0);

            // Usar el número del turno si existe, sino calcular basado en el índice ordenado
            const numeroTurno = turno.numero ?? (index + 1);

            return {
                ...turno,
                total,
                carreras: carrerasDelTurno.length,
                cTarjeta,
                cEmisora,
                sumaTarjetas,
                sumaEmisora,
                cVales,
                sumaVales,
                turnoIndex: numeroTurno,
                kmTotal: (turno.kilometrosFin && turno.kilometrosInicio) ? turno.kilometrosFin - turno.kilometrosInicio : 0,
                horasTotal: (() => {
                    if (!turno.fechaFin) return 'En curso';
                    const diff = new Date(turno.fechaFin).getTime() - new Date(turno.fechaInicio).getTime();
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    return `${hours}h ${minutes}m`;
                })()
            };
        });
    }, [turnos, carreras]);

    // Total del día
    const totalDia = useMemo(() => {
        const totalIngresos = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        return {
            ingresos: totalIngresos,
            gastos: gastosTotal || 0,
            balance: totalIngresos - (gastosTotal || 0)
        };
    }, [carreras, gastosTotal]);

    const selectedDateISO = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, [selectedDate]);

    const balanceClass = useMemo(
        () => (totalDia.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'),
        [totalDia.balance]
    );

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
        setSelectedDate(newDate);
    };

    const formatTime = (date: Date | undefined): string => {
        if (!date) return '';
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const dateInputRef = useRef<HTMLInputElement>(null);

    const handleCalendarClick = () => {
        if (dateInputRef.current) {
            // @ts-ignore - showPicker is a valid method in modern browsers
            if (typeof dateInputRef.current.showPicker === 'function') {
                dateInputRef.current.showPicker();
            } else {
                // Fallback for older browsers: focus and click
                dateInputRef.current.focus();
                dateInputRef.current.click();
            }
        }
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 font-sans px-3 py-4 space-y-3">
            <div className="relative">
                <ScreenTopBar
                    title="Resumen Diario"
                    navigateTo={navigateTo}
                    backTarget={Seccion.Resumen}
                    className="mb-3"
                    rightSlot={
                        <div className="relative">
                            <button
                                type="button"
                                onClick={handleCalendarClick}
                                className="p-1.5 text-zinc-900 hover:text-zinc-700 transition-colors rounded"
                                aria-label="Seleccionar fecha"
                            >
                                <CalendarIcon />
                            </button>
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={selectedDateISO}
                                onChange={(e) => {
                                    if (!e.target.value) return;
                                    setSelectedDate(new Date(`${e.target.value}T00:00:00`));
                                }}
                                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer -z-10"
                                style={{ visibility: 'hidden', position: 'absolute' }}
                            />
                        </div>
                    }
                />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 px-3 flex items-center justify-between">
                <button
                    onClick={() => changeDate(-1)}
                    className="text-zinc-100 hover:bg-zinc-800 rounded p-1"
                >
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-100 font-medium">{formatDate(selectedDate)}</span>
                <button
                    onClick={() => changeDate(1)}
                    className="text-zinc-100 hover:bg-zinc-800 rounded p-1"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {loading ? (
                <div className="text-center p-8 text-zinc-400">Cargando...</div>
            ) : (
                <>
                    {turnosConEstadisticas.map((turno) => (
                        <div key={turno.id} className="bg-blue-900 rounded-lg p-4 relative">
                            <div className="flex justify-center mb-2">
                                <div className="bg-white rounded px-3 py-1 border border-blue-900">
                                    <span className="text-blue-900 text-sm font-bold">Turno {turno.turnoIndex || 1}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-white text-sm">
                                <div className="flex justify-between">
                                    <span>Carreras:</span>
                                    <span className="font-semibold">{turno.carreras}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>C. Tarjeta:</span>
                                    <span className="font-semibold">{turno.cTarjeta}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>C. Emisora:</span>
                                    <span className="font-semibold">{turno.cEmisora}</span>
                                </div>
                                {turno.cVales > 0 && (
                                    <div className="flex justify-between">
                                        <span>C. Vales:</span>
                                        <span className="font-semibold">{turno.cVales}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Suma Tarjetas:</span>
                                    <span className="font-semibold">{turno.sumaTarjetas.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Suma Emisora:</span>
                                    <span className="font-semibold">{turno.sumaEmisora.toFixed(2)}</span>
                                </div>
                                {turno.cVales > 0 && (
                                    <div className="flex justify-between">
                                        <span>Suma Vales:</span>
                                        <span className="font-semibold">{turno.sumaVales.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Km inicial:</span>
                                    <span className="font-semibold">{turno.kilometrosInicio}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Km final:</span>
                                    <span className="font-semibold">{turno.kilometrosFin || 0}</span>
                                </div>
                                <div className="flex justify-between text-emerald-300">
                                    <span>Km Total:</span>
                                    <span className="font-semibold">{turno.kmTotal} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hora Inicio:</span>
                                    <span className="font-semibold">{formatTime(turno.fechaInicio)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hora Fin:</span>
                                    <span className="font-semibold">{formatTime(turno.fechaFin)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-300">
                                    <span>Horas Total:</span>
                                    <span className="font-semibold">{turno.horasTotal}</span>
                                </div>
                            </div>

                            <div className="mt-2 bg-white rounded border border-blue-900 p-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-900 font-bold">TOTAL</span>
                                    <span className="text-blue-900 font-bold">{turno.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {turnosConEstadisticas.length > 0 && (
                        <div className="bg-blue-900 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-white font-bold">TOTAL DÍA</span>
                                <div className="flex gap-4">
                                    <span className="text-white font-semibold">{totalDia.ingresos.toFixed(2)}</span>
                                    <span className="text-red-300 font-semibold">{totalDia.gastos.toFixed(2)}</span>
                                    <span className="text-white font-semibold">{totalDia.balance.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ResumenDiarioScreen;

