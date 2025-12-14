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

const getBase64ImageFromURL = (url: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                try {
                    const dataURL = canvas.toDataURL("image/jpeg");
                    resolve(dataURL);
                } catch (e) {
                    // CORS taint error most likely
                    console.warn("Could not get base64 data due to CORS:", e);
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };
        img.onerror = (error) => {
            console.warn("Failed to load image:", url, error);
            resolve(null);
        };
    });
};

const processLogo = async (logoInput: string | null): Promise<string | null> => {
    if (!logoInput) return null;

    // Si ya es base64, devolverlo
    if (logoInput.startsWith('data:image')) return logoInput;

    // Manejo de Google Drive
    // Formatos comunes:
    // https://drive.google.com/file/d/ID/view
    // https://drive.google.com/open?id=ID
    let directUrl = logoInput;
    const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([^/?&]+)/;
    const match = logoInput.match(driveRegex);

    if (match && match[1]) {
        // Convertir a link directo de visualización
        // Opción 1: UC (User Content) - a veces tiene limites
        // directUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
        // Opción 2: Thumbnail API (más permisiva con CORS a veces y más rápida)
        directUrl = `https://lh3.googleusercontent.com/d/${match[1]}=s200`;
        // Nota: =s200 pide ancho 200px.
    }

    try {
        const base64 = await getBase64ImageFromURL(directUrl);
        return base64;
    } catch (e) {
        console.error("Error processing logo:", e);
        return null;
    }
};

/**
 * Exporta datos a PDF con formato profesional mejorado
 */
