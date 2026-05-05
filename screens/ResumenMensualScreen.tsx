import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import { getIngresosByYear, getGastosByYear, getHorasByYear } from '../services/api';
import jsPDF from 'jspdf';

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

const PDFIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
);

interface ResumenMensualScreenProps {
    navigateTo: (page: Seccion) => void;
}

const meses = [
    { abrev: 'Ene', nombre: 'Enero', num: 0 },
    { abrev: 'Feb', nombre: 'Febrero', num: 1 },
    { abrev: 'Mar', nombre: 'Marzo', num: 2 },
    { abrev: 'Abr', nombre: 'Abril', num: 3 },
    { abrev: 'May', nombre: 'Mayo', num: 4 },
    { abrev: 'Jun', nombre: 'Junio', num: 5 },
    { abrev: 'Jul', nombre: 'Julio', num: 6 },
    { abrev: 'Ago', nombre: 'Agosto', num: 7 },
    { abrev: 'Sep', nombre: 'Septiembre', num: 8 },
    { abrev: 'Oct', nombre: 'Octubre', num: 9 },
    { abrev: 'Nov', nombre: 'Noviembre', num: 10 },
    { abrev: 'Dic', nombre: 'Diciembre', num: 11 }
];

const ResumenMensualScreen: React.FC<ResumenMensualScreenProps> = ({ navigateTo }) => {
    const { showToast } = useToast();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [datosMensuales, setDatosMensuales] = useState<Array<{
        mes: string;
        ingresos: number;
        gastos: number;
        total: number;
        horasBrutas: number;
        horasNetas: number;
    }>>([]);
    const [loading, setLoading] = useState(true);

    const formatValue = (value: number): string => {
        if (value === 0) return ' ';
        return `${value.toFixed(2).replace('.', ',')} €`;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [ingresosData, gastosData, horasData] = await Promise.all([
                    getIngresosByYear(selectedYear),
                    getGastosByYear(selectedYear),
                    getHorasByYear(selectedYear)
                ]);

                const datosPorMes = meses.map((mes) => {
                    const ingresosMes = ingresosData[mes.num] || 0;
                    const gastosMes = gastosData[mes.num] || 0;
                    const horasBrutas = (horasData[mes.num]?.brutaMs || 0) / 3600000;
                    const horasNetas = (horasData[mes.num]?.netaMs || 0) / 3600000;
                    return {
                        mes: mes.abrev,
                        ingresos: ingresosMes,
                        gastos: gastosMes,
                        total: ingresosMes - gastosMes,
                        horasBrutas,
                        horasNetas
                    };
                });

                setDatosMensuales(datosPorMes);
            } catch (error) {
                console.error("Error loading monthly summary:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedYear]);

    const totales = useMemo(() => {
        const ingresosTotal = datosMensuales.reduce((sum, d) => sum + d.ingresos, 0);
        const gastosTotal = datosMensuales.reduce((sum, d) => sum + d.gastos, 0);
        const totalGeneral = ingresosTotal - gastosTotal;
        const totalHorasBrutas = datosMensuales.reduce((sum, d) => sum + d.horasBrutas, 0);
        const totalHorasNetas = datosMensuales.reduce((sum, d) => sum + d.horasNetas, 0);
        return { ingresosTotal, gastosTotal, totalGeneral, totalHorasBrutas, totalHorasNetas };
    }, [datosMensuales]);

    const changeYear = (years: number) => {
        setSelectedYear(prev => prev + years);
    };

    const handleGenerarPDF = () => {
        try {
            const doc = new jsPDF();
            const headerColorR = 25, headerColorG = 118, headerColorB = 210;
            const textColorR = 0, textColorG = 0, textColorB = 0;
            const ingresosColorR = 33, ingresosColorG = 150, ingresosColorB = 243;
            const gastosColorR = 211, gastosColorG = 47, gastosColorB = 47;

            doc.setFontSize(18);
            doc.setTextColor(headerColorR, headerColorG, headerColorB);
            doc.text('Resumen Financiero Anual', 105, 20, { align: 'center' });

            doc.setFontSize(14);
            doc.setTextColor(textColorR, textColorG, textColorB);
            doc.text(`Año: ${selectedYear}`, 105, 30, { align: 'center' });

            const startY = 40;
            const lineHeight = 8;
            const colWidths = [30, 40, 40, 40, 40];
            const colX = [10, 40, 80, 120, 160];

            doc.setFillColor(headerColorR, headerColorG, headerColorB);
            colX.forEach((x, i) => doc.rect(x, startY, colWidths[i], lineHeight, 'F'));

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Mes', colX[0] + colWidths[0] / 2, startY + 5, { align: 'center' });
            doc.text('Ingresos', colX[1] + colWidths[1] / 2, startY + 5, { align: 'center' });
            doc.text('Gastos', colX[2] + colWidths[2] / 2, startY + 5, { align: 'center' });
            doc.text('Horas B/N', colX[3] + colWidths[3] / 2, startY + 5, { align: 'center' });
            doc.text('Total', colX[4] + colWidths[4] / 2, startY + 5, { align: 'center' });

            let currentY = startY + lineHeight;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            datosMensuales.forEach((dato, index) => {
                if (index % 2 === 0) {
                    doc.setFillColor(249, 250, 251);
                    doc.rect(colX[0], currentY, 190, lineHeight, 'F');
                }

                doc.setTextColor(textColorR, textColorG, textColorB);
                doc.text(dato.mes, colX[0] + colWidths[0] / 2, currentY + 5, { align: 'center' });

                doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
                doc.text(dato.ingresos.toFixed(2) + ' €', colX[1] + colWidths[1] / 2, currentY + 5, { align: 'center' });

                doc.setTextColor(gastosColorR, gastosColorG, gastosColorB);
                doc.text(dato.gastos.toFixed(2) + ' €', colX[2] + colWidths[2] / 2, currentY + 5, { align: 'center' });

                doc.setTextColor(33, 150, 243);
                doc.text(`${dato.horasBrutas.toFixed(1)}/${dato.horasNetas.toFixed(1)}h`, colX[3] + colWidths[3] / 2, currentY + 5, { align: 'center' });

                doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
                doc.text(dato.total.toFixed(2) + ' €', colX[4] + colWidths[4] / 2, currentY + 5, { align: 'center' });

                currentY += lineHeight;
                if (currentY > 270) {
                    doc.addPage();
                    currentY = 20;
                }
            });

            doc.setFillColor(229, 231, 235);
            doc.rect(colX[0], currentY, 190, lineHeight, 'F');
            doc.setFont(undefined, 'bold');
            doc.setTextColor(textColorR, textColorG, textColorB);
            doc.text('Total', colX[0] + colWidths[0] / 2, currentY + 5, { align: 'center' });

            doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
            doc.text(totales.ingresosTotal.toFixed(2) + ' €', colX[1] + colWidths[1] / 2, currentY + 5, { align: 'center' });

            doc.setTextColor(gastosColorR, gastosColorG, gastosColorB);
            doc.text(totales.gastosTotal.toFixed(2) + ' €', colX[2] + colWidths[2] / 2, currentY + 5, { align: 'center' });

            doc.setTextColor(33, 150, 243);
            doc.text(`${totales.totalHorasBrutas.toFixed(1)}/${totales.totalHorasNetas.toFixed(1)}h`, colX[3] + colWidths[3] / 2, currentY + 5, { align: 'center' });

            doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
            doc.text(totales.totalGeneral.toFixed(2) + ' €', colX[4] + colWidths[4] / 2, currentY + 5, { align: 'center' });

            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(`Página ${i} de ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
            }

            doc.save(`Resumen_Financiero_${selectedYear}.pdf`);
            showToast('PDF generado correctamente', 'success');
        } catch (error) {
            ErrorHandler.handle(error, 'ResumenMensualScreen - generarPDF');
        }
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 py-4 space-y-2">
            <ScreenTopBar
                title="Resumen Financiero Anual"
                navigateTo={navigateTo}
                backTarget={Seccion.Resumen}
                className="rounded-xl shadow-lg"
            />

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-1 px-4 flex items-center justify-between">
                <button onClick={() => changeYear(-1)} className="text-cyan-300 hover:bg-zinc-800 rounded p-1 transition-colors">
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-100 font-medium text-sm tracking-wide">{selectedYear}</span>
                <button onClick={() => changeYear(1)} className="text-cyan-300 hover:bg-zinc-800 rounded p-1 transition-colors">
                    <ArrowRightIcon />
                </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="flex-1 overflow-y-auto">
                    <div className="bg-[#14225A] grid grid-cols-5 py-1 px-2 text-white font-semibold text-[10px] uppercase tracking-wide sticky top-0 z-10">
                        <div className="flex items-center">Mes</div>
                        <div className="text-center">Ingresos</div>
                        <div className="text-center">Gastos</div>
                        <div className="text-center">Hrs (B/N)</div>
                        <div className="text-right">Total</div>
                    </div>

                    {loading ? (
                        <div className="text-center py-8 text-zinc-400">Cargando...</div>
                    ) : (
                        datosMensuales.map((dato, index) => (
                            <div key={index} className={`grid grid-cols-5 py-1 px-2 text-xs border-b border-zinc-800 ${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}`}>
                                <div className="text-zinc-100 font-medium flex items-center">{dato.mes}</div>
                                <div className="text-cyan-400 text-center flex items-center justify-center">{formatValue(dato.ingresos)}</div>
                                <div className="text-red-400 text-center flex items-center justify-center">{formatValue(dato.gastos)}</div>
                                <div className="text-blue-300 text-center flex items-center justify-center">
                                    {dato.horasBrutas > 0 ? `${dato.horasBrutas.toFixed(1)}/${dato.horasNetas.toFixed(1)}h` : ' '}
                                </div>
                                <div className={`text-right font-semibold flex items-center justify-end ${dato.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {formatValue(dato.total)}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="bg-[#10172D] grid grid-cols-5 py-1.5 px-2 text-[11px] font-semibold border-t border-zinc-800">
                    <div className="text-zinc-100 font-bold uppercase">Total</div>
                    <div className="text-cyan-300 text-center">{formatValue(totales.ingresosTotal)}</div>
                    <div className="text-red-400 text-center">{formatValue(totales.gastosTotal)}</div>
                    <div className="text-blue-300 text-center">
                        {totales.totalHorasBrutas.toFixed(1)}/{totales.totalHorasNetas.toFixed(1)}h
                    </div>
                    <div className={`text-right font-bold ${totales.totalGeneral >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatValue(totales.totalGeneral)}
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-0.5">
                <button onClick={handleGenerarPDF} className="bg-[#14225A] text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-[#1b2c78] transition-colors shadow-lg">
                    <PDFIcon />
                    <span>Generar Informe PDF</span>
                </button>
            </div>
        </div>
    );
};

export default ResumenMensualScreen;
