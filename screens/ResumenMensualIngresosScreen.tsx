import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { getCarrerasByMonth, getGastosByMonth } from '../services/api';

// Icons
const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
);

interface ResumenMensualIngresosScreenProps {
    navigateTo: (page: Seccion) => void;
}

const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const ResumenMensualIngresosScreen: React.FC<ResumenMensualIngresosScreenProps> = ({ navigateTo }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [carreras, setCarreras] = useState<any[]>([]);
    const [gastos, setGastos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [carrerasData, gastosData] = await Promise.all([
                    getCarrerasByMonth(selectedMonth, selectedYear),
                    getGastosByMonth(selectedMonth, selectedYear)
                ]);
                setCarreras(carrerasData);
                setGastos(gastosData);
            } catch (error) {
                console.error("Error loading monthly data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedMonth, selectedYear]);

    // Agrupar datos por día
    const datosPorDia = useMemo(() => {
        const datos: { [key: string]: { fecha: Date, ingresos: number, gastos: number } } = {};

        // Procesar carreras (ingresos)
        carreras.forEach(carrera => {
            const fechaKey = carrera.fechaHora.toISOString().split('T')[0];
            if (!datos[fechaKey]) {
                datos[fechaKey] = {
                    fecha: new Date(carrera.fechaHora.getFullYear(), carrera.fechaHora.getMonth(), carrera.fechaHora.getDate()),
                    ingresos: 0,
                    gastos: 0
                };
            }
            datos[fechaKey].ingresos += (carrera.cobrado || 0);
        });

        // Procesar gastos
        gastos.forEach(gasto => {
            const fechaKey = gasto.fecha.toISOString().split('T')[0];
            if (!datos[fechaKey]) {
                datos[fechaKey] = {
                    fecha: new Date(gasto.fecha.getFullYear(), gasto.fecha.getMonth(), gasto.fecha.getDate()),
                    ingresos: 0,
                    gastos: 0
                };
            }
            datos[fechaKey].gastos += (gasto.importe || 0);
        });

        // Convertir a array y ordenar por fecha (del más antiguo al más reciente)
        return Object.values(datos).sort((a, b) => {
            return a.fecha.getTime() - b.fecha.getTime();
        });
    }, [carreras, gastos]);

    // Calcular total del mes
    const totalMes = useMemo(() => {
        const totalIngresos = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        const totalGastos = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
        return totalIngresos - totalGastos;
    }, [carreras, gastos]);

    const changeMonth = (months: number) => {
        let newMonth = selectedMonth + months;
        let newYear = selectedYear;
        
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }
        
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    const formatCurrency = (value: number): string => {
        if (value === 0) return '';
        return value.toFixed(2).replace('.', ',');
    };

    const formatDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}`;
    };

    return (
        <div className="bg-zinc-950 min-h-screen flex flex-col p-3 space-y-1.5">
            <ScreenTopBar
                title="Resumen Mensual"
                navigateTo={navigateTo}
                backTarget={Seccion.Resumen}
                className="rounded-xl shadow-md"
            />

            {/* Navegación de Fecha */}
            <div className="bg-zinc-900 py-1 px-4 flex items-center justify-between border border-zinc-800 rounded-xl">
                <button 
                    onClick={() => changeMonth(-1)}
                    className="text-cyan-300 hover:bg-zinc-800 rounded p-1 transition-colors"
                >
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-100 font-semibold text-base tracking-wide">
                    {meses[selectedMonth]} {selectedYear}
                </span>
                <button 
                    onClick={() => changeMonth(1)}
                    className="text-cyan-300 hover:bg-zinc-800 rounded p-1 transition-colors"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {/* Header de la Tabla */}
            <div className="bg-[#14225A] grid grid-cols-12 py-1.5 px-4 text-white font-bold text-sm rounded-xl">
                <div className="col-span-2">Días</div>
                <div className="col-span-2 text-right">Ingresos</div>
                <div className="col-span-4 text-right">Gastos</div>
                <div className="col-span-4 text-right">Total</div>
            </div>

            {/* Lista de Datos - Área con scroll */}
            <div className="bg-zinc-900 flex-1 overflow-y-auto rounded-xl border border-zinc-800">
                {loading ? (
                    <div className="text-center py-8 text-zinc-400">Cargando...</div>
                ) : datosPorDia.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">No hay datos para este mes</div>
                ) : (
                    <>
                        {datosPorDia.map((dato, index) => {
                            const total = dato.ingresos - dato.gastos;
                            return (
                                <div 
                                    key={index}
                                    className={`grid grid-cols-12 py-1.5 px-4 text-sm border-b border-zinc-800 ${
                                        index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'
                                    }`}
                                >
                                    <div className="col-span-2 text-zinc-100">{formatDate(dato.fecha)}</div>
                                    <div className="col-span-2 text-right text-cyan-400 font-medium">{formatCurrency(dato.ingresos)}</div>
                                    <div className="col-span-4 text-right text-red-400 font-medium">{formatCurrency(dato.gastos)}</div>
                                    <div className="col-span-4 text-right font-medium">
                                        {total === 0 ? (
                                            <span></span>
                                        ) : total >= 0 ? (
                                            <span className="text-emerald-400">{formatCurrency(total)}</span>
                                        ) : (
                                            <span className="text-red-400">{formatCurrency(total)}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Barra de Total - Fija en la parte inferior */}
            <div className="bg-[#10172D] py-2 px-4 flex items-center justify-between rounded-xl">
                <span className="text-white font-bold text-sm">Total del Mes:</span>
                <span className={`font-bold text-sm ${totalMes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(totalMes)}€</span>
            </div>
        </div>
    );
};

export default ResumenMensualIngresosScreen;



