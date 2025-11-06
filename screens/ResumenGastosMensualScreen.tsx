import React, { useState, useEffect, useMemo } from 'react';
import BackButton from '../components/BackButton';
import { Seccion } from '../types';
import { getGastosByMonth } from '../services/api';

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
}

const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const ResumenGastosMensualScreen: React.FC<ResumenGastosMensualScreenProps> = ({ navigateTo }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [gastos, setGastos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const gastosData = await getGastosByMonth(selectedMonth, selectedYear);
                setGastos(gastosData);
            } catch (error) {
                console.error("Error loading monthly expenses:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
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
        <div className="space-y-0 bg-white min-h-screen flex flex-col">
            {/* Header Azul Oscuro */}
            <div className="bg-blue-900 py-2 px-3 flex items-center">
                <BackButton 
                    navigateTo={navigateTo} 
                    targetPage={Seccion.Resumen}
                    className="p-2 text-white hover:text-zinc-300 transition-colors"
                />
                <h1 className="text-white font-bold text-base flex-1 text-center">Resumen de Gastos</h1>
                <div className="w-10"></div>
            </div>

            {/* Navegación de Fecha */}
            <div className="bg-white py-2 px-4 flex items-center justify-between border-b border-gray-200">
                <button 
                    onClick={() => changeMonth(-1)}
                    className="text-zinc-900 hover:bg-gray-100 rounded p-1"
                >
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-900 font-bold text-base">
                    {meses[selectedMonth]} {selectedYear}
                </span>
                <button 
                    onClick={() => changeMonth(1)}
                    className="text-zinc-900 hover:bg-gray-100 rounded p-1"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {/* Header de la Tabla */}
            <div className="bg-blue-900 grid grid-cols-12 py-2.5 px-4 text-white font-bold text-sm">
                <div className="col-span-2 text-center">Día</div>
                <div className="col-span-2 text-center">€</div>
                <div className="col-span-4 text-center">Concepto</div>
                <div className="col-span-4 text-center">Proveedor</div>
            </div>

            {/* Lista de Gastos - Área con scroll */}
            <div className="bg-white flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-8 text-zinc-400">Cargando...</div>
                ) : gastosOrdenados.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">No hay gastos para este mes</div>
                ) : (
                    <>
                        {gastosOrdenados.map((gasto, index) => (
                            <div 
                                key={gasto.id}
                                className={`grid grid-cols-12 py-3 px-4 text-sm border-b border-gray-200 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                            >
                                <div className="col-span-2 text-zinc-900">{formatDate(gasto.fecha)}</div>
                                <div className="col-span-2 text-right text-red-600 font-medium">{formatCurrency(gasto.importe || 0)}</div>
                                <div className="col-span-4 text-zinc-900">{gasto.concepto || '-'}</div>
                                <div className="col-span-4 text-zinc-900">{gasto.proveedor || '-'}</div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Barra de Total - Fija en la parte inferior */}
            <div className="bg-blue-900 py-3 px-4 flex items-center justify-between">
                <span className="text-white font-bold text-sm">Total del Mes:</span>
                <span className="text-red-600 font-bold text-sm">{formatCurrency(totalMes)}€</span>
            </div>
        </div>
    );
};

export default ResumenGastosMensualScreen;


