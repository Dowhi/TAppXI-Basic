import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { getGastosByMonth, subscribeToGastosByMonth } from '../services/api';

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

interface ResumenGastosMensualScreenProps {
    navigateTo: (page: Seccion) => void;
    navigateToEditGasto?: (gastoId: string) => void;
}

const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const ResumenGastosMensualScreen: React.FC<ResumenGastosMensualScreenProps> = ({ navigateTo, navigateToEditGasto }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [gastos, setGastos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Usar listener en tiempo real para actualizaciones automáticas
    useEffect(() => {
        console.log('🔔 Suscribiéndose a gastos del mes:', selectedMonth + 1, selectedYear);
        setLoading(true);

        const unsubscribe = subscribeToGastosByMonth(
            selectedMonth,
            selectedYear,
            (gastosData) => {
                console.log('✅ Gastos actualizados en tiempo real:', gastosData.length, 'gastos');
                if (gastosData.length > 0) {
                    console.log('📋 Primer gasto:', {
                        id: gastosData[0].id,
                        importe: gastosData[0].importe,
                        concepto: gastosData[0].concepto,
                        proveedor: gastosData[0].proveedor,
                        taller: gastosData[0].taller,
                        fecha: gastosData[0].fecha
                    });
                }
                setGastos(gastosData);
                setLoading(false);
            },
            (error) => {
                console.error("❌ Error en suscripción de gastos:", error);
                setLoading(false);
            }
        );

        return () => {
            console.log('🔕 Desuscribiéndose de gastos del mes');
            unsubscribe();
        };
    }, [selectedMonth, selectedYear]);

    // Calcular total del mes
    const totalMes = useMemo(() => {
        return gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
    }, [gastos]);

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
        return value.toFixed(2).replace('.', ',');
    };

    const formatDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}`;
    };

    // Ordenar gastos por fecha (más recientes primero)
    const gastosOrdenados = useMemo(() => {
        return [...gastos].sort((a, b) => {
            return b.fecha.getTime() - a.fecha.getTime();
        });
    }, [gastos]);

    return (
        <div className="bg-zinc-950 min-h-screen flex flex-col p-3 space-y-1.5">
            <ScreenTopBar
                title="Resumen de Gastos"
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
                <div className="col-span-2 text-center">Día</div>
                <div className="col-span-2 text-center">€</div>
                <div className="col-span-4 text-center">Concepto</div>
                <div className="col-span-4 text-center">Proveedor</div>
            </div>

            {/* Lista de Gastos - Área con scroll */}
            <div className="bg-zinc-900 flex-1 overflow-y-auto rounded-xl border border-zinc-800">
                {loading ? (
                    <div className="text-center py-8 text-zinc-400">Cargando...</div>
                ) : gastosOrdenados.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">No hay gastos para este mes</div>
                ) : (
                    <>
                        {gastosOrdenados.map((gasto, index) => (
                            <div 
                                key={gasto.id}
                                onClick={() => {
                                    if (navigateToEditGasto) {
                                        navigateToEditGasto(gasto.id);
                                    }
                                }}
                                className={`grid grid-cols-12 py-1.5 px-4 text-sm border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${
                                    index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'
                                }`}
                            >
                                <div className="col-span-2 text-zinc-100 text-center">{formatDate(gasto.fecha)}</div>
                                <div className="col-span-2 text-red-400 font-medium text-center">{formatCurrency(gasto.importe || 0)}</div>
                                <div className="col-span-4 text-zinc-100 text-center">{gasto.concepto || gasto.taller || '-'}</div>
                                <div className="col-span-4 text-zinc-100 text-center">{gasto.proveedor || gasto.taller || '-'}</div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Barra de Total - Fija en la parte inferior */}
            <div className="bg-[#14225A] py-2 px-4 flex items-center justify-between rounded-xl">
                <span className="text-white font-bold text-sm">Total del Mes:</span>
                <span className="text-red-400 font-bold text-sm">{formatCurrency(totalMes)}€</span>
            </div>
        </div>
    );
};

export default ResumenGastosMensualScreen;


