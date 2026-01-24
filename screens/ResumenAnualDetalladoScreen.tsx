import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { getCarreras, getGastos, getTurnos, getOtrosIngresos, cleanN, parseDate } from '../services/api';

interface ResumenAnualDetalladoScreenProps {
    navigateTo: (page: Seccion) => void;
}

const mesesNombres = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const ResumenAnualDetalladoScreen: React.FC<ResumenAnualDetalladoScreenProps> = ({ navigateTo }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        const loadYearData = async () => {
            setLoading(true);
            try {
                const [allCarreras, allGastos, allTurnos, allOtrosIngresos] = await Promise.all([
                    getCarreras(),
                    getGastos(),
                    getTurnos(),
                    getOtrosIngresos()
                ]);

                // Filtrar por año y agrupar por mes
                const yearlyStats = mesesNombres.map((nombre, index) => {
                    const mesCarreras = allCarreras.filter(c => {
                        const d = new Date(c.fechaHora);
                        return d.getFullYear() === selectedYear && d.getMonth() === index;
                    });

                    const mesGastos = allGastos.filter(g => {
                        const d = new Date(g.fecha);
                        return d.getFullYear() === selectedYear && d.getMonth() === index;
                    });

                    const mesTurnos = allTurnos.filter(t => {
                        const d = new Date(t.fechaInicio);
                        return d.getFullYear() === selectedYear && d.getMonth() === index;
                    });

                    const mesOtros = allOtrosIngresos.filter(oi => {
                        const d = new Date(oi.fecha);
                        return d.getFullYear() === selectedYear && d.getMonth() === index;
                    });

                    // Los helpers cleanN y parseDate ahora se importan de api.ts

                    // Cálculos
                    const ingresoTaxi = mesCarreras.reduce((sum, c) => sum + cleanN(c.cobrado), 0);
                    const otrosIngresos = mesOtros.reduce((sum, oi) => sum + cleanN(oi.importe), 0);
                    const ingreso = ingresoTaxi + otrosIngresos;

                    const egreso = mesGastos.reduce((sum, g) => sum + cleanN(g.importe), 0);
                    const total = ingreso - egreso;

                    const diasUnicos = new Set();
                    mesCarreras.forEach(c => {
                        const d = parseDate(c.fechaHora);
                        if (d) diasUnicos.add(d.getDate());
                    });
                    mesTurnos.forEach(t => {
                        const d = parseDate(t.fechaInicio);
                        if (d) diasUnicos.add(d.getDate());
                    });

                    const kilometros = mesTurnos.reduce((sum, t) => {
                        const ini = cleanN(t.kilometrosInicio);
                        const fin = cleanN(t.kilometrosFin);
                        return sum + Math.max(0, fin - ini);
                    }, 0);
                    const carreras = mesCarreras.length;

                    const sTarjeta = mesCarreras.filter(c => c.formaPago === 'Tarjeta').reduce((sum, c) => sum + cleanN(c.cobrado), 0);
                    const sEmisora = mesCarreras.filter(c => !!c.emisora).reduce((sum, c) => sum + cleanN(c.cobrado), 0);
                    const sVales = mesCarreras.filter(c => c.formaPago === 'Vales').reduce((sum, c) => sum + cleanN(c.cobrado), 0);

                    const cTarjeta = mesCarreras.filter(c => c.formaPago === 'Tarjeta').length;
                    const cEmisora = mesCarreras.filter(c => !!c.emisora).length;
                    const vVales = mesCarreras.filter(c => c.formaPago === 'Vales').length;

                    const propinas = mesCarreras.reduce((sum, c) => sum + Math.max(0, cleanN(c.cobrado) - cleanN(c.taximetro)), 0);

                    // Combustible / Consumo (Detección mejorada)
                    const combustibleGasto = mesGastos.filter(g => {
                        const concepto = g.concepto?.toLowerCase() || '';
                        const isFuelConcept = concepto.includes('combustible') || concepto.includes('carburante') || concepto.includes('gasolin') || concepto.includes('repost');
                        const hasFuelData = cleanN(g.litros) > 0 || cleanN(g.kmParciales) > 0;
                        return isFuelConcept || hasFuelData;
                    });
                    const litrosTotal = combustibleGasto.reduce((sum, g) => sum + cleanN(g.litros), 0);

                    // Si no hay kms en turnos, intentar usar kmParciales de los gastos de combustible
                    let kmsParaConsumo = kilometros;
                    if (kmsParaConsumo <= 0) {
                        kmsParaConsumo = combustibleGasto.reduce((sum, g) => sum + cleanN(g.kmParciales), 0);
                    }

                    const litros100 = (kmsParaConsumo > 0 && litrosTotal > 0) ? (litrosTotal / kmsParaConsumo) * 100 : 0;

                    return {
                        nombre,
                        ingreso,
                        egreso,
                        total,
                        dias: diasUnicos.size,
                        kilometros,
                        carreras,
                        cTarjeta,
                        cEmisora,
                        vVales,
                        sTarjeta,
                        sEmisora,
                        sVales,
                        litros100,
                        propinas,
                        turno1: mesTurnos.length // Placeholder para Turno 1
                    };
                });

                setStats(yearlyStats);
            } catch (error) {
                console.error("Error loading yearly data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadYearData();
    }, [selectedYear]);

    const formatCurrency = (val: number) => (val === 0 || !val) ? ' ' : val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNumber = (val: number) => (val === 0 || !val) ? ' ' : val.toLocaleString('es-ES');
    const formatAvg = (val: number, decimals: number = 1) => (val === 0 || !val) ? ' ' : val.toFixed(decimals).replace('.', ',');

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 flex flex-col p-4 bg-gradient-to-br from-zinc-950 to-zinc-900">
            <ScreenTopBar
                title="Resumen Anual Detallado"
                navigateTo={navigateTo}
                backTarget={Seccion.Informes}
            />

            <div className="flex items-center justify-between mb-4 mt-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="bg-zinc-800 p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        &larr;
                    </button>
                    <span className="text-2xl font-bold text-cyan-400">{selectedYear}</span>
                    <button
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        className="bg-zinc-800 p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        &rarr;
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 shadow-2xl bg-zinc-900/50 backdrop-blur-sm relative">
                <table className="w-full text-[10px] text-left border-separate border-spacing-0 min-w-[1000px]">
                    <thead className="sticky top-0 bg-zinc-950 z-30">
                        <tr>
                            <th className="p-2 border-b border-r border-zinc-700 font-bold uppercase tracking-wider sticky left-0 z-40 bg-zinc-950 min-w-[80px]">Mes</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">Ing.</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">Gast.</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">Benef.</th>
                            <th className="p-2 border-b border-zinc-700 text-center font-bold uppercase tracking-wider bg-zinc-900">Días</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">Kms</th>
                            <th className="p-2 border-b border-zinc-700 text-center font-bold uppercase tracking-wider bg-zinc-900">Carr.</th>
                            <th className="p-2 border-b border-zinc-700 text-center font-bold uppercase tracking-wider bg-zinc-900">C.Tarj.</th>
                            <th className="p-2 border-b border-zinc-700 text-center font-bold uppercase tracking-wider bg-zinc-900">C.Ems.</th>
                            <th className="p-2 border-b border-zinc-700 text-center font-bold uppercase tracking-wider bg-zinc-900">Vales</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">S.Tarj.</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">S.Ems.</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">S.Vales</th>
                            <th className="p-2 border-b border-zinc-700 text-center font-bold uppercase tracking-wider bg-zinc-900">L/100</th>
                            <th className="p-2 border-b border-zinc-700 text-right font-bold uppercase tracking-wider bg-zinc-900">Prop.</th>
                            <th className="p-2 border-b border-zinc-700 text-center font-bold uppercase tracking-wider bg-zinc-900">T1</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={16} className="p-8 text-center text-zinc-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Procesando datos anuales...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : stats.map((month, idx) => (
                            <tr key={idx} className="hover:bg-zinc-800/50 transition-colors group">
                                <td className="p-2 font-semibold text-zinc-300 group-hover:text-cyan-400 sticky left-0 z-20 bg-zinc-950 border-r border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">{month.nombre}</td>
                                <td className="p-2 text-right font-bold text-cyan-400">{formatCurrency(month.ingreso)}</td>
                                <td className="p-2 text-right font-bold text-pink-500">{formatCurrency(month.egreso)}</td>
                                <td className={`p-2 text-right font-bold ${month.total >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                    {formatCurrency(month.total)}
                                </td>
                                <td className="p-2 text-center text-zinc-400">{formatNumber(month.dias)}</td>
                                <td className="p-2 text-right text-zinc-400">{formatNumber(month.kilometros)}</td>
                                <td className="p-2 text-center text-zinc-400">{formatNumber(month.carreras)}</td>
                                <td className="p-2 text-center text-zinc-400">{formatNumber(month.cTarjeta)}</td>
                                <td className="p-2 text-center text-zinc-400">{formatNumber(month.cEmisora)}</td>
                                <td className="p-2 text-center text-zinc-400">{formatNumber(month.vVales)}</td>
                                <td className="p-2 text-right text-zinc-400">{formatCurrency(month.sTarjeta)}</td>
                                <td className="p-2 text-right text-zinc-400">{formatCurrency(month.sEmisora)}</td>
                                <td className="p-2 text-right text-zinc-400">{formatCurrency(month.sVales)}</td>
                                <td className="p-2 text-center text-zinc-400">{formatAvg(month.litros100, 2)}</td>
                                <td className="p-2 text-right text-zinc-400">{formatCurrency(month.propinas)}</td>
                                <td className="p-2 text-center text-zinc-400">{formatNumber(month.turno1)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {!loading && (
                        <tfoot className="sticky bottom-0 z-30">
                            <tr className="bg-zinc-800 text-cyan-400 font-bold border-t-2 border-cyan-500/50">
                                <td className="p-2 uppercase sticky left-0 z-20 bg-zinc-800 border-r border-cyan-500/50">TOTAL</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + m.ingreso, 0))}</td>
                                <td className="p-2 text-right text-pink-400">{formatCurrency(stats.reduce((s, m) => s + m.egreso, 0))}</td>
                                <td className="p-2 text-right text-emerald-400">{formatCurrency(stats.reduce((s, m) => s + m.total, 0))}</td>
                                <td className="p-2 text-center">{formatNumber(stats.reduce((s, m) => s + (m.dias || 0), 0))}</td>
                                <td className="p-2 text-right">{formatNumber(stats.reduce((s, m) => s + (m.kilometros || 0), 0))}</td>
                                <td className="p-2 text-center">{formatNumber(stats.reduce((s, m) => s + (m.carreras || 0), 0))}</td>
                                <td className="p-2 text-center">{formatNumber(stats.reduce((s, m) => s + (m.cTarjeta || 0), 0))}</td>
                                <td className="p-2 text-center">{formatNumber(stats.reduce((s, m) => s + (m.cEmisora || 0), 0))}</td>
                                <td className="p-2 text-center">{formatNumber(stats.reduce((s, m) => s + (m.vVales || 0), 0))}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.sTarjeta || 0), 0))}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.sEmisora || 0), 0))}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.sVales || 0), 0))}</td>
                                <td className="p-2 text-center">{formatAvg(stats.filter(m => m.litros100 > 0).reduce((s, m) => s + m.litros100, 0) / (stats.filter(m => m.litros100 > 0).length || 1), 2)}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.propinas || 0), 0))}</td>
                                <td className="p-2 text-center">{formatNumber(stats.reduce((s, m) => s + (m.turno1 || 0), 0))}</td>
                            </tr>
                            <tr className="bg-zinc-950 text-zinc-400 font-semibold border-t border-zinc-800 text-[9px]">
                                <td className="p-2 uppercase sticky left-0 z-20 bg-zinc-950 border-r border-zinc-800">MEDIA</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + m.ingreso, 0) / 12)}</td>
                                <td className="p-2 text-right text-pink-400/80">{formatCurrency(stats.reduce((s, m) => s + m.egreso, 0) / 12)}</td>
                                <td className="p-2 text-right text-emerald-400/80">{formatCurrency(stats.reduce((s, m) => s + (m.total || 0), 0) / 12)}</td>
                                <td className="p-2 text-center">{formatAvg(stats.reduce((s, m) => s + (m.dias || 0), 0) / 12, 1)}</td>
                                <td className="p-2 text-right">{formatNumber(Math.round(stats.reduce((s, m) => s + (m.kilometros || 0), 0) / 12))}</td>
                                <td className="p-2 text-center">{formatAvg(stats.reduce((s, m) => s + (m.carreras || 0), 0) / 12, 1)}</td>
                                <td className="p-2 text-center">{formatAvg(stats.reduce((s, m) => s + (m.cTarjeta || 0), 0) / 12, 1)}</td>
                                <td className="p-2 text-center">{formatAvg(stats.reduce((s, m) => s + (m.cEmisora || 0), 0) / 12, 1)}</td>
                                <td className="p-2 text-center">{formatAvg(stats.reduce((s, m) => s + (m.vVales || 0), 0) / 12, 1)}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.sTarjeta || 0), 0) / 12)}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.sEmisora || 0), 0) / 12)}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.sVales || 0), 0) / 12)}</td>
                                <td className="p-2 text-center">{formatAvg(stats.filter(m => (m.litros100 ?? 0) > 0).reduce((s, m) => s + (m.litros100 ?? 0), 0) / (stats.filter(m => (m.litros100 ?? 0) > 0).length || 1), 2)}</td>
                                <td className="p-2 text-right">{formatCurrency(stats.reduce((s, m) => s + (m.propinas || 0), 0) / 12)}</td>
                                <td className="p-2 text-center">{formatAvg(stats.reduce((s, m) => s + (m.turno1 || 0), 0) / 12, 1)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {!loading && (
                <div className="mt-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 flex flex-wrap gap-6 justify-center text-sm shadow-inner">
                    <div className="flex flex-col items-center">
                        <span className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Total Año</span>
                        <span className="text-cyan-400 font-extrabold text-xl">{formatCurrency(stats.reduce((s, m) => s + m.ingreso, 0))}€</span>
                    </div>
                    <div className="w-px h-10 bg-zinc-800 hidden sm:block"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Beneficio Anual</span>
                        <span className="text-emerald-400 font-extrabold text-xl">{formatCurrency(stats.reduce((s, m) => s + m.total, 0))}€</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumenAnualDetalladoScreen;
