import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface DeveloperSectionProps {
    adminMode: boolean;
    targetDeviceId: string;
    generatedCode: string;
    onSetTargetDeviceId: (val: string) => void;
    onGenerateLicense: () => void;
    onAdminTrigger: () => void;
}

const DeveloperSection: React.FC<DeveloperSectionProps> = ({
    adminMode,
    targetDeviceId,
    generatedCode,
    onSetTargetDeviceId,
    onGenerateLicense,
    onAdminTrigger
}) => {
    const { isDark } = useTheme();

    if (!adminMode) {
        return (
            <p
                onClick={onAdminTrigger}
                className={`mt-12 text-center text-[10px] select-none cursor-pointer active:opacity-50 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}
            >
                TAppXI v1.0 • Acciso Restringido
            </p>
        );
    }

    return (
        <div className="mt-8 space-y-4">
            <div className={`p-4 rounded-xl border border-dashed ${isDark ? 'bg-purple-900/10 border-purple-500/50' : 'bg-purple-50 border-purple-300'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🛠️</span>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Admin / Licencias</h3>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className={`block text-xs uppercase font-bold mb-1 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>ID del Terminal</label>
                        <input
                            type="text"
                            value={targetDeviceId}
                            onChange={(e) => onSetTargetDeviceId(e.target.value.toUpperCase())}
                            placeholder="XXXX-XXXX"
                            className={`w-full p-3 rounded-lg font-mono text-center tracking-widest text-lg ${isDark ? 'bg-black/40 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-purple-900'}`}
                        />
                    </div>

                    <button 
                        onClick={onGenerateLicense}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        Generar Código de Desbloqueo
                    </button>

                    {generatedCode && (
                        <div className={`mt-4 p-4 rounded-lg border-2 border-dashed text-center animate-pulse ${isDark ? 'bg-black/60 border-purple-500' : 'bg-white border-purple-400'}`}>
                            <p className="text-[10px] uppercase font-bold text-purple-500 mb-1">CÓDIGO GENERADO</p>
                            <p className="text-3xl font-mono font-black tracking-[0.2em]">{generatedCode}</p>
                        </div>
                    )}
                </div>
            </div>

            <p
                onClick={onAdminTrigger}
                className={`text-center text-[10px] select-none cursor-pointer ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}
            >
                TAppXI v1.0 • Modo Desarrollador Activo
            </p>
        </div>
    );
};

export default DeveloperSection;
