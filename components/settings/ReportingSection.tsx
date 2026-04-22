import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ReportingSectionProps {
    haciendaFechaDesde: string;
    haciendaFechaHasta: string;
    exportingHacienda: boolean;
    showReportBuilder: boolean;
    newReportNombre: string;
    newReportDescripcion: string;
    newReportTipo: 'excel' | 'pdf' | 'csv';
    customReports: any[];
    exporting: boolean;
    setHaciendaFechaDesde: (val: string) => void;
    setHaciendaFechaHasta: (val: string) => void;
    setShowReportBuilder: (val: boolean) => void;
    setNewReportNombre: (val: string) => void;
    setNewReportDescripcion: (val: string) => void;
    setNewReportTipo: (val: 'excel' | 'pdf' | 'csv') => void;
    onExportHacienda: () => void;
    onGuardarReporte: () => void;
    onUsarReporte: (report: any) => void;
    onEliminarReporte: (id: string) => void;
}

const ReportingSection: React.FC<ReportingSectionProps> = ({
    haciendaFechaDesde,
    haciendaFechaHasta,
    exportingHacienda,
    showReportBuilder,
    newReportNombre,
    newReportDescripcion,
    newReportTipo,
    customReports,
    exporting,
    setHaciendaFechaDesde,
    setHaciendaFechaHasta,
    setShowReportBuilder,
    setNewReportNombre,
    setNewReportDescripcion,
    setNewReportTipo,
    onExportHacienda,
    onGuardarReporte,
    onUsarReporte,
    onEliminarReporte
}) => {
    const { isDark } = useTheme();

    return (
        <div className="space-y-4">
            {/* Exportar para Hacienda */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-3`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>💰</span> Hacienda (España)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Desde</label>
                        <input
                            type="date"
                            value={haciendaFechaDesde}
                            onChange={(e) => setHaciendaFechaDesde(e.target.value)}
                            className={`w-full p-2 rounded-lg text-sm border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={haciendaFechaHasta}
                            onChange={(e) => setHaciendaFechaHasta(e.target.value)}
                            className={`w-full p-2 rounded-lg text-sm border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        />
                    </div>
                </div>
                <button
                    onClick={onExportHacienda}
                    disabled={exportingHacienda || !haciendaFechaDesde || !haciendaFechaHasta}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                    {exportingHacienda ? 'Generando...' : 'Exportar Informe Fiscal'}
                </button>
            </div>

            {/* Reportes Personalizados */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Reportes Personalizados</h3>
                    <button
                        onClick={() => setShowReportBuilder(!showReportBuilder)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                        {showReportBuilder ? 'Cancelar' : '+ Nuevo'}
                    </button>
                </div>

                {showReportBuilder && (
                    <div className={`p-3 rounded-lg border mb-4 space-y-3 ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                        <input
                            type="text"
                            value={newReportNombre}
                            onChange={(e) => setNewReportNombre(e.target.value)}
                            placeholder="Nombre del reporte"
                            className={`w-full p-2 rounded text-sm ${isDark ? 'bg-zinc-700' : 'bg-white border text-zinc-900'}`}
                        />
                        <select
                            value={newReportTipo}
                            onChange={(e) => setNewReportTipo(e.target.value as any)}
                            className={`w-full p-2 rounded text-sm ${isDark ? 'bg-zinc-700' : 'bg-white border text-zinc-900'}`}
                        >
                            <option value="excel">Excel</option>
                            <option value="pdf">PDF</option>
                            <option value="csv">CSV</option>
                        </select>
                        <button
                            onClick={onGuardarReporte}
                            className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm"
                        >
                            Guardar Configuración
                        </button>
                    </div>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {customReports.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center py-4 italic">No hay reportes guardados</p>
                    ) : (
                        customReports.map((report) => (
                            <div 
                                key={report.id} 
                                className={`p-3 rounded-lg border flex items-center justify-between ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                            >
                                <div>
                                    <h4 className="text-sm font-bold">{report.nombre}</h4>
                                    <span className="text-[10px] uppercase bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                                        {report.tipoExportacion}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onUsarReporte(report)}
                                        disabled={exporting}
                                        className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                    >
                                        Exportar
                                    </button>
                                    <button 
                                        onClick={() => onEliminarReporte(report.id)}
                                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                                    >
                                        Borrar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportingSection;
