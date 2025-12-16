import React, { useState, useEffect } from 'react';
import { Seccion } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getCarreras, getGastos, getTurnos } from '../services/api';
import jsPDF from 'jspdf';

// Importar jspdf-autotable - versión 5.x
// @ts-ignore
import * as autoTableModule from 'jspdf-autotable';

interface ReportsScreenProps {
    navigateTo: (page: Seccion) => void;
}

interface ReportFilter {
    tipo: 'todos' | 'ingresos' | 'gastos';
    gastosFiltro?: 'todos' | 'actividad' | 'vehiculo' | 'iva' | 'conceptos' | 'proveedores';
    concepto?: string;
    proveedor?: string;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ navigateTo }) => {
    const { showToast } = useToast();
    const [fechaDesde, setFechaDesde] = useState<string>('');
    const [fechaHasta, setFechaHasta] = useState<string>('');
    const [filtros, setFiltros] = useState<ReportFilter>({
        tipo: 'todos',
        gastosFiltro: 'todos'
    });
    const [loading, setLoading] = useState(false);
    const [showDatePickerDesde, setShowDatePickerDesde] = useState(false);
    const [showDatePickerHasta, setShowDatePickerHasta] = useState(false);
    const [showGastosFiltro, setShowGastosFiltro] = useState(false);

    // Inicializar fechas con el mes actual
    useEffect(() => {
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

        setFechaDesde(primerDia.toISOString().split('T')[0]);
        setFechaHasta(ultimoDia.toISOString().split('T')[0]);
    }, []);

    const generarInforme = async () => {
        if (!fechaDesde || !fechaHasta) {
            showToast('Por favor, selecciona ambas fechas', 'warning');
            return;
        }

        setLoading(true);
        try {
            const fechaDesdeObj = new Date(fechaDesde);
            fechaDesdeObj.setHours(0, 0, 0, 0);
            const fechaHastaObj = new Date(fechaHasta);
            fechaHastaObj.setHours(23, 59, 59, 999);

            // Obtener todos los datos
            const [carreras, gastos, turnos] = await Promise.all([
                getCarreras(),
                getGastos(),
                getTurnos()
            ]);

            // Filtrar por fechas
            const carrerasFiltradas = carreras.filter(c => {
                const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                return fecha >= fechaDesdeObj && fecha <= fechaHastaObj;
            });

            const gastosFiltrados = gastos.filter(g => {
                const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                return fecha >= fechaDesdeObj && fecha <= fechaHastaObj;
            });

            const turnosFiltrados = turnos.filter(t => {
                const fecha = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
                return fecha >= fechaDesdeObj && fecha <= fechaHastaObj;
            });

            // Aplicar filtros adicionales
            let gastosFinales = gastosFiltrados;
            console.log('Filtros aplicados:', filtros);
            console.log('Gastos antes de filtrar:', gastosFiltrados.length);

            if (filtros.tipo === 'gastos' || filtros.tipo === 'todos') {
                if (filtros.gastosFiltro === 'actividad') {
                    // Filtrar solo gastos de actividad (tipo === 'actividad' o 'Actividad')
                    gastosFinales = gastosFinales.filter(g => {
                        const tipo = g.tipo?.toLowerCase();
                        return tipo === 'actividad' || (!tipo && (g.proveedor || g.concepto) && !g.kilometrosVehiculo);
                    });
                } else if (filtros.gastosFiltro === 'vehiculo') {
                    console.log('Aplicando filtro de Vehículo...');
                    // Filtrar solo gastos de vehículo
                    const gastosAntes = gastosFinales.length;
                    gastosFinales = gastosFinales.filter(g => {
                        const tipo = String(g.tipo || '').toLowerCase().trim();

                        // Verificar si es tipo vehículo (puede estar guardado como 'vehiculo', 'Vehículo', etc.)
                        const esTipoVehiculo = tipo === 'vehiculo' ||
                            tipo === 'vehículo' ||
                            tipo === 'vehicle' ||
                            tipo === 'vehicul' ||
                            (tipo.length > 0 && tipo.includes('vehic'));

                        // O si tiene campos de vehículo (taller, kilometrosVehiculo, o servicios)
                        const tieneTaller = g.taller != null && String(g.taller).trim() !== '';
                        const tieneKilometros = g.kilometrosVehiculo != null && Number(g.kilometrosVehiculo) > 0;
                        const tieneServicios = g.servicios && Array.isArray(g.servicios) && g.servicios.length > 0;
                        // También incluir si tiene litros (combustible)
                        const tieneCombustible = (g.litros != null && Number(g.litros) > 0) || (g.precioPorLitro != null && Number(g.precioPorLitro) > 0);

                        const tieneCamposVehiculo = tieneTaller || tieneKilometros || tieneServicios || tieneCombustible;

                        const resultado = esTipoVehiculo || tieneCamposVehiculo;

                        // Debug: mostrar todos los gastos para ver qué tienen
                        console.log('Gasto evaluado:', {
                            id: g.id,
                            tipo: g.tipo,
                            tipoLower: tipo,
                            taller: g.taller,
                            kilometrosVehiculo: g.kilometrosVehiculo,
                            servicios: g.servicios,
                            esTipoVehiculo,
                            tieneCamposVehiculo,
                            resultado
                        });

                        return resultado;
                    });

                    console.log(`Filtro Vehículo: ${gastosFinales.length} gastos encontrados de ${gastosAntes} totales`);
                    console.log('Gastos filtrados:', gastosFinales.map(g => ({ id: g.id, tipo: g.tipo, taller: g.taller })));
                } else if (filtros.gastosFiltro === 'conceptos' && filtros.concepto) {
                    gastosFinales = gastosFinales.filter(g => g.concepto?.toLowerCase().includes(filtros.concepto!.toLowerCase()));
                } else if (filtros.gastosFiltro === 'proveedores' && filtros.proveedor) {
                    gastosFinales = gastosFinales.filter(g => g.proveedor?.toLowerCase().includes(filtros.proveedor!.toLowerCase()));
                } else if (filtros.gastosFiltro === 'iva') {
                    // Filtrar solo gastos con IVA > 0
                    gastosFinales = gastosFinales.filter(g => g.ivaPorcentaje != null && Number(g.ivaPorcentaje) > 0);
                }
            }

            // Generar PDF
            generarPDF(carrerasFiltradas, gastosFinales, turnosFiltrados, fechaDesdeObj, fechaHastaObj, filtros);
            showToast('Informe generado correctamente', 'success');
        } catch (error) {
            ErrorHandler.handle(error, 'ReportsScreen - generarInforme');
        } finally {
            setLoading(false);
        }
    };

    const generarPDF = (
        carreras: any[],
        gastos: any[],
        turnos: any[],
        fechaDesde: Date,
        fechaHasta: Date,
        filtros: ReportFilter
    ) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 15; // Reduced initial Y position

        // Encabezado
        doc.setFontSize(16); // Slightly smaller title
        doc.setTextColor(0, 0, 0);
        doc.text('INFORME FISCAL Y CONTABLE', pageWidth / 2, yPos, { align: 'center' });
        yPos += 7; // Reduced gap

        doc.setFontSize(10); // Smaller metadata
        doc.text(`Período: ${fechaDesde.toLocaleDateString('es-ES')} - ${fechaHasta.toLocaleDateString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 6; // Reduced gap

        // Mostrar filtros aplicados
        let textoFiltros = 'Filtros: ';
        if (filtros.tipo === 'todos') textoFiltros += 'Todos';
        else if (filtros.tipo === 'ingresos') textoFiltros += 'Solo Ingresos';
        else if (filtros.tipo === 'gastos') {
            textoFiltros += 'Solo Gastos';
            if (filtros.gastosFiltro) {
                // Capitalizar primera letra
                const filtroCapitalizado = filtros.gastosFiltro.charAt(0).toUpperCase() + filtros.gastosFiltro.slice(1);
                textoFiltros += ` - ${filtroCapitalizado}`;

                if (filtros.gastosFiltro === 'conceptos' && filtros.concepto) {
                    textoFiltros += ` (${filtros.concepto})`;
                }
                if (filtros.gastosFiltro === 'proveedores' && filtros.proveedor) {
                    textoFiltros += ` (${filtros.proveedor})`;
                }
            }
        }

        doc.setFontSize(10);
        doc.text(textoFiltros, pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;

        doc.setTextColor(100, 100, 100); // Gray for generation date
        doc.setFontSize(9);
        doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Reset color
        yPos += 10; // Reduced gap before summary

        const totalIngresos = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        const totalGastos = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
        const baseImponibleGastos = gastos.reduce((sum, g) => sum + (g.baseImponible || g.importe || 0), 0);
        const totalIVAGastos = gastos.reduce((sum, g) => sum + (g.ivaImporte || 0), 0);
        const balance = totalIngresos - totalGastos;

        // =====================
        // RESUMEN EJECUTIVO (TABLA)
        // =====================
        doc.setFontSize(12); // Smaller section title
        doc.text('RESUMEN EJECUTIVO', 14, yPos);
        yPos += 5; // Reduced gap

        // Tabla resumen tipo hoja de cálculo
        // @ts-ignore
        autoTableModule.default(doc, {
            startY: yPos,
            head: [[
                'Total Ingresos (€)',
                'Total Gastos (€)',
                'Balance Neto (€)'
            ]],
            body: [[
                totalIngresos.toFixed(2),
                totalGastos.toFixed(2),
                balance.toFixed(2)
            ]],
            theme: 'grid',
            styles: {
                fontSize: 9, // Smaller font
                halign: 'center',
                cellPadding: 1.5 // Reduced padding
            },
            headStyles: {
                fillColor: [245, 245, 245], // Lighter gray
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            margin: { left: 14, right: 14 }
        });

        // Segunda fila (Base + IVA)
        const resumenY = (doc as any).lastAutoTable.finalY + 2; // Reduced gap between tables

        // @ts-ignore
        autoTableModule.default(doc, {
            startY: resumenY,
            head: [[
                'Base Imponible Gastos (€)',
                'IVA Gastos (€)'
            ]],
            body: [[
                baseImponibleGastos.toFixed(2),
                totalIVAGastos.toFixed(2)
            ]],
            theme: 'grid',
            styles: {
                fontSize: 9, // Smaller font
                halign: 'center',
                cellPadding: 1.5 // Reduced padding
            },
            headStyles: {
                fillColor: [245, 245, 245], // Lighter gray
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            margin: { left: 30, right: 30 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8; // Reduced gap after summary

        // DETALLE DE INGRESOS (Daily aggregation)
        if (filtros.tipo === 'ingresos' || filtros.tipo === 'todos') {
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            // Alineación a la izquierda (x=14)
            doc.text('DETALLE DE INGRESOS', 14, yPos);
            yPos += 8;

            // Agrupar datos por día
            const datosPorDia: {
                [key: string]: {
                    fecha: Date,
                    ingresos: number,
                    kilometros: number,
                    horasMs: number,
                    carrerasTotal: number,
                    carrerasTarjeta: number,
                    carrerasEmisora: number,
                    carrerasVales: number,
                    importeTarjeta: number,
                    importeEmisora: number,
                    importeVales: number
                }
            } = {};

            // Inicializar días con turnos (para tener días sin carreras pero con trabajo)
            turnos.forEach(t => {
                const fecha = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
                const key = fecha.toISOString().split('T')[0];

                if (!datosPorDia[key]) {
                    datosPorDia[key] = {
                        fecha: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
                        ingresos: 0,
                        kilometros: 0,
                        horasMs: 0,
                        carrerasTotal: 0,
                        carrerasTarjeta: 0,
                        carrerasEmisora: 0,
                        carrerasVales: 0,
                        importeTarjeta: 0,
                        importeEmisora: 0,
                        importeVales: 0
                    };
                }

                // Calcular Km
                if (t.kilometrosFin && t.kilometrosInicio) {
                    datosPorDia[key].kilometros += (t.kilometrosFin - t.kilometrosInicio);
                }

                // Calcular Horas
                if (t.fechaFin && t.fechaInicio) {
                    const inicio = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
                    const fin = t.fechaFin instanceof Date ? t.fechaFin : new Date(t.fechaFin);
                    datosPorDia[key].horasMs += (fin.getTime() - inicio.getTime());
                }
            });

            // Procesar Carreras
            carreras.forEach(c => {
                const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                const key = fecha.toISOString().split('T')[0]; // YYYY-MM-DD

                if (!datosPorDia[key]) {
                    datosPorDia[key] = {
                        fecha: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
                        ingresos: 0,
                        kilometros: 0,
                        horasMs: 0,
                        carrerasTotal: 0,
                        carrerasTarjeta: 0,
                        carrerasEmisora: 0,
                        carrerasVales: 0,
                        importeTarjeta: 0,
                        importeEmisora: 0,
                        importeVales: 0
                    };
                }

                const datos = datosPorDia[key];
                datos.ingresos += (c.cobrado || 0);
                datos.carrerasTotal++;

                if (c.formaPago === 'Tarjeta') {
                    datos.carrerasTarjeta++;
                    datos.importeTarjeta += (c.cobrado || 0);
                }
                if (c.formaPago === 'Vales') {
                    datos.carrerasVales++;
                    datos.importeVales += (c.cobrado || 0);
                }
                if (c.emisora) {
                    datos.carrerasEmisora++;
                    datos.importeEmisora += (c.cobrado || 0);
                }
            });

            // Procesar Gastos
            gastos.forEach(g => {
                const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                const key = fecha.toISOString().split('T')[0];

                if (!datosPorDia[key]) {
                    datosPorDia[key] = {
                        fecha: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
                        ingresos: 0,
                        kilometros: 0,
                        horasMs: 0,
                        carrerasTotal: 0,
                        carrerasTarjeta: 0,
                        carrerasEmisora: 0,
                        carrerasVales: 0,
                        importeTarjeta: 0,
                        importeEmisora: 0,
                        importeVales: 0
                    };
                }

                // datosPorDia[key].egresos += (g.importe || 0); // This line is removed as per instruction
            });

            // Agrupar por meses para la visualización
            const diasOrdenados = Object.values(datosPorDia)
                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
                .filter(d => d.ingresos > 0); // Solo mostrar días con ingresos

            const tableBody: any[] = [];
            let currentMonth = -1;
            const mesesNombres = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

            diasOrdenados.forEach(d => {
                const mes = d.fecha.getMonth();
                if (mes !== currentMonth) {
                    currentMonth = mes;
                    // Fila de cabecera de mes
                    tableBody.push([{
                        content: mesesNombres[mes],
                        colSpan: 11, // Ajustado a 11 columnas (sin DIAS)
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240],
                            textColor: [0, 0, 0],
                            halign: 'left'
                        }
                    }]);
                }

                const fechaStr = d.fecha.toLocaleDateString('es-ES');

                // Formatear horas
                const hours = Math.floor(d.horasMs / (1000 * 60 * 60));
                const minutes = Math.floor((d.horasMs % (1000 * 60 * 60)) / (1000 * 60));
                const horasStr = `${hours}h ${minutes}m`;

                tableBody.push([
                    fechaStr,
                    d.ingresos.toFixed(2),
                    d.kilometros.toFixed(0), // KILOMETROS
                    horasStr, // HORAS
                    // DIAS column removed
                    d.carrerasTotal.toString(),
                    d.carrerasTarjeta.toString(),
                    d.carrerasEmisora.toString(),
                    d.carrerasVales.toString(),
                    d.importeTarjeta.toFixed(2),
                    d.importeEmisora.toFixed(2),
                    d.importeVales.toFixed(2)
                ]);
            });

            // @ts-ignore
            if (typeof autoTableModule.default === 'function') {
                // @ts-ignore
                autoTableModule.default(doc, {
                    startY: yPos,
                    head: [
                        [
                            { content: 'FECHA', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [0, 0, 255] } },
                            { content: 'INGRESOS', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [0, 0, 255] } },
                            { content: 'Kms.', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [0, 0, 255] } },
                            { content: 'HORAS', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [0, 0, 255] } },
                            // DIAS column removed
                            { content: 'CARRERAS', colSpan: 4, styles: { halign: 'center', fillColor: [205, 200, 0], textColor: [0, 0, 0] } },
                            { content: 'IMPORTE EN €', colSpan: 3, styles: { halign: 'center', fillColor: [255, 200, 0], textColor: [0, 0, 0] } }
                        ],
                        [
                            { content: 'TOTAL', styles: { fillColor: [205, 200, 0], textColor: [0, 0, 0] } },
                            { content: 'TARJ.', styles: { fillColor: [205, 200, 0], textColor: [0, 0, 0] } },
                            { content: 'EMIS.', styles: { fillColor: [205, 200, 0], textColor: [0, 0, 0] } },
                            { content: 'VALES', styles: { fillColor: [205, 200, 0], textColor: [0, 0, 0] } },
                            { content: 'TARJETAS', styles: { fillColor: [255, 200, 0], textColor: [0, 0, 0] } },
                            { content: 'EMISORA', styles: { fillColor: [255, 200, 0], textColor: [0, 0, 0] } },
                            { content: 'VALES', styles: { fillColor: [255, 200, 0], textColor: [0, 0, 0] } }
                        ]
                    ],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: {
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        lineWidth: 0.1,
                        lineColor: [200, 200, 200]
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 1, // Reduced padding for compactness
                        halign: 'center',
                        valign: 'middle'
                    },
                    columnStyles: {
                        0: { cellWidth: 20, halign: 'center' }, // Fecha
                        1: { cellWidth: 20, halign: 'right' }, // Ingresos
                        2: { cellWidth: 20, halign: 'center' }, // Kilometros
                        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Horas
                        // DIAS removed, shift indices
                        4: { cellWidth: 14 }, // Carreras Total
                        5: { cellWidth: 15 }, // Carreras Tarjetas
                        6: { cellWidth: 15 }, // Carreras Emisora
                        7: { cellWidth: 14 }, // Carreras Vales
                        8: { cellWidth: 18, halign: 'right' }, // Importe Tarjetas
                        9: { cellWidth: 18, halign: 'right' }, // Importe Emisora
                        10: { cellWidth: 18, halign: 'right' } // Importe Vales
                    },
                    margin: { left: 10, right: 10 }
                });
            } else {
                // Fallback
                // @ts-ignore
                doc.autoTable({
                    startY: yPos,
                    head: [
                        ['FECHA', 'INGRESOS', 'KILOMETROS', 'HORAS', 'CARRERAS', '', '', '', 'IMPORTE EN €', '', ''],
                        ['', '', '', '', 'TOTAL', 'TARJ.', 'EMIS.', 'VALES', 'TARJETAS', 'EMISORA', 'VALES']
                    ],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 8, halign: 'center' }
                });
            }

            yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // GASTOS
        if (filtros.tipo === 'gastos' || filtros.tipo === 'todos') {
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.text('DETALLE DE GASTOS', 14, yPos);
            yPos += 8;

            if (gastos.length > 0) {
                // Agrupar por meses (Lógica unificada para todos los reportes de gastos)
                const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                const gastosPorMes: { [key: number]: any[] } = {};

                // Ordenar por fecha ascendente
                const gastosOrdenados = [...gastos].sort((a, b) => {
                    const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
                    const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
                    return fechaA.getTime() - fechaB.getTime();
                });

                gastosOrdenados.forEach(g => {
                    const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                    const mesIndex = fecha.getMonth();
                    if (!gastosPorMes[mesIndex]) {
                        gastosPorMes[mesIndex] = [];
                    }
                    gastosPorMes[mesIndex].push(g);
                });

                const tableBody: any[] = [];

                // Construir cuerpo de la tabla con cabeceras de mes
                Object.keys(gastosPorMes).sort((a, b) => Number(a) - Number(b)).forEach(mesIndexStr => {
                    const mesIndex = Number(mesIndexStr);
                    // Fila de cabecera de mes
                    tableBody.push([{
                        content: meses[mesIndex],
                        colSpan: 11,
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240],
                            textColor: [0, 0, 0],
                            halign: 'left'
                        }
                    }]);

                    // Filas de gastos del mes
                    gastosPorMes[mesIndex].forEach(g => {
                        const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                        const esVehiculoConServicios = g.tipo?.toLowerCase() === 'vehiculo' && g.servicios && Array.isArray(g.servicios) && g.servicios.length > 0;


                        // Fila principal - mismo formato para todos los gastos
                        // Columnas: Fecha, €, Proveedor, Concepto, Factura, F. Pago, Base, %, IVA, Kms., Notas
                        tableBody.push([
                            fecha.toLocaleDateString('es-ES'),
                            g.importe?.toFixed(2) || '0.00',
                            g.proveedor || g.taller || 'Sin proveedor',
                            g.concepto || 'Sin concepto',
                            g.numeroFactura || 'Sin factura',
                            g.formaPago || 'N/A',
                            (g.baseImponible || g.importe || 0).toFixed(2),
                            g.ivaPorcentaje ? `${g.ivaPorcentaje}%` : '0%',
                            (g.ivaImporte || 0).toFixed(2),
                            g.kilometros ? g.kilometros.toFixed(0) : (g.kilometrosVehiculo ? g.kilometrosVehiculo.toFixed(0) : 'N/A'),
                            g.notas || ''
                        ]);

                        // Si es vehículo con servicios, agregar filas de servicios
                        if (esVehiculoConServicios) {
                            g.servicios.forEach((s: any) => {
                                tableBody.push([
                                    '', // Fecha vacía
                                    s.importe ? s.importe.toFixed(2) : '0.00', // €
                                    '', // Proveedor vacío
                                    s.descripcion || 'Sin descripción', // Concepto
                                    s.referencia || 'Sin ref.', // Factura
                                    s.precio ? s.precio.toFixed(2) : '0.00', // F. Pago (reutilizado para Precio)
                                    s.descuento ? s.descuento.toFixed(2) : '0.00', // Base (reutilizado para Descuento)
                                    '', // % vacío
                                    '', // IVA vacío
                                    s.cantidad || '1', // Kms (reutilizado para Cantidad)
                                    '' // Notas vacío
                                ]);
                            });
                        }
                    });
                });

                // Usar autoTable con el nuevo formato unificado
                // @ts-ignore
                if (typeof autoTableModule.default === 'function') {
                    // @ts-ignore
                    autoTableModule.default(doc, {
                        startY: yPos,
                        head: [['Fecha', '€', 'Proveedor', 'Concepto', 'Factura', 'F. Pago', 'Base', '%', 'IVA', 'Kms.', 'Notas']],
                        body: tableBody,
                        theme: 'striped',
                        headStyles: { fillColor: [0, 0, 200], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak', cellWidth: 'wrap', halign: 'center' },
                        columnStyles: {
                            0: { cellWidth: 14 }, // Fecha
                            1: { cellWidth: 11, halign: 'right' }, // €
                            2: { cellWidth: 34, halign: 'left' }, // Proveedor
                            3: { cellWidth: 23, halign: 'left' }, // Concepto
                            4: { cellWidth: 30, halign: 'left' }, // Factura
                            5: { cellWidth: 15, halign: 'left' }, // Forma Pago
                            6: { cellWidth: 10, halign: 'right' }, // B. Imp.
                            7: { cellWidth: 9 }, // IVA %
                            8: { cellWidth: 10, halign: 'right' }, // IVA €
                            9: { cellWidth: 10 }, // Kms.
                            10: { cellWidth: 'auto', halign: 'left' } // Notas
                        },
                        margin: { left: 10, right: 10 },
                        didParseCell: (data: any) => {
                            if (data.cell.text && data.cell.text.length > 0) {
                                data.cell.text = String(data.cell.text);
                            }
                        }
                    });
                } else {
                    // Fallback
                    // @ts-ignore
                    doc.autoTable({
                        startY: yPos,
                        head: [['Fecha', '€', 'Proveedor', 'Concepto', 'Factura', 'F. Pago', 'Base', '%', 'IVA', 'Kms.', 'Notas']],
                        body: tableBody,
                        theme: 'striped',
                        headStyles: { fillColor: [0, 0, 200], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak', cellWidth: 'wrap', halign: 'center' },
                        columnStyles: {
                            0: { cellWidth: 14 }, // Fecha
                            1: { cellWidth: 11, halign: 'right' }, // €
                            2: { cellWidth: 34, halign: 'left' }, // Proveedor
                            3: { cellWidth: 23, halign: 'left' }, // Concepto
                            4: { cellWidth: 30, halign: 'left' }, // Factura
                            5: { cellWidth: 15, halign: 'left' }, // Forma Pago
                            6: { cellWidth: 10, halign: 'right' }, // B. Imp.
                            7: { cellWidth: 9 }, // IVA %
                            8: { cellWidth: 10, halign: 'right' }, // IVA €
                            9: { cellWidth: 10 }, // Kms.
                            10: { cellWidth: 'auto', halign: 'left' } // Notas
                        },
                        margin: { left: 10, right: 10 },
                        didParseCell: (data: any) => {
                            if (data.cell.text && data.cell.text.length > 0) {
                                data.cell.text = String(data.cell.text);
                            }
                        }
                    });
                }



                yPos = (doc as any).lastAutoTable.finalY + 10;

                // Resumen de gastos por proveedor o taller
                const esVehiculo = filtros.gastosFiltro === 'vehiculo';
                const tituloResumen = esVehiculo ? 'Resumen por Taller:' : 'Resumen por Proveedor:';

                const gastosAgrupados: { [key: string]: number } = {};
                gastos.forEach(g => {
                    let key;
                    if (esVehiculo) {
                        key = g.taller || 'Sin taller';
                    } else {
                        key = g.proveedor || 'Sin proveedor';
                    }
                    gastosAgrupados[key] = (gastosAgrupados[key] || 0) + (g.importe || 0);
                });

                doc.setFontSize(12);
                doc.text(tituloResumen, 14, yPos);
                yPos += 6;
                doc.setFontSize(10);
                Object.entries(gastosAgrupados)
                    .sort((a, b) => b[1] - a[1])
                    .forEach(([nombre, total]) => {
                        doc.text(`${nombre}: ${total.toFixed(2)} €`, 20, yPos);
                        yPos += 5;
                    });
                yPos += 5;

                // Resumen de IVA
                const ivaPorTipo: { [key: string]: { porcentaje: number; base: number; iva: number } } = {};
                gastos.forEach(g => {
                    const porcentaje = g.ivaPorcentaje || 0;
                    const key = `${porcentaje}%`;
                    if (!ivaPorTipo[key]) {
                        ivaPorTipo[key] = { porcentaje, base: 0, iva: 0 };
                    }
                    ivaPorTipo[key].base += g.baseImponible || g.importe || 0;
                    ivaPorTipo[key].iva += g.ivaImporte || 0;
                });

                doc.setFontSize(12);
                doc.text('Resumen de IVA:', 14, yPos);
                yPos += 6;
                doc.setFontSize(10);
                Object.entries(ivaPorTipo).forEach(([tipo, datos]) => {
                    doc.text(`${tipo}: Base ${datos.base.toFixed(2)} € | IVA ${datos.iva.toFixed(2)} €`, 20, yPos);
                    yPos += 5;
                });
            } else {
                doc.setFontSize(10);
                doc.text('No hay gastos en el período seleccionado', 14, yPos);
                yPos += 10;
            }
        }

        // Pie de página
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${i} de ${totalPages} - Documento generado para trámites administrativos`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        // Guardar PDF
        const nombreArchivo = `Informe_${fechaDesde.toISOString().split('T')[0]}_${fechaHasta.toISOString().split('T')[0]}.pdf`;
        doc.save(nombreArchivo);
    };

    // Obtener valores únicos para filtros
    const obtenerValoresUnicos = async () => {
        try {
            const [carreras, gastos] = await Promise.all([
                getCarreras(),
                getGastos()
            ]);

            const conceptos = [...new Set(gastos.map(g => g.concepto).filter(Boolean))];
            const proveedores = [...new Set(gastos.map(g => g.proveedor).filter(Boolean))];

            return { conceptos, proveedores };
        } catch (error) {
            console.error('Error al obtener valores únicos:', error);
            return { conceptos: [], proveedores: [] };
        }
    };

    const [valoresUnicos, setValoresUnicos] = useState<{
        conceptos: string[];
        proveedores: string[];
    }>({ conceptos: [], proveedores: [] });

    useEffect(() => {
        obtenerValoresUnicos().then(setValoresUnicos);
    }, []);

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-24 space-y-4">
            <ScreenTopBar title="Informes" navigateTo={navigateTo} backTarget={Seccion.Home} />

            <div className="space-y-4">
                {/* Selector de Fechas */}
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <h2 className="text-cyan-400 text-lg font-bold mb-4">Período del Informe</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-zinc-300 text-sm mb-2">Fecha Desde</label>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="w-full bg-zinc-800 border-2 border-green-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400"
                            />
                        </div>
                        <div>
                            <label className="block text-zinc-300 text-sm mb-2">Fecha Hasta</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="w-full bg-zinc-800 border-2 border-green-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <h2 className="text-cyan-400 text-lg font-bold mb-4">Filtros del Informe</h2>

                    {/* Tipo de Informe */}
                    <div className="mb-4">
                        <label className="block text-zinc-300 text-sm mb-2">Tipo de Informe</label>
                        <select
                            value={filtros.tipo}
                            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as any })}
                            className="w-full bg-zinc-800 border-2 border-green-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400"
                        >
                            <option value="todos">Todos (Ingresos y Gastos)</option>
                            <option value="ingresos">Solo Ingresos</option>
                            <option value="gastos">Solo Gastos</option>
                        </select>
                    </div>

                    {/* Filtros de Gastos */}
                    {(filtros.tipo === 'gastos' || filtros.tipo === 'todos') && (
                        <>
                            <div className="mb-4">
                                <label className="block text-zinc-300 text-sm mb-2">Filtro de Gastos</label>
                                <select
                                    value={filtros.gastosFiltro}
                                    onChange={(e) => setFiltros({ ...filtros, gastosFiltro: e.target.value as any })}
                                    className="w-full bg-zinc-800 border-2 border-green-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400"
                                >
                                    <option value="todos">Todos los Gastos</option>
                                    <option value="actividad">Actividad</option>
                                    <option value="vehiculo">Vehículo</option>
                                    <option value="iva">IVA</option>
                                    <option value="conceptos">Concepto</option>
                                    <option value="proveedores">Proveedor</option>
                                </select>
                            </div>

                            {/* Filtro específico según selección */}
                            {filtros.gastosFiltro === 'actividad' && (
                                <div className="mb-4">
                                    <p className="text-zinc-400 text-xs">
                                        Se mostrarán solo los gastos de actividad (con proveedor o concepto, sin kilometrosVehiculo)
                                    </p>
                                </div>
                            )}

                            {filtros.gastosFiltro === 'vehiculo' && (
                                <div className="mb-4">
                                    <p className="text-zinc-400 text-xs">
                                        Se mostrarán solo los gastos de vehículo (con kilometrosVehiculo)
                                    </p>
                                </div>
                            )}

                            {filtros.gastosFiltro === 'conceptos' && (
                                <div className="mb-4">
                                    <label className="block text-zinc-300 text-sm mb-2">Concepto</label>
                                    <input
                                        type="text"
                                        list="conceptos-list"
                                        value={filtros.concepto || ''}
                                        onChange={(e) => setFiltros({ ...filtros, concepto: e.target.value })}
                                        placeholder="Buscar por concepto..."
                                        className="w-full bg-zinc-800 border-2 border-green-500 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-green-400"
                                    />
                                    <datalist id="conceptos-list">
                                        {valoresUnicos.conceptos.map((c, i) => (
                                            <option key={i} value={c} />
                                        ))}
                                    </datalist>
                                </div>
                            )}

                            {filtros.gastosFiltro === 'proveedores' && (
                                <div className="mb-4">
                                    <label className="block text-zinc-300 text-sm mb-2">Proveedor</label>
                                    <select
                                        value={filtros.proveedor || ''}
                                        onChange={(e) => setFiltros({ ...filtros, proveedor: e.target.value })}
                                        className="w-full bg-zinc-800 border-2 border-green-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400"
                                    >
                                        <option value="">Todos los proveedores</option>
                                        {valoresUnicos.proveedores.map(prov => (
                                            <option key={prov} value={prov}>{prov}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {filtros.gastosFiltro === 'iva' && (
                                <div className="mb-4">
                                    <label className="block text-zinc-300 text-sm mb-2">Filtro de IVA</label>
                                    <p className="text-zinc-400 text-xs mb-2">
                                        El informe mostrará todos los gastos con su desglose de IVA
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Botón Generar */}
                <button
                    onClick={generarInforme}
                    disabled={loading || !fechaDesde || !fechaHasta}
                    className="w-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-white font-bold text-base hover:from-green-400 hover:to-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span>Generando informe...</span>
                        </div>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                            </svg>
                            Generar Informe PDF
                        </>
                    )}
                </button>

                {/* Información */}
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <h3 className="text-cyan-400 text-sm font-bold mb-2">ℹ️ Información</h3>
                    <p className="text-zinc-400 text-xs">
                        Los informes generados incluyen toda la información necesaria para trámites ante la Administración:
                        desglose de IVA, bases imponibles, facturas, proveedores y resúmenes por categorías.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportsScreen;

