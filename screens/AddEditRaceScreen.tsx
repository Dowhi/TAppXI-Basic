import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, CarreraVista } from '../types';
import { getCarrera, addCarrera, updateCarrera, deleteCarrera, getValesDirectory, ValeDirectoryEntry } from '../services/api';
import ScreenTopBar from '../components/ScreenTopBar';

const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
const EuroIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H3v2h3.06c-.04.33-.06.66-.06 1s.02.67.06 1H3v2h3.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.78-1.77C18.09 17.91 16.61 18.5 15 18.5z"/></svg>;
const CreditCardIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>;
const BizumIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const ValesIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2h-2v2h2V4zM9 18H4v-2h5v2zm0-4H4v-2h5v2zm0-4H4V8h5v2zm7 8h-5v-2h5v2zm0-4h-5v-2h5v2zm0-4h-5V8h5v2z"/></svg>;

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

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-500 ${props.className}`} />
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...rest }) => (
    <textarea
        {...rest}
        className={`w-full min-h-[90px] p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-500 resize-y ${className}`}
    />
);

const CheckboxField: React.FC<{ label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 text-blue-600 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500" />
        <span className="text-sm font-medium text-zinc-300">{label}</span>
    </label>
);

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; }> = ({ children, onClick, className, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`w-full bg-blue-600 text-white px-3 py-3 rounded-lg font-bold flex items-center justify-center gap-1.5 text-base hover:bg-blue-700 transition-colors disabled:bg-zinc-700 disabled:text-zinc-400 ${className}`}>
        {children}
    </button>
);

const PaymentOption: React.FC<{
    label: 'Efectivo' | 'Tarjeta' | 'Bizum' | 'Vales';
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
}> = ({ label, icon, selected, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-colors w-full aspect-square
            ${selected ? 'bg-zinc-700 border-blue-500' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50'}`
        }
        aria-pressed={selected}
    >
        <div className={`w-7 h-7 mb-1 ${selected ? 'text-blue-400' : 'text-zinc-400'}`}>{icon}</div>
        <span className={`text-xs font-semibold ${selected ? 'text-zinc-50' : 'text-zinc-300'}`}>{label}</span>
    </button>
);

interface AddEditRaceScreenProps {
    navigateTo: (page: Seccion) => void;
    raceId: string | null;
}

