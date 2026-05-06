import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { getGastosByMonth, subscribeToGastosByMonth } from '../services/api';

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

interface ResumenGastosMensualScreenProps {
    navigateTo: (page: Seccion) => void;
    navigateToEditGasto?: (gastoId: string) => void;
}

const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const detalleColumns = [
    { key: 'fecha', label: 'Fecha', width: 'w-24' },
    { key: 'tipo', label: 'Tipo', width: 'w-24' },
    { key: 'categoria', label: 'Categoria', width: 'w-28' },
    { key: 'concepto', label: 'Concepto', width: 'w-44' },
    { key: 'proveedor', label: 'Proveedor', width: 'w-44' },
    { key: 'taller', label: 'Taller', width: 'w-44' },
    { key: 'nif', label: 'NIF', width: 'w-28' },
    { key: 'factura', label: 'Factura', width: 'w-36' },
    { key: 'formaPago', label: 'F. Pago', width: 'w-28' },
    { key: 'base', label: 'Base', width: 'w-24' },
    { key: 'ivaPorcentaje', label: 'IVA %', width: 'w-20' },
    { key: 'ivaImporte', label: 'IVA EUR', width: 'w-24' },
    { key: 'total', label: 'Total', width: 'w-24' },
    { key: 'kilometros', label: 'Km total', width: 'w-24' },
    { key: 'kilometrosVehiculo', label: 'Km vehiculo', width: 'w-28' },
    { key: 'kmParciales', label: 'Km parciales', width: 'w-28' },
    { key: 'litros', label: 'Litros', width: 'w-24' },
    { key: 'precioPorLitro', label: 'Precio/L', width: 'w-24' },
    { key: 'descuento', label: 'Descuento', width: 'w-28' },
    { key: 'servicios', label: 'Servicios', width: 'w-64' },
    { key: 'notas', label: 'Notas', width: 'w-64' },
    { key: 'turnoId', label: 'Turno', width: 'w-36' },
    { key: 'id', label: 'ID', width: 'w-52' },
];

const ResumenGastosMensualScreen: React.FC<ResumenGastosMensualScreenProps> = ({ navigateTo, navigateToEditGasto }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [gastos, setGastos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'resumen' | 'detalle'>('resumen');

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
                    console.log('📋 Primer gasto completo:', gastosData[0]);
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
        if (value === 0) return ' ';
        return value.toFixed(2).replace('.', ',');
    };

    const parseSafeDate = (dateAny: any): Date => {
        if (!dateAny) return new Date();
        if (dateAny instanceof Date) {
            return isNaN(dateAny.getTime()) ? new Date() : dateAny;
        }
        const parsed = new Date(dateAny);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const formatDate = (date: any): string => {
        const d = parseSafeDate(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}`;
    };

    const formatFullDate = (date: any): string => {
        const d = parseSafeDate(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
    };

    const formatNumber = (value: any, decimals = 2): string => {
        const num = Number(value || 0);
        if (!Number.isFinite(num) || num === 0) return '';
        return num.toFixed(decimals).replace('.', ',');
    };

    const formatServices = (servicios: any): string => {
        if (!Array.isArray(servicios) || servicios.length === 0) return '';
        return servicios.map((s, index) => {
            const descripcion = s.descripcion || s.referencia || `Linea ${index + 1}`;
            const importe = s.importe ? ` (${formatNumber(s.importe)} EUR)` : '';
            return `${descripcion}${importe}`;
        }).join(' | ');
    };

    const getDetalleValue = (gasto: any, key: string): string => {
        switch (key) {
            case 'fecha': return formatFullDate(gasto.fecha);
            case 'tipo': return gasto.tipo || '';
            case 'categoria': return gasto.categoria || '';
            case 'concepto': return gasto.concepto || '';
            case 'proveedor': return gasto.proveedor || '';
            case 'taller': return gasto.taller || '';
            case 'nif': return gasto.nif || '';
            case 'factura': return gasto.numeroFactura || '';
            case 'formaPago': return gasto.formaPago || '';
            case 'base': return formatNumber(gasto.baseImponible || gasto.importe);
            case 'ivaPorcentaje': return formatNumber(gasto.ivaPorcentaje, 0);
            case 'ivaImporte': return formatNumber(gasto.ivaImporte);
            case 'total': return formatNumber(gasto.importe);
            case 'kilometros': return formatNumber(gasto.kilometros, 0);
            case 'kilometrosVehiculo': return formatNumber(gasto.kilometrosVehiculo, 0);
            case 'kmParciales': return formatNumber(gasto.kmParciales, 0);
            case 'litros': return formatNumber(gasto.litros, 2);
            case 'precioPorLitro': return formatNumber(gasto.precioPorLitro, 3);
            case 'descuento': return formatNumber(gasto.descuento);
            case 'servicios': return formatServices(gasto.servicios);
            case 'notas': return gasto.notas || '';
            case 'turnoId': return gasto.turnoId || '';
            case 'id': return gasto.id || '';
            default: return '';
        }
    };

    // Ordenar gastos por fecha (más recientes primero)
    const gastosOrdenados = useMemo(() => {
        return [...gastos].sort((a, b) => {
            const dateA = parseSafeDate(a.fecha);
            const dateB = parseSafeDate(b.fecha);
            return dateB.getTime() - dateA.getTime();
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

            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                <button
                    onClick={() => setViewMode('resumen')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'resumen' ? 'bg-[#14225A] text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setViewMode('detalle')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'detalle' ? 'bg-[#14225A] text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
                >
                    Detalle Excel
                </button>
            </div>

            {viewMode === 'resumen' ? (
                <>
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
                                        className={`grid grid-cols-12 py-1.5 px-4 text-sm border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'
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
                </>
            ) : (
                <div className="bg-zinc-900 flex-1 rounded-xl border border-zinc-800 overflow-hidden">
                    {loading ? (
                        <div className="text-center py-8 text-zinc-400">Cargando...</div>
                    ) : gastosOrdenados.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">No hay gastos para este mes</div>
                    ) : (
                        <div className="h-full overflow-auto">
                            <div className="min-w-max">
                                <div className="sticky top-0 z-10 flex bg-[#14225A] text-white text-[11px] font-bold uppercase">
                                    {detalleColumns.map(col => (
                                        <div key={col.key} className={`${col.width} shrink-0 px-2 py-2 border-r border-blue-900/60 text-center`}>
                                            {col.label}
                                        </div>
                                    ))}
                                </div>
                                {gastosOrdenados.map((gasto, index) => (
                                    <div
                                        key={gasto.id}
                                        onClick={() => {
                                            if (navigateToEditGasto) {
                                                navigateToEditGasto(gasto.id);
                                            }
                                        }}
                                        className={`flex text-xs border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}`}
                                    >
                                        {detalleColumns.map(col => (
                                            <div key={col.key} className={`${col.width} shrink-0 px-2 py-2 border-r border-zinc-800 text-zinc-100 whitespace-nowrap overflow-hidden text-ellipsis`}>
                                                {getDetalleValue(gasto, col.key) || '-'}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Barra de Total - Fija en la parte inferior */}
            <div className="bg-[#14225A] py-2 px-4 flex items-center justify-between rounded-xl">
                <span className="text-white font-bold text-sm">Total del Mes:</span>
                <span className="text-red-400 font-bold text-sm">{formatCurrency(totalMes)}€</span>
            </div>
        </div>
    );
};

export default ResumenGastosMensualScreen;
