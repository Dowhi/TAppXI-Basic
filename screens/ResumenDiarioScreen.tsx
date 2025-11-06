import React, { useState, useEffect, useMemo } from 'react';
import BackButton from '../components/BackButton';
import { Seccion, Turno, CarreraVista } from '../types';
import { getTurnosByDate, getCarrerasByDate, getGastosByDate } from '../services/api';

// Icons
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
);

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
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
        return turnos.map((turno, index) => {
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

            return {
                ...turno,
                total,
                carreras: carrerasDelTurno.length,
                cTarjeta,
                cEmisora,
                sumaTarjetas,
                sumaEmisora,
                turnoIndex: index + 1
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
    };

    const formatTime = (date: Date | undefined): string => {
        if (!date) return '';
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-2">
            {/* Header Amarillo */}
            <div className="bg-yellow-400 py-2 px-3 rounded-lg flex items-center justify-between">
                <BackButton 
                    navigateTo={navigateTo} 
                    targetPage={Seccion.Resumen}
                    className="p-2 text-zinc-900 hover:text-zinc-700 transition-colors"
                />
                <h1 className="text-zinc-900 font-bold text-base flex-1 text-center">Resumen Diario</h1>
                <div className="w-8"></div> {/* Espaciador para mantener el título centrado */}
            </div>

            {/* Barra de Navegación de Fecha */}
            <div className="bg-white rounded-lg py-1.5 px-3 flex items-center justify-between">
                <button 
                    onClick={() => changeDate(-1)}
                    className="text-zinc-900 hover:bg-gray-100 rounded p-1"
                >
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-900 font-medium">{formatDate(selectedDate)}</span>
                <button 
                    onClick={() => changeDate(1)}
                    className="text-zinc-900 hover:bg-gray-100 rounded p-1"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {loading ? (
                <div className="text-center p-8 text-zinc-400">Cargando...</div>
            ) : (
                <>
                    {/* Resumen por Turno */}
                    {turnosConEstadisticas.map((turno) => (
                        <div key={turno.id} className="bg-blue-900 rounded-lg p-4 relative">
                            {/* Badge Turno Centrado */}
                            <div className="flex justify-center mb-2">
                                <div className="bg-white rounded px-3 py-1 border border-blue-900">
                                    <span className="text-blue-900 text-sm font-bold">Turno {turno.turnoIndex || 1}</span>
                                </div>
                            </div>

                            {/* Contenido del Turno */}
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
                                <div className="flex justify-between">
                                    <span>Suma Tarjetas:</span>
                                    <span className="font-semibold">{turno.sumaTarjetas.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Suma Emisora:</span>
                                    <span className="font-semibold">{turno.sumaEmisora.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Km inicial:</span>
                                    <span className="font-semibold">{turno.kilometrosInicio}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Km final:</span>
                                    <span className="font-semibold">{turno.kilometrosFin || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hora Inicio:</span>
                                    <span className="font-semibold">{formatTime(turno.fechaInicio)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hora Fin:</span>
                                    <span className="font-semibold">{formatTime(turno.fechaFin)}</span>
                                </div>
                            </div>

                            {/* Total del Turno */}
                            <div className="mt-2 bg-white rounded border border-blue-900 p-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-900 font-bold">TOTAL</span>
                                    <span className="text-blue-900 font-bold">{turno.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Total del Día */}
                    {turnosConEstadisticas.length > 0 && (
                        <div className="bg-blue-900 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-white font-bold">TOTAL DÍA</span>
                                <div className="flex gap-4">
                                    <span className="text-white font-semibold">{totalDia.ingresos.toFixed(2)}</span>
                                    <span className="text-red-400 font-semibold">{totalDia.gastos.toFixed(2)}</span>
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

