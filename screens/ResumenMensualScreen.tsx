import React, { useState, useEffect, useMemo } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import { getIngresosByYear, getGastosByYear } from '../services/api';
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
    { abrev: 'Ene', nombre: 'Enero', num: 0 },        // getMonth() retorna 0 para Enero
    { abrev: 'Feb', nombre: 'Febrero', num: 1 },     // getMonth() retorna 1 para Febrero
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
    }>>([]);
    const [loading, setLoading] = useState(true);

    // Función helper para formatear valores: si es 0, retorna cadena vacía
    const formatValue = (value: number): string => {
        if (value === 0) return '';
        return `${value.toFixed(2).replace('.', ',')} €`;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [ingresosData, gastosData] = await Promise.all([
                    getIngresosByYear(selectedYear),
                    getGastosByYear(selectedYear)
                ]);

                // Organizar datos por mes (desde Enero)
                // getMonth() retorna 0-11, donde 0=Enero, 1=Febrero, ..., 11=Diciembre
                // ingresosData y gastosData son arrays de 12 elementos (índices 0-11)
                // ingresosData[0]=Enero, ingresosData[1]=Febrero, ..., ingresosData[10]=Noviembre, ingresosData[11]=Diciembre
                const datosPorMes = meses.map((mes) => {
                    // mes.num corresponde directamente al índice del array retornado por getIngresosByYear
                    // Enero = 0, Febrero = 1, Marzo = 2, ..., Noviembre = 10, Diciembre = 11
                    const ingresosMes = ingresosData[mes.num] || 0;
                    const gastosMes = gastosData[mes.num] || 0;
                    return {
                        mes: mes.abrev,
                        ingresos: ingresosMes,
                        gastos: gastosMes,
                        total: ingresosMes - gastosMes
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

    // Calcular totales
    const totales = useMemo(() => {
        const ingresosTotal = datosMensuales.reduce((sum, d) => sum + d.ingresos, 0);
        const gastosTotal = datosMensuales.reduce((sum, d) => sum + d.gastos, 0);
        const totalGeneral = ingresosTotal - gastosTotal;
        return { ingresosTotal, gastosTotal, totalGeneral };
    }, [datosMensuales]);

    const changeYear = (years: number) => {
        setSelectedYear(prev => prev + years);
    };

    const handleGenerarPDF = () => {
        try {
            const doc = new jsPDF();

            // Configuración de colores
            const headerColorR = 25, headerColorG = 118, headerColorB = 210; // Azul oscuro (blue-900)
            const textColorR = 0, textColorG = 0, textColorB = 0; // Negro
            const ingresosColorR = 33, ingresosColorG = 150, ingresosColorB = 243; // Azul (blue-600)
            const gastosColorR = 211, gastosColorG = 47, gastosColorB = 47; // Rojo (red-600)

            // Título
            doc.setFontSize(18);
            doc.setTextColor(headerColorR, headerColorG, headerColorB);
            doc.text('Resumen Financiero Anual', 105, 20, { align: 'center' });

            // Año
            doc.setFontSize(14);
            doc.setTextColor(textColorR, textColorG, textColorB);
            doc.text(`Año: ${selectedYear}`, 105, 30, { align: 'center' });

            // Configuración de la tabla
            const startY = 40;
            const lineHeight = 8;
            const colWidths = [40, 50, 50, 50]; // Ancho de columnas
            const colX = [20, 60, 110, 160]; // Posiciones X de las columnas

            // Header de la tabla
            doc.setFillColor(headerColorR, headerColorG, headerColorB);
            doc.rect(colX[0], startY, colWidths[0], lineHeight, 'F');
            doc.rect(colX[1], startY, colWidths[1], lineHeight, 'F');
            doc.rect(colX[2], startY, colWidths[2], lineHeight, 'F');
            doc.rect(colX[3], startY, colWidths[3], lineHeight, 'F');

            doc.setTextColor(255, 255, 255); // Blanco para el header
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Mes', colX[0] + colWidths[0] / 2, startY + 5, { align: 'center' });
            doc.text('Ingresos', colX[1] + colWidths[1] / 2, startY + 5, { align: 'center' });
            doc.text('Gastos', colX[2] + colWidths[2] / 2, startY + 5, { align: 'center' });
            doc.text('Total', colX[3] + colWidths[3] / 2, startY + 5, { align: 'center' });

            // Filas de datos
            let currentY = startY + lineHeight;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            datosMensuales.forEach((dato, index) => {
                // Color de fondo alternado
                if (index % 2 === 0) {
                    doc.setFillColor(249, 250, 251); // gray-50
                    doc.rect(colX[0], currentY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], lineHeight, 'F');
                }

                // Texto del mes
                doc.setTextColor(textColorR, textColorG, textColorB);
                doc.text(dato.mes, colX[0] + colWidths[0] / 2, currentY + 5, { align: 'center' });

                // Ingresos (azul)
                doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
                doc.text(dato.ingresos.toFixed(2) + ' €', colX[1] + colWidths[1] / 2, currentY + 5, { align: 'center' });

                // Gastos (rojo)
                doc.setTextColor(gastosColorR, gastosColorG, gastosColorB);
                doc.text(dato.gastos.toFixed(2) + ' €', colX[2] + colWidths[2] / 2, currentY + 5, { align: 'center' });

                // Total (azul)
                doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
                doc.text(dato.total.toFixed(2) + ' €', colX[3] + colWidths[3] / 2, currentY + 5, { align: 'center' });

                currentY += lineHeight;

                // Nueva página si es necesario
                if (currentY > 270) {
                    doc.addPage();
                    currentY = 20;
                }
            });

            // Fila de totales
            doc.setFillColor(229, 231, 235); // gray-200
            doc.rect(colX[0], currentY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], lineHeight, 'F');

            doc.setFont(undefined, 'bold');
            doc.setTextColor(textColorR, textColorG, textColorB);
            doc.text('Total', colX[0] + colWidths[0] / 2, currentY + 5, { align: 'center' });

            doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
            doc.text(totales.ingresosTotal.toFixed(2) + ' €', colX[1] + colWidths[1] / 2, currentY + 5, { align: 'center' });

            doc.setTextColor(gastosColorR, gastosColorG, gastosColorB);
            doc.text(totales.gastosTotal.toFixed(2) + ' €', colX[2] + colWidths[2] / 2, currentY + 5, { align: 'center' });

            doc.setTextColor(ingresosColorR, ingresosColorG, ingresosColorB);
            doc.text(totales.totalGeneral.toFixed(2) + ' €', colX[3] + colWidths[3] / 2, currentY + 5, { align: 'center' });

            // Pie de página
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    105,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }

            // Guardar el PDF
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

            {/* Navegación de Año */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-1 px-4 flex items-center justify-between">
                <button
                    onClick={() => changeYear(-1)}
                    className="text-cyan-300 hover:bg-zinc-800 rounded p-1 transition-colors"
                >
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-100 font-medium text-sm tracking-wide">{selectedYear}</span>
                <button
                    onClick={() => changeYear(1)}
                    className="text-cyan-300 hover:bg-zinc-800 rounded p-1 transition-colors"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {/* Contenido principal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {/* Tabla */}
                <div className="flex-1 overflow-y-auto">
                    {/* Header de la Tabla */}
                    <div className="bg-[#14225A] grid grid-cols-4 py-1 px-2 text-white font-semibold text-xs uppercase tracking-wide sticky top-0 z-10">
                        <div className="flex items-center">Mes</div>
                        <div className="text-right flex items-center justify-end whitespace-nowrap">Ingresos</div>
                        <div className="text-right flex items-center justify-end whitespace-nowrap">Gastos</div>
                        <div className="text-right flex items-center justify-end whitespace-nowrap">Total</div>
                    </div>

                    {/* Filas de Datos */}
                    {loading ? (
                        <div className="text-center py-8 text-zinc-400">Cargando...</div>
                    ) : (
                        <>
                            {datosMensuales.map((dato, index) => (
                                <div
                                    key={index}
                                    className={`grid grid-cols-4 py-1 px-2 text-sm border-b border-zinc-800 ${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'
                                        }`}
                                >
                                    <div className="text-zinc-100 font-medium flex items-center">{dato.mes}</div>
                                    <div className="text-cyan-400 text-right font-semibold flex items-center justify-end whitespace-nowrap">{formatValue(dato.ingresos)}</div>
                                    <div className="text-red-400 text-right font-semibold flex items-center justify-end whitespace-nowrap">{formatValue(dato.gastos)}</div>
                                    <div className={`text-right font-semibold flex items-center justify-end whitespace-nowrap ${dato.total >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                        {formatValue(dato.total)}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Fila de Totales */}
                <div className="bg-[#10172D] grid grid-cols-4 py-1.5 px-2 text-sm font-semibold border-t border-zinc-800">
                    <div className="flex items-center">
                        <span className="text-zinc-100 font-bold uppercase tracking-wide">Total</span>
                    </div>
                    <div className="text-cyan-300 text-right font-bold flex items-center justify-end whitespace-nowrap">{totales.ingresosTotal.toFixed(2)} €</div>
                    <div className="text-red-400 text-right font-bold flex items-center justify-end whitespace-nowrap">{totales.gastosTotal.toFixed(2)} €</div>
                    <div className={`text-right font-bold flex items-center justify-end whitespace-nowrap ${totales.totalGeneral >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                        {totales.totalGeneral.toFixed(2)} €
                    </div>
                </div>
            </div>

            {/* Botón Generar PDF */}
            <div className="flex justify-center pt-0.5">
                <button
                    onClick={handleGenerarPDF}
                    className="bg-[#14225A] text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-[#1b2c78] transition-colors shadow-lg"
                >
                    <PDFIcon />
                    <span>Generar Informe PDF</span>
                </button>
            </div>
        </div>
    );
};

export default ResumenMensualScreen;

