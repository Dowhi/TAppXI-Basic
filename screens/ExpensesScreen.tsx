import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Seccion, Proveedor, Concepto, Taller, Gasto } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import {
    addGasto,
    updateGasto,
    deleteGasto,
    getGasto,
    getProveedores,
    getConceptos,
    getTalleres,
    addProveedor,
    addConcepto,
    addTaller
} from '../services/api';
import {
    getTemplates,
    saveTemplate,
    deleteTemplate,
    markTemplateAsUsed,
    ExpenseTemplate
} from '../services/expenseTemplates';
import { ExpenseScanner } from '../components/ExpenseScanner';
import AutocompleteField from '../components/AutocompleteField';
import { ProveedorModal, ConceptoModal, TallerModal } from '../components/ExpenseModals';

// --- UI Sub-components ---
const FormCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2 ${className}`}>
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-wider">{title}</h2>
        {children}
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = "" }) => (
    <div className={className}>
        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1 ml-1">{label}</label>
        {children}
    </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { readOnly?: boolean }> = ({ readOnly, className = "", ...props }) => (
    <input
        {...props}
        readOnly={readOnly}
        className={`w-full py-1.5 px-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-600 ${readOnly ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400' : ''} ${className}`}
    />
);

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; variant?: 'primary' | 'danger' | 'success' | 'outline' }> = ({ children, onClick, className = "", disabled, variant = 'primary' }) => {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        outline: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${variants[variant]} px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {children}
        </button>
    );
};

