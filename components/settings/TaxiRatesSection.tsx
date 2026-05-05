import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface TaxiRatesSectionProps {
    tarifa1: number;
    setTarifa1: (v: number) => void;
    tarifa2: number;
    setTarifa2: (v: number) => void;
    tarifa3: number;
    setTarifa3: (v: number) => void;
    tarifaAeropuertoDia: number;
    setTarifaAeropuertoDia: (v: number) => void;
    tarifaAeropuertoNoche: number;
    setTarifaAeropuertoNoche: (v: number) => void;
    setHasUserChanged: (v: boolean) => void;
}

const TaxiRatesSection: React.FC<TaxiRatesSectionProps> = ({
    tarifa1, setTarifa1,
    tarifa2, setTarifa2,
    tarifa3, setTarifa3,
    tarifaAeropuertoDia, setTarifaAeropuertoDia,
    tarifaAeropuertoNoche, setTarifaAeropuertoNoche,
    setHasUserChanged
}) => {
    const { isDark } = useTheme();

    const parseNumberInput = (value: string): number => {
        const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const formatNumberValue = (value: number) => Number.isFinite(value) ? value : undefined;

    const inputClass = `w-full p-2.5 rounded-lg border text-sm font-medium transition-all ${isDark
            ? 'bg-zinc-800 border-zinc-700 text-white focus:border-blue-500'
            : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500'
        }`;

    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

    return (
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-6`}>
            <div>
                <h3 className="text-base font-bold mb-1">Tarifas Urbanas</h3>
                <p className="text-xs text-zinc-500 mb-4">Importes mínimos para servicios urbanos.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Tarifa 1</label>
                        <div className="relative">
                            <input type="number" step="0.01" value={formatNumberValue(tarifa1)} onChange={(e) => { setHasUserChanged(true); setTarifa1(parseNumberInput(e.target.value)); }} className={inputClass} />
                            <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">€</span>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Tarifa 2</label>
                        <div className="relative">
                            <input type="number" step="0.01" value={formatNumberValue(tarifa2)} onChange={(e) => { setHasUserChanged(true); setTarifa2(parseNumberInput(e.target.value)); }} className={inputClass} />
                            <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">€</span>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Tarifa 3</label>
                        <div className="relative">
                            <input type="number" step="0.01" value={formatNumberValue(tarifa3)} onChange={(e) => { setHasUserChanged(true); setTarifa3(parseNumberInput(e.target.value)); }} className={inputClass} />
                            <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">€</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <h3 className="text-base font-bold mb-1">Tarifas Aeropuerto</h3>
                <p className="text-xs text-zinc-500 mb-4">Importes fijos para traslados a terminales.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>TARIFA 4 (Día)</label>
                        <div className="relative">
                            <input type="number" step="0.01" value={formatNumberValue(tarifaAeropuertoDia)} onChange={(e) => { setHasUserChanged(true); setTarifaAeropuertoDia(parseNumberInput(e.target.value)); }} className={inputClass} />
                            <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">€</span>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>TARIFA 5 (Noche)</label>
                        <div className="relative">
                            <input type="number" step="0.01" value={formatNumberValue(tarifaAeropuertoNoche)} onChange={(e) => { setHasUserChanged(true); setTarifaAeropuertoNoche(parseNumberInput(e.target.value)); }} className={inputClass} />
                            <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">€</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxiRatesSection;
