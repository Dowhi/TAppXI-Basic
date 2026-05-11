import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, Turno, CarreraVista, Gasto } from '../types';
import { getRecentTurnos, getRecentCarreras, getGastos } from '../services/api';
import { calculateTurnoTimes } from '../services/timeUtils';

// Icons
// Icons (Tipo 2: Lineal Moderno, stroke-width=2)
const TaxiIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13.1V16c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
    </svg>
);

const AttachMoneyIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h12" />
        <path d="M4 14h9" />
        <path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12a7.9 7.9 0 0 0 7.8 8 7.7 7.7 0 0 0 5.2-2" />
    </svg>
);

interface HistoricoScreenProps {
    navigateTo: (page: Seccion) => void;
}

type TabType = 'turnos' | 'carreras' | 'gastos';

const HistoricoScreen: React.FC<HistoricoScreenProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<TabType>('turnos');

    // Función helper para convertir a Date de forma segura
    const parseSafeDate = (dateAny: any): Date => {
        if (!dateAny) return new Date();
        if (dateAny instanceof Date) {
            return isNaN(dateAny.getTime()) ? new Date() : dateAny;
        }
        const parsed = new Date(dateAny);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    // Función helper para formatear fecha y hora de forma consistente (DD/MM/YYYY HH:MM)
    const formatDateTime = (dateAny: any): string => {
        const date = parseSafeDate(dateAny);
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
                                                </div>
                                                <button 
                                                    onClick={() => navigateTo(Seccion.EditarTurno, turno.id)}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    ✎
                                                </button>
                                            </div>
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
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <div>
                                                            <p className="text-zinc-500 text-xs">Tiempo Bruto</p>
                                                            <p className="text-blue-400 text-xs font-bold">
                                                                {calculateTurnoTimes(turno).horasBrutasFormateadas}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-zinc-500 text-xs">Tiempo Neto</p>
                                                            <p className="text-emerald-400 text-xs font-bold">
                                                                {calculateTurnoTimes(turno).horasNetasFormateadas}
                                                            </p>
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
                                    const fechaHora = parseSafeDate(carrera.fechaHora).toLocaleDateString('es-ES', {
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
                                                </div>
                                                <button 
                                                    onClick={() => navigateTo(Seccion.EditarCarrera, carrera.id)}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    ✎
                                                </button>
                                            </div>
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
                                    const fecha = parseSafeDate(gasto.fecha).toLocaleDateString('es-ES', {
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
                                                    <button 
                                                        onClick={() => navigateTo(Seccion.EditarGasto, gasto.id)}
                                                        className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                                                    >
                                                        ✎
                                                    </button>
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

