import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { getCarrerasByMonth, getGastosByMonth, getTurnosByMonth, cleanN, parseDate } from '../services/api';

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

interface ResumenMensualDetalladoScreenProps {
    navigateTo: (page: Seccion) => void;
}

const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const ResumenMensualDetalladoScreen: React.FC<ResumenMensualDetalladoScreenProps> = ({ navigateTo }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [carreras, setCarreras] = useState<any[]>([]);
    const [gastos, setGastos] = useState<any[]>([]);
    const [turnos, setTurnos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [carrerasData, gastosData, turnosData] = await Promise.all([
                    getCarrerasByMonth(selectedMonth, selectedYear),
                    getGastosByMonth(selectedMonth, selectedYear),
                    getTurnosByMonth(selectedMonth, selectedYear)
                ]);
                setCarreras(carrerasData);
                setGastos(gastosData);
                setTurnos(turnosData);
            } catch (error) {
                console.error("Error loading monthly detailed data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedMonth, selectedYear]);

    const parseSafeDate = parseDate;

    // Calcular métricas
    const metrics = useMemo(() => {
        // Días únicos con carreras o turnos
        const diasUnicos = new Set<number>();
        carreras.forEach(c => diasUnicos.add(parseSafeDate(c.fechaHora).getDate()));
        turnos.forEach(t => diasUnicos.add(parseSafeDate(t.fechaInicio).getDate()));
        const dias = diasUnicos.size;

        // Carreras totales
        const totalCarreras = carreras.length;

        // Turnos únicos
        const turnosUnicos = new Set(turnos.map(t => t.id));
        const turno1 = turnosUnicos.size;

        // Sumas por forma de pago
        const sumaTarjeta = carreras
            .filter(c => c.formaPago === 'Tarjeta')
            .reduce((sum, c) => sum + (Number(c.cobrado) || 0), 0);

        const sumaEmisora = carreras
            .filter(c => !!c.emisora)
            .reduce((sum, c) => sum + (Number(c.cobrado) || 0), 0);

        const sumaVales = carreras
            .filter(c => c.formaPago === 'Vales')
            .reduce((sum, c) => sum + (Number(c.cobrado) || 0), 0);

        // Contadores por forma de pago
        const countTarjeta = carreras.filter(c => c.formaPago === 'Tarjeta').length;
        const countEmisora = carreras.filter(c => !!c.emisora).length;
        const countVales = carreras.filter(c => c.formaPago === 'Vales').length;

        // Propinas (diferencia entre cobrado y taxímetro)
        const propinas = carreras.reduce((sum, c) => {
            const propina = Math.max(0, (Number(c.cobrado) || 0) - (Number(c.taximetro) || 0));
            return sum + propina;
        }, 0);

        // Aeropuerto
        const aeropuerto = carreras
            .filter(c => !!c.aeropuerto)
            .reduce((sum, c) => sum + (Number(c.cobrado) || 0), 0);

        // Los helpers cleanN y parseDate ahora se importan de api.ts

        // Horas trabajadas
        let totalMs = 0;
        turnos.forEach(t => {
            const start = parseDate(t.fechaInicio);
            const end = parseDate(t.fechaFin);
            if (start && end) {
                const diff = end.getTime() - start.getTime();
                if (diff > 0) totalMs += diff;
            }
        });
        const horas = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;

        // Kilómetros
        let kilometros = 0;
        turnos.forEach(t => {
            const ini = cleanN(t.kilometrosInicio);
            const fin = cleanN(t.kilometrosFin);
            if (fin > ini) {
                kilometros += (fin - ini);
            }
        });

        // Ingresos Varios
        const ingresosVarios = 0;

        // Combustible (Detección mejorada: concepto, litros o kmParciales)
        const combustibleGasto = gastos.filter(g => {
            const concepto = g.concepto?.toLowerCase() || '';
            const isFuelConcept =
                concepto.includes('combustible') ||
                concepto.includes('carburante') ||
                concepto.includes('gasolin') ||
                concepto.includes('gasoil') ||
                concepto.includes('diésel') ||
                concepto.includes('diesel') ||
                concepto.includes('repost');
            const hasFuelData = cleanN(g.litros) > 0 || cleanN(g.kmParciales) > 0;
            return isFuelConcept || hasFuelData;
        });
        const combustible = combustibleGasto.reduce((sum, g) => sum + cleanN(g.importe), 0);
        const litrosTotal = combustibleGasto.reduce((sum, g) => sum + cleanN(g.litros), 0);

        // Kms para el cálculo de consumo (prioridad turnos, respaldo kmParciales de gastos)
        let kmsParaConsumo = kilometros;
        if (kmsParaConsumo <= 0) {
            kmsParaConsumo = combustibleGasto.reduce((sum, g) => sum + cleanN(g.kmParciales), 0);
        }
        const litros100 = (kmsParaConsumo > 0 && litrosTotal > 0) ? (litrosTotal / kmsParaConsumo) * 100 : 0;

        // Total ingresos (suma de todas las carreras usando cleanN)
        const neto = carreras.reduce((sum, c) => sum + cleanN(c.cobrado), 0);

        // Total gastos
        const totalGastos = gastos.reduce((sum, g) => sum + (Number(g.importe) || 0), 0);

        // Total general
        const total = neto - totalGastos;

        return {
            dias,
            carreras: totalCarreras,
            turno1,
            sumaTarjeta,
            sumaEmisora,
            sumaVales,
            countTarjeta,
            countEmisora,
            countVales,
            propinas,
            aeropuerto,
            horas,
            kilometros,
            ingresosVarios,
            combustible,
            litros100,
            neto,
            gastos: totalGastos,
            total
        };
    }, [carreras, gastos, turnos]);

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

    const formatNumber = (value: number): string => {
        if (value === 0) return ' ';
        return value.toString();
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 flex flex-col p-3 space-y-2" style={{ maxHeight: '100vh', overflow: 'hidden' }}>
            <ScreenTopBar
                title="Mensual Detallado"
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
                <span className="text-zinc-100 font-medium text-sm tracking-wide">
                    {meses[selectedMonth]} {selectedYear}
                </span>
                <button
                    onClick={() => changeMonth(1)}
                    className="text-cyan-300 hover:bg-zinc-800 rounded p-1 transition-colors"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {/* Resumen Completo y Total */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-1.5 flex items-center justify-between">
                <h2 className="text-cyan-300 font-semibold text-sm uppercase tracking-wide">Resumen</h2>
                <div className="bg-emerald-500 rounded-xl px-4 py-1.5 shadow-md flex items-center gap-2">
                    <span className="text-emerald-950 font-semibold text-xs uppercase">Total</span>
                    <span className="text-white font-bold text-base">{formatCurrency(metrics.total)} €</span>
                </div>
            </div>

            {/* Grid de Datos */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500">Cargando...</div>
            ) : (
                <div className="flex-1 overflow-hidden min-h-0">
                    <div className="grid grid-cols-3 gap-1 h-full" style={{ gridAutoRows: 'minmax(56px, auto)' }}>
                        {/* Fila 1 */}
                        <DataBox label="Días" value={formatNumber(metrics.dias)} />
                        <DataBox label="Carreras" value={formatNumber(metrics.carreras)} />
                        <DataBox label="Turnos" value={formatNumber(metrics.turno1)} />

                        {/* Fila 2 */}
                        <DataBox label="S. Tarjeta" value={formatCurrency(metrics.sumaTarjeta)} />
                        <DataBox label="S. Emisora" value={formatCurrency(metrics.sumaEmisora)} />
                        <DataBox label="S.Vales" value={formatCurrency(metrics.sumaVales)} />

                        {/* Fila 3 */}
                        <DataBox label="C. Tarjeta" value={formatNumber(metrics.countTarjeta)} />
                        <DataBox label="C. Emisora" value={formatNumber(metrics.countEmisora)} />
                        <DataBox label="C.Vales" value={formatNumber(metrics.countVales)} />

                        {/* Fila 4 */}
                        <DataBox label="Propinas" value={formatCurrency(metrics.propinas)} />
                        <DataBox label="Aeropuertos" value={formatCurrency(metrics.aeropuerto)} />
                        <DataBox label="Horas" value={formatNumber(metrics.horas)} />

                        {/* Fila 5 */}
                        <DataBox label="Kilometros" value={formatNumber(metrics.kilometros)} />
                        <DataBox label="L/100" value={metrics.litros100 > 0 ? metrics.litros100.toFixed(2).replace('.', ',') : ' '} />
                        <DataBox label="Combustible" value={formatCurrency(metrics.combustible)} />

                        {/* Fila 6 - Totales */}
                        <DataBox label="NETO" value={formatCurrency(metrics.neto)} />
                        <DataBox label="GASTOS" value={formatCurrency(metrics.gastos)} />
                        <DataBox label="TOTAL" value={formatCurrency(metrics.total)} />
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente para las cajas de datos
const DataBox: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col justify-center min-h-[56px]">
            <div className="text-cyan-300 text-xs font-semibold uppercase tracking-wide mb-0.5">{label}</div>
            <div className="text-zinc-100 text-sm font-semibold">{value || '—'}</div>
        </div>
    );
};

export default ResumenMensualDetalladoScreen;


