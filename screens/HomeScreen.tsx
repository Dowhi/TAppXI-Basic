
import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, Turno, CarreraVista } from '../types';
import KineticHeader from '../components/KineticHeader';
import AnimatedIcon3D from '../components/AnimatedIcon3D';
import InfoBox from '../components/InfoBoxNeonGrande';
import QuickActionTile from '../components/QuickActionTile';
import Card from '../components/NeumorphicCard';
import { getIngresosForCurrentMonth, getGastosForCurrentMonth, getActiveTurno, getCarrerasByTurnoId, subscribeToActiveTurno, subscribeToCarreras } from '../services/api';

// SVG Icons
const TaxiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>;
const TrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/></svg>;
const TrendingDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z"/></svg>;
const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61-.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0-.61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>;
const PauseCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>;

// Quick Action Icons
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>;
const AttachMoneyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c2.16-.43 3.5-1.77 3.5-3.6 0-2.13-1.87-3.29-4.7-4.15z"/></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.75-1.23-3.5-2.09V8H12z"/></svg>;
const AssessmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
const AssignmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>;
const ScheduleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>;

interface HomeScreenProps {
    navigateTo: (page: Seccion, id?: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateTo }) => {
    const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
    const [carreras, setCarreras] = useState<CarreraVista[]>([]);
    const [ingresos, setIngresos] = useState(0);
    const [gastos, setGastos] = useState(0);
    const [loading, setLoading] = useState(true);

    // Suscripción en tiempo real al turno activo
    useEffect(() => {
        const unsubscribe = subscribeToActiveTurno((turno) => {
            setTurnoActivo(turno);
        });
        return () => unsubscribe();
    }, []);

    // Suscripción en tiempo real a todas las carreras (para calcular total del turno)
    useEffect(() => {
        const unsubscribe = subscribeToCarreras((data) => {
            setCarreras(data);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [ingresosData, gastosData] = await Promise.all([
                    getIngresosForCurrentMonth(),
                    getGastosForCurrentMonth()
                ]);
                setIngresos(ingresosData);
                setGastos(gastosData);
            } catch (error) {
                console.error("Error fetching home screen data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Calcular total de carreras del turno activo
    const totalTurno = useMemo(() => {
        if (!turnoActivo) return 0;
        const carrerasDelTurno = carreras.filter(c => c.turnoId === turnoActivo.id);
        return carrerasDelTurno.reduce((sum, c) => sum + c.cobrado, 0);
    }, [carreras, turnoActivo]);

    const balance = ingresos - gastos;

    const quickActions = [
        { label: "Ingresos", icon: <ListIcon />, action: () => navigateTo(turnoActivo ? Seccion.VistaCarreras : Seccion.Turnos) },
        { label: "Gastos", icon: <AttachMoneyIcon />, action: () => navigateTo(Seccion.Gastos) },
        { label: "Turnos", icon: <ScheduleIcon />, action: () => navigateTo(Seccion.Turnos) },
        { label: "Histórico", icon: <HistoryIcon />, action: () => navigateTo(Seccion.Historico) },
        { label: "Estadísticas", icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Estadisticas) },
        { label: "Calendario", icon: <CalendarIcon />, action: () => navigateTo(Seccion.Calendario) },
        { label: "Resumen", icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Resumen) },
        { label: "Informes", icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Informes) },
        { label: "Ajustes", icon: <SettingsIcon />, action: () => navigateTo(Seccion.AjustesGenerales) },
        { label: "Recordatorios", icon: <AssignmentIcon />, action: () => navigateTo(Seccion.Recordatorios) },
    ];
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <div className="bg-zinc-950 px-2 py-4 space-y-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <AnimatedIcon3D><TaxiIcon /></AnimatedIcon3D>
                    <KineticHeader title="TAppXI" />
                </div>
                <button className="text-zinc-400 p-2 hover:text-zinc-100 transition-colors">
                    <SettingsIcon />
                </button>
            </header>
            
            {loading ? (
                 <div className="text-center text-zinc-400">Cargando datos...</div>
            ) : (
                <>
                    <section className="flex flex-row gap-1.5">
                        <InfoBox icon={<TrendingUpIcon />} title="Ingresos" value={`${ingresos.toFixed(2)}`} color="#00CFFF" />
                        <InfoBox icon={<TrendingDownIcon />} title="Gastos" value={`${gastos.toFixed(2)}`} color="#FF00D6" />
                        <InfoBox icon={<WalletIcon />} title="Balance" value={`${balance.toFixed(2)}`} color="#00FFB0" />
                    </section>

                    {turnoActivo ? (
                        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-3 border border-blue-500/50 shadow-lg">
                            {/* Header con Turno y Fecha */}
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-white font-bold text-lg">Turno Activo</h2>
                                <p className="text-white font-bold text-base">
                                    {turnoActivo.fechaInicio.toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>

                            {/* Información del turno en dos columnas */}
                            <div className="grid grid-cols-3 gap-4 mb-3">
                                {/* Columna izquierda */}
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-white/90 text-xs font-medium mb-0.5">Total</p>
                                        <p className="text-white font-bold text-base">{totalTurno.toFixed(2)}€</p>
                                    </div>
                                    
                                </div>
                                {/* Columna  */}
                                <div className="space-y-2">
                                    <div>
                                    <p className="text-white/90 text-xs font-medium mb-0.5">Kms. Inicio</p>
                                    <p className="text-white font-bold text-base">{turnoActivo.kilometrosInicio}</p>
                                    </div>
                                </div>

                                {/* Columna derecha */}
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-white/90 text-xs font-medium mb-0.5">H. Inicio</p>
                                        <p className="text-white font-bold text-base">
                                            {turnoActivo.fechaInicio.toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Botón Ver Detalles */}
                            <button
                                onClick={() => navigateTo(Seccion.VistaCarreras)}
                                className="w-full py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold text-sm rounded-lg transition-colors shadow-lg active:scale-95"
                            >
                                Ver Detalles
                            </button>
                        </div>
                    ) : (
                        <Card className="p-4">
                            <div className="text-center space-y-3 flex flex-col items-center">
                                <div className="w-12 h-12 text-zinc-500">
                                    <PauseCircleIcon />
                                </div>
                                <p className="text-zinc-200 font-semibold text-base">{formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}</p>
                                <p className="text-zinc-400 font-bold text-base">NO HAY TURNO ACTIVO</p>
                                <p className="text-zinc-500 text-sm">Inicia un nuevo turno para comenzar</p>
                            </div>
                        </Card>
                    )}
                </>
            )}

            <section className="grid grid-cols-4 gap-1.5">
                {quickActions.map((action, index) => (
                    <QuickActionTile key={index} icon={action.icon} label={action.label} onClick={action.action} />
                ))}
            </section>
        </div>
    );
};

export default HomeScreen;
