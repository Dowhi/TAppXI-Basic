import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, Turno, CarreraVista } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  getIngresosForCurrentMonth,
  getGastosForCurrentMonth,
  subscribeToActiveTurno,
  subscribeToCarreras,
  getAjustes,
  getCarrerasByDate,
  getWorkingDays,
} from '../services/api';
import { filterRemindersForToday, checkMaintenanceReminders } from '../services/reminders';
import PredictionWidget from '../components/PredictionWidget';

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

const StatisticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const AnalysisIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
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

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const TrainIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const PlaneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

// --- COMPONENTE PRINCIPAL (REPLICADO DE LA FOTO) ---

import QuickActionsWidget from '../components/QuickActionsWidget';

// ...

interface HomeScreenProps {
  navigateTo: (page: Seccion, id?: string) => void;
  onQuickAction?: (action: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateTo, onQuickAction }) => {

  const { isDark } = useTheme();
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
  const [carreras, setCarreras] = useState<CarreraVista[]>([]);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [objetivoDiario, setObjetivoDiario] = useState<number>(100);
  const [ingresosHoy, setIngresosHoy] = useState<number>(0);
  const [promedioDiasAnteriores, setPromedioDiasAnteriores] = useState<number>(0);
  const [remindersToday, setRemindersToday] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToActiveTurno(async (turno) => {
      if (turno && !turno.numero) {
        // Si el turno no tiene número, calcularlo
        const fechaTurno = new Date(turno.fechaInicio);
        fechaTurno.setHours(0, 0, 0, 0);
        const { getTurnosByDate } = await import('../services/api');
        const turnosDelDia = await getTurnosByDate(fechaTurno);
        const turnosOrdenados = turnosDelDia.sort((a, b) =>
          new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        );
        const indice = turnosOrdenados.findIndex(t => t.id === turno.id);
        turno.numero = indice >= 0 ? indice + 1 : 1;
      }
      setTurnoActivo(turno);
    });
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
        const [ingresosData, gastosData, ajustes] = await Promise.all([
          getIngresosForCurrentMonth(),
          getGastosForCurrentMonth(),
          getAjustes(),
        ]);
        setIngresos(ingresosData);
        setGastos(gastosData);

        // Cargar objetivo diario
        const objetivo = ajustes?.objetivoDiario || parseFloat(localStorage.getItem('objetivoDiario') || '100');
        setObjetivoDiario(objetivo);

        // Calcular ingresos de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const carrerasHoy = await getCarrerasByDate(hoy);
        const ingresosHoyValue = carrerasHoy.reduce((sum, c) => sum + (c.cobrado || 0), 0);
        setIngresosHoy(ingresosHoyValue);

        // Calcular promedio de últimos 7 días trabajados (excluyendo hoy)
        const fechaInicio = new Date(hoy);
        fechaInicio.setDate(fechaInicio.getDate() - 14); // Buscar en últimos 14 días para tener al menos 7 días trabajados
        const diasTrabajados = await getWorkingDays(fechaInicio, new Date(hoy.getTime() - 1)); // Hasta ayer

        if (diasTrabajados.length > 0) {
          const ingresosPorDia = await Promise.all(
            diasTrabajados.slice(-7).map(async (fecha) => {
              const carreras = await getCarrerasByDate(fecha);
              return carreras.reduce((sum, c) => sum + (c.cobrado || 0), 0);
            })
          );
          const promedio = ingresosPorDia.reduce((sum, ing) => sum + ing, 0) / ingresosPorDia.length;
          setPromedioDiasAnteriores(promedio);
        }
      } catch (error) {
        console.error('Error fetching home screen ', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Cargar recordatorios cuando cambie el turno activo
  // Subscription to Reminders
  const [allReminders, setAllReminders] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        const api = await import('../services/api');
        unsubscribe = api.subscribeToReminders((data: any[]) => {
          setAllReminders(data);
        });
      } catch (error) {
        console.error("Error importing api for reminders:", error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Cargar recordatorios cuando cambie el turno activo o la lista de reminders
  useEffect(() => {
    // Filtrar recordatorios del día usando la lista en tiempo real
    const reminders = filterRemindersForToday(allReminders);

    // Verificar recordatorios de mantenimiento por kilómetros
    if (turnoActivo && turnoActivo.kilometrosInicio) {
      const maintenanceReminders = checkMaintenanceReminders(turnoActivo.kilometrosInicio, allReminders);
      // Evitar duplicados
      const existingIds = new Set(reminders.map(r => r.id));
      maintenanceReminders.forEach(r => {
        if (!existingIds.has(r.id)) {
          reminders.push(r);
        }
      });
    }

    setRemindersToday(reminders);
  }, [turnoActivo, allReminders]);

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
    { label: 'Estadísticas', icon: <StatisticsIcon />, action: () => navigateTo(Seccion.Estadisticas) },
    { label: 'Análisis', icon: <AnalysisIcon />, action: () => navigateTo(Seccion.AnalisisAvanzado) },
    { label: 'Calendario', icon: <CalendarIcon />, action: () => navigateTo(Seccion.Calendario) },
    { label: 'Resumen', icon: <SummaryIcon />, action: () => navigateTo(Seccion.Resumen) },
    { label: 'Informes', icon: <AssignmentIcon />, action: () => navigateTo(Seccion.Informes) },
    { label: 'Recordatorios', icon: <BellIcon />, action: () => navigateTo(Seccion.Recordatorios) },
    { label: 'Estación', icon: <TrainIcon />, action: () => navigateTo(Seccion.EstacionTren) },
    { label: 'Aeropuerto', icon: <PlaneIcon />, action: () => navigateTo(Seccion.Aeropuerto) },
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
      className={`flex flex-col items-center justify-center py-3 rounded-xl transition-colors duration-200 group ${isDark
        ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
        : 'bg-zinc-200 hover:bg-zinc-300 border border-zinc-300'
        }`}
    >
      <div className={`mb-1 transition-colors ${isDark ? 'text-cyan-400 group-hover:text-cyan-300' : 'text-blue-600 group-hover:text-blue-700'
        }`}>{icon}</div>
      <span className={`text-xs font-semibold text-center leading-tight w-full px-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'
        }`}>
        {label}
      </span>
    </button>
  );

  // Colores dinámicos basados en el tema
  const bgGradient = isDark
    ? 'linear-gradient(180deg, #08A8D7 0%, #072639 28%, #090B13 100%)'
    : 'linear-gradient(180deg, #60A5FA 0%, #E0E7FF 28%, #F3F4F6 100%)';

  const textColor = isDark ? '#E6F1FF' : '#1F2937';
  const secondaryTextColor = isDark ? '#7A8FA9' : '#6B7280';
  const accentColor = isDark ? '#5FE3FF' : '#2563EB';
  const cardBg = isDark ? '#0A0D14' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)';
  const turnoCardBg = isDark ? '#1A1A1F' : '#F9FAFB';
  const turnoCardBorder = isDark ? '#1F2A37' : '#E5E7EB';
  const noTurnoCardBg = isDark ? '#11131D' : '#F3F4F6';
  const iconBg = isDark ? '#0A0D14' : '#F9FAFB';

  return (
    <div
      className="min-h-screen px-2 py-4 font-sans"
      style={{
        background: bgGradient,
        color: textColor,
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner text="Cargando datos..." size="lg" />
        </div>
      ) : (
        <div className="space-y-6 max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
              <span className="block">
                <TaxiIcon />
              </span>
              <span className="text-2xl font-extrabold tracking-wide">TAppXI</span>
            </div>
            <button
              onClick={() => navigateTo(Seccion.AjustesGenerales)}
              className={`p-2 rounded-full transition-colors ${isDark
                ? 'bg-black/20 text-cyan-400 hover:bg-black/30'
                : 'bg-white/80 text-blue-600 hover:bg-white/90'
                }`}
              aria-label="Ir a ajustes"
            >
              <SettingsIcon />
            </button>
          </div>

          {/* Quick Actions Widget */}
          <QuickActionsWidget onQuickAction={onQuickAction} />

          {/* Alertas de Recordatorios */}
          {remindersToday.length > 0 && (
            <div
              className="rounded-2xl p-4 shadow-xl border-2"
              style={{
                backgroundColor: isDark ? '#FEF3C7' : '#FEF3C7',
                borderColor: '#F59E0B',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-zinc-900 mb-1">
                    {remindersToday.length} Recordatorio{remindersToday.length > 1 ? 's' : ''} Pendiente{remindersToday.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-1 mb-2">
                    {remindersToday.slice(0, 3).map((reminder) => (
                      <p key={reminder.id} className="text-sm text-zinc-800">
                        • {reminder.titulo}
                        {reminder.tipo === 'mantenimiento' && reminder.kilometrosLimite && (
                          <span className="text-zinc-600"> ({reminder.kilometrosLimite} km)</span>
                        )}
                      </p>
                    ))}
                    {remindersToday.length > 3 && (
                      <p className="text-sm text-zinc-600">y {remindersToday.length - 3} más...</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigateTo(Seccion.Recordatorios)}
                    className="text-sm font-semibold text-zinc-900 underline hover:no-underline"
                  >
                    Ver todos los recordatorios →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tarjetas principales (Ingresos, Gastos, Balance) */}
          <div className="flex gap-2 w-full">
            {[
              {
                label: "Ingresos",
                value: formatCurrency(ingresos),
                color: isDark ? '#00D4FF' : '#2563EB',
                icon: <TrendingUpIcon />,
              },
              {
                label: "Gastos",
                value: formatCurrency(gastos),
                color: isDark ? '#FF3DD0' : '#DC2626',
                icon: <TrendingDownIcon />,
              },
              {
                label: "Balance",
                value: formatCurrency(balance),
                color: isDark ? '#00FF94' : '#16A34A',
                icon: <WalletIcon />,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="flex-1 min-w-0 rounded-xl px-2 py-1 flex flex-col items-center gap-1 shadow-lg"
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <div
                  className="w-8 h-5 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: iconBg, color: card.color }}
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

          {/* Tarjeta de Productividad - Progreso vs Objetivo */}
          {(() => {
            const porcentajeProgreso = objetivoDiario > 0 ? Math.min((ingresosHoy / objetivoDiario) * 100, 100) : 0;
            const diferencia = ingresosHoy - objetivoDiario;
            const porcentajeVsPromedio = promedioDiasAnteriores > 0
              ? ((ingresosHoy - promedioDiasAnteriores) / promedioDiasAnteriores) * 100
              : 0;

            // Determinar color según progreso
            let statusColor: string;
            let statusIcon: string;
            let statusText: string;

            if (porcentajeProgreso >= 100) {
              statusColor = isDark ? '#00FF94' : '#16A34A'; // Verde
              statusIcon = '✅';
              statusText = 'Objetivo alcanzado';
            } else if (porcentajeProgreso >= 75) {
              statusColor = isDark ? '#FBBF24' : '#F59E0B'; // Amarillo
              statusIcon = '⚠️';
              statusText = 'Buen progreso';
            } else if (porcentajeProgreso >= 50) {
              statusColor = isDark ? '#FB923C' : '#F97316'; // Naranja
              statusIcon = '⚠️';
              statusText = 'Progreso regular';
            } else {
              statusColor = isDark ? '#EF4444' : '#DC2626'; // Rojo
              statusIcon = '❌';
              statusText = 'Por debajo del objetivo';
            }

            return (
              <div
                className="rounded-2xl p-4 shadow-xl"
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{statusIcon}</span>
                    <h3 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Progreso del Día
                    </h3>
                  </div>
                  <span
                    className="text-sm font-semibold px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: statusColor + '20',
                      color: statusColor
                    }}
                  >
                    {statusText}
                  </span>
                </div>

                {/* Barra de progreso */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {formatCurrency(ingresosHoy)} / {formatCurrency(objetivoDiario)}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: statusColor }}
                    >
                      {porcentajeProgreso.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="w-full h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: isDark ? '#1A1A1F' : '#E5E7EB' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${porcentajeProgreso}%`,
                        backgroundColor: statusColor,
                      }}
                    />
                  </div>
                </div>

                {/* Información adicional */}
                <div className="space-y-1.5">
                  {diferencia >= 0 ? (
                    <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      ✅ Has superado el objetivo por {formatCurrency(Math.abs(diferencia))}
                    </p>
                  ) : (
                    <p className={`text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      ⚠️ Te faltan {formatCurrency(Math.abs(diferencia))} para el objetivo
                    </p>
                  )}

                  {promedioDiasAnteriores > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: cardBorder }}>
                      <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Promedio últimos días:
                      </span>
                      <span className={`text-xs font-semibold ${porcentajeVsPromedio >= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                        {formatCurrency(promedioDiasAnteriores)}
                        {porcentajeVsPromedio !== 0 && (
                          <span> ({porcentajeVsPromedio >= 0 ? '+' : ''}{porcentajeVsPromedio.toFixed(1)}%)</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Estado del turno integrado */}
                {turnoActivo && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: cardBorder }}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className={`text-sm font-bold tracking-wide uppercase ${isDark ? 'text-cyan-400' : 'text-blue-600'
                          }`}>
                          {`Turno ${turnoActivo.numero ?? 1}`}
                        </h2>
                        <p className={`uppercase tracking-wide text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'
                          }`}>
                          {turnoActivo.fechaInicio.toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-blue-600'
                          }`}>Total turno</p>
                        <p className={`text-xl font-bold mt-1 ${isDark ? 'text-green-400' : 'text-green-600'
                          }`}>{formatCurrency(totalTurno)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                      <div className="text-center">
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-blue-600'
                          }`}>Kms Inic.</p>
                        <p className={`text-lg mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {turnoActivo.kilometrosInicio}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-blue-600'
                          }`}>H. Inicio</p>
                        <p className={`text-lg mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {turnoActivo.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-blue-600'
                          }`}>Carreras</p>
                        <p className={`text-lg mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {carrerasDelTurno.length}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigateTo(Seccion.VistaCarreras)}
                      className={`w-full py-2 rounded-xl font-semibold text-sm shadow-md hover:opacity-95 transition-opacity ${isDark
                        ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-zinc-900'
                        : 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        }`}
                    >
                      Ver Detalles
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Estado cuando no hay turno activo */}
          {!turnoActivo && (
            <div
              className="rounded-2xl p-4 shadow-xl text-center"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <div className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-purple-900/50 text-pink-400' : 'bg-purple-100 text-pink-600'
                }`}>
                <PauseCircleIcon />
              </div>
              <p className={`text-base font-semibold mb-1 ${isDark ? 'text-cyan-400' : 'text-blue-600'
                }`}>{formattedDateCapitalized}</p>
              <h3 className={`font-bold text-base tracking-wide mb-2 uppercase ${isDark ? 'text-pink-400' : 'text-pink-600'
                }`}>NO HAY TURNO ACTIVO</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>Inicia un nuevo turno para comenzar</p>
            </div>
          )}


          {/* Widget de Predicción */}
          {!turnoActivo && <PredictionWidget />}

          {/* Accesos directos en 3 filas de 3 (ajustado para 9 acciones) */}
          <div className="grid grid-cols-3 gap-1">
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