export const exportToPDFAdvanced = async (
    data: ExportData,
    filters: ExportFilter,
    filename?: string
): Promise<void> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Branding
    const logoInput = localStorage.getItem('branding_logo');
    const fiscalDataStr = localStorage.getItem('branding_datosFiscales');
    const fiscalData = fiscalDataStr ? JSON.parse(fiscalDataStr) : null;
    let headerHeight = 40;

    // Procesar Logo (Async)
    const logoBase64 = await processLogo(logoInput);

    // Renderizar Logo
    if (logoBase64) {
        try {
            // Add image (x, y, w, h)
            doc.addImage(logoBase64, 'JPEG', 14, 10, 25, 25);
        } catch (e) {
            console.error('Error adding logo to PDF:', e);
        }
    }

    // Header Text (Right aligned if logo exists, or Center if not, but standardizing to Right for pro look)
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');

    // Title
    const titleX = pageWidth - 14;
    doc.text('TAppXI', titleX, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Informe Profesional', titleX, 25, { align: 'right' });

    // Fiscal Data
    if (fiscalData) {
        let fiscalY = 35;
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        if (fiscalData.nombre) {
            doc.setFont(undefined, 'bold');
            doc.text(fiscalData.nombre, titleX, fiscalY, { align: 'right' });
            doc.setFont(undefined, 'normal');
            fiscalY += 4;
        }
        if (fiscalData.nif) {
            doc.text(`NIF: ${fiscalData.nif}`, titleX, fiscalY, { align: 'right' });
            fiscalY += 4;
        }
        if (fiscalData.direccion) {
            doc.text(fiscalData.direccion, titleX, fiscalY, { align: 'right' });
            fiscalY += 4;
        }
        if (fiscalData.telefono || fiscalData.email) {
            doc.text(`${fiscalData.telefono || ''} ${fiscalData.email ? '· ' + fiscalData.email : ''}`, titleX, fiscalY, { align: 'right' });
            headerHeight = Math.max(headerHeight, fiscalY + 10);
        }
    }

    yPos = headerHeight + 5;

    // Period Info
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    if (filters.fechaDesde && filters.fechaHasta) {
        doc.text(
            `Período: ${filters.fechaDesde.toLocaleDateString('es-ES')} - ${filters.fechaHasta.toLocaleDateString('es-ES')}`,
            14,
            headerHeight,
            { align: 'left' }
        );
    }

    // Date Generated
    doc.setFontSize(8);
    doc.text(
        `Generado: ${new Date().toLocaleDateString('es-ES')}`,
        14,
        headerHeight + 4,
        { align: 'left' }
    );
    yPos += 10;

    // Resumen Ejecutivo
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN EJECUTIVO', 14, yPos);
    yPos += 10;

    // Calcular totales si no están pre-calculados
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

/**
 * Exporta datos a Excel con formato específico para Hacienda (declaración de impuestos)
 * Formato optimizado para autónomos en España
 */
export const exportToHacienda = (
    data: ExportData,
    filters: ExportFilter,
    filename?: string
): void => {
    const workbook = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split('T')[0];
    const year = filters.fechaDesde?.getFullYear() || new Date().getFullYear();

    // ========== HOJA 1: RESUMEN FISCAL ==========
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Calcular ingresos y gastos por mes
    const resumenMensual: Array<{
        Mes: string;
        'Ingresos (€)': number;
        'Gastos Deducibles (€)': number;
        'Base Imponible Gastos (€)': number;
        'IVA Soportado (€)': number;
        'Rendimiento Neto (€)': number;
        'Nº Carreras': number;
        'Nº Gastos': number;
    }> = [];

    for (let mes = 0; mes < 12; mes++) {
        const fechaInicioMes = new Date(year, mes, 1);
        const fechaFinMes = new Date(year, mes + 1, 0, 23, 59, 59);

        // Filtrar carreras del mes
        const carrerasMes = (data.carreras || []).filter(c => {
            const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
            return fecha >= fechaInicioMes && fecha <= fechaFinMes;
        });

        // Filtrar gastos del mes
        const gastosMes = (data.gastos || []).filter(g => {
            const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
            return fecha >= fechaInicioMes && fecha <= fechaFinMes;
        });

        const ingresosMes = carrerasMes.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        const gastosMesTotal = gastosMes.reduce((sum, g) => sum + (g.importe || 0), 0);
        const baseImponibleGastos = gastosMes.reduce((sum, g) => sum + (g.baseImponible || g.importe || 0), 0);
        const ivaSoportado = gastosMes.reduce((sum, g) => sum + (g.ivaImporte || 0), 0);
        const rendimientoNeto = ingresosMes - gastosMesTotal;

        resumenMensual.push({
            Mes: meses[mes],
            'Ingresos (€)': ingresosMes,
            'Gastos Deducibles (€)': gastosMesTotal,
            'Base Imponible Gastos (€)': baseImponibleGastos,
            'IVA Soportado (€)': ivaSoportado,
            'Rendimiento Neto (€)': rendimientoNeto,
            'Nº Carreras': carrerasMes.length,
            'Nº Gastos': gastosMes.length,
        });
    }

    // Totales anuales
    const totalIngresos = resumenMensual.reduce((sum, r) => sum + r['Ingresos (€)'], 0);
    const totalGastos = resumenMensual.reduce((sum, r) => sum + r['Gastos Deducibles (€)'], 0);
    const totalBaseImponible = resumenMensual.reduce((sum, r) => sum + r['Base Imponible Gastos (€)'], 0);
    const totalIVASoportado = resumenMensual.reduce((sum, r) => sum + r['IVA Soportado (€)'], 0);
    const rendimientoNetoAnual = totalIngresos - totalGastos;

    resumenMensual.push({
        Mes: 'TOTAL ANUAL',
        'Ingresos (€)': totalIngresos,
        'Gastos Deducibles (€)': totalGastos,
        'Base Imponible Gastos (€)': totalBaseImponible,
        'IVA Soportado (€)': totalIVASoportado,
        'Rendimiento Neto (€)': rendimientoNetoAnual,
        'Nº Carreras': (data.carreras || []).length,
        'Nº Gastos': (data.gastos || []).length,
    });

    const wsResumen = XLSX.utils.json_to_sheet(resumenMensual);
    wsResumen['!cols'] = [
        { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 22 },
        { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Fiscal');

    // ========== HOJA 2: INGRESOS DETALLADOS ==========
    if (data.carreras && data.carreras.length > 0) {
        const ingresosData = data.carreras.map(c => {
            const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
            return {
                'Fecha': fecha.toLocaleDateString('es-ES'),
                'Mes': meses[fecha.getMonth()],
                'Hora': fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                'Ingreso (€)': c.cobrado || 0,
                'Taxímetro (€)': c.taximetro || 0,
                'Forma de Pago': c.formaPago || '',
                'Tipo': c.tipoCarrera || 'Urbana',
                'Emisora': c.emisora ? 'Sí' : 'No',
                'Aeropuerto': c.aeropuerto ? 'Sí' : 'No',
                'Estación': c.estacion ? 'Sí' : 'No',
            };
        });

        const wsIngresos = XLSX.utils.json_to_sheet(ingresosData);
        wsIngresos['!cols'] = [
            { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
            { wch: 14 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }
        ];
        XLSX.utils.book_append_sheet(workbook, wsIngresos, 'Ingresos Detallados');
    }

    // ========== HOJA 3: GASTOS DEDUCIBLES ==========
    if (data.gastos && data.gastos.length > 0) {
        const gastosData = data.gastos.map(g => {
            const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
            return {
                'Fecha': fecha.toLocaleDateString('es-ES'),
                'Mes': meses[fecha.getMonth()],
                'Concepto': g.concepto || '',
                'Proveedor': g.proveedor || '',
                'NIF Proveedor': '', // Campo para completar manualmente si es necesario
                'Nº Factura': g.numeroFactura || '',
                'Base Imponible (€)': g.baseImponible || g.importe || 0,
                'IVA %': g.ivaPorcentaje || 0,
                'IVA (€)': g.ivaImporte || 0,
                'Total (€)': g.importe || 0,
                'Forma de Pago': g.formaPago || '',
                'Kilómetros': g.kilometros || 0,
                'Deducible': 'Sí', // Todos los gastos registrados se consideran deducibles
            };
        });

        const wsGastos = XLSX.utils.json_to_sheet(gastosData);
        wsGastos['!cols'] = [
            { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 },
            { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 8 },
            { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 12 },
            { wch: 10 }
        ];
        XLSX.utils.book_append_sheet(workbook, wsGastos, 'Gastos Deducibles');
    }

    // ========== HOJA 4: INFORMACIÓN FISCAL ==========
    const infoFiscal = [
        { 'Concepto': 'Año Fiscal', 'Valor': year.toString() },
        { 'Concepto': 'Fecha de Generación', 'Valor': new Date().toLocaleDateString('es-ES') },
        { 'Concepto': 'Período Desde', 'Valor': filters.fechaDesde?.toLocaleDateString('es-ES') || 'N/A' },
        { 'Concepto': 'Período Hasta', 'Valor': filters.fechaHasta?.toLocaleDateString('es-ES') || 'N/A' },
        { 'Concepto': '', 'Valor': '' },
        { 'Concepto': 'TOTAL INGRESOS ANUALES', 'Valor': `${totalIngresos.toFixed(2)} €` },
        { 'Concepto': 'TOTAL GASTOS DEDUCIBLES', 'Valor': `${totalGastos.toFixed(2)} €` },
        { 'Concepto': 'BASE IMPONIBLE GASTOS', 'Valor': `${totalBaseImponible.toFixed(2)} €` },
        { 'Concepto': 'IVA SOPORTADO', 'Valor': `${totalIVASoportado.toFixed(2)} €` },
        { 'Concepto': 'RENDIMIENTO NETO', 'Valor': `${rendimientoNetoAnual.toFixed(2)} €` },
        { 'Concepto': '', 'Valor': '' },
        { 'Concepto': 'NOTAS IMPORTANTES', 'Valor': '' },
        { 'Concepto': '', 'Valor': '1. Los ingresos de taxistas NO están sujetos a IVA (Régimen Especial)' },
        { 'Concepto': '', 'Valor': '2. El IVA soportado en gastos puede deducirse según normativa vigente' },
        { 'Concepto': '', 'Valor': '3. Verificar que todos los gastos sean deducibles según tu actividad' },
        { 'Concepto': '', 'Valor': '4. Completar NIF de proveedores si es necesario para la declaración' },
        { 'Concepto': '', 'Valor': '5. Este documento es una ayuda, consulta con tu asesor fiscal' },
    ];

    const wsInfo = XLSX.utils.json_to_sheet(infoFiscal);
    wsInfo['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, wsInfo, 'Información Fiscal');

    // Generar archivo
    const finalFilename = filename || `TAppXI_Hacienda_${year}_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, finalFilename);
};


