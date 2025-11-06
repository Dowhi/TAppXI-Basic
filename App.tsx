import React, { useState, useCallback } from 'react';
import { Seccion } from './types';
import HomeScreen from './screens/HomeScreen';
import IncomeScreen from './screens/IncomeScreen';
import AddEditRaceScreen from './screens/AddEditRaceScreen';
import ExpensesScreen from './screens/ExpensesScreen';
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

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/>
    </svg>
);

const App: React.FC = () => {
    // Siempre iniciar en HomeScreen
    const [currentPage, setCurrentPage] = useState<Seccion>(Seccion.Home);
    const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
    const [editingTurnoId, setEditingTurnoId] = useState<string | null>(null);

    const navigateTo = useCallback((page: Seccion, id?: string) => {
        if (page === Seccion.IntroducirCarrera) {
            setEditingRaceId(null);
        }
        if (page === Seccion.EditarTurno && id) {
            setEditingTurnoId(id);
        }
        setCurrentPage(page);
    }, []);
    
    const navigateToEditRace = useCallback((id: string) => {
        setEditingRaceId(id);
        setCurrentPage(Seccion.EditarCarrera);
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case Seccion.Home:
                return <HomeScreen navigateTo={navigateTo} />;
            case Seccion.VistaCarreras:
                return <IncomeScreen navigateTo={navigateTo} navigateToEditRace={navigateToEditRace} />;
            case Seccion.IntroducirCarrera:
                return <AddEditRaceScreen navigateTo={navigateTo} raceId={null} />;
            case Seccion.EditarCarrera:
                return <AddEditRaceScreen navigateTo={navigateTo} raceId={editingRaceId} />;
            case Seccion.Gastos:
                return <ExpensesScreen navigateTo={navigateTo} />;
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
                return <ResumenGastosMensualScreen navigateTo={navigateTo} />;
            case Seccion.ResumenMensualIngresos:
                return <ResumenMensualIngresosScreen navigateTo={navigateTo} />;
            case Seccion.AjustesGenerales:
                return <AjustesScreen navigateTo={navigateTo} />;
            default:
                return <HomeScreen navigateTo={navigateTo} />;
        }
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-50 font-sans">
            <main className="container mx-auto p-4 max-w-2xl pb-24">
                {renderPage()}
            </main>
            {currentPage !== Seccion.Home && (
                <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-50">
                    <button
                        onClick={() => navigateTo(Seccion.Home)}
                        className="bg-zinc-800 text-zinc-300 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border border-zinc-700 hover:bg-zinc-700 transition-colors active:scale-90"
                        aria-label="Go to Home page"
                    >
                        <HomeIcon />
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;








