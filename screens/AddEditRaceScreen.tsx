import React, { useState, useEffect } from 'react';
import { Seccion, CarreraVista } from '../types';
import { getCarrera, addCarrera, updateCarrera, deleteCarrera } from '../services/api';
import KineticHeader from '../components/KineticHeader';

// Icons
const ArrowBackIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
    </svg>
);
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

    useEffect(() => {
        const fetchRaceData = async (id: string) => {
            setIsLoading(true);
            const race = await getCarrera(id);
            if (race) {
                setTaximetro(race.taximetro.toFixed(2));
                setCobrado(race.cobrado.toFixed(2));
                setFormaPago(race.formaPago);
                setEmisora(race.emisora);
                setAeropuerto(race.aeropuerto);
                
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

    const handleTaximetroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTaximetro(value);
        if (!cobradoManuallySet) {
            setCobrado(value);
        }
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

        setIsSubmitting(true);
        const carreraData = {
            taximetro: taximetroValue,
            cobrado: cobradoValue || taximetroValue, // Si no hay cobrado, usar taximetro
            formaPago,
            emisora,
            aeropuerto,
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

    const handleBack = () => {
        navigateTo(Seccion.VistaCarreras);
    };

    if (isLoading) {
        return <div className="text-center text-zinc-400">Cargando datos de la carrera...</div>;
    }

    return (
        <div className="space-y-4 relative">
            {/* Flecha fija en la esquina superior izquierda */}
                    <button 
                onClick={handleBack}
                aria-label="Volver"
                className="fixed top-4 left-4 p-2.5 text-white bg-zinc-900/70 border border-zinc-700 rounded-full z-50 shadow-md hover:bg-zinc-900/80 transition-colors focus:outline-none"
                style={{ zIndex: 999 }}
                    >
                <ArrowBackIcon className="w-5 h-5 text-white" />
                    </button>
            <header className="flex justify-between items-center">
                <div className="w-10" />
                <KineticHeader title={isEditing ? 'Editar Carrera' : 'Introducir Carrera'} />
                {isEditing ? (
                    <button onClick={handleDelete} className="p-2 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete race">
                        <DeleteIcon />
                    </button>
                ) : <div className="w-10" /> }
            </header>
            
            <FormCard title="Detalles de la Carrera">
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Taxímetro">
                        <TextInput type="number" value={taximetro} onChange={handleTaximetroChange} placeholder="0.00" />
                            </FormField>
                    <FormField label="Cobrado">
                        <TextInput type="number" value={cobrado} onFocus={handleCobradoFocus} onChange={handleCobradoChange} placeholder="0.00" />
                         {cobrado && taximetro && cobradoValue !== taximetroValue && (
                            <p className={`text-xs mt-1.5 ${propinaValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {propinaValue >= 0 ? `Propina: ${propinaValue.toFixed(2)}€` : `Diferencia: ${propinaValue.toFixed(2)}€`}
                            </p>
                        )}
                            </FormField>
                    <FormField label="Forma de Pago" className="col-span-2">
                         <div className="grid grid-cols-4 gap-2">
                            <PaymentOption label="Efectivo" icon={<EuroIcon />} selected={formaPago === 'Efectivo'} onClick={() => setFormaPago('Efectivo')} />
                            <PaymentOption label="Tarjeta" icon={<CreditCardIcon />} selected={formaPago === 'Tarjeta'} onClick={() => setFormaPago('Tarjeta')} />
                            <PaymentOption label="Bizum" icon={<BizumIcon />} selected={formaPago === 'Bizum'} onClick={() => setFormaPago('Bizum')} />
                            <PaymentOption label="Vales" icon={<ValesIcon />} selected={formaPago === 'Vales'} onClick={() => setFormaPago('Vales')} />
                                </div>
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
        </div>
    );
};

export default AddEditRaceScreen;