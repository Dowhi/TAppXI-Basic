
const gastos = [
    { id: '1', concepto: 'Con IVA 21', ivaPorcentaje: 21 },
    { id: '2', concepto: 'Con IVA 10', ivaPorcentaje: 10 },
    { id: '3', concepto: 'Sin IVA (0)', ivaPorcentaje: 0 },
    { id: '4', concepto: 'Sin IVA (null)', ivaPorcentaje: null },
    { id: '5', concepto: 'Sin IVA (undefined)' },
    { id: '6', concepto: 'Con IVA string "21"', ivaPorcentaje: "21" }
];

const testIVAFilter = () => {
    console.log('Testing IVA Filter (Only > 0)...');

    const gastosFiltrados = gastos.filter(g => g.ivaPorcentaje != null && Number(g.ivaPorcentaje) > 0);

    console.log('Filtered Expenses:');
    gastosFiltrados.forEach(g => {
        console.log(`- ID ${g.id}: ${g.concepto} (IVA: ${g.ivaPorcentaje})`);
    });

    const excluded = gastos.filter(g => !(g.ivaPorcentaje != null && Number(g.ivaPorcentaje) > 0));
    console.log('\nExcluded Expenses:');
    excluded.forEach(g => {
        console.log(`- ID ${g.id}: ${g.concepto} (IVA: ${g.ivaPorcentaje})`);
    });
};

testIVAFilter();
