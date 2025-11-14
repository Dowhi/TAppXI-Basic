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
const TaxiIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 11h16l-1.5-5A2 2 0 0 0 16.61 4H7.39A2 2 0 0 0 5.5 6z" />
    <path d="M6 11v9" />
    <path d="M18 11v9" />
    <path d="M2 16h20" />
    <path d="M7 16v5" />
    <path d="M17 16v5" />
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

// --- COMPONENTE PRINCIPAL (REPLICADO DE LA FOTO) ---

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
    { label: 'Ingresos', icon: <TrendingUpIcon />, action: () => navigateTo(turnoActivo ? Seccion.VistaCarreras : Seccion.Turnos) },
    { label: 'Gastos', icon: <TrendingDownIcon />, action: () => navigateTo(Seccion.Gastos) },
    { label: 'Histórico', icon: <HistoryIcon />, action: () => navigateTo(Seccion.Historico) },
    { label: 'Estadíst...', icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Estadisticas) },
    { label: 'Calenda...', icon: <CalendarIcon />, action: () => navigateTo(Seccion.Calendario) },
    { label: 'Resumen', icon: <AssessmentIcon />, action: () => navigateTo(Seccion.Resumen) },
    { label: 'Informes', icon: <AssignmentIcon />, action: () => navigateTo(Seccion.Informes) },
    { label: 'Ajustes', icon: <SettingsIcon />, action: () => navigateTo(Seccion.AjustesGenerales) },
  ];

  const formatCurrency = (value: number): string => `${value.toFixed(2).replace('.', ',')} €`;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedDateCapitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Componente inline para acción rápida (estilo coherente con la foto)
  const QuickActionItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
    icon,
    label,
    onClick,
  }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center py-3 rounded-xl bg-[#2A3347] hover:bg-[#3B455A] transition-colors duration-200 group"
    >
      <div className="text-[#00D4FF] mb-1 group-hover:text-[#00F0FF] transition-colors">{icon}</div>
      <span className="text-white text-xs font-semibold text-center leading-tight truncate w-full px-1">
        {label}
      </span>
    </button>
  );

  return (
    <div
      className="min-h-screen px-2 py-4 font-sans"
      style={{
        background: 'linear-gradient(180deg, #08A8D7 0%, #072639 28%, #090B13 100%)',
        color: '#E6F1FF',
      }}
    >
      {loading ? (
        <div className="text-center py-12 text-[#7A8FA9] text-lg">Cargando datos...</div>
      ) : (
        <div className="space-y-6 max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#5FE3FF]">
              <span className="block">
                <TaxiIcon />
              </span>
              <span className="text-2xl font-extrabold tracking-wide">TAppXI</span>
            </div>
            <button
              onClick={() => navigateTo(Seccion.AjustesGenerales)}
              className="p-2 rounded-full bg-black/20 text-[#5FE3FF] hover:bg-black/30 transition-colors"
              aria-label="Ir a ajustes"
            >
              <SettingsIcon />
            </button>
          </div>

          {/* Tarjetas principales (Ingresos, Gastos, Balance) */}
          <div className="flex gap-2 w-full">
            {[
              {
                label: "Ingresos",
                value: formatCurrency(ingresos),
                color: '#00D4FF',
                iconBg: '#0A0D14',
                icon: <TrendingUpIcon />,
              },
              {
                label: "Gastos",
                value: formatCurrency(gastos),
                color: '#FF3DD0',
                iconBg: '#0A0D14',
                icon: <TrendingDownIcon />,
              },
              {
                label: "Balance",
                value: formatCurrency(balance),
                color: '#00FF94',
                iconBg: '#0A0D14',
                icon: <WalletIcon />,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="flex-1 min-w-0 rounded-xl px-2 py-1 bg-[#0A0D14] border border-black/60 shadow-[0_8px_20px_rgba(0,0,0,0.5)] flex flex-col items-center gap-1"
              >
                <div
                  className="w-8 h-5 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: card.iconBg, color: card.color }}
                >
                  {card.icon}
                </div>
                <p className="text-[14px] uppercase tracking-wide" style={{ color: card.color }}>
                  {card.label}
                </p>
                <p className="text-[17px] tracking-tight" style={{ color: card.color }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Estado del turno (como en la foto) */}
          {turnoActivo ? (
            <div className="bg-[#1A1A1F] rounded-3xl p-6 border border-[#1F2A37] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-[#46D7FF] text-sm font-bold tracking-wide uppercase">
                    {`Turno ${turnoActivo.numero ?? 1}`}
                  </h2>
                  <p className="text-[#A4B7D6] uppercase tracking-wide">
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

              <div className="grid grid-cols-3 gap-5 mb-3 text-sm">
                <div className="text-center">
                  <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">Kms Inic.</p>
                  <p className="text-[#E6F1FF] text-xl mt-1">{turnoActivo.kilometrosInicio}</p>
                </div>
                <div className="text-center">
                  <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">H. Inicio</p>
                  <p className="text-[#E6F1FF] text-xl mt-1">
                    {turnoActivo.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">Carreras</p>
                  <p className="text-[#E6F1FF] mt-1">{carrerasDelTurno.length}</p>
                </div>
              </div>

              <button
                onClick={() => navigateTo(Seccion.VistaCarreras)}
                className="w-full py-2 bg-gradient-to-r from-[#00FF94] to-[#00C6FF] rounded-xl font-semibold text-[#0F0F12] text-sm shadow-md hover:opacity-95 transition-opacity"
              >
                Ver Detalles
              </button>
            </div>
          ) : (
            <div className="bg-[#11131D] rounded-3xl px-6 py-8 border border-black/60 text-center shadow-[0_20px_65px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center bg-[#2B0F49] text-[#FF3DD0]">
                <PauseCircleIcon />
              </div>
              <p className="text-[#46D7FF] text-lg font-semibold mb-1">{formattedDateCapitalized}</p>
              <h3 className="text-[#FF3DD0] font-bold text-lg tracking-wide mb-3 uppercase">NO HAY TURNO ACTIVO</h3>
              <p className="text-[#E6F1FF] text-base leading-relaxed">Inicia un nuevo turno para comenzar</p>
            </div>
          )}

          {/* Accesos directos en 2 filas de 4 (como en la foto) */}
          <div className="grid grid-cols-4 gap-1">
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