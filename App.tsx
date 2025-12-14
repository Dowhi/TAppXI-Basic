import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
import { useTheme } from './contexts/ThemeContext';
import { Seccion, CarreraVista } from './types';
import { startReminderSoundCheck, stopReminderSoundCheck, requestNotificationPermission } from './services/reminderSound';
import { ErrorHandlerSetup } from './components/ErrorHandlerSetup';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import HomeScreen from './screens/HomeScreen';
import IncomeScreen from './screens/IncomeScreen';
import AddEditRaceScreen from './screens/AddEditRaceScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import { getCurrentMinimaRate, getCurrentAeropuertoRate } from './services/tariffs';
import ShiftsScreen from './screens/ShiftsScreen';
import CloseTurnScreen from './screens/CloseTurnScreen';
import EditTurnScreen from './screens/EditTurnScreen';
import HistoricoScreen from './screens/HistoricoScreen';
import ResumenScreen from './screens/ResumenScreen';
import ResumenDiarioScreen from './screens/ResumenDiarioScreen';
import ResumenMensualScreen from './screens/ResumenMensualScreen';
import ResumenMensualDetalladoScreen from './screens/ResumenMensualDetalladoScreen';
import ResumenGastosMensualScreen from './screens/ResumenGastosMensualScreen';
import ResumenMensualIngresosScreen from './screens/ResumenMensualIngresosScreen';
import AjustesScreen from './screens/AjustesScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import CalendarScreen from './screens/CalendarScreen';
import BreakConfigurationScreen from './screens/BreakConfigurationScreen';
import ReportsScreen from './screens/ReportsScreen';
import AnalisisAvanzadoScreen from './screens/AnalisisAvanzadoScreen';
import RemindersScreen from './screens/RemindersScreen';
import TrainStationScreen from './screens/TrainStationScreen';
import FlightStationScreen from './screens/FlightStationScreen';
import BottomNavBar from './components/BottomNavBar';


