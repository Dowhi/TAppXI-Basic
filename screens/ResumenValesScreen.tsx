import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, CarreraVista } from '../types';
import { getCarrerasByMonth, parseDate, cleanN } from '../services/api';

// Icons
const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
);

const ValesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2h-2v2h2V4zM9 18H4v-2h5v2zm0-4H4v-2h5v2zm0-4H4V8h5v2zm7 8h-5v-2h5v2zm0-4h-5v-2h5v2zm0-4h-5V8h5v2z" />
    </svg>
);

interface ResumenValesScreenProps {
    navigateTo: (page: Seccion) => void;
    navigateToEditRace: (id: string) => void;
}

const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const ResumenValesScreen: React.FC<ResumenValesScreenProps> = ({ navigateTo, navigateToEditRace }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [carreras, setCarreras] = useState<CarreraVista[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const data = await getCarrerasByMonth(selectedMonth, selectedYear);
                // Filtrar solo las que son forma de pago Vales
                const valesData = data.filter(c => c.formaPago === 'Vales');
                setCarreras(valesData);
            } catch (error) {
                console.error("Error loading vales data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedMonth, selectedYear]);

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

    const totalVales = useMemo(() => {
        return carreras.reduce((sum, c) => sum + cleanN(c.cobrado), 0);
    }, [carreras]);

    const valesGroupedByDay = useMemo(() => {
        const grouped: { [key: string]: CarreraVista[] } = {};
        carreras.forEach(c => {
            const date = parseDate(c.fechaHora);
            const key = date.toLocaleDateString('es-ES');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(c);
        });
        // Sort by date inside
        return Object.entries(grouped).sort((a, b) => {
            const dateA = new Date(a[0].split('/').reverse().join('-'));
            const dateB = new Date(b[0].split('/').reverse().join('-'));
            return dateB.getTime() - dateA.getTime(); // Recientes primero
        });
    }, [carreras]);

    const formatCurrency = (value: number): string => {
        return value.toFixed(2).replace('.', ',') + ' €';
    };

    return (
        <div className="bg-zinc-950 min-h-screen flex flex-col p-3 space-y-3">
            <ScreenTopBar
                title="Resumen de Vales"
                navigateTo={navigateTo}
                backTarget={Seccion.Resumen}
                className="rounded-xl shadow-md"
            />

            {/* Navegación de Fecha */}
            <div className="bg-zinc-900 py-2 px-4 flex items-center justify-between border border-zinc-800 rounded-xl shadow-inner">
                <button
                    onClick={() => changeMonth(-1)}
                    className="text-cyan-400 hover:bg-zinc-800 rounded-full p-1.5 transition-all active:scale-90"
                >
                    <ArrowLeftIcon />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-zinc-100 font-bold text-base tracking-widest uppercase">
                        {meses[selectedMonth]}
                    </span>
                    <span className="text-zinc-500 text-xs font-medium tracking-widest">
                        {selectedYear}
                    </span>
                </div>
                <button
                    onClick={() => changeMonth(1)}
                    className="text-cyan-400 hover:bg-zinc-800 rounded-full p-1.5 transition-all active:scale-90"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {/* Total Highlight */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ValesIcon />
                </div>
                <div className="z-10">
                    <span className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Total acumulado</span>
                    <span className="text-2xl font-black text-white tracking-tight">{formatCurrency(totalVales)}</span>
                </div>
                <div className="z-10 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg flex flex-col items-end">
                    <span className="text-cyan-400 text-xs font-bold uppercase">{carreras.length}</span>
                    <span className="text-zinc-500 text-[10px] uppercase font-medium">Vales</span>
                </div>
            </div>

            {/* Header de la Tabla */}
            <div className="bg-zinc-900/50 grid grid-cols-12 py-2 px-4 text-zinc-400 font-bold text-[10px] uppercase tracking-widest border-b border-zinc-800 rounded-t-xl">
                <div className="col-span-3">Fecha</div>
                <div className="col-span-6">Empresa / Albarán</div>
                <div className="col-span-3 text-right">Importe</div>
            </div>

            {/* Lista de Datos */}
            <div className="flex-1 overflow-y-auto rounded-b-xl space-y-2 pb-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-zinc-500 text-sm animate-pulse">Cargando vales...</span>
                    </div>
                ) : valesGroupedByDay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                        <ValesIcon />
                        <span className="mt-4 text-zinc-500 text-sm">No hay vales registrados este mes</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {valesGroupedByDay.map(([fecha, items]) => (
                            <div key={fecha} className="space-y-1">
                                <div className="px-4 py-1.5 bg-zinc-800/40 text-[10px] font-bold text-zinc-500 uppercase tracking-widest rounded-md border-l-2 border-cyan-500">
                                    {fecha}
                                </div>
                                <div className="space-y-0.5">
                                    {items.map((vale, idx) => (
                                        <button
                                            key={vale.id}
                                            onClick={() => navigateToEditRace(vale.id)}
                                            className="w-full grid grid-cols-12 py-3 px-4 text-sm bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 transition-colors active:bg-zinc-800 rounded-lg group"
                                        >
                                            <div className="col-span-3 text-zinc-100 font-medium">
                                                {parseDate(vale.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="col-span-6 text-left flex flex-col justify-center">
                                                <span className="text-zinc-100 font-bold truncate group-hover:text-cyan-400 transition-colors">
                                                    {vale.valeInfo?.empresa || 'Empresa Desconocida'}
                                                </span>
                                                <span className="text-zinc-500 text-[10px] font-medium tracking-tight truncate">
                                                    ALB: {vale.valeInfo?.numeroAlbaran || '-'} • {vale.valeInfo?.codigoEmpresa || '-'}
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-right flex items-center justify-end font-black text-zinc-100">
                                                {formatCurrency(cleanN(vale.cobrado))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumenValesScreen;
