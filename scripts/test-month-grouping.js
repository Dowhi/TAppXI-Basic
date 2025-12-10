
const gastos = [
    {
        id: '1',
        fecha: new Date('2025-12-01'),
        importe: 100,
        proveedor: 'Papeleria',
        concepto: 'Material',
        numeroFactura: 'F-001',
        formaPago: 'Efectivo',
        baseImponible: 82.64,
        ivaPorcentaje: 21,
        ivaImporte: 17.36,
        notas: 'Compra mensual'
    },
    {
        id: '2',
        fecha: new Date('2025-01-15'),
        importe: 50,
        concepto: 'Combustible',
        litros: 30,
        formaPago: 'Tarjeta'
    },
    {
        id: '3',
        fecha: new Date('2025-01-20'),
        importe: 20,
        concepto: 'Café',
        formaPago: 'Efectivo'
    }
];

const testMonthGrouping = () => {
    console.log('Testing Month Grouping Logic...');

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const gastosPorMes = {};

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

    const tableBody = [];

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
            tableBody.push([
                fecha.toLocaleDateString('es-ES'),
                g.importe?.toFixed(2) || '0.00',
                g.proveedor || 'Sin proveedor',
                g.concepto || 'Sin concepto',
                g.numeroFactura || 'Sin factura',
                g.formaPago || 'N/A',
                (g.baseImponible || g.importe || 0).toFixed(2),
                g.ivaPorcentaje ? `${g.ivaPorcentaje}%` : '0%',
                (g.ivaImporte || 0).toFixed(2),
                g.kilometros ? g.kilometros.toFixed(0) : 'N/A',
                g.notas || ''
            ]);
        });
    });

    console.log('Table Body Structure:');
    tableBody.forEach(row => {
        if (row[0] && row[0].content) {
            console.log(`[HEADER] ${row[0].content}`);
        } else {
            console.log(`[DATA] ${JSON.stringify(row)}`);
        }
    });
};

testMonthGrouping();
