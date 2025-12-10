
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
        fecha: new Date('2025-12-02'),
        importe: 50,
        concepto: 'Combustible',
        litros: 30,
        formaPago: 'Tarjeta'
    }
];

const testCustomReport = () => {
    console.log('Testing Custom Activity Report Data Formatting...');

    const gastosData = gastos.map(g => {
        const fecha = g.fecha;

        return [
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
        ];
    });

    console.log('Formatted Rows:');
    gastosData.forEach(row => console.log(JSON.stringify(row)));
};

testCustomReport();
