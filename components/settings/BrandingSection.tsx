import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface BrandingSectionProps {
    logo: string;
    setLogo: (v: string) => void;
    fiscalData: {
        nombre: string;
        nif: string;
        direccion: string;
        telefono: string;
        email: string;
    };
    setFiscalData: (v: any) => void;
    setHasUserChanged: (v: boolean) => void;
}

const BrandingSection: React.FC<BrandingSectionProps> = ({
    logo, setLogo,
    fiscalData, setFiscalData,
    setHasUserChanged
}) => {
    const { isDark } = useTheme();

    const inputClass = `w-full p-2.5 rounded-lg border text-sm transition-all ${
        isDark 
        ? 'bg-zinc-800 border-zinc-700 text-white focus:border-blue-500' 
        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500'
    }`;

    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

    // Procesar URL para vista previa (especialmente para Google Drive)
    const getPreviewUrl = (url: string) => {
        if (!url) return null;
        let cleanUrl = url.replace(/['"]+/g, '').trim();
        
        const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([^/?&]+)/;
        const match = cleanUrl.match(driveRegex);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${match[1]}=s200`;
        }
        return cleanUrl;
    };

    const previewUrl = getPreviewUrl(logo);

    return (
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-6`}>
            <div>
                <h3 className="text-base font-bold mb-1">Identidad y Marca</h3>
                <p className="text-xs text-zinc-500 mb-4">Personaliza tus facturas e informes.</p>
                
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                            <label className={labelClass}>URL del Logo</label>
                            <input 
                                type="text" 
                                value={logo} 
                                onChange={(e) => { 
                                    const val = e.target.value.replace(/['"]+/g, '').trim();
                                    setHasUserChanged(true); 
                                    setLogo(val); 
                                }} 
                                placeholder="https://tudominio.com/logo.png"
                                className={inputClass} 
                            />
                            <p className="text-[10px] text-zinc-500 mt-1.5 px-1 italic">
                                Admite enlaces directos y Google Drive (sin comillas).
                            </p>
                        </div>

                        {previewUrl && (
                            <div className={`shrink-0 p-2 rounded-xl border ${isDark ? 'bg-black border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                                <div className="relative w-20 h-20 flex items-center justify-center overflow-hidden rounded-lg bg-white/5">
                                    <img 
                                        src={previewUrl} 
                                        alt="Logo Preview" 
                                        className="max-w-full max-h-full object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-[10px] text-zinc-500 text-center p-1">URL Inválida</span>';
                                        }}
                                    />
                                </div>
                                <span className="block text-[8px] mt-1 text-center font-bold uppercase tracking-tighter opacity-50">Vista Previa</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Nombre / Razón Social</label>
                            <input 
                                type="text" 
                                value={fiscalData.nombre} 
                                onChange={(e) => { setHasUserChanged(true); setFiscalData({ ...fiscalData, nombre: e.target.value }); }} 
                                className={inputClass} 
                            />
                        </div>
                        <div>
                            <label className={labelClass}>NIF / CIF</label>
                            <input 
                                type="text" 
                                value={fiscalData.nif} 
                                onChange={(e) => { setHasUserChanged(true); setFiscalData({ ...fiscalData, nif: e.target.value }); }} 
                                className={inputClass} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Dirección Fiscal</label>
                        <input 
                            type="text" 
                            value={fiscalData.direccion} 
                            onChange={(e) => { setHasUserChanged(true); setFiscalData({ ...fiscalData, direccion: e.target.value }); }} 
                            className={inputClass} 
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Teléfono</label>
                            <input 
                                type="tel" 
                                value={fiscalData.telefono} 
                                onChange={(e) => { setHasUserChanged(true); setFiscalData({ ...fiscalData, telefono: e.target.value }); }} 
                                className={inputClass} 
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input 
                                type="email" 
                                value={fiscalData.email} 
                                onChange={(e) => { setHasUserChanged(true); setFiscalData({ ...fiscalData, email: e.target.value }); }} 
                                className={inputClass} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandingSection;