// --- Main Component ---
const ExpensesScreen: React.FC<{ navigateTo: (page: Seccion) => void; gastoId?: string | null }> = ({ navigateTo, gastoId }) => {
    const isEditing = !!gastoId;
    const { showToast } = useToast();

    // -- State --
    const [activeTab, setActiveTab] = useState<'actividad' | 'vehiculo'>('actividad');
    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [numeroFactura, setNumeroFactura] = useState('');
    const [importeTotal, setImporteTotal] = useState('');
    const [formaPago, setFormaPago] = useState('Efectivo');
    const [notas, setNotas] = useState('');

    // Actividad Specific
    const [proveedorName, setProveedorName] = useState('');
    const [conceptoName, setConceptoName] = useState('');
    const [soportaIVA, setSoportaIVA] = useState(true);
    const [ivaPorcentaje, setIvaPorcentaje] = useState('21');
    const [kilometros, setKilometros] = useState('');

    // Fuel Specific (Actividad)
    const [kmParciales, setKmParciales] = useState('');
    const [litros, setLitros] = useState('');
    const [precioPorLitro, setPrecioPorLitro] = useState('');

    // Vehiculo Specific
    const [tallerName, setTallerName] = useState('');
    const [services, setServices] = useState<Array<any>>([{}]);

    // Resumen (Calculated)
    const [baseImponible, setBaseImponible] = useState('');
    const [ivaImporte, setIvaImporte] = useState('');
    const [descuento, setDescuento] = useState('');
    const [totalNeto, setTotalNeto] = useState('');

    // Lists & Modals
    const [lists, setLists] = useState<{ proveedores: Proveedor[]; conceptos: Concepto[]; talleres: Taller[] }>({ proveedores: [], conceptos: [], talleres: [] });
    const [modals, setModals] = useState<{ proveedor: boolean; concepto: boolean; taller: boolean }>({ proveedor: false, concepto: false, taller: false });
    const [showScanner, setShowScanner] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);

    // -- Calculations --
    useEffect(() => {
        const total = parseFloat(importeTotal) || 0;
        const desc = parseFloat(descuento) || 0;
        const iva = parseFloat(ivaPorcentaje) || 0;

        const finalTotal = total - desc;
        setTotalNeto(finalTotal.toFixed(2));

        if (soportaIVA && iva > 0) {
            const base = total / (1 + iva / 100);
            setBaseImponible(base.toFixed(2));
            setIvaImporte((total - base).toFixed(2));
        } else {
            setBaseImponible(total.toFixed(2));
            setIvaImporte('0.00');
        }
    }, [importeTotal, ivaPorcentaje, soportaIVA, descuento]);

    useEffect(() => {
        const l = parseFloat(litros) || 0;
        const total = parseFloat(importeTotal) || 0;
        if (l > 0 && total > 0) setPrecioPorLitro((total / l).toFixed(3));
        else setPrecioPorLitro('');
    }, [litros, importeTotal]);

    // -- Data Loading --
    const loadInitialData = useCallback(async () => {
        try {
            const [p, c, t] = await Promise.all([getProveedores(), getConceptos(), getTalleres()]);
            setLists({ proveedores: p, conceptos: c, talleres: t });
            setTemplates(getTemplates());
        } catch (e) {
            console.error('Error loading initial lists:', e);
        }
    }, []);

    useEffect(() => { loadInitialData(); }, [loadInitialData]);

    useEffect(() => {
        if (!isEditing || !gastoId) return;
        const loadGasto = async () => {
            setIsLoading(true);
            try {
                const g = await getGasto(gastoId);
                if (g) {
                    const date = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                    setFecha(date.toISOString().split('T')[0]);
                    setNumeroFactura(g.numeroFactura || '');
                    setImporteTotal(g.importe?.toString() || '');
                    setFormaPago(g.formaPago || 'Efectivo');
                    setActiveTab((g.tipo as 'actividad' | 'vehiculo') || 'actividad');
                    setProveedorName(g.proveedor || '');
                    setConceptoName(g.concepto || '');
                    setTallerName(g.taller || '');
                    setKilometros(g.kilometros?.toString() || '');
                    setKmParciales(g.kmParciales?.toString() || '');
                    setLitros(g.litros?.toString() || '');
                    setIvaPorcentaje(g.ivaPorcentaje?.toString() || '21');
                    setSoportaIVA(!!(g.ivaPorcentaje && g.ivaPorcentaje > 0));
                    setServices(g.servicios?.length ? g.servicios : [{}]);
                    setDescuento(g.descuento?.toString() || '');
                    setNotas(g.notas || '');
                }
            } catch (e) {
                console.error('Error loading expense:', e);
                setError('Error al cargar el gasto');
            } finally {
                setIsLoading(false);
            }
        };
        loadGasto();
    }, [isEditing, gastoId]);

    // -- Handlers --
    const saveExpense = async () => {
        const total = parseFloat(importeTotal) || 0;
        if (total <= 0) {
            setError('El importe total debe ser mayor a 0');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const data: any = {
                importe: total,
                fecha: fecha ? new Date(fecha) : new Date(),
                formaPago,
                tipo: activeTab,
                numeroFactura: numeroFactura.trim() || null,
                baseImponible: parseFloat(baseImponible) || null,
                ivaImporte: parseFloat(ivaImporte) || null,
                ivaPorcentaje: parseFloat(ivaPorcentaje) || null,
                descuento: parseFloat(descuento) || null,
                notas: notas.trim() || null,
                kilometros: parseFloat(kilometros) || null,
            };

            if (activeTab === 'actividad') {
                data.proveedor = proveedorName.trim() || null;
                data.concepto = conceptoName.trim() || null;
                data.kmParciales = parseFloat(kmParciales) || null;
                data.litros = parseFloat(litros) || null;
                data.precioPorLitro = parseFloat(precioPorLitro) || null;
            } else {
                data.taller = tallerName.trim() || null;
                data.concepto = conceptoName.trim() || null;
                data.servicios = services.filter(s => s.referencia || s.importe || s.descripcion);
                // Si el concepto es combustible en pestaña vehículo, también guardar kms específicos
                if (conceptoName.toLowerCase().includes('carburante') || conceptoName.toLowerCase().includes('combustible')) {
                    data.kilometrosVehiculo = parseFloat(kilometros) || null;
                }
            }

            if (isEditing && gastoId) {
                await updateGasto(gastoId, data);
            } else {
                await addGasto(data);
            }

            showToast(`Gasto ${isEditing ? 'actualizado' : 'guardado'} correctamente`, 'success');
            navigateTo(Seccion.ResumenGastosMensual);
        } catch (e) {
            console.error('Error saving expense:', e);
            setError('Error al guardar el gasto');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteEx = async () => {
        if (!isEditing || !gastoId || !confirm('¿Eliminar este gasto?')) return;
        setIsSaving(true);
        try {
            await deleteGasto(gastoId);
            showToast('Gasto eliminado', 'success');
            navigateTo(Seccion.ResumenGastosMensual);
        } catch (e) {
            setError('Error al eliminar el gasto');
        } finally {
            setIsSaving(false);
        }
    };

    const applyTpl = (t: ExpenseTemplate) => {
        if (t.importe) setImporteTotal(t.importe.toString());
        if (t.formaPago) setFormaPago(t.formaPago);
        if (t.proveedor) setProveedorName(t.proveedor);
        if (t.concepto) setConceptoName(t.concepto);
        if (t.taller) setTallerName(t.taller);
        if (t.ivaPorcentaje) setIvaPorcentaje(t.ivaPorcentaje.toString());
        if (t.tipo) setActiveTab(t.tipo);
        markTemplateAsUsed(t.id);
        setShowTemplates(false);
        showToast('Plantilla aplicada', 'success');
    };

    if (isLoading) return (
        <div className="bg-zinc-950 min-h-screen flex items-center justify-center text-zinc-400">
            <div className="animate-pulse">Cargando...</div>
        </div>
    );

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-2 pb-6">
            <ScreenTopBar
                title={isEditing ? "Editar Gasto" : "Gastos"}
                navigateTo={navigateTo}
                backTarget={isEditing ? Seccion.ResumenGastosMensual : Seccion.Home}
                className="mb-2"
            />

            <div className="space-y-2.5 max-w-lg mx-auto">
                {/* 1. Datos Generales */}
                <FormCard title="Datos de la Factura">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Fecha">
                            <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="border-blue-500/30" />
                        </FormField>
                        <FormField label="Nº Factura">
                            <TextInput placeholder="Ej: 2024/001" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
                        </FormField>
                        <FormField label="Importe Total">
                            <div className="relative flex gap-1">
                                <div className="relative flex-grow">
                                    <TextInput type="number" placeholder="0.00" value={importeTotal} onChange={(e) => setImporteTotal(e.target.value)} className="pl-6 font-bold text-base" />
                                    <span className="absolute left-2.5 top-2 text-zinc-500 font-bold text-xs">€</span>
                                </div>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-2 bg-zinc-800 border border-zinc-700 rounded-lg text-blue-400 hover:bg-zinc-700 transition-colors"
                                    title="Escanear Ticket"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" /></svg>
                                </button>
                            </div>
                        </FormField>
                        <FormField label="Kilómetros">
                            <TextInput type="number" placeholder="Km totales" value={kilometros} onChange={(e) => setKilometros(e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Forma de Pago">
                        <select
                            value={formaPago}
                            onChange={(e) => setFormaPago(e.target.value)}
                            className="w-full py-1.5 px-2 bg-zinc-800/50 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {['Efectivo', 'Tarjeta', 'Bizum', 'Domiciliado', 'Transferencia'].map(m => <option key={m}>{m}</option>)}
                        </select>
                    </FormField>
                </FormCard>

                {/* 2. Selector de Tipo */}
                <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                    {(['actividad', 'vehiculo'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-1.5 rounded-lg font-black text-xs uppercase tracking-tight transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {tab === 'actividad' ? '🏢 Actividad' : '🚗 Vehículo'}
                        </button>
                    ))}
                </div>

                {/* 3. Detalles Dinámicos */}
                {activeTab === 'actividad' ? (
                    <FormCard title="Detalles del Gasto">
                        <AutocompleteField
                            label="Proveedor / Empresa"
                            placeholder="Ej: Repsol, Gestoría..."
                            value={proveedorName}
                            items={lists.proveedores}
                            onChange={setProveedorName}
                            onSelect={(p) => setProveedorName(p.nombre)}
                            onAddNew={() => setModals(m => ({ ...m, proveedor: true }))}
                        />
                        <AutocompleteField
                            label="Concepto"
                            placeholder="Ej: Combustible, Cuota..."
                            value={conceptoName}
                            items={lists.conceptos}
                            onChange={setConceptoName}
                            onSelect={(c) => setConceptoName(c.nombre)}
                            onAddNew={() => setModals(m => ({ ...m, concepto: true }))}
                        />
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <FormField label="¿Desgrava IVA?">
                                <button
                                    onClick={() => setSoportaIVA(!soportaIVA)}
                                    className={`w-full py-2 rounded-lg border text-sm font-bold transition-colors ${soportaIVA ? 'bg-blue-900/30 border-blue-500 text-blue-200' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                                >
                                    {soportaIVA ? 'SÍ (21%)' : 'NO'}
                                </button>
                            </FormField>
                            {soportaIVA && (
                                <FormField label="Porcentaje IVA">
                                    <TextInput type="number" value={ivaPorcentaje} onChange={e => setIvaPorcentaje(e.target.value)} />
                                </FormField>
                            )}
                        </div>

                        {/* Bloque Combustible */}
                        {(conceptoName.toLowerCase().includes('combustible') || conceptoName.toLowerCase().includes('carburante')) && (
                            <div className="pt-4 mt-2 border-t border-zinc-800 space-y-4">
                                <h3 className="text-xs font-black text-blue-500 uppercase">Datos de Repostaje</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="KM Parciales">
                                        <TextInput type="number" placeholder="Ej: 450" value={kmParciales} onChange={e => setKmParciales(e.target.value)} />
                                    </FormField>
                                    <FormField label="Litros">
                                        <TextInput type="number" placeholder="0.00" value={litros} onChange={e => setLitros(e.target.value)} />
                                    </FormField>
                                </div>
                                {precioPorLitro && (
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex justify-between items-center">
                                        <span className="text-xs text-blue-400 font-bold">PRECIO CALCULADO:</span>
                                        <span className="text-lg font-black text-blue-100">{precioPorLitro} €/L</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </FormCard>
                ) : (
                    <FormCard title="Detalles del Vehículo">
                        <AutocompleteField
                            label="Taller"
                            placeholder="Ej: Talleres Manolo..."
                            value={tallerName}
                            items={lists.talleres}
                            onChange={setTallerName}
                            onSelect={(t) => setTallerName(t.nombre)}
                            onAddNew={() => setModals(m => ({ ...m, taller: true }))}
                        />
                        <AutocompleteField
                            label="Motivo General"
                            placeholder="Ej: Revisión 60k..."
                            value={conceptoName}
                            items={lists.conceptos}
                            onChange={setConceptoName}
                            onSelect={(c) => setConceptoName(c.nombre)}
                            onAddNew={() => setModals(m => ({ ...m, concepto: true }))}
                        />

                        <div className="pt-2 border-t border-zinc-800">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black text-zinc-500 uppercase">Desglose de Servicios</h3>
                                <button
                                    onClick={() => setServices([...services, {}])}
                                    className="text-blue-400 text-xs font-bold hover:bg-blue-400/10 px-2 py-1 rounded transition-colors"
                                >
                                    + Añadir Línea
                                </button>
                            </div>
                            <div className="space-y-3">
                                {services.map((s, i) => (
                                    <div key={i} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-800 space-y-2 relative group">
                                        <div className="grid grid-cols-2 gap-2">
                                            <TextInput placeholder="Referencia" value={s.referencia || ''} onChange={e => { const n = [...services]; n[i].referencia = e.target.value; setServices(n); }} />
                                            <TextInput type="number" placeholder="Importe" value={s.importe || ''} onChange={e => { const n = [...services]; n[i].importe = parseFloat(e.target.value) || 0; setServices(n); }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <TextInput type="number" placeholder="Cantidad" value={s.cantidad || ''} onChange={e => { const n = [...services]; n[i].cantidad = parseFloat(e.target.value) || 0; setServices(n); }} />
                                            <TextInput type="number" placeholder="Desc. %" value={s.descuentoPorcentaje || ''} onChange={e => { const n = [...services]; n[i].descuentoPorcentaje = parseFloat(e.target.value) || 0; setServices(n); }} />
                                        </div>
                                        <TextInput placeholder="Servicio" value={s.descripcion || ''} onChange={e => { const n = [...services]; n[i].descripcion = e.target.value; setServices(n); }} />
                                        {services.length > 1 && (
                                            <button
                                                onClick={() => setServices(services.filter((_, idx) => idx !== i))}
                                                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FormCard>
                )}

                {/* 4. Resumen de Totales */}
                <FormCard title="Resumen de Totales">
                    <div className="grid grid-cols-5 gap-2">
                        <FormField label="Base">
                            <TextInput readOnly value={baseImponible} className="text-center font-bold" />
                        </FormField>
                        <FormField label="Iva %">
                            <TextInput readOnly value={ivaPorcentaje} className="text-center font-bold" />
                        </FormField>
                        <FormField label="Iva (€)">
                            <TextInput readOnly value={ivaImporte} className="text-center font-bold text-blue-400" />
                        </FormField>
                        <FormField label="Desc.">
                            <TextInput type="number" placeholder="0.00" value={descuento} onChange={e => setDescuento(e.target.value)} className="text-center" />
                        </FormField>
                        <FormField label="TOTAL">
                            <TextInput readOnly value={totalNeto} className="text-center font-black bg-blue-500/10 border-blue-500/30 text-blue-300" />
                        </FormField>
                    </div>
                </FormCard>

                {/* 5. Notas */}
                <FormCard title="Información Adicional">
                    <textarea
                        rows={2}
                        value={notas}
                        onChange={e => setNotas(e.target.value)}
                        className="w-full p-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-blue-500"
                        placeholder="Anotaciones extra sobre el gasto..."
                    />
                </FormCard>

                {/* 6. Acciones */}
                <div className="space-y-3 pt-4">
                    <div className="flex gap-3">
                        {!isEditing && (
                            <PrimaryButton variant="outline" onClick={() => setShowTemplates(true)} className="flex-1 py-3">
                                ⚡ Gastos Rápidos
                            </PrimaryButton>
                        )}
                        <PrimaryButton onClick={saveExpense} disabled={isSaving} className="flex-[2] py-3 text-base shadow-lg shadow-blue-900/20">
                            {isSaving ? '⏳ Procesando...' : (isEditing ? '💾 Actualizar Cambios' : '✅ Guardar Gasto')}
                        </PrimaryButton>
                    </div>

                    <div className="flex gap-3">
                        {isEditing ? (
                            <PrimaryButton variant="danger" onClick={deleteEx} className="flex-1 py-2 text-zinc-100">
                                🗑️ Eliminar Definitivamente
                            </PrimaryButton>
                        ) : (
                            <PrimaryButton variant="outline" onClick={() => setShowSaveTemplate(true)} className="w-full py-2">
                                ⭐ Guardar como Plantilla nueva
                            </PrimaryButton>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-950/50 border border-red-500/50 text-red-100 text-sm rounded-xl text-center font-bold">
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {/* Modales Compartidos */}
            {modals.proveedor && (
                <ProveedorModal
                    initialName={proveedorName}
                    onClose={() => setModals(m => ({ ...m, proveedor: false }))}
                    onSave={async (d) => {
                        await addProveedor(d);
                        await loadInitialData();
                        setProveedorName(d.nombre);
                    }}
                />
            )}
            {modals.concepto && (
                <ConceptoModal
                    initialName={conceptoName}
                    onClose={() => setModals(m => ({ ...m, concepto: false }))}
                    onSave={async (d) => {
                        await addConcepto(d);
                        await loadInitialData();
                        setConceptoName(d.nombre);
                    }}
                />
            )}
            {modals.taller && (
                <TallerModal
                    initialName={tallerName}
                    onClose={() => setModals(m => ({ ...m, taller: false }))}
                    onSave={async (d) => {
                        await addTaller(d);
                        await loadInitialData();
                        setTallerName(d.nombre);
                    }}
                />
            )}

            {/* Escáner */}
            {showScanner && (
                <ExpenseScanner
                    onScanComplete={(data) => {
                        if (data.importe) setImporteTotal(data.importe.toString());
                        if (data.litros) setLitros(data.litros.toString());
                        if (data.fecha) setFecha(data.fecha.toISOString().split('T')[0]);
                        if (data.numeroFactura) setNumeroFactura(data.numeroFactura);
                        if (data.proveedor) {
                            activeTab === 'actividad' ? setProveedorName(data.proveedor) : setTallerName(data.proveedor);
                        }
                        setShowScanner(false);
                        showToast('Ticket analizado correctamente', 'success');
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Selector de Plantillas */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xl text-zinc-100">Plantillas Guardadas</h3>
                            <button onClick={() => setShowTemplates(false)} className="text-zinc-500 text-2xl">×</button>
                        </div>
                        <div className="overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                            {templates.length === 0 ? (
                                <div className="text-center py-10 text-zinc-600 italic">No hay plantillas guardadas.</div>
                            ) : (
                                templates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => applyTpl(t)}
                                        className="w-full p-4 bg-zinc-800/50 rounded-xl text-left border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800 transition-all group"
                                    >
                                        <div className="font-black text-blue-400 group-hover:text-blue-300">{t.nombre}</div>
                                        <div className="text-xs text-zinc-500 mt-2 flex justify-between">
                                            <span>{t.concepto || 'Sin concepto'}</span>
                                            <span className="font-bold text-zinc-300">{t.importe?.toFixed(2)} €</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Crear Plantilla */}
            {showSaveTemplate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="font-black text-xl mb-6 text-zinc-100">Nueva Plantilla</h3>
                        <p className="text-xs text-zinc-500 mb-4">Se guardarán los datos actuales (proveedor, concepto, importe, etc.) como una plantilla rápida.</p>
                        <TextInput
                            placeholder="Nombre de la plantilla (ej: Repsol Diésel)"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            className="mb-6 py-3"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <PrimaryButton className="flex-[2] py-3 shadow-lg shadow-blue-900/20" onClick={() => {
                                if (!templateName.trim()) return alert('Ponle un nombre a la plantilla');
                                saveTemplate({
                                    nombre: templateName,
                                    importe: parseFloat(importeTotal),
                                    proveedor: proveedorName,
                                    concepto: conceptoName,
                                    taller: tallerName,
                                    tipo: activeTab,
                                    formaPago: formaPago,
                                    ivaPorcentaje: parseFloat(ivaPorcentaje)
                                });
                                setTemplates(getTemplates());
                                setShowSaveTemplate(false);
                                setTemplateName('');
                                showToast('Plantilla guardada con éxito', 'success');
                            }}>
                                ⭐ Guardar Plantilla
                            </PrimaryButton>
                            <PrimaryButton variant="outline" className="flex-1 py-3" onClick={() => setShowSaveTemplate(false)}>
                                Cancelar
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesScreen;
