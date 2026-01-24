import React, { useState, useEffect } from 'react';
import { Seccion, Gasto } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import ScreenTopBar from '../components/ScreenTopBar';
import { removeDuplicates, getGastosByMonth, getMaintenanceIntervals, saveMaintenanceIntervals, MaintenanceIntervals, deleteMonthlyData } from '../services/api';
import { useToast } from '../components/Toast';

const WalletIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <path d="M20 10v4" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const ToolsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a2 2 0 0 1 0 2.8l-3.2 3.2-1.6-1.6a1 1 0 0 0-1.4 0l-5.6 5.6a2 2 0 0 1-2.8 0l-1.6-1.6a2 2 0 0 1 0-2.8l5.6-5.6a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L2.3 8.7a2 2 0 0 0 0 2.8l3.2 3.2-1.6 1.6a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a2 2 0 0 1 0-2.8l-3.2-3.2 1.6-1.6a1 1 0 0 0 0-1.4l1.6-1.6z" />
    </svg>
);

const DatabaseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
);

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const SummaryIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
    </svg>
);

const ListIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

const ValesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="2" y1="10" x2="22" y2="10"></line>
    </svg>
);

const LeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
);

const RightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

interface VariosScreenProps {
    navigateTo: (page: Seccion) => void;
}

const VariosScreen: React.FC<VariosScreenProps> = ({ navigateTo }) => {
    const { isDark } = useTheme();
    const { showToast } = useToast();
    const [isCleaning, setIsCleaning] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isResetting, setIsResetting] = useState(false);

    // History State
    const now = new Date();
    const [viewDate, setViewDate] = useState(new Date(now.getFullYear() - 1, now.getMonth(), 1));
    const [lastYearGastos, setLastYearGastos] = useState<Gasto[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        fetchHistoryData();
    }, [viewDate]);

    const fetchHistoryData = async () => {
        try {
            setIsLoadingHistory(true);
            const data = await getGastosByMonth(viewDate.getMonth(), viewDate.getFullYear());
            // Filter out "Combustible" (case insensitive)
            const filtered = data.filter(g =>
                !(g.concepto || '').toLowerCase().includes('combustible')
            );
            setLastYearGastos(filtered.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
        } catch (error) {
            console.error("Error fetching historical gastos:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    // Maintenance State
    const [maintenance, setMaintenance] = useState<MaintenanceIntervals>({
        aceite: 15000,
        ruedas: 40000,
        filtros: 15000,
        frenos: 30000,
        inspeccion: 50000
    });

    useEffect(() => {
        getMaintenanceIntervals().then(setMaintenance);
    }, []);

    const updateMaintenanceField = async (field: keyof MaintenanceIntervals, value: string) => {
        const numValue = parseInt(value) || 0;
        const newMaintenance = { ...maintenance, [field]: numValue };
        setMaintenance(newMaintenance);
        await saveMaintenanceIntervals(newMaintenance);
    };

    const handleCleanDuplicates = async () => {
        if (!window.confirm("Se buscarán y eliminarán registros duplicados (Exactamente el mismo contenido). ¿Continuar?")) {
            return;
        }

        setIsCleaning(true);
        try {
            const result = await removeDuplicates();
            showToast(`✅ Limpieza completada. Eliminados: ${result.gastosRemoved} gastos y ${result.carrerasRemoved} carreras.`, 'success');
        } catch (error) {
            console.error(error);
            showToast('❌ Error al limpiar duplicados.', 'error');
        } finally {
            setIsCleaning(false);
        }
    };

    const handleResetMonth = async () => {
        const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(selectedYear, selectedMonth));
        if (!window.confirm(`¿Estás SEGURO de que quieres BORRAR TODO (Carreras, Gastos y Turnos) de ${monthName} de ${selectedYear}?\n\nEsta acción NO se puede deshacer y dejará el mes a cero.`)) {
            return;
        }

        setIsResetting(true);
        try {
            await deleteMonthlyData(selectedMonth, selectedYear);
            showToast(`Mes de ${monthName} de ${selectedYear} reseteado correctamente`, 'success');
        } catch (error) {
            console.error('Error resetting month:', error);
            showToast('Error al resetear el mes', 'error');
        } finally {
            setIsResetting(false);
        }
    };

    const options = [
        {
            id: 'otros-ingresos',
            title: 'Otros Ingresos',
            description: 'Publicidad, propinas extra y otros conceptos.',
            icon: <WalletIcon />,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
            action: () => navigateTo(Seccion.OtrosIngresos)
        },
        {
            id: 'gestion-datos',
            title: 'Proveedores, Talleres y Conceptos',
            description: 'Administra tus listas de proveedores, talleres y conceptos.',
            icon: <ListIcon />,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            action: () => navigateTo(Seccion.GestionDatos)
        },
        {
            id: 'vales',
            title: 'Gestión de Vales / Empresas',
            description: 'Administra el listado de empresas para cobros por vale.',
            icon: <ValesIcon />,
            color: 'text-cyan-500',
            bgColor: 'bg-cyan-500/10',
            action: () => navigateTo(Seccion.Vales)
        },
        {
            id: 'descansos',
            title: 'Configuración de Descansos',
            description: 'Personaliza tus letras y días de descanso en el calendario.',
            icon: <SettingsIcon />,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            action: () => navigateTo(Seccion.ConfiguracionDescansos)
        }
    ];

    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(viewDate);
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return (
        <div className={`min-h-screen ${isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
            <ScreenTopBar
                title="Miscelánea / Varios"
                onBack={() => navigateTo(Seccion.Home)}
            />

            <div className="p-3 space-y-2.5 max-w-xl mx-auto pb-24">
                <div className="grid grid-cols-1 gap-1.5">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={option.action}
                            className={`w-full flex items-center p-3 rounded-xl transition-all active:scale-[0.98] ${isDark
                                ? 'bg-zinc-900 hover:bg-zinc-800/80 border-zinc-800'
                                : 'bg-white hover:bg-zinc-50 border-zinc-200'
                                } border shadow-sm group`}
                        >
                            <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${option.bgColor} ${option.color} mr-3 transition-transform group-hover:scale-110`}>
                                {option.icon}
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{option.title}</h3>
                                <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mt-0.5 leading-tight`}>{option.description}</p>
                            </div>
                            <div className={`${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </div>
                        </button>
                    ))}

                    <button
                        onClick={handleCleanDuplicates}
                        disabled={isCleaning}
                        className={`w-full flex items-center p-3 rounded-xl transition-all active:scale-[0.98] ${isDark
                            ? 'bg-zinc-900 hover:bg-zinc-800/80 border-zinc-800'
                            : 'bg-white hover:bg-zinc-50 border-zinc-200'
                            } border shadow-sm group disabled:opacity-50`}
                    >
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 mr-3 transition-transform group-hover:scale-110`}>
                            <SettingsIcon />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{isCleaning ? 'Limpiando...' : 'Optimizar Base de Datos'}</h3>
                            <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mt-0.5 leading-tight`}>Eliminar registros duplicados de gastos y carreras.</p>
                        </div>
                    </button>
                </div>

                {/* Maintenance Configuration Card */}
                <div className={`mt-2 p-4 rounded-2xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border shadow-xl`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg flex-shrink-0">
                            <ToolsIcon />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Próximo Mantenimiento (km)</h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-semibold">Configura tus intervalos</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Cambio Aceite</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={maintenance.aceite === 0 ? '' : maintenance.aceite}
                                    onChange={(e) => updateMaintenanceField('aceite', e.target.value)}
                                    className={`w-full py-2 px-3 pr-8 rounded-xl text-sm font-bold border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-cyan-400 focus:border-cyan-500' : 'bg-zinc-100 border-zinc-200 text-blue-600 focus:border-blue-400'} outline-none`}
                                    placeholder="15000"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold">km</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Neumáticos</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={maintenance.ruedas === 0 ? '' : maintenance.ruedas}
                                    onChange={(e) => updateMaintenanceField('ruedas', e.target.value)}
                                    className={`w-full py-2 px-3 pr-8 rounded-xl text-sm font-bold border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-cyan-400 focus:border-cyan-500' : 'bg-zinc-100 border-zinc-200 text-blue-600 focus:border-blue-400'} outline-none`}
                                    placeholder="40000"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold">km</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Filtros</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={maintenance.filtros === 0 ? '' : maintenance.filtros}
                                    onChange={(e) => updateMaintenanceField('filtros', e.target.value)}
                                    className={`w-full py-2 px-3 pr-8 rounded-xl text-sm font-bold border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-cyan-400 focus:border-cyan-500' : 'bg-zinc-100 border-zinc-200 text-blue-600 focus:border-blue-400'} outline-none`}
                                    placeholder="15000"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold">km</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Frenos / Pastillas</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={maintenance.frenos === 0 ? '' : maintenance.frenos}
                                    onChange={(e) => updateMaintenanceField('frenos', e.target.value)}
                                    className={`w-full py-2 px-3 pr-8 rounded-xl text-sm font-bold border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-cyan-400 focus:border-cyan-500' : 'bg-zinc-100 border-zinc-200 text-blue-600 focus:border-blue-400'} outline-none`}
                                    placeholder="30000"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold">km</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reset Data Card */}
                <div className={`mt-2 p-4 rounded-2xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border shadow-xl`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-500/10 text-red-500 rounded-lg flex-shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Limpieza de Datos por Mes</h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-semibold">Resetea ingresos, gastos y turnos</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Mes</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className={`w-full py-2 px-3 rounded-xl text-sm font-bold border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-100 border-zinc-200 text-zinc-900'} outline-none`}
                                >
                                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                        <option key={i} value={i}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Año</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className={`w-full py-2 px-3 rounded-xl text-sm font-bold border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-100 border-zinc-200 text-zinc-900'} outline-none`}
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleResetMonth}
                            disabled={isResetting}
                            className={`w-full py-3 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-md ${isResetting ? 'bg-zinc-800 text-zinc-500' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/40'}`}
                        >
                            {isResetting ? 'RESETEANDO...' : 'BORRAR DATOS DEL MES'}
                        </button>
                    </div>
                </div>

                {/* Historique Comparison Card */}
                <div className={`mt-2 p-4 rounded-2xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border shadow-xl`}>
                    <div className="mb-4">
                        {/* Icon and Title Row */}
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg flex-shrink-0">
                                <SummaryIcon />
                            </div>
                            <h3 className="font-bold text-base">Gastos {capitalizedMonth} {viewDate.getFullYear()}</h3>
                        </div>
                        {/* Subtitle and Navigation Row */}
                        <div className="flex items-center justify-between pl-14">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-semibold">Comparativa histórica</p>
                            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                                <button
                                    onClick={() => changeMonth(-1)}
                                    className="p-0.5 hover:bg-white dark:hover:bg-zinc-700 rounded-sm transition-colors text-zinc-500"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => changeMonth(1)}
                                    className="p-0.5 hover:bg-white dark:hover:bg-zinc-700 rounded-sm transition-colors text-zinc-500"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {isLoadingHistory ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
                            <p className="text-zinc-500 text-sm font-medium animate-pulse">Consultando historial...</p>
                        </div>
                    ) : lastYearGastos.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-zinc-500 italic text-sm">No hay registros para este período.</p>
                            <p className="text-[10px] text-zinc-600 mt-1">(Se han filtrado los gastos de combustible)</p>
                        </div>
                    ) : (
                        <div className="mt-2 text-zinc-900 dark:text-zinc-100">
                            <div className="grid grid-cols-12 py-1 px-1 border-b border-zinc-800/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <div className="col-span-2">Día</div>
                                <div className="col-span-10 flex justify-between">
                                    <span>Concepto / Proveedor</span>
                                    <span className="pr-1 text-right">Importe</span>
                                </div>
                            </div>
                            <div className="divide-y divide-zinc-800/20">
                                {lastYearGastos.map((gasto, idx) => (
                                    <div key={gasto.id || idx} className="grid grid-cols-12 py-1.5 px-1 items-center hover:bg-zinc-800/10 transition-colors">
                                        <div className="col-span-2 text-xs font-bold text-zinc-400">
                                            {new Date(gasto.fecha).getDate()}
                                        </div>
                                        <div className="col-span-10 flex justify-between items-center">
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-sm font-bold truncate pr-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                                    {gasto.concepto}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 truncate italic">
                                                    {gasto.proveedor || gasto.taller || 'Sin proveedor'}
                                                </span>
                                            </div>
                                            <div className={`text-sm font-black whitespace-nowrap pl-2 ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`}>
                                                {gasto.importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className={`mt-3 p-3 rounded-xl flex justify-between items-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total</span>
                                <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                    {lastYearGastos.reduce((s, g) => s + g.importe, 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VariosScreen;
