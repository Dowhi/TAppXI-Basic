import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface DataActionsSectionProps {
    isCleaning: boolean;
    isDeleting: boolean;
    archiving: boolean;
    archiveMonths: number;
    archiveResult: string | null;
    setArchiveMonths: (n: number) => void;
    onCleanDuplicates: () => void;
    onDeleteAllData: () => void;
    onArchiveData: () => void;
}

const DataActionsSection: React.FC<DataActionsSectionProps> = ({
    isCleaning,
    isDeleting,
    archiving,
    archiveMonths,
    archiveResult,
    setArchiveMonths,
    onCleanDuplicates,
    onDeleteAllData,
    onArchiveData
}) => {
    const { isDark } = useTheme();

    return (
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-6`}>
            <div>
                <h3 className="text-base font-bold mb-1">Mantenimiento de Datos</h3>
                <p className="text-xs text-zinc-500 mb-4">Optimiza y gestiona el almacenamiento local.</p>
                
                <div className="space-y-4">
                    {/* Clean Duplicates */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold">Limpiar Duplicados</p>
                            <p className="text-xs text-zinc-500">Busca registros idénticos y los elimina.</p>
                        </div>
                        <button 
                            onClick={onCleanDuplicates}
                            disabled={isCleaning}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                        >
                            {isCleaning ? 'Limpiando...' : 'Ejecutar'}
                        </button>
                    </div>

                    {/* archiving */}
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-100'} space-y-3`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-amber-500">Archivado Histórico</p>
                            <button 
                                onClick={onArchiveData}
                                disabled={archiving}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
                            >
                                {archiving ? 'Archivando...' : 'Archivar'}
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">Mueve registros antiguos a un estado de solo lectura para mejorar el rendimiento.</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">Antigüedad:</span>
                            <input 
                                type="number" 
                                value={archiveMonths} 
                                onChange={(e) => setArchiveMonths(parseInt(e.target.value))}
                                className={`w-16 p-1 rounded border text-xs text-center ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}
                            />
                            <span className="text-xs text-zinc-400">meses</span>
                        </div>
                        {archiveResult && (
                            <p className="text-[10px] text-amber-500 font-medium py-1 px-2 bg-amber-500/5 rounded border border-amber-500/10">
                                {archiveResult}
                            </p>
                        )}
                    </div>

                    {/* Dangerous Actions */}
                    <div className={`pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                        <button 
                            onClick={onDeleteAllData}
                            disabled={isDeleting}
                            className="w-full p-3 border border-red-500/30 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/10 transition-all uppercase tracking-widest"
                        >
                            {isDeleting ? 'Borrando...' : 'Borrar TODOS los datos'}
                        </button>
                        <p className="text-[10px] text-center text-zinc-500 mt-2">⚠️ Esta acción no se puede deshacer.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataActionsSection;
