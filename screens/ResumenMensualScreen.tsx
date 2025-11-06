import React, { useState, useEffect, useMemo } from 'react';
import BackButton from '../components/BackButton';
import { Seccion } from '../types';
import { getIngresosByYear, getGastosByYear } from '../services/api';
import jsPDF from 'jspdf';

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

const PDFIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
    </svg>
);

const CurrencyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c2.16-.43 3.5-1.77 3.5-3.6 0-2.13-1.87-3.29-4.7-4.15z"/>
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
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [datosMensuales, setDatosMensuales] = useState<Array<{
        mes: string;
        ingresos: number;
        gastos: number;
        total: number;
    }>>([]);
    const [loading, setLoading] = useState(true);

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
        } catch (error) {
            console.error("Error generando PDF:", error);
            alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
        }
    };

    return (
        <div className="space-y-0">
            {/* Header Azul Oscuro */}
            <div className="bg-blue-900 py-1.5 px-3 rounded-t-lg flex items-center">
                <BackButton 
                    navigateTo={navigateTo} 
                    targetPage={Seccion.Resumen}
                    className="p-1.5 text-white hover:text-zinc-300 transition-colors"
                />
                <h1 className="text-white font-bold text-sm flex-1 text-center">Resumen Financiero Anual</h1>
                <div className="w-10"></div> {/* Espaciador */}
            </div>

            {/* Navegación de Año */}
            <div className="bg-white py-1 px-3 flex items-center justify-between">
                <button 
                    onClick={() => changeYear(-1)}
                    className="text-zinc-900 hover:bg-gray-100 rounded p-1"
                >
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-900 font-bold text-xl">{selectedYear}</span>
                <button 
                    onClick={() => changeYear(1)}
                    className="text-zinc-900 hover:bg-gray-100 rounded p-1"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white overflow-hidden">
                {/* Header de la Tabla */}
                <div className="bg-blue-900 grid grid-cols-4 py-2.5 px-4 text-white font-bold text-sm">
                    <div className="flex items-center">Mes</div>
                    <div className="text-right flex items-center justify-end">Ingresos</div>
                    <div className="text-right flex items-center justify-end">Gastos</div>
                    <div className="text-right flex items-center justify-end">Total</div>
                </div>

                {/* Filas de Datos */}
                {loading ? (
                    <div className="text-center py-8 text-zinc-400">Cargando...</div>
                ) : (
                    <>
                        {datosMensuales.map((dato, index) => (
                            <div 
                                key={index}
                                className={`grid grid-cols-4 py-2.5 px-4 text-sm border-b border-gray-200 ${
                                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                }`}
                            >
                                <div className="text-zinc-900 font-medium flex items-center">{dato.mes}</div>
                                <div className="text-blue-600 text-right font-medium flex items-center justify-end">{dato.ingresos.toFixed(2)} €</div>
                                <div className="text-red-600 text-right font-medium flex items-center justify-end">{dato.gastos.toFixed(2)} €</div>
                                <div className="text-blue-600 text-right font-medium flex items-center justify-end">{dato.total.toFixed(2)} €</div>
                            </div>
                        ))}

                        {/* Fila de Totales */}
                        <div className="bg-gray-200 grid grid-cols-4 py-3 px-4 text-sm font-semibold border-t-2 border-gray-300">
                            <div className="flex items-center gap-2">
                                <div className="text-blue-600">
                                    <CurrencyIcon />
                                </div>
                                <span className="text-zinc-900 font-bold">Total</span>
                            </div>
                            <div className="text-blue-600 text-right font-bold flex items-center justify-end">{totales.ingresosTotal.toFixed(2)} €</div>
                            <div className="text-red-600 text-right font-bold flex items-center justify-end">{totales.gastosTotal.toFixed(2)} €</div>
                            <div className="text-blue-600 text-right font-bold flex items-center justify-end">{totales.totalGeneral.toFixed(2)} €</div>
                        </div>
                    </>
                )}
            </div>

            {/* Botón Generar PDF */}
            <div className="flex justify-center pt-4 pb-20">
                <button
                    onClick={handleGenerarPDF}
                    className="bg-blue-900 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-lg"
                >
                    <PDFIcon />
                    <span>Generar Informe PDF</span>
                </button>
            </div>
        </div>
    );
};

export default ResumenMensualScreen;

