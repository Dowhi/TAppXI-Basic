import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface BackupSectionProps {
    isLoggedIn: boolean;
    lastBackupStatus: string | null;
    uploadingToDrive: boolean;
    exportingToSheets: boolean;
    syncingCloud: boolean;
    onGoogleLogin: () => void;
    onGoogleLogout: () => void;
    onDownloadBackupJSON: () => void;
    onRestoreFromJSONFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUploadToDrive: () => void;
    onExportToSheets: () => void;
    onSyncFromFirestore: () => void;
}

const BackupSection: React.FC<BackupSectionProps> = ({
    isLoggedIn,
    lastBackupStatus,
    uploadingToDrive,
    exportingToSheets,
    syncingCloud,
    onGoogleLogin,
    onGoogleLogout,
    onDownloadBackupJSON,
    onRestoreFromJSONFile,
    onUploadToDrive,
    onExportToSheets,
    onSyncFromFirestore
}) => {
    const { isDark } = useTheme();

    return (
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-4`}>
            <h3 className="text-lg font-bold">Respaldo y Nube</h3>
            
            <div className="space-y-4">
                {/* Google Connection */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold">Google Drive / Sheets</p>
                        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {isLoggedIn ? 'Conectado' : 'No conectado'}
                        </p>
                    </div>
                    {isLoggedIn ? (
                        <button onClick={onGoogleLogout} className="text-xs text-red-500 font-bold uppercase">Cerrar Sesión</button>
                    ) : (
                        <button onClick={onGoogleLogin} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">Conectar</button>
                    )}
                </div>

                {/* Last Backup Info */}
                {lastBackupStatus && (
                    <div className={`p-2 rounded-lg text-xs ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                        Último backup auto: {lastBackupStatus}
                    </div>
                )}

                {/* Buttons Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={onDownloadBackupJSON}
                        className={`p-3 rounded-lg border text-sm font-bold transition-colors ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}
                    >
                        Descargar JSON
                    </button>
                    
                    <label className={`p-3 rounded-lg border text-sm font-bold text-center cursor-pointer transition-colors ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                        Restaurar JSON
                        <input type="file" accept=".json" onChange={onRestoreFromJSONFile} className="hidden" />
                    </label>

                    <button 
                        onClick={onUploadToDrive}
                        disabled={!isLoggedIn || uploadingToDrive}
                        className="p-3 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                        {uploadingToDrive ? 'Subiendo...' : 'Subir a Drive'}
                    </button>

                    <button 
                        onClick={onExportToSheets}
                        disabled={!isLoggedIn || exportingToSheets}
                        className="p-3 bg-emerald-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                        {exportingToSheets ? 'Exportando...' : 'Hojas de Google'}
                    </button>

                    <button 
                        onClick={onSyncFromFirestore}
                        disabled={syncingCloud}
                        className="col-span-2 p-3 bg-indigo-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                        {syncingCloud ? 'Sincronizando...' : 'Restaurar desde Cloud (Firestore)'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BackupSection;
