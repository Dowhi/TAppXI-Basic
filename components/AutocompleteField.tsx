import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteItem {
    id: string;
    nombre: string;
}

interface AutocompleteFieldProps<T extends AutocompleteItem> {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onSelect: (item: T) => void;
    items: T[];
    onAddNew?: () => void;
    readOnly?: boolean;
    className?: string;
}

const AutocompleteField = <T extends AutocompleteItem>({
    label,
    placeholder,
    value,
    onChange,
    onSelect,
    items,
    onAddNew,
    readOnly,
    className = ""
}: AutocompleteFieldProps<T>) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredItems, setFilteredItems] = useState<T[]>([]);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (value.trim() === '') {
            setFilteredItems([]);
            setShowDropdown(false);
        } else {
            const filtered = items.filter(item =>
                item.nombre.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredItems(filtered);

            // Hide if exact match
            const exactMatch = items.some(item =>
                item.nombre.toLowerCase() === value.toLowerCase()
            );
            setShowDropdown(filtered.length > 0 && !exactMatch);
        }
    }, [value, items]);

    const handleFocus = () => {
        const exactMatch = items.some(item =>
            item.nombre.toLowerCase() === value.toLowerCase()
        );
        if (filteredItems.length > 0 && !exactMatch) {
            setShowDropdown(true);
        }
    };

    const handleBlur = () => {
        blurTimeoutRef.current = setTimeout(() => {
            setShowDropdown(false);
        }, 200);
    };

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        };
    }, []);

    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-sm font-medium text-zinc-400">{label}</label>
            <div className="relative">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        readOnly={readOnly}
                        className={`flex-grow p-2 border border-zinc-700 bg-zinc-800/50 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-zinc-100 placeholder:text-zinc-500 ${readOnly ? 'bg-zinc-800 cursor-not-allowed' : ''}`}
                    />
                    {onAddNew && (
                        <button
                            type="button"
                            onClick={onAddNew}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 text-sm hover:bg-blue-700 transition-colors disabled:bg-zinc-700 disabled:text-zinc-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            <span>Nuevo</span>
                        </button>
                    )}
                </div>

                {showDropdown && filteredItems.length > 0 && (
                    <div
                        className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {filteredItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    onSelect(item);
                                    setShowDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 transition-colors"
                            >
                                {item.nombre}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutocompleteField;
