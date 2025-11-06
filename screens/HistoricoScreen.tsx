import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import KineticHeader from '../components/KineticHeader';
import AnimatedIcon3D from '../components/AnimatedIcon3D';
import BackButton from '../components/BackButton';
import { Seccion, Turno, CarreraVista, Gasto } from '../types';
import { getRecentTurnos, getCarreras, getGastos } from '../services/api';

// Icons
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.75-1.23-3.5-2.09V8H12z"/></svg>;
const TaxiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>;
const AttachMoneyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c2.16-.43 3.5-1.77 3.5-3.6 0-2.13-1.87-3.29-4.7-4.15z"/></svg>;

interface HistoricoScreenProps {
    navigateTo: (page: Seccion) => void;
}

type TabType = 'turnos' | 'carreras' | 'gastos';

const HistoricoScreen: React.FC<HistoricoScreenProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<TabType>('turnos');
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [carreras, setCarreras] = useState<CarreraVista[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [turnosData, carrerasData, gastosData] = await Promise.all([
                    getRecentTurnos(50), // Obtener últimos 50 turnos
                    getCarreras(), // Obtener todas las carreras
                    getGastos() // Obtener todos los gastos
                ]);
                setTurnos(turnosData || []);
                setCarreras(carrerasData || []);
                setGastos(gastosData || []);
            } catch (error) {
                console.error("Error loading historical data:", error);
                setTurnos([]);
                setCarreras([]);
                setGastos([]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Agrupar carreras por turno
    const carrerasPorTurno = React.useMemo(() => {
        const grouped: Record<string, CarreraVista[]> = {};
        carreras.forEach(carrera => {
            if (carrera.turnoId) {
                if (!grouped[carrera.turnoId]) {
                    grouped[carrera.turnoId] = [];
                }
                grouped[carrera.turnoId].push(carrera);
            }
        });
        return grouped;
    }, [carreras]);

    // Calcular total de carreras por turno
    const calcularTotalTurno = (turnoId: string): number => {
        const carrerasDelTurno = carrerasPorTurno[turnoId] || [];
        return carrerasDelTurno.reduce((sum, c) => sum + c.cobrado, 0);
    };

    const tabs = [
        { id: 'turnos' as TabType, label: 'Turnos', icon: <TaxiIcon /> },
        { id: 'carreras' as TabType, label: 'Carreras', icon: <TaxiIcon /> },
        { id: 'gastos' as TabType, label: 'Gastos', icon: <AttachMoneyIcon /> },
    ];

    return (
        <div className="space-y-4">
            <header className="flex items-center space-x-3">
                <BackButton navigateTo={navigateTo} />
                <AnimatedIcon3D><HistoryIcon /></AnimatedIcon3D>
                <KineticHeader title="Histórico" />
            </header>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    >
                        <span className="w-4 h-4">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center p-8 text-zinc-400">Cargando histórico...</div>
            ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {activeTab === 'turnos' && (
                        <>
                            {turnos.length === 0 ? (
                                <Card className="p-4 text-center text-zinc-400">
                                    No hay turnos en el histórico
                                </Card>
                            ) : (
                                turnos.map(turno => {
                                    const fechaInicio = turno.fechaInicio.toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    });
                                    const horaInicio = turno.fechaInicio.toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    const fechaFin = turno.fechaFin ? turno.fechaFin.toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    }) : '';
                                    const horaFin = turno.fechaFin ? turno.fechaFin.toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : '';
                                    const totalTurno = calcularTotalTurno(turno.id);
                                    const kmsRecorridos = turno.kilometrosFin && turno.kilometrosInicio 
                                        ? turno.kilometrosFin - turno.kilometrosInicio 
                                        : null;

                                    return (
                                        <Card key={turno.id} className="p-3 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-zinc-100 mb-1">
                                                        {fechaInicio} {horaInicio}
                                                    </p>
                                                    {turno.fechaFin && (
                                                        <p className="text-zinc-400 text-xs mb-1">
                                                            Fin: {fechaFin} {horaFin}
                                                        </p>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <div>
                                                            <p className="text-zinc-500 text-xs">Kms</p>
                                                            <p className="text-zinc-300 text-sm font-medium">
                                                                {turno.kilometrosInicio} {turno.kilometrosFin ? `→ ${turno.kilometrosFin}` : ''}
                                                            </p>
                                                            {kmsRecorridos !== null && (
                                                                <p className="text-zinc-500 text-xs">({kmsRecorridos} km)</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-zinc-500 text-xs">Total</p>
                                                            <p className="text-emerald-400 text-sm font-bold">
                                                                {totalTurno.toFixed(2)}€
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </>
                    )}

                    {activeTab === 'carreras' && (
                        <>
                            {carreras.length === 0 ? (
                                <Card className="p-4 text-center text-zinc-400">
                                    No hay carreras en el histórico
                                </Card>
                            ) : (
                                carreras.slice(0, 100).map(carrera => {
                                    const fechaHora = carrera.fechaHora.toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    const propina = carrera.cobrado - carrera.taximetro;

                                    return (
                                        <Card key={carrera.id} className="p-3 text-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-zinc-100 mb-1">
                                                        {fechaHora}
                                                    </p>
                                                    <div className="flex gap-4 mt-2">
                                                        <div>
                                                            <p className="text-zinc-500 text-xs">Taxímetro</p>
                                                            <p className="text-zinc-300 text-sm font-medium">
                                                                {carrera.taximetro.toFixed(2)}€
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-zinc-500 text-xs">Cobrado</p>
                                                            <p className="text-emerald-400 text-sm font-bold">
                                                                {carrera.cobrado.toFixed(2)}€
                                                            </p>
                                                        </div>
                                                        {propina > 0 && (
                                                            <div>
                                                                <p className="text-zinc-500 text-xs">Propina</p>
                                                                <p className="text-pink-400 text-sm font-medium">
                                                                    +{propina.toFixed(2)}€
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            carrera.formaPago === 'Efectivo' ? 'bg-green-900/50 text-green-300' :
                                                            carrera.formaPago === 'Tarjeta' ? 'bg-blue-900/50 text-blue-300' :
                                                            carrera.formaPago === 'Bizum' ? 'bg-purple-900/50 text-purple-300' :
                                                            'bg-yellow-900/50 text-yellow-300'
                                                        }`}>
                                                            {carrera.formaPago}
                                                        </span>
                                                        {carrera.emisora && (
                                                            <span className="text-xs px-2 py-0.5 rounded bg-pink-900/50 text-pink-300">
                                                                Emisora
                                                            </span>
                                                        )}
                                                        {carrera.aeropuerto && (
                                                            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                                                                Aeropuerto
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </>
                    )}

                    {activeTab === 'gastos' && (
                        <>
                            {gastos.length === 0 ? (
                                <Card className="p-4 text-center text-zinc-400">
                                    No hay gastos en el histórico
                                </Card>
                            ) : (
                                gastos.slice(0, 100).map(gasto => {
                                    const fecha = gasto.fecha.toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    });

                                    return (
                                        <Card key={gasto.id} className="p-3 text-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-zinc-100 mb-1">
                                                        {fecha}
                                                    </p>
                                                    {gasto.concepto && (
                                                        <p className="text-zinc-400 text-xs mb-1">
                                                            {gasto.concepto}
                                                        </p>
                                                    )}
                                                    {gasto.proveedor && (
                                                        <p className="text-zinc-500 text-xs">
                                                            Proveedor: {gasto.proveedor}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-red-400 text-sm font-bold">
                                                        -{gasto.importe.toFixed(2)}€
                                                    </p>
                                                    {gasto.formaPago && (
                                                        <p className="text-zinc-500 text-xs mt-1">
                                                            {gasto.formaPago}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoricoScreen;