const AddEditRaceScreen: React.FC<AddEditRaceScreenProps> = ({ navigateTo, raceId }) => {
    const isEditing = raceId !== null;

    const [taximetro, setTaximetro] = useState('');
    const [cobrado, setCobrado] = useState('');
    const [formaPago, setFormaPago] = useState<CarreraVista['formaPago']>('Efectivo');
    const [emisora, setEmisora] = useState(false);
    const [aeropuerto, setAeropuerto] = useState(false);
    const [cobradoManuallySet, setCobradoManuallySet] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTaximetroKeyboard, setShowTaximetroKeyboard] = useState(false);
    const [tempTaximetroValue, setTempTaximetroValue] = useState('');
    const [showCobradoKeyboard, setShowCobradoKeyboard] = useState(false);
    const [tempCobradoValue, setTempCobradoValue] = useState('');
    const [showValeModal, setShowValeModal] = useState(false);
    const [valeForm, setValeForm] = useState({
        despacho: '',
        numeroAlbaran: '',
        empresa: '',
        codigoEmpresa: '',
        autoriza: '',
    });
    const [valeFormTouched, setValeFormTouched] = useState(false);
    const [valeDirectory, setValeDirectory] = useState<ValeDirectoryEntry[]>([]);
    const [empresaManuallyEdited, setEmpresaManuallyEdited] = useState(false);
    const [notas, setNotas] = useState('');

    const isValeFormComplete = useMemo(() => {
        return Object.values(valeForm).every((value) => value.trim().length > 0);
    }, [valeForm]);

    const valeSuggestions = useMemo(() => {
        const codigo = valeForm.codigoEmpresa.trim().toLowerCase();
        if (!codigo) return [];
        return valeDirectory
            .filter((entry) => entry.codigoEmpresa.toLowerCase().includes(codigo))
            .slice(0, 5);
    }, [valeForm.codigoEmpresa, valeDirectory]);

    useEffect(() => {
        const fetchRaceData = async (id: string) => {
            setIsLoading(true);
            const race = await getCarrera(id);
            if (race) {
                setTaximetro(race.taximetro.toFixed(2));
                setCobrado(race.cobrado.toFixed(2));
                setFormaPago(race.formaPago);
                setEmisora(race.formaPago === 'Vales' ? true : race.emisora);
                setAeropuerto(race.aeropuerto);
                setNotas(race.notas || '');
                if (race.formaPago === 'Vales' && race.valeInfo) {
                    setValeForm({
                        despacho: race.valeInfo.despacho || '',
                        numeroAlbaran: race.valeInfo.numeroAlbaran || '',
                        empresa: race.valeInfo.empresa || '',
                        codigoEmpresa: race.valeInfo.codigoEmpresa || '',
                        autoriza: race.valeInfo.autoriza || '',
                    });
                    setEmpresaManuallyEdited(false);
                } else {
                    setValeForm({
                        despacho: '',
                        numeroAlbaran: '',
                        empresa: '',
                        codigoEmpresa: '',
                        autoriza: '',
                    });
                    setEmpresaManuallyEdited(false);
                }
                
                if (race.cobrado !== race.taximetro) {
                    setCobradoManuallySet(true);
                }
            } else {
                console.error("Race not found!");
                navigateTo(Seccion.VistaCarreras);
            }
            setIsLoading(false);
        };

        if (isEditing && raceId) {
            fetchRaceData(raceId);
        }
    }, [raceId, isEditing, navigateTo]);

    useEffect(() => {
        let isMounted = true;
        const loadValeDirectory = async () => {
            try {
                const entries = await getValesDirectory();
                if (!isMounted) return;
                setValeDirectory(entries);
            } catch (error) {
                console.error('Error cargando el directorio de vales:', error);
            }
        };
        loadValeDirectory();
        return () => {
            isMounted = false;
        };
    }, []);

    const handlePaymentSelection = (option: CarreraVista['formaPago']) => {
        setFormaPago(option);
        setEmisora(prev => (option === 'Vales' ? true : prev));
        if (option === 'Vales') {
            setValeFormTouched(false);
            setShowValeModal(true);
        } else {
            setShowValeModal(false);
        }
    };

    const handleTaximetroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTaximetro(value);
        if (!cobradoManuallySet) {
            setCobrado(value);
        }
    };

    const handleValeInputChange = (field: keyof typeof valeForm, value: string) => {
        if (field === 'empresa') {
            setEmpresaManuallyEdited(true);
            setValeForm((prev) => ({
                ...prev,
                empresa: value,
            }));
            return;
        }

        if (field === 'codigoEmpresa') {
            let autoFilledEmpresa = false;
            setValeForm((prev) => {
                const next = {
                    ...prev,
                    codigoEmpresa: value,
                };

                const trimmed = value.trim();
                if (!trimmed) {
                    if (!empresaManuallyEdited) {
                        next.empresa = '';
                        autoFilledEmpresa = true;
                    }
                } else {
                    const match = valeDirectory.find((entry) =>
                        entry.codigoEmpresa.toLowerCase().startsWith(trimmed.toLowerCase())
                    );
                    if (
                        match &&
                        (!empresaManuallyEdited ||
                            prev.empresa.trim().length === 0 ||
                            prev.codigoEmpresa !== trimmed)
                    ) {
                        next.empresa = match.empresa;
                        autoFilledEmpresa = true;
                    }
                }

                return next;
            });
            if (autoFilledEmpresa) {
                setEmpresaManuallyEdited(false);
            }
            return;
        }

        setValeForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleValeRegister = () => {
        setValeFormTouched(true);
        const sanitized = {
            despacho: valeForm.despacho.trim(),
            numeroAlbaran: valeForm.numeroAlbaran.trim(),
            empresa: valeForm.empresa.trim(),
            codigoEmpresa: valeForm.codigoEmpresa.trim(),
            autoriza: valeForm.autoriza.trim(),
        };
        const hasEmpty = Object.values(sanitized).some((value) => value.length === 0);
        if (hasEmpty) {
            return;
        }
        setValeForm(sanitized);
        setEmpresaManuallyEdited(false);
        setShowValeModal(false);
    };

    const handleValeSuggestionSelect = (entry: ValeDirectoryEntry) => {
        setValeForm((prev) => ({
            ...prev,
            codigoEmpresa: entry.codigoEmpresa,
            empresa: entry.empresa,
        }));
        setEmpresaManuallyEdited(false);
    };

    const handleTaximetroClick = () => {
        setTempTaximetroValue(taximetro);
        setShowTaximetroKeyboard(true);
    };

    const handleNumberKeyPress = (num: string) => {
        setTempTaximetroValue(prev => {
            // Si está vacío o es 0, reemplazar
            if (prev === '' || prev === '0') {
                return num;
            }
            // Agregar el número
            return prev + num;
        });
    };

    const handleDecimalPoint = () => {
        setTempTaximetroValue(prev => {
            // Si ya tiene punto decimal, no hacer nada
            if (prev.includes('.')) {
                return prev;
            }
            // Si está vacío, agregar "0."
            if (prev === '') {
                return '0.';
            }
            // Agregar el punto
            return prev + '.';
        });
    };

    const handleBackspace = () => {
        setTempTaximetroValue(prev => {
            if (prev.length <= 1) {
                return '';
            }
            return prev.slice(0, -1);
        });
    };

    const handleClear = () => {
        setTempTaximetroValue('');
    };

    const handleTaximetroOk = () => {
        const value = tempTaximetroValue || '0';
        setTaximetro(value);
        if (!cobradoManuallySet) {
            setCobrado(value);
        }
        setShowTaximetroKeyboard(false);
    };

    const handleCobradoClick = () => {
        setTempCobradoValue('');
        setCobradoManuallySet(true);
        setShowCobradoKeyboard(true);
    };

    const handleCobradoNumberKeyPress = (num: string) => {
        setTempCobradoValue(prev => {
            // Si está vacío o es 0, reemplazar
            if (prev === '' || prev === '0') {
                return num;
            }
            // Agregar el número
            return prev + num;
        });
    };

    const handleCobradoDecimalPoint = () => {
        setTempCobradoValue(prev => {
            // Si ya tiene punto decimal, no hacer nada
            if (prev.includes('.')) {
                return prev;
            }
            // Si está vacío, agregar "0."
            if (prev === '') {
                return '0.';
            }
            // Agregar el punto
            return prev + '.';
        });
    };

    const handleCobradoBackspace = () => {
        setTempCobradoValue(prev => {
            if (prev.length <= 1) {
                return '';
            }
            return prev.slice(0, -1);
        });
    };

    const handleCobradoClear = () => {
        setTempCobradoValue('');
    };

    const handleCobradoOk = () => {
        const value = tempCobradoValue || '0';
        setCobrado(value);
        setCobradoManuallySet(true);
        setShowCobradoKeyboard(false);
    };

    const handleCobradoFocus = () => {
        if (!cobradoManuallySet) {
            setCobrado('');
        }
        setCobradoManuallySet(true);
    };
    
    const handleCobradoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCobrado(e.target.value);
        setCobradoManuallySet(true);
    };

    const taximetroValue = parseFloat(taximetro) || 0;
    const cobradoValue = parseFloat(cobrado) || 0;
    const propinaValue = cobradoValue - taximetroValue;

    const handleSave = async () => {
        // Validar que al menos uno de los campos tenga un valor
        if (taximetroValue <= 0 && cobradoValue <= 0) {
            alert('Por favor, ingresa al menos un valor en Taxímetro o Cobrado');
            return;
        }

        const sanitizedValeInfo = {
            despacho: valeForm.despacho.trim(),
            numeroAlbaran: valeForm.numeroAlbaran.trim(),
            empresa: valeForm.empresa.trim(),
            codigoEmpresa: valeForm.codigoEmpresa.trim(),
            autoriza: valeForm.autoriza.trim(),
        };
        const isValePayment = formaPago === 'Vales';
        const sanitizedNotas = notas.trim();

        if (isValePayment) {
            const hasEmpty = Object.values(sanitizedValeInfo).some((value) => value.length === 0);
            if (hasEmpty) {
                setValeFormTouched(true);
                setShowValeModal(true);
                alert('Completa todos los datos del vale antes de registrar.');
                return;
            }
            setValeForm(sanitizedValeInfo);
        }

        setIsSubmitting(true);
        const carreraData = {
            taximetro: taximetroValue,
            cobrado: cobradoValue || taximetroValue, // Si no hay cobrado, usar taximetro
            formaPago,
            emisora,
            aeropuerto,
            valeInfo: isValePayment ? sanitizedValeInfo : null,
            notas: sanitizedNotas.length > 0 ? sanitizedNotas : null,
        };
        try {
            if (isEditing && raceId) {
                await updateCarrera(raceId, { ...carreraData, fechaHora: new Date() });
            } else {
                await addCarrera({ ...carreraData, fechaHora: new Date() });
            }
            // Navegar de vuelta a la pantalla de carreras después de guardar
            navigateTo(Seccion.VistaCarreras);
        } catch (error) {
            console.error("Failed to save race:", error);
            alert('Error al guardar la carrera. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (isEditing && raceId && window.confirm("¿Estás seguro de que quieres eliminar esta carrera?")) {
            setIsSubmitting(true);
            try {
                await deleteCarrera(raceId);
                navigateTo(Seccion.VistaCarreras);
            } catch (error) {
                console.error("Failed to delete race:", error);
                alert('Error al eliminar la carrera. Por favor, inténtalo de nuevo.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const headerTitle = isEditing ? 'Editar Carrera' : 'Introducir Carrera';
    const topBar = (
        <ScreenTopBar
            title={headerTitle}
            navigateTo={navigateTo}
            backTarget={Seccion.VistaCarreras}
            className="mb-4"
            rightSlot={
                isEditing ? (
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-zinc-900 hover:text-red-600 transition-colors"
                        aria-label="Eliminar carrera"
                    >
                        <DeleteIcon />
                    </button>
                ) : (
                    <div className="w-6" />
                )
            }
        />
    );

    if (isLoading) {
        return (
            <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-6 space-y-4">
                {topBar}
                <div className="text-center text-zinc-400">Cargando datos de la carrera...</div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-24 space-y-4">
            {topBar}
            
            <FormCard title="Detalles de la Carrera">
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Taxímetro">
                        <button
                            onClick={handleTaximetroClick}
                            className="w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md text-left text-sm text-zinc-100 hover:border-blue-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            {taximetro || <span className="text-zinc-500">0.00</span>}
                        </button>
                            </FormField>
                    <FormField label="Cobrado">
                        <button
                            onClick={handleCobradoClick}
                            className="w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md text-left text-sm text-zinc-100 hover:border-blue-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            {cobrado || <span className="text-zinc-500">0.00</span>}
                        </button>
                         {cobrado && taximetro && cobradoValue !== taximetroValue && (
                            <p className={`text-xs mt-1.5 ${propinaValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {propinaValue >= 0 ? `Propina: ${propinaValue.toFixed(2)}€` : `Diferencia: ${propinaValue.toFixed(2)}€`}
                            </p>
                        )}
                            </FormField>
                    <FormField label="Forma de Pago" className="col-span-2">
                         <div className="grid grid-cols-4 gap-2">
                            <PaymentOption label="Efectivo" icon={<EuroIcon />} selected={formaPago === 'Efectivo'} onClick={() => handlePaymentSelection('Efectivo')} />
                            <PaymentOption label="Tarjeta" icon={<CreditCardIcon />} selected={formaPago === 'Tarjeta'} onClick={() => handlePaymentSelection('Tarjeta')} />
                            <PaymentOption label="Bizum" icon={<BizumIcon />} selected={formaPago === 'Bizum'} onClick={() => handlePaymentSelection('Bizum')} />
                            <PaymentOption label="Vales" icon={<ValesIcon />} selected={formaPago === 'Vales'} onClick={() => handlePaymentSelection('Vales')} />
                                </div>
                                {formaPago === 'Vales' && (
                                    <div className="mt-3 space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowValeModal(true)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {isValeFormComplete ? 'Editar datos del vale' : 'Registrar datos del vale'}
                                        </button>
                                        <p className={`text-xs ${isValeFormComplete ? 'text-emerald-400' : 'text-amber-300'}`}>
                                            {isValeFormComplete ? 'Datos del vale registrados.' : 'Faltan datos del vale por completar.'}
                                        </p>
                                    </div>
                                )}
                            </FormField>
                            
                    <div className="col-span-2 flex justify-around items-center pt-2">
                        <CheckboxField label="Emisora" checked={emisora} onChange={(e) => setEmisora(e.target.checked)} />
                        <CheckboxField label="Aeropuerto" checked={aeropuerto} onChange={(e) => setAeropuerto(e.target.checked)} />
                    </div>
                </div>
            </FormCard>

            <div className="pt-4">
                <PrimaryButton onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Añadir Carrera')}
                </PrimaryButton>
            </div>

            <FormCard title="Notas">
                <TextArea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Añade observaciones adicionales sobre la carrera"
                />
            </FormCard>

            {showValeModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 md:items-center"
                    onClick={() => setShowValeModal(false)}
                >
                    <div
                        className="bg-zinc-900 w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl border border-zinc-800 p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-zinc-100">Datos del Vale</h3>
                            <button
                                type="button"
                                onClick={() => setShowValeModal(false)}
                                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                                aria-label="Cerrar"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-1">Despacho</label>
                                <TextInput
                                    value={valeForm.despacho}
                                    onChange={(e) => handleValeInputChange('despacho', e.target.value)}
                                    placeholder="Introduce el despacho"
                                />
                                {valeFormTouched && valeForm.despacho.trim().length === 0 && (
                                    <p className="text-xs text-red-400 mt-1">Este campo es obligatorio.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-1">Nº de Albarán</label>
                                <TextInput
                                    value={valeForm.numeroAlbaran}
                                    onChange={(e) => handleValeInputChange('numeroAlbaran', e.target.value)}
                                    placeholder="Introduce el número de albarán"
                                />
                                {valeFormTouched && valeForm.numeroAlbaran.trim().length === 0 && (
                                    <p className="text-xs text-red-400 mt-1">Este campo es obligatorio.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-1">Nº Empresa</label>
                                <TextInput
                                    value={valeForm.codigoEmpresa}
                                    onChange={(e) => handleValeInputChange('codigoEmpresa', e.target.value)}
                                    placeholder="Introduce el número de empresa"
                                />
                                {valeFormTouched && valeForm.codigoEmpresa.trim().length === 0 && (
                                    <p className="text-xs text-red-400 mt-1">Este campo es obligatorio.</p>
                                )}
                                {valeSuggestions.length > 0 && (
                                    <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
                                        {valeSuggestions.map((suggestion) => (
                                            <button
                                                key={`${suggestion.codigoEmpresa}-${suggestion.empresa}`}
                                                type="button"
                                                onClick={() => handleValeSuggestionSelect(suggestion)}
                                                className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-700 transition-colors flex justify-between gap-2"
                                            >
                                                <span className="font-semibold">{suggestion.codigoEmpresa}</span>
                                                <span className="text-zinc-400 truncate">{suggestion.empresa || 'Sin nombre'}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-1">Empresa</label>
                                <TextInput
                                    value={valeForm.empresa}
                                    onChange={(e) => handleValeInputChange('empresa', e.target.value)}
                                    placeholder="Introduce la empresa"
                                />
                                {valeFormTouched && valeForm.empresa.trim().length === 0 && (
                                    <p className="text-xs text-red-400 mt-1">Este campo es obligatorio.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-1">Autoriza</label>
                                <TextInput
                                    value={valeForm.autoriza}
                                    onChange={(e) => handleValeInputChange('autoriza', e.target.value)}
                                    placeholder="Persona que autoriza"
                                />
                                {valeFormTouched && valeForm.autoriza.trim().length === 0 && (
                                    <p className="text-xs text-red-400 mt-1">Este campo es obligatorio.</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowValeModal(false)}
                                className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleValeRegister}
                                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Teclado Numérico para Taxímetro */}
            {showTaximetroKeyboard && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50" onClick={() => setShowTaximetroKeyboard(false)}>
                    <div className="bg-zinc-900 w-full max-w-md rounded-t-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Pantalla de visualización */}
                        <div className="bg-zinc-800 p-6 border-b border-zinc-700">
                            <div className="text-zinc-400 text-sm mb-2">Taxímetro</div>
                            <div className="text-white text-4xl font-bold text-right min-h-[60px] flex items-center justify-end">
                                {tempTaximetroValue || '0.00'}
                            </div>
                        </div>

                        {/* Teclado Numérico */}
                        <div className="p-4">
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                {/* Fila 1 */}
                                <button
                                    onClick={() => handleNumberKeyPress('7')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    7
                                </button>
                                <button
                                    onClick={() => handleNumberKeyPress('8')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    8
                                </button>
                                <button
                                    onClick={() => handleNumberKeyPress('9')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    9
                                </button>
                                
                                {/* Fila 2 */}
                                <button
                                    onClick={() => handleNumberKeyPress('4')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    4
                                </button>
                                <button
                                    onClick={() => handleNumberKeyPress('5')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    5
                                </button>
                                <button
                                    onClick={() => handleNumberKeyPress('6')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    6
                                </button>
                                
                                {/* Fila 3 */}
                                <button
                                    onClick={() => handleNumberKeyPress('1')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    1
                                </button>
                                <button
                                    onClick={() => handleNumberKeyPress('2')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    2
                                </button>
                                <button
                                    onClick={() => handleNumberKeyPress('3')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    3
                                </button>
                                
                                {/* Fila 4 */}
                                <button
                                    onClick={handleClear}
                                    className="bg-red-600 hover:bg-red-700 text-white text-lg font-bold py-4 rounded-lg transition-colors active:bg-red-800"
                                >
                                    C
                                </button>
                                <button
                                    onClick={() => handleNumberKeyPress('0')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    0
                                </button>
                                <button
                                    onClick={handleBackspace}
                                    className="bg-zinc-700 hover:bg-zinc-600 text-white text-xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-500"
                                >
                                    ⌫
                                </button>
                            </div>
                            
                            {/* Fila de punto decimal y OK */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleDecimalPoint}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    .
                                </button>
                                <button
                                    onClick={handleTaximetroOk}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-lg transition-colors active:bg-green-800"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Teclado Numérico para Cobrado */}
            {showCobradoKeyboard && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50" onClick={() => setShowCobradoKeyboard(false)}>
                    <div className="bg-zinc-900 w-full max-w-md rounded-t-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Pantalla de visualización */}
                        <div className="bg-zinc-800 p-6 border-b border-zinc-700">
                            <div className="text-zinc-400 text-sm mb-2">Cobrado</div>
                            <div className="text-white text-4xl font-bold text-right min-h-[60px] flex items-center justify-end">
                                {tempCobradoValue || '0.00'}
                            </div>
                        </div>

                        {/* Teclado Numérico */}
                        <div className="p-4">
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                {/* Fila 1 */}
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('7')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    7
                                </button>
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('8')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    8
                                </button>
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('9')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    9
                                </button>
                                
                                {/* Fila 2 */}
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('4')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    4
                                </button>
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('5')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    5
                                </button>
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('6')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    6
                                </button>
                                
                                {/* Fila 3 */}
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('1')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    1
                                </button>
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('2')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    2
                                </button>
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('3')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    3
                                </button>
                                
                                {/* Fila 4 */}
                                <button
                                    onClick={handleCobradoClear}
                                    className="bg-red-600 hover:bg-red-700 text-white text-lg font-bold py-4 rounded-lg transition-colors active:bg-red-800"
                                >
                                    C
                                </button>
                                <button
                                    onClick={() => handleCobradoNumberKeyPress('0')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    0
                                </button>
                                <button
                                    onClick={handleCobradoBackspace}
                                    className="bg-zinc-700 hover:bg-zinc-600 text-white text-xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-500"
                                >
                                    ⌫
                                </button>
                            </div>
                            
                            {/* Fila de punto decimal y OK */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleCobradoDecimalPoint}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors active:bg-zinc-600"
                                >
                                    .
                                </button>
                                <button
                                    onClick={handleCobradoOk}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-lg transition-colors active:bg-green-800"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddEditRaceScreen;