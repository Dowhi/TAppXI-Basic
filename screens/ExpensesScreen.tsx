import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, Proveedor, Concepto, Taller } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import { addGasto, updateGasto, deleteGasto, getGasto, getProveedores, getConceptos, getTalleres, addProveedor, addConcepto, addTaller } from '../services/api';
import {
    getTemplates,
    saveTemplate,
    deleteTemplate,
    markTemplateAsUsed,
    getMostUsedTemplates,
    ExpenseTemplate
} from '../services/expenseTemplates';
import { ExpenseScanner } from '../components/ExpenseScanner';

// Icons
const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>;
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
    gastoId?: string | null;
}

const ExpensesScreen: React.FC<ExpensesScreenProps> = ({ navigateTo, gastoId }) => {
    const isEditing = gastoId !== null && gastoId !== undefined;
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'actividad' | 'vehiculo'>('actividad');
    const [showScanner, setShowScanner] = useState(false);

    // Estados para encabezado
    const [fecha, setFecha] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [importeTotal, setImporteTotal] = useState('');
    const [formaPago, setFormaPago] = useState<string>('Efectivo');

    // Estados para Actividad
    const [proveedorName, setProveedorName] = useState('');
    const [conceptoName, setConceptoName] = useState('');
    const [soportaIVA, setSoportaIVA] = useState<boolean>(true);
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
    const [isLoading, setIsLoading] = useState(isEditing);

    // Estados para plantillas
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // Cargar plantillas
    useEffect(() => {
        setTemplates(getTemplates());
    }, []);

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

    // Cargar gasto si está en modo edición
    useEffect(() => {
        const loadGasto = async () => {
            if (!isEditing || !gastoId) return;

            setIsLoading(true);
            try {
                const gasto = await getGasto(gastoId);
                if (gasto) {
                    // Formatear fecha para input type="date"
                    const fechaDate = gasto.fecha instanceof Date ? gasto.fecha : new Date(gasto.fecha);
                    const fechaStr = fechaDate.toISOString().split('T')[0];
                    setFecha(fechaStr);

                    setNumeroFactura(gasto.numeroFactura || '');
                    setImporteTotal(gasto.importe?.toString() || '');
                    setFormaPago(gasto.formaPago || 'Efectivo');

                    // Establecer tipo (actividad o vehiculo)
                    if (gasto.tipo) {
                        setActiveTab(gasto.tipo as 'actividad' | 'vehiculo');
                    }

                    // Campos de actividad
                    setProveedorName(gasto.proveedor || '');
                    setConceptoName(gasto.concepto || '');
                    setKilometros(gasto.kilometros?.toString() || '');
                    setKmParciales(gasto.kmParciales?.toString() || '');
                    setLitros(gasto.litros?.toString() || '');
                    setPrecioPorLitro(gasto.precioPorLitro?.toString() || '');

                    // Campos de vehículo
                    setTallerName(gasto.taller || '');
                    setConceptoName(gasto.concepto || ''); // Cargar concepto también para vehículo
                    setKilometrosVehiculo(gasto.kilometrosVehiculo?.toString() || '');

                    // IVA y base
                    setIvaPorcentaje(gasto.ivaPorcentaje?.toString() || '21');
                    setBaseImponible(gasto.baseImponible?.toString() || '');
                    setIvaImporte(gasto.ivaImporte?.toString() || '');

                    // Establecer soportaIVA basado en si tiene IVA
                    setSoportaIVA(gasto.ivaPorcentaje !== undefined && gasto.ivaPorcentaje !== null && gasto.ivaPorcentaje > 0);

                    // Servicios
                    if (gasto.servicios && Array.isArray(gasto.servicios) && gasto.servicios.length > 0) {
                        setServices(gasto.servicios);
                    } else {
                        setServices([{}]);
                    }

                    // Descuento y notas
                    setResumenDescuento(gasto.descuento?.toString() || '');
                    setNotas(gasto.notas || '');
                }
            } catch (err) {
                console.error('Error loading gasto:', err);
                setError('Error al cargar el gasto');
            } finally {
                setIsLoading(false);
            }
        };
        loadGasto();
    }, [isEditing, gastoId]);

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
            // Solo mostrar dropdown si hay coincidencias Y el nombre no coincide exactamente con algún proveedor
            const exactMatch = proveedoresList.some(p =>
                p.nombre.toLowerCase() === proveedorName.toLowerCase()
            );
            setShowProveedorDropdown(filtered.length > 0 && !exactMatch);
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
            // Solo mostrar dropdown si hay coincidencias Y el nombre no coincide exactamente con algún concepto
            const exactMatch = conceptosList.some(c =>
                c.nombre.toLowerCase() === conceptoName.toLowerCase()
            );
            setShowConceptoDropdown(filtered.length > 0 && !exactMatch);
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
            // Solo mostrar dropdown si hay coincidencias Y el nombre no coincide exactamente con algún taller
            const exactMatch = talleresList.some(t =>
                t.nombre.toLowerCase() === tallerName.toLowerCase()
            );
            setShowTallerDropdown(filtered.length > 0 && !exactMatch);
        }
    }, [tallerName, talleresList]);

    // Calcular Base Imponible e IVA
    useEffect(() => {
        const total = parseFloat(importeTotal) || 0;
        const iva = parseFloat(ivaPorcentaje) || 21;

        if (soportaIVA) {
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
            setPrecioPorLitro(precio.toFixed(3));
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

    const handleDeleteExpense = async () => {
        if (!isEditing || !gastoId) return;

        if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await deleteGasto(gastoId);
            alert('Gasto eliminado correctamente');
            navigateTo(Seccion.ResumenGastosMensual);
        } catch (err) {
            console.error('Error deleting expense:', err);
            setError('Error al eliminar el gasto. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleScanComplete = (data: { importe?: number; litros?: number; concepto?: string }) => {
        setShowScanner(false);
        if (data.importe) setImporteTotal(data.importe.toString());
        if (data.litros) setLitros(data.litros.toString());
        if (data.concepto) {
            setConceptoName(data.concepto);
            // Logic to auto-select tab based on concept could go here if robust enough
            if (data.concepto === 'Combustible' || data.concepto === 'Mantenimiento') {
                // Common defaults
            }
        }
        showToast('Datos escaneados aplicados', 'success');
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
            // Validar y crear fecha correctamente
            let fechaGasto: Date;
            if (fecha && fecha.trim()) {
                const fechaParsed = new Date(fecha);
                // Verificar que la fecha sea válida
                if (isNaN(fechaParsed.getTime())) {
                    // Si la fecha es inválida, usar fecha actual
                    fechaGasto = new Date();
                } else {
                    fechaGasto = fechaParsed;
                }
            } else {
                fechaGasto = new Date();
            }

            const gastoData: any = {
                importe: importeValue,
                fecha: fechaGasto,
                formaPago: formaPago || 'Efectivo',
                tipo: activeTab // SIEMPRE guardar el tipo
            };

            // En modo edición, inicializar todos los campos para asegurar que se actualicen
            if (isEditing) {
                gastoData.proveedor = null;
                gastoData.concepto = null;
                gastoData.taller = null;
                gastoData.numeroFactura = null;
                gastoData.baseImponible = null;
                gastoData.ivaImporte = null;
                gastoData.ivaPorcentaje = null;
                gastoData.kilometros = null;
                gastoData.kilometrosVehiculo = null;
                gastoData.kmParciales = null;
                gastoData.litros = null;
                gastoData.precioPorLitro = null;
                gastoData.descuento = null;
                gastoData.servicios = null;
                gastoData.notas = null;
            }

            // Campos comunes (aplican a ambos tipos)
            // En modo edición, incluir todos los campos incluso si están vacíos
            if (isEditing) {
                gastoData.numeroFactura = numeroFactura && numeroFactura.trim() ? numeroFactura.trim() : null;
            } else {
                if (numeroFactura && numeroFactura.trim()) {
                    gastoData.numeroFactura = numeroFactura.trim();
                }
            }

            // Base imponible, IVA - campos comunes
            const baseImponibleValue = baseImponible ? parseFloat(baseImponible) : NaN;
            if (!isNaN(baseImponibleValue)) {
                gastoData.baseImponible = baseImponibleValue;
            } else if (isEditing) {
                gastoData.baseImponible = null;
            }

            const ivaImporteValue = ivaImporte ? parseFloat(ivaImporte) : NaN;
            if (!isNaN(ivaImporteValue)) {
                gastoData.ivaImporte = ivaImporteValue;
            } else if (isEditing) {
                gastoData.ivaImporte = null;
            }

            const ivaPorcentajeValue = ivaPorcentaje ? parseFloat(ivaPorcentaje) : NaN;
            if (!isNaN(ivaPorcentajeValue)) {
                gastoData.ivaPorcentaje = ivaPorcentajeValue;
            } else if (isEditing) {
                gastoData.ivaPorcentaje = null;
            }

            // Campos específicos de Actividad
            if (activeTab === 'actividad') {
                if (isEditing) {
                    gastoData.proveedor = proveedorName && proveedorName.trim() ? proveedorName.trim() : null;
                    gastoData.concepto = conceptoName && conceptoName.trim() ? conceptoName.trim() : null;
                    gastoData.taller = null; // Limpiar taller si cambió a actividad
                } else {
                    if (proveedorName && proveedorName.trim()) gastoData.proveedor = proveedorName.trim();
                    if (conceptoName && conceptoName.trim()) gastoData.concepto = conceptoName.trim();
                }

                // Kilometros se maneja unificado ahora, ver abajo

                // Guardar kmParciales, litros y precioPorLitro
                const kmParcialesValue = kmParciales ? parseFloat(kmParciales) : NaN;
                if (!isNaN(kmParcialesValue)) {
                    gastoData.kmParciales = kmParcialesValue;
                } else if (isEditing) {
                    gastoData.kmParciales = null;
                }

                const litrosValue = litros ? parseFloat(litros) : NaN;
                if (!isNaN(litrosValue)) {
                    gastoData.litros = litrosValue;
                } else if (isEditing) {
                    gastoData.litros = null;
                }

                const precioPorLitroValue = precioPorLitro ? parseFloat(precioPorLitro) : NaN;
                if (!isNaN(precioPorLitroValue)) {
                    gastoData.precioPorLitro = precioPorLitroValue;
                } else if (isEditing) {
                    gastoData.precioPorLitro = null;
                }

                // Limpiar campos de vehículo
                if (isEditing) {
                    gastoData.kilometrosVehiculo = null;
                    gastoData.servicios = null;
                }
            }

            // Campos específicos de Vehículo
            if (activeTab === 'vehiculo') {
                if (isEditing) {
                    gastoData.taller = tallerName && tallerName.trim() ? tallerName.trim() : null;
                    gastoData.proveedor = null; // Limpiar proveedor si cambió a vehículo
                    // gastoData.concepto = null; // YA NO Limpiar concepto si cambió a vehículo (se usa en ambos)
                    if (isEditing) {
                        gastoData.concepto = conceptoName && conceptoName.trim() ? conceptoName.trim() : null;
                    } else {
                        if (conceptoName && conceptoName.trim()) gastoData.concepto = conceptoName.trim();
                    }
                    gastoData.kilometros = null; // Limpiar kilometros de actividad
                } else {
                    if (tallerName && tallerName.trim()) gastoData.taller = tallerName.trim();
                    if (conceptoName && conceptoName.trim()) gastoData.concepto = conceptoName.trim();
                }

                // Guardar kilometros (unificado en UI, separado en BD)
                const kilometrosValue = kilometros ? parseFloat(kilometros) : NaN;

                // 1. SIEMPRE guardar en 'kilometros' (campo general) sea Actividad o Vehículo
                if (!isNaN(kilometrosValue)) {
                    gastoData.kilometros = kilometrosValue;
                } else if (isEditing) {
                    gastoData.kilometros = null;
                }

                // 2. Guardar en 'kilometrosVehiculo' SOLO si el concepto es 'Carburante'
                // Normalizar nombre del concepto para comparación
                const conceptoNormalizado = conceptoName ? conceptoName.trim().toLowerCase() : '';

                if (conceptoNormalizado === 'carburante' && !isNaN(kilometrosValue)) {
                    gastoData.kilometrosVehiculo = kilometrosValue;
                } else if (isEditing) {
                    // Si editamos y ya no es carburante, limpiamos este campo específico
                    gastoData.kilometrosVehiculo = null;
                }

                // Servicios - limpiar valores undefined
                const serviciosValidados = services
                    .filter(s => s.referencia || s.importe || s.cantidad || s.descripcion)
                    .map(s => {
                        const servicio: any = {};
                        if (s.referencia) servicio.referencia = s.referencia;
                        if (s.importe !== undefined && !isNaN(Number(s.importe))) servicio.importe = Number(s.importe);
                        if (s.cantidad !== undefined && !isNaN(Number(s.cantidad))) servicio.cantidad = Number(s.cantidad);
                        if (s.descuentoPorcentaje !== undefined && !isNaN(Number(s.descuentoPorcentaje))) servicio.descuentoPorcentaje = Number(s.descuentoPorcentaje);
                        if (s.descripcion) servicio.descripcion = s.descripcion;
                        return servicio;
                    })
                    .filter(s => Object.keys(s).length > 0); // Solo incluir si tiene al menos un campo

                if (isEditing) {
                    gastoData.servicios = serviciosValidados.length > 0 ? serviciosValidados : null;
                } else {
                    if (serviciosValidados.length > 0) {
                        gastoData.servicios = serviciosValidados;
                    }
                }
            }

            // Campos comunes adicionales
            const descuentoValue = resumenDescuento ? parseFloat(resumenDescuento) : NaN;
            if (!isNaN(descuentoValue)) {
                gastoData.descuento = descuentoValue;
            } else if (isEditing) {
                gastoData.descuento = null;
            }

            // Para gastos de vehículo, también guardar base e IVA del resumen si están presentes
            if (activeTab === 'vehiculo') {
                const resumenBaseValue = resumenBase ? parseFloat(resumenBase) : NaN;
                if (!isNaN(resumenBaseValue) && resumenBaseValue > 0) {
                    // Si no hay baseImponible, usar la del resumen
                    if (!gastoData.baseImponible) {
                        gastoData.baseImponible = resumenBaseValue;
                    }
                }

                const resumenIvaImporteValue = resumenIvaImporte ? parseFloat(resumenIvaImporte) : NaN;
                if (!isNaN(resumenIvaImporteValue) && resumenIvaImporteValue >= 0) {
                    // Si no hay ivaImporte, usar el del resumen
                    if (gastoData.ivaImporte === undefined) {
                        gastoData.ivaImporte = resumenIvaImporteValue;
                    }
                }

                const resumenIvaPorcentajeValue = resumenIvaPorcentaje ? parseFloat(resumenIvaPorcentaje) : NaN;
                if (!isNaN(resumenIvaPorcentajeValue) && resumenIvaPorcentajeValue >= 0) {
                    // Si no hay ivaPorcentaje, usar el del resumen
                    if (gastoData.ivaPorcentaje === undefined) {
                        gastoData.ivaPorcentaje = resumenIvaPorcentajeValue;
                    }
                }
            }

            if (isEditing) {
                gastoData.notas = notas && notas.trim() ? notas.trim() : null;
            } else {
                if (notas && notas.trim()) gastoData.notas = notas.trim();
            }

            // Debug: mostrar qué se está guardando
            console.log('Guardando gasto:', gastoData);
            console.log('Modo edición:', isEditing, 'ID:', gastoId);

            if (isEditing && gastoId) {
                try {
                    await updateGasto(gastoId, gastoData);
                    console.log('Gasto actualizado, esperando un momento antes de navegar...');
                    // Esperar un momento para que Firebase procese la actualización
                    await new Promise(resolve => setTimeout(resolve, 500));
                    showToast('Gasto actualizado correctamente', 'success');
                    navigateTo(Seccion.ResumenGastosMensual);
                } catch (error) {
                    ErrorHandler.handle(error, 'ExpensesScreen - updateGasto');
                    setError('Error al actualizar el gasto. Por favor, inténtalo de nuevo.');
                }
            } else {
                await addGasto(gastoData);
                // Limpiar formulario solo si no está editando
                setFecha('');
                setNumeroFactura('');
                setImporteTotal('');
                setProveedorName('');
                setConceptoName('');
                setTallerName('');
                setServices([{}]);
                setNotas('');
                showToast('Gasto guardado correctamente', 'success');
            }
        } catch (err) {
            ErrorHandler.handle(err, 'ExpensesScreen - handleSaveExpense');
            setError('Error al guardar el gasto. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    // Aplicar plantilla al formulario
    const applyTemplate = (template: ExpenseTemplate) => {
        if (template.importe) setImporteTotal(template.importe.toString());
        if (template.formaPago) setFormaPago(template.formaPago);
        if (template.proveedor) setProveedorName(template.proveedor);
        if (template.concepto) setConceptoName(template.concepto);
        if (template.taller) setTallerName(template.taller);
        if (template.numeroFactura) setNumeroFactura(template.numeroFactura);
        if (template.baseImponible) setBaseImponible(template.baseImponible.toString());
        if (template.ivaPorcentaje) setIvaPorcentaje(template.ivaPorcentaje.toString());
        if (template.ivaImporte) setIvaImporte(template.ivaImporte.toString());
        if (template.kilometros) setKilometros(template.kilometros.toString());
        if (template.kilometrosVehiculo) setKilometrosVehiculo(template.kilometrosVehiculo.toString());
        if (template.descuento) setResumenDescuento(template.descuento.toString());
        if (template.servicios) setServices(template.servicios);
        if (template.notas) setNotas(template.notas);
        if (template.tipo) setActiveTab(template.tipo);

        markTemplateAsUsed(template.id);
        setShowTemplatesModal(false);
    };

    // Guardar gasto actual como plantilla
    const handleSaveAsTemplate = () => {
        if (!templateName.trim()) {
            alert('Por favor, ingresa un nombre para la plantilla');
            return;
        }

        const templateData: Omit<ExpenseTemplate, 'id' | 'createdAt' | 'useCount'> = {
            nombre: templateName.trim(),
            importe: parseFloat(importeTotal) || undefined,
            formaPago: formaPago || undefined,
            proveedor: proveedorName || undefined,
            concepto: conceptoName || undefined,
            taller: tallerName || undefined,
            numeroFactura: numeroFactura || undefined,
            baseImponible: baseImponible ? parseFloat(baseImponible) : undefined,
            ivaPorcentaje: ivaPorcentaje ? parseFloat(ivaPorcentaje) : undefined,
            ivaImporte: ivaImporte ? parseFloat(ivaImporte) : undefined,
            kilometros: kilometros ? parseFloat(kilometros) : undefined,
            kilometrosVehiculo: kilometrosVehiculo ? parseFloat(kilometrosVehiculo) : undefined,
            descuento: resumenDescuento ? parseFloat(resumenDescuento) : undefined,
            servicios: services.length > 0 && services[0].importe ? services : undefined,
            notas: notas || undefined,
            tipo: activeTab,
        };

        saveTemplate(templateData);
        setTemplates(getTemplates());
        setShowSaveTemplateModal(false);
        setTemplateName('');
        alert('Plantilla guardada correctamente');
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 font-sans px-3 pt-3 pb-6">
            <ScreenTopBar title={isEditing ? "Editar Gasto" : "Gastos"} navigateTo={navigateTo} backTarget={isEditing ? Seccion.ResumenGastosMensual : Seccion.Home} className="mb-4" />

            <div className="space-y-3 max-w-sm mx-auto">
                <FormCard title="Encabezado de Factura">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Fecha">
                            <TextInput
                                type="date"
                                value={fecha}
                                className="border-blue-500"
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
                            <div className="relative flex gap-2">
                                <div className="relative flex-grow">
                                    <TextInput
                                        type="number"
                                        placeholder="0.00"
                                        value={importeTotal}
                                        onChange={(e) => setImporteTotal(e.target.value)}
                                        className="pl-8"
                                    />
                                    <span className="absolute left-3 top-2 text-zinc-500">€</span>
                                </div>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 text-zinc-300"
                                    title="Escanear Ticket"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none" /><circle cx="12" cy="12" r="3.2" /><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" /></svg>
                                </button>
                            </div>
                        </FormField>
                        <FormField label="Kilómetros">
                            <TextInput
                                type="number"
                                value={kilometros}
                                onChange={(e) => setKilometros(e.target.value)}
                                placeholder="Kms"
                            />
                        </FormField>

                        <FormField label="Forma de Pago">
                            <SelectInput value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                                <option>Efectivo</option>
                                <option>Tarjeta</option>
                                <option>Bizum</option>
                                <option>Domiciliado</option>
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

                {
                    activeTab === 'actividad' && (
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
                                                    // El useEffect manejará cuándo mostrar el dropdown
                                                }}
                                                onFocus={() => {
                                                    // Solo mostrar si hay coincidencias y no hay coincidencia exacta
                                                    const exactMatch = proveedoresList.some(p =>
                                                        p.nombre.toLowerCase() === proveedorName.toLowerCase()
                                                    );
                                                    if (filteredProveedores.length > 0 && !exactMatch) {
                                                        setShowProveedorDropdown(true);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Ocultar con delay para permitir el click
                                                    setTimeout(() => {
                                                        setShowProveedorDropdown(false);
                                                    }, 200);
                                                }}
                                            />
                                            <PrimaryButton onClick={() => setShowProveedorModal(true)}>
                                                <AddIcon /> Nuevo
                                            </PrimaryButton>
                                        </div>
                                        {showProveedorDropdown && filteredProveedores.length > 0 && (
                                            <div
                                                className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto"
                                                onMouseDown={(e) => e.preventDefault()}
                                            >
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
                                                    // Solo mostrar dropdown si hay coincidencias y no hay coincidencia exacta
                                                    const exactMatch = conceptosList.some(c =>
                                                        c.nombre.toLowerCase() === conceptoName.toLowerCase()
                                                    );
                                                    if (filteredConceptos.length > 0 && !exactMatch) {
                                                        setShowConceptoDropdown(true);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Ocultar dropdown cuando se pierde el foco (con un pequeño delay para permitir el click)
                                                    setTimeout(() => {
                                                        setShowConceptoDropdown(false);
                                                    }, 200);
                                                }}
                                            />
                                            <PrimaryButton onClick={() => setShowConceptoModal(true)}>
                                                <AddIcon /> Nuevo
                                            </PrimaryButton>
                                        </div>
                                        {showConceptoDropdown && filteredConceptos.length > 0 && (
                                            <div
                                                className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto"
                                                onMouseDown={(e) => e.preventDefault()}
                                            >
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
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={soportaIVA}
                                                onChange={(e) => setSoportaIVA(e.target.checked)}
                                                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-zinc-300">{soportaIVA ? 'Sí' : 'No'}</span>
                                        </div>
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
                                    {/* Kilometros movido al encabezado */}
                                    <div />
                                    {/* Mostrar campos de combustible solo si el concepto es "Combustible" */}
                                    {conceptoName.toLowerCase().trim() === 'combustible' && (
                                        <>
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
                                        </>
                                    )}
                                    {/* Si no es Combustible, mostrar div vacío para mantener el layout */}
                                    {conceptoName.toLowerCase().trim() !== 'combustible' && <div />}
                                </div>
                            </div>
                        </FormCard>
                    )
                }

                {
                    activeTab === 'vehiculo' && (
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
                                                    // El useEffect manejará cuándo mostrar el dropdown
                                                }}
                                                onFocus={() => {
                                                    // Solo mostrar si hay coincidencias y no hay coincidencia exacta
                                                    const exactMatch = talleresList.some(t =>
                                                        t.nombre.toLowerCase() === tallerName.toLowerCase()
                                                    );
                                                    if (filteredTalleres.length > 0 && !exactMatch) {
                                                        setShowTallerDropdown(true);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Ocultar con delay para permitir el click
                                                    setTimeout(() => {
                                                        setShowTallerDropdown(false);
                                                    }, 200);
                                                }}
                                            />
                                            <PrimaryButton onClick={() => setShowTallerModal(true)}>
                                                <AddIcon /> Nuevo
                                            </PrimaryButton>
                                        </div>
                                        {showTallerDropdown && filteredTalleres.length > 0 && (
                                            <div
                                                className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto"
                                                onMouseDown={(e) => e.preventDefault()}
                                            >
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

                                <FormField label="Concepto / Servicio">
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <TextInput
                                                type="text"
                                                placeholder="Buscar o añadir concepto"
                                                className="flex-grow"
                                                value={conceptoName}
                                                onChange={(e) => setConceptoName(e.target.value)}
                                                onFocus={() => {
                                                    if (conceptoName.trim() !== '') {
                                                        const filtered = conceptosList.filter(c =>
                                                            c.nombre.toLowerCase().includes(conceptoName.toLowerCase())
                                                        );
                                                        setFilteredConceptos(filtered);
                                                        setShowConceptoDropdown(filtered.length > 0);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        setShowConceptoDropdown(false);
                                                    }, 200);
                                                }}
                                            />
                                            <PrimaryButton onClick={() => {
                                                setModalConceptoName(conceptoName);
                                                setShowConceptoModal(true);
                                            }}>
                                                <AddIcon /> Nuevo
                                            </PrimaryButton>
                                        </div>
                                        {showConceptoDropdown && filteredConceptos.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                                {filteredConceptos.map((concepto) => (
                                                    <div
                                                        key={concepto.id}
                                                        className="px-4 py-2 hover:bg-zinc-700 cursor-pointer text-sm"
                                                        onClick={() => {
                                                            setConceptoName(concepto.nombre);
                                                            setShowConceptoDropdown(false);
                                                        }}
                                                    >
                                                        {concepto.nombre}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </FormField>

                                {/* Kilometros movido al encabezado */}

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
                    )
                }

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

                {
                    isLoading ? (
                        <div className="text-center py-8 text-zinc-400">Cargando gasto...</div>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                {!isEditing && (
                                    <PrimaryButton
                                        onClick={() => setShowTemplatesModal(true)}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                        </svg>
                                        Gasto Rápido
                                    </PrimaryButton>
                                )}
                                <PrimaryButton onClick={handleSaveExpense} disabled={isSaving} className="flex-1">
                                    {isSaving ? (isEditing ? 'Actualizando...' : 'Guardando...') : (isEditing ? 'Actualizar Gasto' : 'Guardar Gasto')}
                                </PrimaryButton>
                                {isEditing && (
                                    <PrimaryButton
                                        onClick={handleDeleteExpense}
                                        disabled={isSaving}
                                        className="flex-1 bg-red-600 hover:bg-red-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        Eliminar
                                    </PrimaryButton>
                                )}
                            </div>

                            {!isEditing && (
                                <PrimaryButton
                                    onClick={() => setShowSaveTemplateModal(true)}
                                    className="w-full bg-zinc-700 hover:bg-zinc-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    Guardar como Plantilla
                                </PrimaryButton>
                            )}
                        </>
                    )
                }

                {
                    error && (
                        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )
                }
            </div >

            {/* Modal Proveedor */}
            {
                showProveedorModal && (
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
                )
            }

            {/* Modal Concepto */}
            {
                showConceptoModal && (
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
                )
            }

            {/* Modal de Plantillas */}
            {
                showTemplatesModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-zinc-100">Gastos Rápidos</h3>
                                <button
                                    onClick={() => setShowTemplatesModal(false)}
                                    className="text-zinc-400 hover:text-zinc-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {templates.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-400">
                                        <p>No hay plantillas guardadas</p>
                                        <p className="text-sm mt-2">Guarda un gasto como plantilla para usarlo después</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {templates.map((template) => (
                                            <div
                                                key={template.id}
                                                className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <button
                                                        onClick={() => applyTemplate(template)}
                                                        className="flex-1 text-left"
                                                    >
                                                        <h4 className="font-semibold text-zinc-100">{template.nombre}</h4>
                                                        <div className="mt-1 text-xs text-zinc-400 space-y-0.5">
                                                            {template.importe && <p>Importe: {template.importe.toFixed(2)} €</p>}
                                                            {template.proveedor && <p>Proveedor: {template.proveedor}</p>}
                                                            {template.concepto && <p>Concepto: {template.concepto}</p>}
                                                            {template.taller && <p>Taller: {template.taller}</p>}
                                                        </div>
                                                    </button>
                                                    <div className="flex flex-col items-end gap-1 ml-2">
                                                        <span className="text-xs text-zinc-500">
                                                            {template.useCount || 0} usos
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('¿Eliminar esta plantilla?')) {
                                                                    deleteTemplate(template.id);
                                                                    setTemplates(getTemplates());
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-400/10 transition-colors"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Guardar Plantilla */}
            {
                showSaveTemplateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-lg font-bold text-zinc-100 mb-4">Guardar como Plantilla</h3>
                            <div className="space-y-4">
                                <FormField label="Nombre de la plantilla *">
                                    <TextInput
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="Ej: Combustible, Mantenimiento..."
                                        autoFocus
                                    />
                                </FormField>
                                <div className="flex gap-2">
                                    <PrimaryButton onClick={handleSaveAsTemplate} className="flex-1">
                                        Guardar
                                    </PrimaryButton>
                                    <button
                                        onClick={() => {
                                            setShowSaveTemplateModal(false);
                                            setTemplateName('');
                                        }}
                                        className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Taller */}
            {
                showTallerModal && (
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
                )
            }
            {showScanner && (
                <ExpenseScanner
                    onScanComplete={handleScanComplete}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div >
    );
};

export default ExpensesScreen;

