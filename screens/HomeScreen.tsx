import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, Turno, CarreraVista } from '../types';
import {
  getIngresosForCurrentMonth,
  getGastosForCurrentMonth,
  subscribeToActiveTurno,
  subscribeToCarreras,
} from '../services/api';

// --- ICONOS MODERNOS, ESTILO COHERENTE (20px, stroke-based) ---

const TrendingUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <path d="M20 10v4" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

// Quick Action Icons — mismo estilo
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

const AttachMoneyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <line x1="9" y1="10" x2="9.01" y2="10" />
    <line x1="15" y1="10" x2="15.01" y2="10" />
    <path d="M11 15h2" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AssessmentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const AssignmentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    <path d="M9 16l4-4-4-4" />
  </svg>
);

const ScheduleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const PauseCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="10" y1="15" x2="10" y2="9" />
    <line x1="14" y1="15" x2="14" y2="9" />
  </svg>
);

// --- COMPONENTE PRINCIPAL ---

interface HomeScreenProps {
  navigateTo: (page: Seccion, id?: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateTo }) => {
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
  const [carreras, setCarreras] = useState<CarreraVista[]>([]);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToActiveTurno((turno) => setTurnoActivo(turno));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCarreras((data) => setCarreras(data));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ingresosData, gastosData] = await Promise.all([
          getIngresosForCurrentMonth(),
          getGastosForCurrentMonth(),
        ]);
        setIngresos(ingresosData);
        setGastos(gastosData);
      } catch (error) {
        console.error('Error fetching home screen ', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const carrerasDelTurno = useMemo(() => {
    if (!turnoActivo) return [];
    return carreras.filter((c) => c.turnoId === turnoActivo.id);
  }, [carreras, turnoActivo]);

  const totalTurno = useMemo(() => {
    return carrerasDelTurno.reduce((sum, c) => sum + (c.cobrado || 0), 0);
  }, [carrerasDelTurno]);

  const balance = ingresos - gastos;

  const quickActions = [
    { label: 'Ingresos', icon: <ListIcon />, action: () => navigateTo(turnoActivo ? Seccion.VistaCarreras : Seccion.Turnos) },
    { label: 'Gastos', icon: <AttachMoneyIcon />, action: () => navigateTo(Seccion.Gastos) },
    { label: 'Turnos', icon: <ScheduleIcon />, action: () => navigateTo(Seccion.Turnos) },
    { label: 'Histórico', icon: <HistoryIcon />, action: () => navigateTo(Seccion.Historico) },
    { label: 'Estadísticas', icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Estadisticas) },
    { label: 'Calendario', icon: <CalendarIcon />, action: () => navigateTo(Seccion.Calendario) },
    { label: 'Resumen', icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Resumen) },
    { label: 'Informes', icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Informes) },
    { label: 'Ajustes', icon: <SettingsIcon />, action: () => navigateTo(Seccion.AjustesGenerales) },
    { label: 'Recordatorios', icon: <AssignmentIcon />, action: () => navigateTo(Seccion.Recordatorios) },
  ];

  const formatCurrency = (value: number): string => `${value.toFixed(2).replace('.', ',')} €`;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Componente inline para acción rápida (estilo coherente)
  const QuickActionItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
    icon,
    label,
    onClick,
  }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#15151B] border border-[#1F2A37] hover:bg-[#1A1A1F] transition-colors duration-200 group"
    >
      <div className="text-[#00D4FF] mb-2 group-hover:text-[#00E0FF] transition-colors">{icon}</div>
      <span className="text-[#A4B7D6] text-xs font-medium text-center leading-tight group-hover:text-[#E6F1FF] transition-colors">
        {label}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen px-4 py-6 font-sans" style={{ backgroundColor: '#0F0F12', color: '#E6F1FF' }}>
      {loading ? (
        <div className="text-center py-12 text-[#7A8FA9] text-lg">Cargando datos...</div>
      ) : (
        <div className="space-y-7 max-w-6xl mx-auto">
          {/* --- TRES BOX EN UNA SOLA FILA, SIEMPRE --- */}
          <div className="flex gap-4 w-full">
            <div className="flex-1 min-w-0 bg-[#15151B] rounded-xl p-5 border border-[#1F2A37] flex items-center shadow-sm">
              <div className="text-blue-400 mr-4 flex-shrink-0">
                <TrendingUpIcon />
              </div>
              <div>
                <p className="text-[#7A8FA9] text-xs uppercase tracking-widest font-medium">Ingresos</p>
                <p className="text-xl font-semibold text-[#E6F1FF] mt-1">{formatCurrency(ingresos)}</p>
              </div>
            </div>
            <div className="flex-1 min-w-0 bg-[#15151B] rounded-xl p-5 border border-[#1F2A37] flex items-center shadow-sm">
              <div className="text-red-400 mr-4 flex-shrink-0">
                <TrendingDownIcon />
              </div>
              <div>
                <p className="text-[#7A8FA9] text-xs uppercase tracking-widest font-medium">Gastos</p>
                <p className="text-xl font-semibold text-[#E6F1FF] mt-1">{formatCurrency(gastos)}</p>
              </div>
            </div>
            <div className="flex-1 min-w-0 bg-[#15151B] rounded-xl p-5 border border-[#1F2A37] flex items-center shadow-sm">
              <div className="text-emerald-400 mr-4 flex-shrink-0">
                <WalletIcon />
              </div>
              <div>
                <p className="text-[#7A8FA9] text-xs uppercase tracking-widest font-medium">Balance</p>
                <p className="text-xl font-semibold text-[#E6F1FF] mt-1">{formatCurrency(balance)}</p>
              </div>
            </div>
          </div>

          {/* --- TURNO ACTIVO --- */}
          {turnoActivo ? (
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#1F2A37]">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-[#00D4FF] text-sm font-bold tracking-wide uppercase">Turno Activo</h2>
                  <p className="text-[#A4B7D6] text-sm mt-1">
                    {turnoActivo.fechaInicio.toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">Total turno</p>
                  <p className="text-2xl font-bold text-[#26FFC9] mt-1">{formatCurrency(totalTurno)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">Kms. Inicio</p>
                  <p className="text-[#E6F1FF] mt-1">{turnoActivo.kilometrosInicio}</p>
                </div>
                <div>
                  <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">Hora Inicio</p>
                  <p className="text-[#E6F1FF] mt-1">
                    {turnoActivo.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">Carreras</p>
                  <p className="text-[#E6F1FF] mt-1">{carrerasDelTurno.length}</p>
                </div>
              </div>

              <button
                onClick={() => navigateTo(Seccion.VistaCarreras)}
                className="w-full py-3 bg-gradient-to-r from-[#00FF94] to-[#00C6FF] rounded-xl font-semibold text-[#0F0F12] text-sm shadow-md hover:opacity-95 transition-opacity"
              >
                Ver Detalles
              </button>
            </div>
          ) : (
            <div className="bg-[#1A1A1F] rounded-2xl p-8 border border-[#1F2A37] text-center">
              <div className="inline-block p-3 rounded-full bg-[#15151B] mb-4">
                <div className="text-[#00E0FF]">
                  <PauseCircleIcon />
                </div>
              </div>
              <p className="text-[#A4B7D6] text-xs tracking-widest uppercase mb-2">{formattedDate}</p>
              <h3 className="text-[#E6F1FF] font-semibold text-base mb-1">No hay turno activo</h3>
              <p className="text-[#5E6A86] text-sm">Inicia un turno para comenzar</p>
            </div>
          )}

          {/* --- ACCESOS DIRECTOS: SIEMPRE 4 COLUMNAS --- */}
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <QuickActionItem key={index} icon={action.icon} label={action.label} onClick={action.action} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;