const App: React.FC = () => {
    // Siempre iniciar en HomeScreen
    const [currentPage, setCurrentPage] = useState<Seccion>(Seccion.Home);
    const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
    const [initialRaceData, setInitialRaceData] = useState<Partial<CarreraVista> | undefined>(undefined);
    const [editingTurnoId, setEditingTurnoId] = useState<string | null>(null);
    const [editingGastoId, setEditingGastoId] = useState<string | null>(null);
    const [refreshGastosKey, setRefreshGastosKey] = useState(0);
    const { isDark } = useTheme();

    // Iniciar verificación de recordatorios con sonido
    useEffect(() => {
        // Solicitar permiso para notificaciones al iniciar
        requestNotificationPermission();

        // Iniciar verificación de sonidos
        startReminderSoundCheck();

        // Limpiar al desmontar
        return () => {
            stopReminderSoundCheck();
        };
    }, []);

    const navigateTo = useCallback((page: Seccion, id?: string) => {
        if (page === Seccion.IntroducirCarrera) {
            setEditingRaceId(null);
            // Don't reset initialRaceData here immediately if we just set it? 
            // Actually, usually navigation clears transient state. 
            // I'll make a specific handleQuickAction function.
        }
        if (page !== Seccion.IntroducirCarrera) {
            setInitialRaceData(undefined);
        }
        if (page === Seccion.EditarTurno && id) {
            setEditingTurnoId(id);
        }
        // Si se navega de vuelta a ResumenGastosMensual, forzar recarga
        if (page === Seccion.ResumenGastosMensual) {
            setRefreshGastosKey(prev => prev + 1);
        }
        setCurrentPage(page);
    }, []);

    const navigateToEditRace = useCallback((id: string) => {
        setEditingRaceId(id);
        setCurrentPage(Seccion.EditarCarrera);
    }, []);

    const navigateToEditGasto = useCallback((id: string) => {
        setEditingGastoId(id);
        setCurrentPage(Seccion.EditarGasto);
    }, []);

    const handleQuickAction = useCallback((action: string) => {
        if (action === 'minima') {
            const { amount, tariffName } = getCurrentMinimaRate();
            setInitialRaceData({
                taximetro: amount,
                cobrado: amount,
                formaPago: 'Efectivo',
                tipoCarrera: 'Urbana',
                suplementos: tariffName // Optional: store which tariff was applied? 
            });
            // showToast(`Aplicada ${tariffName}: ${amount}€`, 'info'); // Requires using toast here if possible, but handleQuickAction is top level.
            navigateTo(Seccion.IntroducirCarrera);
        } else if (action === 'aeropuerto') {
            const { amount, tariffName, isNight } = getCurrentAeropuertoRate();
            setInitialRaceData({
                taximetro: amount,
                cobrado: amount,
                formaPago: 'Tarjeta',
                aeropuerto: true,
                tipoCarrera: 'Interurbana',
            });
            navigateTo(Seccion.IntroducirCarrera);
        }
    }, [navigateTo]);

    // Atajos de teclado globales
    useKeyboardShortcuts([
        {
            key: 'n',
            ctrlKey: true,
            action: () => {
                if (currentPage === Seccion.Home || currentPage === Seccion.VistaCarreras) {
                    navigateTo(Seccion.IntroducirCarrera);
                }
            },
            description: 'Nueva carrera',
        },
        {
            key: 'e',
            ctrlKey: true,
            action: () => {
                if (currentPage === Seccion.Home) {
                    navigateTo(Seccion.Gastos);
                }
            },
            description: 'Nuevo gasto',
        },
        {
            key: 'h',
            ctrlKey: true,
            action: () => {
                if (currentPage !== Seccion.Home) {
                    navigateTo(Seccion.Home);
                }
            },
            description: 'Ir a inicio',
        },
        {
            key: 'Escape',
            action: () => {
                // Cerrar modales o volver atrás
                if (currentPage !== Seccion.Home) {
                    navigateTo(Seccion.Home);
                }
            },
            description: 'Volver atrás',
        },
    ]);

    const renderPage = () => {
        switch (currentPage) {
            case Seccion.Home:
                return <HomeScreen navigateTo={navigateTo} onQuickAction={handleQuickAction} />;
            case Seccion.VistaCarreras:
                return <IncomeScreen navigateTo={navigateTo} navigateToEditRace={navigateToEditRace} />;
            case Seccion.IntroducirCarrera:
                return <AddEditRaceScreen navigateTo={navigateTo} raceId={null} initialData={initialRaceData} />;
            case Seccion.EditarCarrera:
                return <AddEditRaceScreen navigateTo={navigateTo} raceId={editingRaceId} />;
            case Seccion.Gastos:
                return <ExpensesScreen navigateTo={navigateTo} />;
            case Seccion.EditarGasto:
                return <ExpensesScreen navigateTo={navigateTo} gastoId={editingGastoId} />;
            case Seccion.Turnos:
                return <ShiftsScreen navigateTo={navigateTo} />;
            case Seccion.EditarTurno:
                return editingTurnoId ? <EditTurnScreen navigateTo={navigateTo} turnoId={editingTurnoId} /> : <ShiftsScreen navigateTo={navigateTo} />;
            case Seccion.CerrarTurno:
                return <CloseTurnScreen navigateTo={navigateTo} />;
            case Seccion.Historico:
                return <HistoricoScreen navigateTo={navigateTo} />;
            case Seccion.Resumen:
                return <ResumenScreen navigateTo={navigateTo} />;
            case Seccion.ResumenDiario:
                return <ResumenDiarioScreen navigateTo={navigateTo} />;
            case Seccion.ResumenMensual:
                return <ResumenMensualScreen navigateTo={navigateTo} />;
            case Seccion.ResumenMensualDetallado:
                return <ResumenMensualDetalladoScreen navigateTo={navigateTo} />;
            case Seccion.ResumenGastosMensual:
                return <ResumenGastosMensualScreen key={`gastos-${refreshGastosKey}`} navigateTo={navigateTo} navigateToEditGasto={navigateToEditGasto} />;
            case Seccion.ResumenMensualIngresos:
                return <ResumenMensualIngresosScreen navigateTo={navigateTo} />;
            case Seccion.AjustesGenerales:
                return <AjustesScreen navigateTo={navigateTo} />;
            case Seccion.Estadisticas:
                return <StatisticsScreen navigateTo={navigateTo} />;
            case Seccion.Calendario:
                return <CalendarScreen navigateTo={navigateTo} />;
            case Seccion.ConfiguracionDescansos:
                return <BreakConfigurationScreen navigateTo={navigateTo} />;
            case Seccion.Informes:
                return <ReportsScreen navigateTo={navigateTo} />;
            case Seccion.AnalisisAvanzado:
                return <AnalisisAvanzadoScreen navigateTo={navigateTo} />;
            case Seccion.Recordatorios:
                return <RemindersScreen navigateTo={navigateTo} />;
            case Seccion.EstacionTren:
                return <TrainStationScreen navigateTo={navigateTo} />;
            case Seccion.Aeropuerto:
                return <FlightStationScreen navigateTo={navigateTo} />;
            default:
                return <HomeScreen navigateTo={navigateTo} />;
        }
    };

    const appBgClass = isDark ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900';

    return (
        <ErrorHandlerSetup>
            <div className={`${appBgClass} min-h-screen font-sans overflow-hidden`}>
                <main className="w-full pb-24 h-full relative">
                    <AnimatePresence mode="wait">
                        <PageTransition key={currentPage}>
                            {renderPage()}
                        </PageTransition>
                    </AnimatePresence>
                </main>

                {currentPage !== Seccion.Home && (
                    <BottomNavBar navigateTo={navigateTo} />
                )}
            </div>
        </ErrorHandlerSetup>
    );
};

export default App;









