import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
// @ts-ignore
import * as autoTableModule from 'jspdf-autotable';
import { CarreraVista, Gasto, Turno } from '../types';

export interface ExportFilter {
    fechaDesde?: Date;
    fechaHasta?: Date;
    tipo?: 'todos' | 'ingresos' | 'gastos' | 'turnos';
    formaPago?: string;
    proveedor?: string;
    concepto?: string;
    taller?: string;
}

export interface ExportData {
    carreras?: CarreraVista[];
    gastos?: Gasto[];
    turnos?: Turno[];
}

/**
 * Exporta datos a Excel con formato profesional
 */
export const exportToExcel = (
    data: ExportData,
    filters: ExportFilter,
    filename?: string
): void => {
    const workbook = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split('T')[0];

    // Hoja de Carreras
    if (data.carreras && data.carreras.length > 0) {
        const carrerasData = data.carreras.map(c => ({
            'Fecha': c.fechaHora instanceof Date 
                ? c.fechaHora.toLocaleDateString('es-ES') 
                : new Date(c.fechaHora).toLocaleDateString('es-ES'),
            'Hora': c.fechaHora instanceof Date 
                ? c.fechaHora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : new Date(c.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            'Taxímetro (€)': c.taximetro || 0,
            'Cobrado (€)': c.cobrado || 0,
            'Forma de Pago': c.formaPago || '',
            'Tipo de Carrera': c.tipoCarrera || 'Urbana',
            'Emisora': c.emisora ? 'Sí' : 'No',
            'Aeropuerto': c.aeropuerto ? 'Sí' : 'No',
            'Estación': c.estacion ? 'Sí' : 'No',
            'Notas': c.notas || '',
        }));

        const wsCarreras = XLSX.utils.json_to_sheet(carrerasData);
        
        // Ajustar anchos de columna
        wsCarreras['!cols'] = [
            { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
            { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 30 }
        ];

        XLSX.utils.book_append_sheet(workbook, wsCarreras, 'Carreras');
    }

    // Hoja de Gastos
    if (data.gastos && data.gastos.length > 0) {
        const gastosData = data.gastos.map(g => ({
            'Fecha': g.fecha instanceof Date 
                ? g.fecha.toLocaleDateString('es-ES')
                : new Date(g.fecha).toLocaleDateString('es-ES'),
            'Concepto': g.concepto || '',
            'Proveedor': g.proveedor || '',
            'Taller': g.taller || '',
            'Base Imponible (€)': g.baseImponible || g.importe || 0,
            'IVA %': g.ivaPorcentaje || 0,
            'IVA (€)': g.ivaImporte || 0,
            'Total (€)': g.importe || 0,
            'Nº Factura': g.numeroFactura || '',
            'Forma de Pago': g.formaPago || '',
            'Kilómetros': g.kilometros || 0,
            'Notas': g.notas || '',
        }));

        const wsGastos = XLSX.utils.json_to_sheet(gastosData);
        
        // Ajustar anchos de columna
        wsGastos['!cols'] = [
            { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
            { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 30 }
        ];

        XLSX.utils.book_append_sheet(workbook, wsGastos, 'Gastos');
    }

    // Hoja de Turnos
    if (data.turnos && data.turnos.length > 0) {
        const turnosData = data.turnos.map(t => ({
            'Fecha Inicio': t.fechaInicio instanceof Date
                ? t.fechaInicio.toLocaleDateString('es-ES')
                : new Date(t.fechaInicio).toLocaleDateString('es-ES'),
            'Hora Inicio': t.fechaInicio instanceof Date
                ? t.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : new Date(t.fechaInicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            'Km Inicio': t.kilometrosInicio || 0,
            'Fecha Fin': t.fechaFin 
                ? (t.fechaFin instanceof Date 
                    ? t.fechaFin.toLocaleDateString('es-ES')
                    : new Date(t.fechaFin).toLocaleDateString('es-ES'))
                : '',
            'Hora Fin': t.fechaFin
                ? (t.fechaFin instanceof Date
                    ? t.fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : new Date(t.fechaFin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
                : '',
            'Km Fin': t.kilometrosFin || '',
            'Km Recorridos': t.kilometrosFin && t.kilometrosInicio 
                ? (t.kilometrosFin - t.kilometrosInicio)
                : '',
        }));

        const wsTurnos = XLSX.utils.json_to_sheet(turnosData);
        
        // Ajustar anchos de columna
        wsTurnos['!cols'] = [
            { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
            { wch: 8 }, { wch: 10 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(workbook, wsTurnos, 'Turnos');
    }

    // Hoja de Resumen
    const resumenData = [{
        'Total Ingresos (€)': data.carreras?.reduce((sum, c) => sum + (c.cobrado || 0), 0) || 0,
        'Total Gastos (€)': data.gastos?.reduce((sum, g) => sum + (g.importe || 0), 0) || 0,
        'Balance Neto (€)': (data.carreras?.reduce((sum, c) => sum + (c.cobrado || 0), 0) || 0) - 
                            (data.gastos?.reduce((sum, g) => sum + (g.importe || 0), 0) || 0),
        'Total IVA Gastos (€)': data.gastos?.reduce((sum, g) => sum + (g.ivaImporte || 0), 0) || 0,
        'Período Desde': filters.fechaDesde?.toLocaleDateString('es-ES') || '',
        'Período Hasta': filters.fechaHasta?.toLocaleDateString('es-ES') || '',
        'Fecha Exportación': new Date().toLocaleDateString('es-ES'),
    }];

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

    // Generar archivo
    const finalFilename = filename || `TAppXI_Export_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, finalFilename);
};

/**
 * Exporta datos a CSV
 */
export const exportToCSV = (
    data: ExportData,
    filters: ExportFilter,
    filename?: string
): void => {
    const dateStr = new Date().toISOString().split('T')[0];
    const lines: string[] = [];

    // Encabezado
    lines.push('TAppXI - Exportación de Datos');
    lines.push(`Fecha de exportación: ${new Date().toLocaleDateString('es-ES')}`);
    lines.push(`Período: ${filters.fechaDesde?.toLocaleDateString('es-ES') || 'N/A'} - ${filters.fechaHasta?.toLocaleDateString('es-ES') || 'N/A'}`);
    lines.push('');

    // Carreras
    if (data.carreras && data.carreras.length > 0) {
        lines.push('=== CARRERAS ===');
        lines.push('Fecha,Hora,Taxímetro,Cobrado,Forma Pago,Tipo Carrera,Emisora,Aeropuerto,Estación');
        data.carreras.forEach(c => {
            const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
            lines.push([
                fecha.toLocaleDateString('es-ES'),
                fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                (c.taximetro || 0).toFixed(2),
                (c.cobrado || 0).toFixed(2),
                c.formaPago || '',
                c.tipoCarrera || 'Urbana',
                c.emisora ? 'Sí' : 'No',
                c.aeropuerto ? 'Sí' : 'No',
                c.estacion ? 'Sí' : 'No',
            ].join(','));
        });
        lines.push('');
    }

    // Gastos
    if (data.gastos && data.gastos.length > 0) {
        lines.push('=== GASTOS ===');
        lines.push('Fecha,Concepto,Proveedor,Base Imponible,IVA %,IVA,Total,Nº Factura,Forma Pago');
        data.gastos.forEach(g => {
            const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
            lines.push([
                fecha.toLocaleDateString('es-ES'),
                (g.concepto || '').replace(/,/g, ';'),
                (g.proveedor || '').replace(/,/g, ';'),
                (g.baseImponible || g.importe || 0).toFixed(2),
                (g.ivaPorcentaje || 0).toString(),
                (g.ivaImporte || 0).toFixed(2),
                (g.importe || 0).toFixed(2),
                (g.numeroFactura || '').replace(/,/g, ';'),
                g.formaPago || '',
            ].join(','));
        });
        lines.push('');
    }

    // Resumen
    const totalIngresos = data.carreras?.reduce((sum, c) => sum + (c.cobrado || 0), 0) || 0;
    const totalGastos = data.gastos?.reduce((sum, g) => sum + (g.importe || 0), 0) || 0;
    lines.push('=== RESUMEN ===');
    lines.push(`Total Ingresos,${totalIngresos.toFixed(2)}`);
    lines.push(`Total Gastos,${totalGastos.toFixed(2)}`);
    lines.push(`Balance Neto,${(totalIngresos - totalGastos).toFixed(2)}`);

    // Descargar
    const csvContent = lines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `TAppXI_Export_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Exporta datos a PDF con formato profesional mejorado
 */
export const exportToPDFAdvanced = (
    data: ExportData,
    filters: ExportFilter,
    filename?: string
): void => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Encabezado mejorado
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('TAppXI - Informe Profesional', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    if (filters.fechaDesde && filters.fechaHasta) {
        doc.text(
            `Período: ${filters.fechaDesde.toLocaleDateString('es-ES')} - ${filters.fechaHasta.toLocaleDateString('es-ES')}`,
            pageWidth / 2,
            yPos,
            { align: 'center' }
        );
    }
    yPos += 6;
    doc.text(
        `Generado el: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth / 2,
        yPos,
        { align: 'center' }
    );
    yPos += 15;

    // Resumen Ejecutivo
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN EJECUTIVO', 14, yPos);
    yPos += 10;

    const totalIngresos = data.carreras?.reduce((sum, c) => sum + (c.cobrado || 0), 0) || 0;
    const totalGastos = data.gastos?.reduce((sum, g) => sum + (g.importe || 0), 0) || 0;
    const totalIVAGastos = data.gastos?.reduce((sum, g) => sum + (g.ivaImporte || 0), 0) || 0;
    const balance = totalIngresos - totalGastos;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Ingresos: ${totalIngresos.toFixed(2)} €`, 14, yPos);
    yPos += 7;
    doc.text(`Total Gastos: ${totalGastos.toFixed(2)} €`, 14, yPos);
    yPos += 7;
    doc.text(`IVA (Gastos): ${totalIVAGastos.toFixed(2)} €`, 14, yPos);
    yPos += 7;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 100, 0);
    doc.text(`Balance Neto: ${balance.toFixed(2)} €`, 14, yPos);
    yPos += 12;

    // Carreras
    if (data.carreras && data.carreras.length > 0) {
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('DETALLE DE INGRESOS', 14, yPos);
        yPos += 8;

        const ingresosData = data.carreras.map(c => {
            const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
            return [
                fecha.toLocaleDateString('es-ES'),
                fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                (c.taximetro || 0).toFixed(2),
                (c.cobrado || 0).toFixed(2),
                c.formaPago || 'N/A',
                c.tipoCarrera || 'Urbana',
            ];
        });

        // @ts-ignore
        const autoTable = autoTableModule.default || doc.autoTable;
        if (typeof autoTable === 'function') {
            autoTable(doc, {
                startY: yPos,
                head: [['Fecha', 'Hora', 'Taxímetro', 'Cobrado', 'Forma Pago', 'Tipo']],
                body: ingresosData,
                theme: 'striped',
                headStyles: { fillColor: [0, 150, 200], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // Gastos
    if (data.gastos && data.gastos.length > 0) {
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('DETALLE DE GASTOS', 14, yPos);
        yPos += 8;

        const gastosData = data.gastos.map(g => {
            const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
            return [
                fecha.toLocaleDateString('es-ES'),
                (g.concepto || 'Sin concepto').substring(0, 20),
                (g.proveedor || 'Sin proveedor').substring(0, 20),
                (g.baseImponible || g.importe || 0).toFixed(2),
                (g.ivaPorcentaje || 0).toString() + '%',
                (g.ivaImporte || 0).toFixed(2),
                (g.importe || 0).toFixed(2),
            ];
        });

        // @ts-ignore
        const autoTable = autoTableModule.default || doc.autoTable;
        if (typeof autoTable === 'function') {
            autoTable(doc, {
                startY: yPos,
                head: [['Fecha', 'Concepto', 'Proveedor', 'Base', 'IVA %', 'IVA €', 'Total']],
                body: gastosData,
                theme: 'striped',
                headStyles: { fillColor: [200, 0, 0], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 }
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
            `Página ${i} de ${totalPages} - TAppXI`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    // Guardar
    const finalFilename = filename || `TAppXI_Informe_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(finalFilename);
};


