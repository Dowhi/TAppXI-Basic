import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, Proveedor, Concepto, Taller } from '../types';
import KineticHeader from '../components/KineticHeader';
import BackButton from '../components/BackButton';
import { addGasto, getProveedores, getConceptos, getTalleres, addProveedor, addConcepto, addTaller } from '../services/api';

// Icons
const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;
const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>;

// Local components for this screen's specific style
const FormCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 ${className}`}>
        <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
        {children}
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">{label}</label>
        {children}
    </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
    const { readOnly, ...rest } = props;
    return (
        <input 
            {...rest} 
            readOnly={readOnly}
            onChange={readOnly ? undefined : rest.onChange}
            className={`w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-500 ${readOnly ? 'bg-zinc-800 cursor-not-allowed' : ''} ${rest.className || ''}`} 
        />
    );
};

const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 ${props.className}`}>
        {props.children}
    </select>
);

const TextAreaInput: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea {...props} className={`w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-500 ${props.className}`} />
);

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }> = ({ children, onClick, className, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 text-sm hover:bg-blue-700 transition-colors disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed ${className}`}>
        {children}
    </button>
);

interface ExpensesScreenProps {
    navigateTo: (page: Seccion) => void;
}

const ExpensesScreen: React.FC<ExpensesScreenProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<'actividad' | 'vehiculo'>('actividad');
    
    // Estados para encabezado
    const [fecha, setFecha] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [importeTotal, setImporteTotal] = useState('');
    const [formaPago, setFormaPago] = useState<string>('Efectivo');

    // Estados para Actividad
    const [proveedorName, setProveedorName] = useState('');
    const [conceptoName, setConceptoName] = useState('');
    const [soportaIVA, setSoportaIVA] = useState('');
    const [ivaPorcentaje, setIvaPorcentaje] = useState('21');
    const [baseImponible, setBaseImponible] = useState('');
    const [ivaImporte, setIvaImporte] = useState('');
    const [kilometros, setKilometros] = useState('');
    const [kmParciales, setKmParciales] = useState('');
    const [litros, setLitros] = useState('');
    const [precioPorLitro, setPrecioPorLitro] = useState('');

    // Estados para Vehículo
    const [tallerName, setTallerName] = useState('');
    const [kilometrosVehiculo, setKilometrosVehiculo] = useState('');
    const [descripcionTrabajos, setDescripcionTrabajos] = useState('');

    // Estados para Servicios/Reparaciones
    const [services, setServices] = useState<Array<{
        referencia?: string;
        importe?: number;
        cantidad?: number;
        descuentoPorcentaje?: number;
        descripcion?: string;
    }>>([{}]);

    // Estados para Resumen
    const [resumenBase, setResumenBase] = useState('');
    const [resumenIvaPorcentaje, setResumenIvaPorcentaje] = useState('21');
    const [resumenIvaImporte, setResumenIvaImporte] = useState('');
    const [resumenDescuento, setResumenDescuento] = useState('');

    // Estados para Notas
    const [notas, setNotas] = useState('');

    // Estados para listas de autocompletado
    const [proveedoresList, setProveedoresList] = useState<Proveedor[]>([]);
    const [conceptosList, setConceptosList] = useState<Concepto[]>([]);
    const [talleresList, setTalleresList] = useState<Taller[]>([]);

    // Estados para filtros de autocompletado
    const [filteredProveedores, setFilteredProveedores] = useState<Proveedor[]>([]);
    const [filteredConceptos, setFilteredConceptos] = useState<Concepto[]>([]);
    const [filteredTalleres, setFilteredTalleres] = useState<Taller[]>([]);

    // Estados para mostrar dropdowns
    const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);
    const [showConceptoDropdown, setShowConceptoDropdown] = useState(false);
    const [showTallerDropdown, setShowTallerDropdown] = useState(false);

    // Estados para modales
    const [showProveedorModal, setShowProveedorModal] = useState(false);
    const [showConceptoModal, setShowConceptoModal] = useState(false);
    const [showTallerModal, setShowTallerModal] = useState(false);

    // Estados para modales - Proveedor
    const [modalProveedorName, setModalProveedorName] = useState('');
    const [modalProveedorDireccion, setModalProveedorDireccion] = useState('');
    const [modalProveedorTelefono, setModalProveedorTelefono] = useState('');
    const [modalProveedorNIF, setModalProveedorNIF] = useState('');
    const [modalProveedorSaving, setModalProveedorSaving] = useState(false);

    // Estados para modales - Concepto
    const [modalConceptoName, setModalConceptoName] = useState('');
    const [modalConceptoDescripcion, setModalConceptoDescripcion] = useState('');
    const [modalConceptoCategoria, setModalConceptoCategoria] = useState('');
    const [modalConceptoSaving, setModalConceptoSaving] = useState(false);

    // Estados para modales - Taller
    const [modalTallerName, setModalTallerName] = useState('');
    const [modalTallerDireccion, setModalTallerDireccion] = useState('');
    const [modalTallerTelefono, setModalTallerTelefono] = useState('');
    const [modalTallerSaving, setModalTallerSaving] = useState(false);

    // Estados para guardado
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar listas iniciales
    useEffect(() => {
        const loadLists = async () => {
            try {
                const [proveedores, conceptos, talleres] = await Promise.all([
                    getProveedores(),
                    getConceptos(),
                    getTalleres()
                ]);
                setProveedoresList(proveedores);
                setConceptosList(conceptos);
                setTalleresList(talleres);
            } catch (err) {
                console.error('Error loading lists:', err);
            }
        };
        loadLists();
    }, []);

    // Filtrar proveedores
    useEffect(() => {
        if (proveedorName.trim() === '') {
            setFilteredProveedores([]);
            setShowProveedorDropdown(false);
        } else {
            const filtered = proveedoresList.filter(p => 
                p.nombre.toLowerCase().includes(proveedorName.toLowerCase())
            );
            setFilteredProveedores(filtered);
            setShowProveedorDropdown(filtered.length > 0);
        }
    }, [proveedorName, proveedoresList]);

    // Filtrar conceptos
    useEffect(() => {
        if (conceptoName.trim() === '') {
            setFilteredConceptos([]);
            setShowConceptoDropdown(false);
        } else {
            const filtered = conceptosList.filter(c => 
                c.nombre.toLowerCase().includes(conceptoName.toLowerCase())
            );
            setFilteredConceptos(filtered);
            setShowConceptoDropdown(filtered.length > 0);
        }
    }, [conceptoName, conceptosList]);

    // Filtrar talleres
    useEffect(() => {
        if (tallerName.trim() === '') {
            setFilteredTalleres([]);
            setShowTallerDropdown(false);
        } else {
            const filtered = talleresList.filter(t => 
                t.nombre.toLowerCase().includes(tallerName.toLowerCase())
            );
            setFilteredTalleres(filtered);
            setShowTallerDropdown(filtered.length > 0);
        }
    }, [tallerName, talleresList]);

    // Calcular Base Imponible e IVA
    useEffect(() => {
        const total = parseFloat(importeTotal) || 0;
        const iva = parseFloat(ivaPorcentaje) || 21;
        
        if (soportaIVA === 'Sí' || soportaIVA === 'Si') {
            // Con IVA: Base = Total / (1 + IVA/100)
            const base = total / (1 + iva / 100);
            setBaseImponible(base.toFixed(2));
            const ivaCalc = total - base;
            setIvaImporte(ivaCalc.toFixed(2));
        } else {
            // Sin IVA: Base = Total, IVA = 0
            setBaseImponible(total.toFixed(2));
            setIvaImporte('0.00');
        }
    }, [importeTotal, ivaPorcentaje, soportaIVA]);

    // Calcular precio por litro
    useEffect(() => {
        const litrosValue = parseFloat(litros) || 0;
        const totalValue = parseFloat(importeTotal) || 0;
        
        if (litrosValue > 0 && totalValue > 0) {
            const precio = totalValue / litrosValue;
            setPrecioPorLitro(precio.toFixed(2));
        } else {
            setPrecioPorLitro('');
        }
    }, [litros, importeTotal]);

    // Actualizar resumen
    useEffect(() => {
        setResumenBase(baseImponible);
        setResumenIvaPorcentaje(ivaPorcentaje);
        setResumenIvaImporte(ivaImporte || '0.00');
    }, [baseImponible, ivaPorcentaje, ivaImporte]);

    const handleAddService = () => {
        setServices([...services, {}]);
    };

    const handleSaveProveedor = async () => {
        if (!modalProveedorName.trim()) {
            alert('El nombre del proveedor es obligatorio');
            return;
        }

        setModalProveedorSaving(true);
        try {
            await addProveedor({
                nombre: modalProveedorName,
                direccion: modalProveedorDireccion || null,
                telefono: modalProveedorTelefono || null,
                nif: modalProveedorNIF || null
            });
            
            // Actualizar lista
            const proveedores = await getProveedores();
            setProveedoresList(proveedores);
            
            // Establecer el nombre seleccionado
            setProveedorName(modalProveedorName);
            
            // Cerrar modal y limpiar
            setShowProveedorModal(false);
            setModalProveedorName('');
            setModalProveedorDireccion('');
            setModalProveedorTelefono('');
            setModalProveedorNIF('');
        } catch (err) {
            console.error('Error saving proveedor:', err);
            alert('Error al guardar el proveedor');
        } finally {
            setModalProveedorSaving(false);
        }
    };

    const handleSaveConcepto = async () => {
        if (!modalConceptoName.trim()) {
            alert('El nombre del concepto es obligatorio');
            return;
        }

        setModalConceptoSaving(true);
        try {
            await addConcepto({
                nombre: modalConceptoName,
                descripcion: modalConceptoDescripcion || null,
                categoria: modalConceptoCategoria || null
            });
            
            // Actualizar lista
            const conceptos = await getConceptos();
            setConceptosList(conceptos);
            
            // Establecer el nombre seleccionado
            setConceptoName(modalConceptoName);
            
            // Cerrar modal y limpiar
            setShowConceptoModal(false);
            setModalConceptoName('');
            setModalConceptoDescripcion('');
            setModalConceptoCategoria('');
        } catch (err) {
            console.error('Error saving concepto:', err);
            alert('Error al guardar el concepto');
        } finally {
            setModalConceptoSaving(false);
        }
    };

    const handleSaveTaller = async () => {
        if (!modalTallerName.trim()) {
            alert('El nombre del taller es obligatorio');
            return;
        }

        setModalTallerSaving(true);
        try {
            await addTaller({
                nombre: modalTallerName,
                direccion: modalTallerDireccion || null,
                telefono: modalTallerTelefono || null
            });
            
            // Actualizar lista
            const talleres = await getTalleres();
            setTalleresList(talleres);
            
            // Establecer el nombre seleccionado
            setTallerName(modalTallerName);
            
            // Cerrar modal y limpiar
            setShowTallerModal(false);
            setModalTallerName('');
            setModalTallerDireccion('');
            setModalTallerTelefono('');
        } catch (err) {
            console.error('Error saving taller:', err);
            alert('Error al guardar el taller');
        } finally {
            setModalTallerSaving(false);
        }
    };

    const handleSaveExpense = async () => {
        const importeValue = parseFloat(importeTotal) || 0;
        
        if (importeValue <= 0) {
            setError('El importe total debe ser mayor a 0');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const gastoData: any = {
                importe: importeValue,
                fecha: fecha ? new Date(fecha) : new Date(),
                formaPago: formaPago
            };

            // Campos específicos de Actividad
            if (activeTab === 'actividad') {
                if (proveedorName) gastoData.proveedor = proveedorName;
                if (conceptoName) gastoData.concepto = conceptoName;
                if (numeroFactura) gastoData.numeroFactura = numeroFactura;
                if (baseImponible) gastoData.baseImponible = parseFloat(baseImponible);
                if (ivaImporte) gastoData.ivaImporte = parseFloat(ivaImporte);
                if (ivaPorcentaje) gastoData.ivaPorcentaje = parseFloat(ivaPorcentaje);
                if (kilometros) gastoData.kilometros = parseFloat(kilometros);
            }

            // Campos específicos de Vehículo
            if (activeTab === 'vehiculo') {
                if (tallerName) gastoData.taller = tallerName;
                if (kilometrosVehiculo) gastoData.kilometrosVehiculo = parseFloat(kilometrosVehiculo);
                if (descripcionTrabajos) gastoData.descripcionTrabajos = descripcionTrabajos;
                
                // Servicios
                const serviciosValidados = services
                    .filter(s => s.referencia || s.importe || s.cantidad || s.descripcion)
                    .map(s => ({
                        referencia: s.referencia,
                        importe: s.importe ? Number(s.importe) : undefined,
                        cantidad: s.cantidad ? Number(s.cantidad) : undefined,
                        descuentoPorcentaje: s.descuentoPorcentaje ? Number(s.descuentoPorcentaje) : undefined,
                        descripcion: s.descripcion
                    }));
                
                if (serviciosValidados.length > 0) {
                    gastoData.servicios = serviciosValidados;
                }
            }

            // Campos comunes
            if (resumenDescuento) gastoData.descuento = parseFloat(resumenDescuento);
            if (notas) gastoData.notas = notas;

            await addGasto(gastoData);
            
            // Limpiar formulario
            setFecha('');
            setNumeroFactura('');
            setImporteTotal('');
            setProveedorName('');
            setConceptoName('');
            setTallerName('');
            setServices([{}]);
            setNotas('');
            
            alert('Gasto guardado correctamente');
        } catch (err) {
            console.error('Error saving expense:', err);
            setError('Error al guardar el gasto. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-zinc-950 -m-4 p-4 min-h-screen text-zinc-100 font-sans">
            <header className="flex justify-between items-center mb-4">
                <BackButton navigateTo={navigateTo} />
                <KineticHeader title="Gastos" />
                <div className="w-10" />
            </header>
            
            <div className="space-y-3 max-w-sm mx-auto">
                <FormCard title="Encabezado de Factura">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Fecha">
                            <TextInput 
                                type="text" 
                                placeholder="Seleccionar" 
                                value={fecha}
                                className="border-blue-500" 
                                onFocus={(e) => e.target.type='date'} 
                                onBlur={(e) => e.target.type='text'}
                                onChange={(e) => setFecha(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Nº de Factura">
                            <TextInput 
                                type="text" 
                                placeholder="Ingrese Nº de Fact" 
                                value={numeroFactura}
                                onChange={(e) => setNumeroFactura(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Importe Total">
                            <TextInput 
                                type="number" 
                                value={importeTotal}
                                onChange={(e) => setImporteTotal(e.target.value)}
                                placeholder="0.00"
                            />
                        </FormField>
                        <FormField label="Forma de Pago">
                            <SelectInput value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                                <option>Efectivo</option>
                                <option>Tarjeta</option>
                                <option>Bizum</option>
                            </SelectInput>
                        </FormField>
                    </div>
                </FormCard>

                <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('actividad')}
                        className={`flex-1 py-1.5 rounded-md font-semibold transition-colors text-sm ${activeTab === 'actividad' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                    >
                        Actividad
                    </button>
                    <button 
                        onClick={() => setActiveTab('vehiculo')}
                        className={`flex-1 py-1.5 rounded-md font-semibold transition-colors text-sm ${activeTab === 'vehiculo' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                    >
                        Vehículo
                    </button>
                </div>
                
                {activeTab === 'actividad' && (
                    <FormCard title="Actividad">
                        <div className="space-y-4">
                            <FormField label="Nombre del Proveedor:">
                                <div className="relative">
                                    <div className="flex gap-2">
                                        <TextInput 
                                            type="text" 
                                            placeholder="Buscar Proveedor" 
                                            className="flex-grow"
                                            value={proveedorName}
                                            onChange={(e) => {
                                                setProveedorName(e.target.value);
                                                setShowProveedorDropdown(true);
                                            }}
                                            onFocus={() => {
                                                if (filteredProveedores.length > 0) setShowProveedorDropdown(true);
                                            }}
                                        />
                                        <PrimaryButton onClick={() => setShowProveedorModal(true)}>
                                            <AddIcon /> Nuevo
                                        </PrimaryButton>
                                    </div>
                                    {showProveedorDropdown && filteredProveedores.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {filteredProveedores.map(proveedor => (
                                                <button
                                                    key={proveedor.id}
                                                    onClick={() => {
                                                        setProveedorName(proveedor.nombre);
                                                        setShowProveedorDropdown(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 transition-colors"
                                                >
                                                    {proveedor.nombre}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormField>
                            
                            <FormField label="Concepto:">
                                <div className="relative">
                                    <div className="flex gap-2">
                                        <TextInput 
                                            type="text" 
                                            placeholder="Buscar Concepto" 
                                            className="flex-grow"
                                            value={conceptoName}
                                            onChange={(e) => {
                                                setConceptoName(e.target.value);
                                                setShowConceptoDropdown(true);
                                            }}
                                            onFocus={() => {
                                                if (filteredConceptos.length > 0) setShowConceptoDropdown(true);
                                            }}
                                        />
                                        <PrimaryButton onClick={() => setShowConceptoModal(true)}>
                                            <AddIcon /> Nuevo
                                        </PrimaryButton>
                                    </div>
                                    {showConceptoDropdown && filteredConceptos.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {filteredConceptos.map(concepto => (
                                                <button
                                                    key={concepto.id}
                                                    onClick={() => {
                                                        setConceptoName(concepto.nombre);
                                                        setShowConceptoDropdown(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 transition-colors"
                                                >
                                                    {concepto.nombre}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormField>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <FormField label="¿Soporta IVA?">
                                    <SelectInput value={soportaIVA} onChange={(e) => setSoportaIVA(e.target.value)}>
                                        <option value="">Seleccionar</option>
                                        <option value="Sí">Sí</option>
                                        <option value="No">No</option>
                                    </SelectInput>
                                </FormField>
                                <FormField label="Iva (%)">
                                    <TextInput 
                                        type="number" 
                                        value={ivaPorcentaje}
                                        onChange={(e) => setIvaPorcentaje(e.target.value)}
                                    />
                                </FormField>
                                <FormField label="Base (€)">
                                    <TextInput 
                                        type="number" 
                                        value={baseImponible}
                                        readOnly
                                    />
                                </FormField>
                                <FormField label="Iva(€)">
                                    <TextInput 
                                        type="number" 
                                        value={ivaImporte || '0.00'}
                                        readOnly
                                    />
                                </FormField>
                                <FormField label="Kilómetros">
                                    <TextInput 
                                        type="number" 
                                        value={kilometros}
                                        onChange={(e) => setKilometros(e.target.value)}
                                    />
                                </FormField>
                                <div/>
                                <FormField label="Km.Parc">
                                    <TextInput 
                                        type="number" 
                                        value={kmParciales}
                                        onChange={(e) => setKmParciales(e.target.value)}
                                    />
                                </FormField>
                                <FormField label="Litros">
                                    <TextInput 
                                        type="number" 
                                        value={litros}
                                        onChange={(e) => setLitros(e.target.value)}
                                    />
                                </FormField>
                                <FormField label="€/L">
                                    <TextInput 
                                        type="number" 
                                        value={precioPorLitro}
                                        readOnly
                                    />
                                </FormField>
                            </div>
                        </div>
                    </FormCard>
                )}

                {activeTab === 'vehiculo' && (
                    <FormCard title="Vehículo">
                        <div className="space-y-4">
                            <FormField label="Nombre del Taller:">
                                <div className="relative">
                                    <div className="flex gap-2">
                                        <TextInput 
                                            type="text" 
                                            placeholder="Buscar Taller" 
                                            className="flex-grow"
                                            value={tallerName}
                                            onChange={(e) => {
                                                setTallerName(e.target.value);
                                                setShowTallerDropdown(true);
                                            }}
                                            onFocus={() => {
                                                if (filteredTalleres.length > 0) setShowTallerDropdown(true);
                                            }}
                                        />
                                        <PrimaryButton onClick={() => setShowTallerModal(true)}>
                                            <AddIcon /> Nuevo
                                        </PrimaryButton>
                                    </div>
                                    {showTallerDropdown && filteredTalleres.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {filteredTalleres.map(taller => (
                                                <button
                                                    key={taller.id}
                                                    onClick={() => {
                                                        setTallerName(taller.nombre);
                                                        setShowTallerDropdown(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 transition-colors"
                                                >
                                                    {taller.nombre}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormField>

                            <FormField label="Kms">
                                <TextInput 
                                    type="number" 
                                    value={kilometrosVehiculo}
                                    onChange={(e) => setKilometrosVehiculo(e.target.value)}
                                    placeholder="Kilómetros"
                                />
                            </FormField>
                            
                            <div>
                                <h3 className="text-md font-bold text-zinc-300 mb-2">Servicios / Reparaciones</h3>
                                <div className="bg-zinc-950/70 p-3 rounded-md space-y-2 border border-zinc-800">
                                    {services.map((service, index) => (
                                        <div key={index} className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <TextInput 
                                                    placeholder="Referencia"
                                                    value={service.referencia || ''}
                                                    onChange={(e) => {
                                                        const newServices = [...services];
                                                        newServices[index] = { ...newServices[index], referencia: e.target.value };
                                                        setServices(newServices);
                                                    }}
                                                />
                                                <TextInput 
                                                    placeholder="Importe" 
                                                    type="number"
                                                    value={service.importe || ''}
                                                    onChange={(e) => {
                                                        const newServices = [...services];
                                                        newServices[index] = { ...newServices[index], importe: parseFloat(e.target.value) || 0 };
                                                        setServices(newServices);
                                                    }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <TextInput 
                                                    placeholder="Cantidad" 
                                                    type="number"
                                                    value={service.cantidad || ''}
                                                    onChange={(e) => {
                                                        const newServices = [...services];
                                                        newServices[index] = { ...newServices[index], cantidad: parseFloat(e.target.value) || 0 };
                                                        setServices(newServices);
                                                    }}
                                                />
                                                <TextInput 
                                                    placeholder="Desc. %" 
                                                    type="number"
                                                    value={service.descuentoPorcentaje || ''}
                                                    onChange={(e) => {
                                                        const newServices = [...services];
                                                        newServices[index] = { ...newServices[index], descuentoPorcentaje: parseFloat(e.target.value) || 0 };
                                                        setServices(newServices);
                                                    }}
                                                />
                                            </div>
                                            <TextInput 
                                                placeholder="Servicio"
                                                value={service.descripcion || ''}
                                                onChange={(e) => {
                                                    const newServices = [...services];
                                                    newServices[index] = { ...newServices[index], descripcion: e.target.value };
                                                    setServices(newServices);
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex justify-start pt-1">
                                        <button onClick={handleAddService} className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-blue-700 transition-colors">
                                            <AddIcon />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <FormField label="Descripción de trabajos realizados">
                                <TextAreaInput 
                                    rows={4}
                                    value={descripcionTrabajos}
                                    onChange={(e) => setDescripcionTrabajos(e.target.value)}
                                />
                            </FormField>
                        </div>
                    </FormCard>
                )}
                
                <FormCard title="Resumen de Totales">
                    <div className="grid grid-cols-5 gap-1 text-center text-xs items-end">
                        <div>
                            <label className="font-medium text-zinc-400">Base</label>
                            <TextInput 
                                readOnly
                                value={resumenBase}
                                className="text-center mt-1.5"
                            />
                        </div>
                        <div>
                            <label className="font-medium text-zinc-400">Iva</label>
                            <TextInput 
                                value={resumenIvaPorcentaje}
                                onChange={(e) => {
                                    setResumenIvaPorcentaje(e.target.value);
                                    setIvaPorcentaje(e.target.value);
                                }}
                                className="text-center mt-1.5"
                            />
                        </div>
                        <div>
                            <label className="font-medium text-zinc-400">Iva (€)</label>
                            <TextInput 
                                readOnly
                                value={resumenIvaImporte}
                                className="text-center mt-1.5"
                            />
                        </div>
                        <div>
                            <label className="font-medium text-zinc-400">Desc.</label>
                            <TextInput 
                                type="number"
                                value={resumenDescuento}
                                onChange={(e) => setResumenDescuento(e.target.value)}
                                className="text-center mt-1.5"
                            />
                        </div>
                        <div>
                            <label className="font-medium text-zinc-400">TOTAL</label>
                            <TextInput 
                                readOnly
                                value={importeTotal}
                                className="text-center mt-1.5"
                            />
                        </div>
                    </div>
                </FormCard>

                <FormCard title="Notas">
                    <TextAreaInput 
                        rows={4}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                    />
                </FormCard>

                <PrimaryButton onClick={handleSaveExpense} disabled={isSaving} className="w-full">
                    {isSaving ? 'Guardando...' : 'Guardar Gasto'}
                </PrimaryButton>

                {error && (
                    <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Modal Proveedor */}
            {showProveedorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-zinc-100 mb-4">Nuevo Proveedor</h3>
                        <div className="space-y-4">
                            <FormField label="Nombre *">
                                <TextInput 
                                    value={modalProveedorName}
                                    onChange={(e) => setModalProveedorName(e.target.value)}
                                />
                            </FormField>
                            <FormField label="Dirección">
                                <TextInput 
                                    value={modalProveedorDireccion}
                                    onChange={(e) => setModalProveedorDireccion(e.target.value)}
                                />
                            </FormField>
                            <FormField label="Teléfono">
                                <TextInput 
                                    value={modalProveedorTelefono}
                                    onChange={(e) => setModalProveedorTelefono(e.target.value)}
                                />
                            </FormField>
                            <FormField label="NIF">
                                <TextInput 
                                    value={modalProveedorNIF}
                                    onChange={(e) => setModalProveedorNIF(e.target.value)}
                                />
                            </FormField>
                            <div className="flex gap-2">
                                <PrimaryButton onClick={handleSaveProveedor} disabled={modalProveedorSaving} className="flex-1">
                                    {modalProveedorSaving ? 'Guardando...' : 'Guardar'}
                                </PrimaryButton>
                                <button
                                    onClick={() => {
                                        setShowProveedorModal(false);
                                        setModalProveedorName('');
                                        setModalProveedorDireccion('');
                                        setModalProveedorTelefono('');
                                        setModalProveedorNIF('');
                                    }}
                                    className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Concepto */}
            {showConceptoModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-zinc-100 mb-4">Nuevo Concepto</h3>
                        <div className="space-y-4">
                            <FormField label="Nombre *">
                                <TextInput 
                                    value={modalConceptoName}
                                    onChange={(e) => setModalConceptoName(e.target.value)}
                                />
                            </FormField>
                            <FormField label="Descripción">
                                <TextAreaInput 
                                    rows={3}
                                    value={modalConceptoDescripcion}
                                    onChange={(e) => setModalConceptoDescripcion(e.target.value)}
                                />
                            </FormField>
                            <FormField label="Categoría">
                                <TextInput 
                                    value={modalConceptoCategoria}
                                    onChange={(e) => setModalConceptoCategoria(e.target.value)}
                                />
                            </FormField>
                            <div className="flex gap-2">
                                <PrimaryButton onClick={handleSaveConcepto} disabled={modalConceptoSaving} className="flex-1">
                                    {modalConceptoSaving ? 'Guardando...' : 'Guardar'}
                                </PrimaryButton>
                                <button
                                    onClick={() => {
                                        setShowConceptoModal(false);
                                        setModalConceptoName('');
                                        setModalConceptoDescripcion('');
                                        setModalConceptoCategoria('');
                                    }}
                                    className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Taller */}
            {showTallerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-zinc-100 mb-4">Nuevo Taller</h3>
                        <div className="space-y-4">
                            <FormField label="Nombre *">
                                <TextInput 
                                    value={modalTallerName}
                                    onChange={(e) => setModalTallerName(e.target.value)}
                                />
                            </FormField>
                            <FormField label="Dirección">
                                <TextInput 
                                    value={modalTallerDireccion}
                                    onChange={(e) => setModalTallerDireccion(e.target.value)}
                                />
                            </FormField>
                            <FormField label="Teléfono">
                                <TextInput 
                                    value={modalTallerTelefono}
                                    onChange={(e) => setModalTallerTelefono(e.target.value)}
                                />
                            </FormField>
                            <div className="flex gap-2">
                                <PrimaryButton onClick={handleSaveTaller} disabled={modalTallerSaving} className="flex-1">
                                    {modalTallerSaving ? 'Guardando...' : 'Guardar'}
                                </PrimaryButton>
                                <button
                                    onClick={() => {
                                        setShowTallerModal(false);
                                        setModalTallerName('');
                                        setModalTallerDireccion('');
                                        setModalTallerTelefono('');
                                    }}
                                    className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesScreen;
