import React, { useState, useEffect } from 'react';
import { Seccion } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { getCarreras, getGastos } from '../services/api';
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
            alert('Por favor, selecciona ambas fechas');
            return;
        }

        setLoading(true);
        try {
            const fechaDesdeObj = new Date(fechaDesde);
            fechaDesdeObj.setHours(0, 0, 0, 0);
            const fechaHastaObj = new Date(fechaHasta);
            fechaHastaObj.setHours(23, 59, 59, 999);

            // Obtener todos los datos
            const [carreras, gastos] = await Promise.all([
                getCarreras(),
                getGastos()
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
                        const tieneCamposVehiculo = tieneTaller || tieneKilometros || tieneServicios;
                        
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
                }
                // El filtro 'iva' no necesita lógica adicional, solo muestra todos los gastos con su desglose de IVA
            }

            // Generar PDF
            generarPDF(carrerasFiltradas, gastosFinales, fechaDesdeObj, fechaHastaObj, filtros);
        } catch (error) {
            console.error('Error al generar informe:', error);
            alert('Error al generar el informe. Por favor, intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const generarPDF = (
        carreras: any[],
        gastos: any[],
        fechaDesde: Date,
        fechaHasta: Date,
        filtros: ReportFilter
    ) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // Encabezado
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text('INFORME FISCAL Y CONTABLE', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(12);
        doc.text(`Período: ${fechaDesde.toLocaleDateString('es-ES')} - ${fechaHasta.toLocaleDateString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Resumen Ejecutivo
        doc.setFontSize(14);
        doc.text('RESUMEN EJECUTIVO', 14, yPos);
        yPos += 8;

        const totalIngresos = carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        const totalGastos = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
        const baseImponibleGastos = gastos.reduce((sum, g) => sum + (g.baseImponible || g.importe || 0), 0);
        const totalIVAGastos = gastos.reduce((sum, g) => sum + (g.ivaImporte || 0), 0);
        const balance = totalIngresos - totalGastos;

        doc.setFontSize(10);
        doc.text(`Total Ingresos: ${totalIngresos.toFixed(2)} €`, 14, yPos);
        yPos += 6;
        doc.text(`Total Gastos: ${totalGastos.toFixed(2)} €`, 14, yPos);
        yPos += 6;
        doc.text(`Base Imponible (Gastos): ${baseImponibleGastos.toFixed(2)} €`, 14, yPos);
        yPos += 6;
        doc.text(`IVA (Gastos): ${totalIVAGastos.toFixed(2)} €`, 14, yPos);
        yPos += 6;
        doc.text(`Balance Neto: ${balance.toFixed(2)} €`, 14, yPos);
        yPos += 10;

        // INGRESOS
        if (filtros.tipo === 'ingresos' || filtros.tipo === 'todos') {
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.text('DETALLE DE INGRESOS', 14, yPos);
            yPos += 8;

            if (carreras.length > 0) {
                const ingresosData = carreras.map(c => {
                    const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                    return [
                        fecha.toLocaleDateString('es-ES'),
                        fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                        c.taximetro?.toFixed(2) || '0.00',
                        c.cobrado?.toFixed(2) || '0.00',
                        c.formaPago || 'N/A',
                        c.emisora ? 'Sí' : 'No',
                        c.aeropuerto ? 'Sí' : 'No'
                    ];
                });

                // Usar autoTable - en versión 5.x se usa como función
                // @ts-ignore
                if (typeof autoTableModule.default === 'function') {
                    // @ts-ignore
                    autoTableModule.default(doc, {
                        startY: yPos,
                        head: [['Fecha', 'Hora', 'Taxímetro', 'Cobrado', 'Forma Pago', 'Emisora', 'Aeropuerto']],
                        body: ingresosData,
                        theme: 'striped',
                        headStyles: { fillColor: [0, 150, 200], textColor: 255, fontStyle: 'bold' },
                        styles: { fontSize: 8 },
                        margin: { left: 14, right: 14 }
                    });
                } else {
                    // Fallback: usar doc.autoTable si está disponible
                    // @ts-ignore
                    doc.autoTable({
                        startY: yPos,
                        head: [['Fecha', 'Hora', 'Taxímetro', 'Cobrado', 'Forma Pago', 'Emisora', 'Aeropuerto']],
                        body: ingresosData,
                        theme: 'striped',
                        headStyles: { fillColor: [0, 150, 200], textColor: 255, fontStyle: 'bold' },
                        styles: { fontSize: 8 },
                        margin: { left: 14, right: 14 }
                    });
                }

                yPos = (doc as any).lastAutoTable.finalY + 10;

                // Resumen de ingresos por forma de pago
                const ingresosPorFormaPago: { [key: string]: number } = {};
                carreras.forEach(c => {
                    const forma = c.formaPago || 'Sin especificar';
                    ingresosPorFormaPago[forma] = (ingresosPorFormaPago[forma] || 0) + (c.cobrado || 0);
                });

                doc.setFontSize(12);
                doc.text('Resumen por Forma de Pago:', 14, yPos);
                yPos += 6;
                doc.setFontSize(10);
                Object.entries(ingresosPorFormaPago).forEach(([forma, total]) => {
                    doc.text(`${forma}: ${total.toFixed(2)} €`, 20, yPos);
                    yPos += 5;
                });
                yPos += 5;
            } else {
                doc.setFontSize(10);
                doc.text('No hay ingresos en el período seleccionado', 14, yPos);
                yPos += 10;
            }
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
                // Formato especial para gastos de vehículo (Solo Gastos + Vehículo)
                if (filtros.gastosFiltro === 'vehiculo' && filtros.tipo === 'gastos') {
                    // Crear estructura de datos: fila principal + filas de servicios
                    const tableData: any[] = [];
                    
                    gastos.forEach(g => {
                        const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                        const base = (g.baseImponible || g.importe || 0);
                        const ivaPorcentaje = g.ivaPorcentaje || 0;
                        const ivaImporte = g.ivaImporte || 0;
                        const total = g.importe || 0;
                        
                        // Fila principal del gasto (todas las columnas llenas)
                        tableData.push([
                            fecha.toLocaleDateString('es-ES'),
                            g.taller || 'Sin taller',
                            g.numeroFactura || 'Sin factura',
                            g.formaPago || 'N/A',
                            g.kilometrosVehiculo ? g.kilometrosVehiculo.toFixed(0) : 'N/A',
                            base.toFixed(2),
                            `${ivaPorcentaje}%`,
                            ivaImporte.toFixed(2),
                            total.toFixed(2)
                        ]);
                        
                        // Filas de servicios (columnas principales vacías, detalles en columnas correspondientes)
                        if (g.servicios && Array.isArray(g.servicios) && g.servicios.length > 0) {
                            // Agregar fila de encabezado de servicios
                            tableData.push([
                                '', // Fecha vacía
                                'Servicio', // Encabezado en columna Taller
                                'Referencia', // Encabezado en columna Nº Factura
                                'Cant.', // Encabezado en columna Forma Pago
                                '', // Km Vehiculo vacío
                                '', // Base vacía
                                'Precio', // Encabezado en columna IVA %
                                '', // IVA € vacío
                                'Total' // Encabezado en columna Total
                            ]);
                            
                            g.servicios.forEach((s: any) => {
                                const servicioDesc = s.descripcion || 'Sin descripción';
                                const referencia = s.referencia || '';
                                const cantidad = s.cantidad || 1;
                                const precio = s.precio || s.importe || 0;
                                const totalServicio = s.importe || (precio * cantidad);
                                
                                // Fila de servicio: columnas principales vacías, detalles en columnas correspondientes
                                tableData.push([
                                    '', // Fecha vacía
                                    servicioDesc, // Servicio en columna Taller
                                    referencia, // Referencia en columna Nº Factura
                                    cantidad.toString(), // Cant. en columna Forma Pago
                                    '', // Km Vehiculo vacío
                                    '', // Base vacía
                                    precio.toFixed(2), // Precio en columna IVA %
                                    '', // IVA € vacío
                                    totalServicio.toFixed(2) // Total del servicio en columna Total
                                ]);
                            });
                        }
                    });
                    
                    // Usar autoTable con formato especial
                    // @ts-ignore
                    if (typeof autoTableModule.default === 'function') {
                        // @ts-ignore
                        autoTableModule.default(doc, {
                            startY: yPos,
                            head: [
                                ['Fecha', 'Taller', 'Nº Factura', 'Forma Pago', 'Km Vehiculo', 'Base', 'IVA %', 'IVA €', 'Total']
                            ],
                            body: tableData,
                            theme: 'striped',
                            headStyles: { fillColor: [200, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                            styles: { fontSize: 7, cellPadding: 2 },
                            margin: { left: 10, right: 10 },
                            columnStyles: {
                                0: { cellWidth: 18 }, // Fecha
                                1: { cellWidth: 35 }, // Taller / Servicio
                                2: { cellWidth: 25 }, // Nº Factura / Referencia
                                3: { cellWidth: 20 }, // Forma Pago / Cant.
                                4: { cellWidth: 18 }, // Km Vehiculo
                                5: { cellWidth: 18 }, // Base
                                6: { cellWidth: 12 }, // IVA % / Precio
                                7: { cellWidth: 15 }, // IVA €
                                8: { cellWidth: 18 }  // Total
                            },
                            didParseCell: (data: any) => {
                                const row = tableData[data.row.index];
                                if (!row) return;
                                
                                // Estilo para filas principales (con fecha)
                                if (row[0] !== '' && row[1] !== 'Servicio') {
                                    data.cell.styles.fontStyle = 'bold';
                                }
                                // Estilo para fila de encabezado de servicios
                                else if (row[1] === 'Servicio') {
                                    data.cell.styles.fontStyle = 'bold';
                                    data.cell.styles.fillColor = [230, 230, 230];
                                    data.cell.styles.textColor = [100, 100, 100];
                                }
                                // Estilo para filas de servicio (sin fecha y no es encabezado)
                                else if (row[0] === '' && row[1] !== 'Servicio') {
                                    data.cell.styles.fillColor = [250, 250, 250];
                                    data.cell.styles.fontStyle = 'normal';
                                }
                                // Asegurar que el texto se muestre correctamente
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
                            head: [
                                ['Fecha', 'Taller', 'Nº Factura', 'Forma Pago', 'Km Vehiculo', 'Base', 'IVA %', 'IVA €', 'Total']
                            ],
                            body: tableData,
                            theme: 'striped',
                            headStyles: { fillColor: [200, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                            styles: { fontSize: 7, cellPadding: 2 },
                            margin: { left: 10, right: 10 },
                            columnStyles: {
                                0: { cellWidth: 18 },
                                1: { cellWidth: 35 },
                                2: { cellWidth: 25 },
                                3: { cellWidth: 20 },
                                4: { cellWidth: 18 },
                                5: { cellWidth: 18 },
                                6: { cellWidth: 12 },
                                7: { cellWidth: 15 },
                                8: { cellWidth: 18 }
                            },
                            didParseCell: (data: any) => {
                                const row = tableData[data.row.index];
                                if (!row) return;
                                
                                // Estilo para filas principales (con fecha)
                                if (row[0] !== '' && row[1] !== 'Servicio') {
                                    data.cell.styles.fontStyle = 'bold';
                                }
                                // Estilo para fila de encabezado de servicios
                                else if (row[1] === 'Servicio') {
                                    data.cell.styles.fontStyle = 'bold';
                                    data.cell.styles.fillColor = [230, 230, 230];
                                    data.cell.styles.textColor = [100, 100, 100];
                                }
                                // Estilo para filas de servicio (sin fecha y no es encabezado)
                                else if (row[0] === '' && row[1] !== 'Servicio') {
                                    data.cell.styles.fillColor = [250, 250, 250];
                                    data.cell.styles.fontStyle = 'normal';
                                }
                                if (data.cell.text && data.cell.text.length > 0) {
                                    data.cell.text = String(data.cell.text);
                                }
                            }
                        });
                    }
                } else {
                    // Formato normal para otros filtros
                    const gastosData = gastos.map(g => {
                        const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                        
                        // Formatear servicios si existen
                        let serviciosTexto = 'N/A';
                        if (g.servicios && Array.isArray(g.servicios) && g.servicios.length > 0) {
                            serviciosTexto = g.servicios.map((s: any) => {
                                const partes = [];
                                if (s.descripcion) partes.push(s.descripcion);
                                if (s.referencia) partes.push(`Ref: ${s.referencia}`);
                                if (s.cantidad) partes.push(`Cant: ${s.cantidad}`);
                                if (s.importe) partes.push(`${s.importe.toFixed(2)}€`);
                                return partes.join(' | ');
                            }).join('; ');
                        }
                        
                        // Columnas solicitadas: Fecha, Taller, Nº Factura, Base Imp., IVA %, IVA €, Total, Forma Pago, Km. Vehiculo, Servicio
                        return [
                            fecha.toLocaleDateString('es-ES'),
                            g.taller || 'Sin taller',
                            g.numeroFactura || 'Sin factura',
                            (g.baseImponible || g.importe || 0).toFixed(2),
                            g.ivaPorcentaje ? `${g.ivaPorcentaje}%` : '0%',
                            (g.ivaImporte || 0).toFixed(2),
                            g.importe?.toFixed(2) || '0.00',
                            g.formaPago || 'N/A',
                            g.kilometrosVehiculo ? g.kilometrosVehiculo.toFixed(0) : 'N/A',
                            serviciosTexto
                        ];
                    });

                // Usar autoTable - en versión 5.x se usa como función
                // @ts-ignore
                if (typeof autoTableModule.default === 'function') {
                    // @ts-ignore
                    autoTableModule.default(doc, {
                        startY: yPos,
                        head: [['Fecha', 'Taller', 'Nº Factura', 'Base Imp.', 'IVA %', 'IVA €', 'Total', 'Forma Pago', 'Km. Vehiculo', 'Servicio']],
                        body: gastosData,
                        theme: 'striped',
                        headStyles: { fillColor: [200, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                        styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak', cellWidth: 'wrap' },
                        margin: { left: 10, right: 10 },
                        columnStyles: {
                            0: { cellWidth: 13 },
                            1: { cellWidth: 35 },
                            2: { cellWidth: 30 },
                            3: { cellWidth: 10 },
                            4: { cellWidth: 10 },
                            5: { cellWidth: 10 },
                            6: { cellWidth: 10 },
                            7: { cellWidth: 12 },
                            8: { cellWidth: 12 },
                            9: { cellWidth: 70 }
                        },
                        didParseCell: (data: any) => {
                            // Asegurar que el texto se muestre correctamente
                            if (data.cell.text && data.cell.text.length > 0) {
                                data.cell.text = String(data.cell.text);
                            }
                        }
                    });
                } else {
                    // Fallback: usar doc.autoTable si está disponible
                    // @ts-ignore
                    doc.autoTable({
                        startY: yPos,
                        head: [['Fecha', 'Taller', 'Nº Factura', 'Base Imp.', 'IVA %', 'IVA €', 'Total', 'Forma Pago', 'Km. Vehiculo', 'Servicio']],
                        body: gastosData,
                        theme: 'striped',
                        headStyles: { fillColor: [200, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                        styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak', cellWidth: 'wrap' },
                        margin: { left: 10, right: 10 },
                        columnStyles: {
                            0: { cellWidth: 25 },
                            1: { cellWidth: 40 },
                            2: { cellWidth: 30 },
                            3: { cellWidth: 22 },
                            4: { cellWidth: 15 },
                            5: { cellWidth: 18 },
                            6: { cellWidth: 22 },
                            7: { cellWidth: 25 },
                            8: { cellWidth: 20 },
                            9: { cellWidth: 70 }
                        },
                        didParseCell: (data: any) => {
                            // Asegurar que el texto se muestre correctamente
                            if (data.cell.text && data.cell.text.length > 0) {
                                data.cell.text = String(data.cell.text);
                            }
                        }
                    });
                }
                }

                yPos = (doc as any).lastAutoTable.finalY + 10;

                // Resumen de gastos por proveedor
                const gastosPorProveedor: { [key: string]: number } = {};
                gastos.forEach(g => {
                    const proveedor = g.proveedor || 'Sin proveedor';
                    gastosPorProveedor[proveedor] = (gastosPorProveedor[proveedor] || 0) + (g.importe || 0);
                });

                doc.setFontSize(12);
                doc.text('Resumen por Proveedor:', 14, yPos);
                yPos += 6;
                doc.setFontSize(10);
                Object.entries(gastosPorProveedor)
                    .sort((a, b) => b[1] - a[1])
                    .forEach(([proveedor, total]) => {
                        doc.text(`${proveedor}: ${total.toFixed(2)} €`, 20, yPos);
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
                                        value={filtros.concepto || ''}
                                        onChange={(e) => setFiltros({ ...filtros, concepto: e.target.value })}
                                        placeholder="Buscar por concepto..."
                                        className="w-full bg-zinc-800 border-2 border-green-500 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-green-400"
                                    />
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
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generando...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
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

