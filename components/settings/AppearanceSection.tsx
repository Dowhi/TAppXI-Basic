import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useFontSize } from '../../contexts/FontSizeContext';

interface AppearanceSectionProps {
    temaOscuro: boolean;
    setTemaOscuro: (v: boolean) => void;
    temaColor: string;
    setTemaColor: (v: string) => void;
    altoContraste: boolean;
    setAltoContraste: (v: boolean) => void;
    tamanoFuente: number;
    setTamanoFuente: (v: number) => void;
    objetivoDiario: number;
    setObjetivoDiario: (v: number) => void;
    setHasUserChanged: (v: boolean) => void;
}

const AppearanceSection: React.FC<AppearanceSectionProps> = ({
    temaOscuro,
    setTemaOscuro,
    temaColor,
    setTemaColor,
    altoContraste,
    setAltoContraste,
    tamanoFuente,
    setTamanoFuente,
    objetivoDiario,
    setObjetivoDiario,
    setHasUserChanged
}) => {
    const { setTheme, toggleHighContrast, setThemeName, setFontSize } = useTheme() as any; // Using any for simplicity in this refactor step if types are slightly different
    const { setFontSize: setGlobalFontSize } = useFontSize();

    return (
        <div className="space-y-4">
            {/* Dark Mode */}
            <div className={`p-4 rounded-xl border ${temaOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} flex items-center justify-between`}>
                <div>
                    <h3 className="font-bold">Tema Oscuro</h3>
                    <p className={`text-xs ${temaOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>Activar o desactivar el tema oscuro</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={temaOscuro}
                        onChange={(e) => {
                            setHasUserChanged(true);
                            setTemaOscuro(e.target.checked);
                            setTheme(e.target.checked);
                        }}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* Accent Color */}
            <div className={`p-4 rounded-xl border ${temaOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-3`}>
                <h3 className="font-bold">Color de Acento</h3>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: "azul", label: "Azul", color: "bg-blue-500" },
                        { id: "esmeralda", label: "Esmeralda", color: "bg-emerald-500" },
                        { id: "ambar", label: "Ámbar", color: "bg-amber-400" },
                        { id: "fucsia", label: "Fucsia", color: "bg-fuchsia-500" },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setHasUserChanged(true);
                                setTemaColor(t.id);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${temaColor === t.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-zinc-700'}`}
                        >
                            <span>{t.label}</span>
                            <span className={`w-3 h-3 rounded-full ${t.color}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Font Size */}
            <div className={`p-4 rounded-xl border ${temaOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-2`}>
                <div className="flex justify-between items-center">
                    <h3 className="font-bold">Tamaño de Fuente</h3>
                    <span className="text-sm font-mono">{tamanoFuente}px</span>
                </div>
                <input
                    type="range"
                    min="12"
                    max="22"
                    value={tamanoFuente}
                    onChange={(e) => {
                        const size = Number(e.target.value);
                        setHasUserChanged(true);
                        setTamanoFuente(size);
                    }}
                    onPointerUp={(e) => setGlobalFontSize(Number((e.target as HTMLInputElement).value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            {/* Daily Goal */}
            <div className={`p-4 rounded-xl border ${temaOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-2`}>
                <h3 className="font-bold">Objetivo Diario</h3>
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        value={objetivoDiario}
                        onChange={(e) => setObjetivoDiario(Number(e.target.value))}
                        className={`flex-1 p-2 rounded-lg border ${temaOscuro ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                    />
                    <span className="font-bold text-zinc-500 text-sm">EUR</span>
                </div>
            </div>
        </div>
    );
};

export default AppearanceSection;
