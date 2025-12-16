import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, Turno, CarreraVista, Gasto } from '../types';
import { getRecentTurnos, getRecentCarreras, getGastos } from '../services/api';

// Icons
const TaxiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" /></svg>;
const AttachMoneyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c2.16-.43 3.5-1.77 3.5-3.6 0-2.13-1.87-3.29-4.7-4.15z" /></svg>;

interface HistoricoScreenProps {
    navigateTo: (page: Seccion) => void;
}

type TabType = 'turnos' | 'carreras' | 'gastos';

const HistoricoScreen: React.FC<HistoricoScreenProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<TabType>('turnos');

    // Función helper para formatear fecha y hora de forma consistente (DD/MM/YYYY HH:MM)
    const formatDateTime = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };
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
                    getRecentCarreras(300), // Obtener últimas carreras (paginadas)
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
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-6 space-y-4">
            <ScreenTopBar title="Histórico" navigateTo={navigateTo} backTarget={Seccion.Home} />

            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
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
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-4 animate-pulse bg-zinc-800 border border-zinc-700">
                            <div className="h-3 w-1/3 bg-zinc-700 rounded mb-3" />
                            <div className="h-2 w-full bg-zinc-700 rounded mb-1.5" />
                            <div className="h-2 w-2/3 bg-zinc-700 rounded" />
                        </Card>
                    ))}
                </div>
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
                                    const totalTurno = calcularTotalTurno(turno.id);
                                    const kmsRecorridos = turno.kilometrosFin && turno.kilometrosInicio
                                        ? turno.kilometrosFin - turno.kilometrosInicio
                                        : null;

                                    return (
                                        <Card key={turno.id} className="p-3 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-zinc-100 mb-1">
                                                        Inicio: {formatDateTime(turno.fechaInicio)}
                                                    </p>
                                                    {turno.fechaFin && (
                                                        <p className="text-zinc-400 text-xs mb-1">
                                                            Fin: {formatDateTime(turno.fechaFin)}
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
                                                        <span className={`text-xs px-2 py-0.5 rounded ${carrera.formaPago === 'Efectivo' ? 'bg-green-900/50 text-green-300' :
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

