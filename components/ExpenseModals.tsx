import React from 'react';

// Reusable UI components matching the app's style
const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-400">{label}</label>
        {children}
    </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-500"
    />
);

const TextAreaInput: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        {...props}
        className="w-full p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-500"
    />
);

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }> = ({ children, onClick, disabled, className = "" }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 text-sm hover:bg-blue-700 transition-colors disabled:bg-zinc-700 disabled:text-zinc-400 ${className}`}
    >
        {children}
    </button>
);

const ModalWrapper: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-zinc-100 mb-4">{title}</h3>
            {children}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </div>
);

interface ProveedorModalProps {
    onClose: () => void;
    onSave: (data: { nombre: string; direccion?: string; telefono?: string; nif?: string }) => Promise<void>;
    initialName?: string;
}

export const ProveedorModal: React.FC<ProveedorModalProps> = ({ onClose, onSave, initialName = "" }) => {
    const [name, setName] = React.useState(initialName);
    const [direccion, setDireccion] = React.useState('');
    const [telefono, setTelefono] = React.useState('');
    const [nif, setNif] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }
        setIsSaving(true);
        try {
            await onSave({ nombre: name, direccion, telefono, nif });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ModalWrapper title="Nuevo Proveedor" onClose={onClose}>
            <div className="space-y-4">
                <FormField label="Nombre *">
                    <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </FormField>
                <FormField label="Dirección">
                    <TextInput value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                </FormField>
                <FormField label="Teléfono">
                    <TextInput value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </FormField>
                <FormField label="NIF">
                    <TextInput value={nif} onChange={(e) => setNif(e.target.value)} />
                </FormField>
                <div className="flex gap-2 pt-2">
                    <PrimaryButton onClick={handleSave} disabled={isSaving} className="flex-1">
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </PrimaryButton>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

interface ConceptoModalProps {
    onClose: () => void;
    onSave: (data: { nombre: string; descripcion?: string; categoria?: string }) => Promise<void>;
    initialName?: string;
}

export const ConceptoModal: React.FC<ConceptoModalProps> = ({ onClose, onSave, initialName = "" }) => {
    const [name, setName] = React.useState(initialName);
    const [descripcion, setDescripcion] = React.useState('');
    const [categoria, setCategoria] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }
        setIsSaving(true);
        try {
            await onSave({ nombre: name, descripcion, categoria });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ModalWrapper title="Nuevo Concepto" onClose={onClose}>
            <div className="space-y-4">
                <FormField label="Nombre *">
                    <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </FormField>
                <FormField label="Descripción">
                    <TextAreaInput rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </FormField>
                <FormField label="Categoría">
                    <TextInput value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                </FormField>
                <div className="flex gap-2 pt-2">
                    <PrimaryButton onClick={handleSave} disabled={isSaving} className="flex-1">
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </PrimaryButton>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

interface TallerModalProps {
    onClose: () => void;
    onSave: (data: { nombre: string; direccion?: string; telefono?: string }) => Promise<void>;
    initialName?: string;
}

export const TallerModal: React.FC<TallerModalProps> = ({ onClose, onSave, initialName = "" }) => {
    const [name, setName] = React.useState(initialName);
    const [direccion, setDireccion] = React.useState('');
    const [telefono, setTelefono] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }
        setIsSaving(true);
        try {
            await onSave({ nombre: name, direccion, telefono });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ModalWrapper title="Nuevo Taller" onClose={onClose}>
            <div className="space-y-4">
                <FormField label="Nombre *">
                    <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </FormField>
                <FormField label="Dirección">
                    <TextInput value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                </FormField>
                <FormField label="Teléfono">
                    <TextInput value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </FormField>
                <div className="flex gap-2 pt-2">
                    <PrimaryButton onClick={handleSave} disabled={isSaving} className="flex-1">
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </PrimaryButton>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};
