import React, { useState, useEffect, useMemo } from 'react';
import { Seccion } from '../types';
import { getCarrerasByDate, getGastosByDate, getExcepciones, Excepcion } from '../services/api';
import ScreenTopBar from '../components/ScreenTopBar';

interface CalendarScreenProps {
    navigateTo: (page: Seccion) => void;
}

interface BreakConfig {
    startDate: string;
    startDayLetter?: string; // Nueva: letra del día de inicio
    initialBreakLetter?: string; // Compatibilidad con versiones anteriores
    weekendPattern: string;
    userBreakLetter?: string;
    savedAt: string;
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigateTo }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [breakConfig, setBreakConfig] = useState<BreakConfig | null>(null);
    const [dayData, setDayData] = useState<Record<string, { ingresos: number; gastos: number }>>({});
    const [showDayModal, setShowDayModal] = useState(false);
    const [selectedDayForModal, setSelectedDayForModal] = useState<number | null>(null);
    const [excepciones, setExcepciones] = useState<Excepcion[]>([]);

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Obtener el primer día del mes y cuántos días tiene
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 1 = Lunes, etc.

    // Ajustar para que Lunes sea 0
    const startingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    // Cargar configuración al montar el componente y cuando cambie el mes
    useEffect(() => {
        try {
            const savedConfig = localStorage.getItem('breakConfiguration');
            if (savedConfig) {
                setBreakConfig(JSON.parse(savedConfig));
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    }, [year, month]);

    // Escuchar cambios en localStorage para actualizar cuando se guarde la configuración
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const savedConfig = localStorage.getItem('breakConfiguration');
                if (savedConfig) {
                    setBreakConfig(JSON.parse(savedConfig));
                }
            } catch (error) {
                console.error('Error al cargar configuración:', error);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        // También escuchar eventos personalizados para cambios en la misma pestaña
        window.addEventListener('breakConfigUpdated', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('breakConfigUpdated', handleStorageChange);
        };
    }, []);

    // Función auxiliar para verificar si una fecha está dentro de un rango
    const isDateInRange = (date: Date, fechaDesde: Date, fechaHasta: Date): boolean => {
        const dateTime = date.getTime();
        const desdeTime = fechaDesde.getTime();
        const hastaTime = fechaHasta.getTime();
        return dateTime >= desdeTime && dateTime <= hastaTime;
    };

    const parseWeekendPattern = (patternRaw: string) => {
        const normalized = (patternRaw || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const saturdayMatch = normalized.match(/sabado\s*:\s*([a-z]+)/);
        const sundayMatch = normalized.match(/domingo\s*:\s*([a-z]+)/);

        return {
            saturday: (saturdayMatch?.[1] ?? 'ac').toUpperCase(),
            sunday: (sundayMatch?.[1] ?? 'bd').toUpperCase(),
        };
    };

    // Calcular las letras para todos los días del mes
    const dayLetters = useMemo(() => {
        if (!breakConfig || !breakConfig.startDate) return {};

        const letters: Record<number, string> = {};

        try {
            // Parsear la fecha de inicio (formato DD/MM/AAAA)
            const [dayStr, monthStr, yearStr] = breakConfig.startDate.split('/');
            const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
            const lettersArray = ['A', 'B', 'C', 'D'];
            const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;
            const weekendPattern = parseWeekendPattern(breakConfig.weekendPattern || '');

            // Obtener la letra del día de inicio (compatibilidad con versiones anteriores)
            const startLetter = breakConfig.startDayLetter || breakConfig.initialBreakLetter || 'A';
            const startLetterIndex = lettersArray.indexOf(startLetter);

            if (startLetterIndex === -1) return {};

            // Obtener el día de la semana del inicio (0=Domingo, 1=Lunes, etc.)
            const startDayOfWeek = startDate.getDay();
            // Convertir a formato donde Lunes=0
            const startWeekday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

            // Calcular la letra base para el lunes de la semana del inicio
            // Si el día de inicio es un lunes con letra A, entonces el lunes de esa semana es A
            // Si el día de inicio es un martes con letra B, entonces el lunes de esa semana es A (B-1)
            // Si el día de inicio es un miércoles con letra C, entonces el lunes de esa semana es A (C-2)
            // etc.
            const mondayOfStartWeekLetterIndex = mod(startLetterIndex - startWeekday, 4);

            for (let day = 1; day <= daysInMonth; day++) {
                const currentDayDate = new Date(year, month, day);
                const diffTime = currentDayDate.getTime() - startDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) continue; // Día antes del inicio del ciclo

                // Verificar si hay una excepción que afecte a este día
                let exceptionApplied = false;
                for (const excepcion of excepciones) {
                    // Normalizar fechas para comparación (solo día, mes, año)
                    const fechaDesde = new Date(excepcion.fechaDesde);
                    fechaDesde.setHours(0, 0, 0, 0);
                    const fechaHasta = new Date(excepcion.fechaHasta);
                    fechaHasta.setHours(23, 59, 59, 999);
                    const dayDate = new Date(currentDayDate);
                    dayDate.setHours(0, 0, 0, 0);

                    if (isDateInRange(dayDate, fechaDesde, fechaHasta)) {
                        if (excepcion.tipo === 'Cambio de Letra' && excepcion.nuevaLetra) {
                            letters[day] = excepcion.nuevaLetra;
                            exceptionApplied = true;
                            break; // Usar la primera excepción que coincida
                        }
                        // Para "Vacaciones" y otros tipos, solo marcamos que hay excepción
                        // pero no cambiamos la letra, se aplicará el fondo verde después
                        if (excepcion.tipo === 'Vacaciones') {
                            exceptionApplied = true;
                            break;
                        }
                    }
                }

                // Si ya se aplicó una excepción de "Cambio de Letra", continuar con el siguiente día
                // (las vacaciones no cambian la letra, solo el fondo)
                if (exceptionApplied && letters[day]) continue;

                const dayOfWeek = currentDayDate.getDay();
                const isSaturday = dayOfWeek === 6;
                const isSunday = dayOfWeek === 0;

                // Si es fin de semana, usar el patrón de fin de semana
                if (isSaturday || isSunday) {
                    const weekNumber = Math.floor((diffDays + startWeekday) / 7);
                    const swapPattern = weekNumber % 2 === 1;
                    const saturdayLetters = swapPattern ? weekendPattern.sunday : weekendPattern.saturday;
                    const sundayLetters = swapPattern ? weekendPattern.saturday : weekendPattern.sunday;

                    letters[day] = isSaturday ? saturdayLetters : sundayLetters;
                } else {
                    // Para días laborables (L-V): calcular basándose en el lunes de cada semana
                    // Convertir día de la semana a formato Lunes=0
                    const weekday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

                    // Calcular qué semana es desde el inicio
                    const weekNumber = Math.floor((diffDays + startWeekday) / 7);

                    // El lunes de cada semana avanza una letra cada semana
                    // Semana 0: L=A, M=B, X=C, J=D, V=A
                    // Semana 1: L=B, M=C, X=D, J=A, V=B
                    // Semana 2: L=C, M=D, X=A, J=B, V=C
                    // Semana 3: L=D, M=A, X=B, J=C, V=D
                    // Semana 4: L=A (vuelve al inicio)

                    // Calcular la letra del lunes de esta semana
                    const mondayLetterIndex = mod(mondayOfStartWeekLetterIndex + weekNumber, 4);

                    // Calcular la letra según el día de la semana dentro de la semana
                    // weekday: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes
                    const letterIndex = mod(mondayLetterIndex + weekday, 4);
                    letters[day] = lettersArray[letterIndex];
                }
            }
        } catch (error) {
            console.error('Error al calcular letras de descanso:', error);
        }

        return letters;
    }, [year, month, daysInMonth, breakConfig, excepciones]);

    // Cargar excepciones
    useEffect(() => {
        const loadExcepciones = async () => {
            try {
                const data = await getExcepciones();
                setExcepciones(data);
            } catch (error) {
                console.error('Error cargando excepciones:', error);
            }
        };
        loadExcepciones();
    }, [year, month]);

    // Cargar ingresos y gastos por día del mes actual
    useEffect(() => {
        const loadDayData = async () => {
            const today = new Date();
            const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

            const promises = Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const date = new Date(year, month, day);
                const isToday = isCurrentMonth && day === today.getDate();
                const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                return (async () => {
                    try {
                        const [carreras, gastosList] = await Promise.all([
                            getCarrerasByDate(date),
                            getGastosByDate(date)
                        ]);
                        const totalIngresos = carreras.reduce((sum, carrera) => sum + (carrera.cobrado || 0), 0);
                        const totalGastos = gastosList.reduce((sum, gasto) => sum + (gasto.importe || 0), 0);

                        if (totalIngresos > 0 || totalGastos > 0 || isToday) {
                            return { dayKey, ingresos: totalIngresos, gastos: totalGastos };
                        }
                    } catch (error) {
                        console.error(`Error cargando datos para el día ${day}:`, error);
                        if (isToday) {
                            return { dayKey, ingresos: 0, gastos: 0 };
                        }
                    }
                    return null;
                })();
            });

            const results = await Promise.all(promises);
            const newDayData: Record<string, { ingresos: number; gastos: number }> = {};
            results.forEach(result => {
                if (result) {
                    newDayData[result.dayKey] = {
                        ingresos: result.ingresos,
                        gastos: result.gastos
                    };
                }
            });
            setDayData(newDayData);
        };

        loadDayData();
    }, [year, month, daysInMonth]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
        setSelectedDay(null); // Reset selección al cambiar de mes
    };

    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        setSelectedDayForModal(day);
        setShowDayModal(true);
    };

    // Generar array de días del mes
    const days = [];
    // Días vacíos al inicio
    for (let i = 0; i < startingDay; i++) {
        days.push(null);
    }
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
    }

    // Calcular si un día es fin de semana (Sábado o Domingo)
    const isWeekend = (day: number | null): boolean => {
        if (day === null) return false;
        const dayOfWeek = new Date(year, month, day).getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
    };

    return (
        <div className="bg-zinc-950 h-screen flex flex-col overflow-hidden fixed inset-0 w-full px-3 pt-3 pb-14">
            <ScreenTopBar
                title="Calendario"
                navigateTo={navigateTo}
                backTarget={Seccion.Home}
            />

            {/* Navegación de Mes */}
            <div className="bg-blue-800 flex items-center justify-between py-2 px-2 flex-shrink-0">
                <button
                    onClick={() => navigateMonth('prev')}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </button>
                <h2 className="text-cyan-400 text-lg font-semibold">
                    {monthNames[month]} {year}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateTo(Seccion.ConfiguracionDescansos)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => navigateMonth('next')}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-0 py-1 bg-zinc-950 flex-shrink-0">
                {weekDays.map((day, index) => (
                    <div
                        key={index}
                        className={`text-center text-xs font-medium ${index >= 5 ? 'text-orange-500' : 'text-cyan-400'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid del Calendario - Sin espacios, ocupa todo el ancho */}
            <div className="grid grid-cols-7 gap-0 flex-1 bg-zinc-950 overflow-auto w-full">
                {days.map((day, index) => {
                    if (day === null) {
                        return <div key={index} className="min-h-0" />;
                    }

                    const isWeekendDay = isWeekend(day);
                    const isSelected = selectedDay === day;
                    // Crear clave única para el día (año-mes-día)
                    const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayInfo = dayData[dayKey];
                    const hasData = dayInfo !== undefined;

                    // Verificar si es el día actual
                    const today = new Date();
                    const isToday = today.getFullYear() === year &&
                        today.getMonth() === month &&
                        today.getDate() === day;

                    // Mostrar datos si existen o si es el día actual (para que siempre se muestre)
                    const showData = hasData || isToday;

                    // Verificar si la letra del día coincide con la letra del usuario
                    const dayLetter = dayLetters[day]?.toUpperCase();
                    const userLetter = breakConfig?.userBreakLetter?.toUpperCase();
                    const isRestDay = Boolean(
                        userLetter &&
                        dayLetter &&
                        (dayLetter === userLetter ||
                            (dayLetter === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                            (dayLetter === 'BD' && (userLetter === 'B' || userLetter === 'D')))
                    );

                    // Verificar si el día está en vacaciones
                    const isVacaciones = excepciones.some(excepcion => {
                        if (excepcion.tipo === 'Vacaciones') {
                            const fechaDesde = new Date(excepcion.fechaDesde);
                            fechaDesde.setHours(0, 0, 0, 0);
                            const fechaHasta = new Date(excepcion.fechaHasta);
                            fechaHasta.setHours(23, 59, 59, 999);
                            const dayDate = new Date(year, month, day);
                            dayDate.setHours(0, 0, 0, 0);
                            return isDateInRange(dayDate, fechaDesde, fechaHasta);
                        }
                        return false;
                    });

                    // Determinar el color de fondo
                    let bgColor = '';
                    if (isSelected) {
                        bgColor = 'bg-gradient-to-b from-orange-500 via-orange-400 to-yellow-500 border-2 border-white shadow-lg z-10';
                    } else if (isToday) {
                        bgColor = 'bg-gradient-to-b from-cyan-500 via-blue-500 to-indigo-500 border-2 border-white shadow-md';
                    } else if (isRestDay || isVacaciones) {
                        bgColor = 'bg-green-600 hover:bg-green-500 border border-green-500';
                    } else {
                        bgColor = 'bg-zinc-700 hover:bg-zinc-600 border border-zinc-600';
                    }

                    const incomeTextClass = (isSelected || isToday)
                        ? 'text-white'
                        : (isRestDay || isVacaciones)
                            ? 'text-white'
                            : 'text-sky-200';

                    const expenseTextClass = (isSelected || isToday)
                        ? 'text-white'
                        : (isRestDay || isVacaciones)
                            ? 'text-red-200'
                            : 'text-red-400';

                    return (
                        <button
                            key={index}
                            onClick={() => handleDayClick(day)}
                            className={`
                                w-full h-full min-h-[60px] flex items-start justify-between p-0.5 relative
                                transition-all
                                rounded-md overflow-hidden
                                ${bgColor}
                                ${isWeekendDay && !isSelected && !isRestDay && !isToday ? 'text-orange-500' : 'text-white'}
                            `}
                        >
                            {/* Letra en esquina superior izquierda */}
                            {dayLetters[day] && (
                                <div className="absolute top-0.5 left-0.5">
                                    <span className={`text-xs font-bold px-1 py-0.5 rounded flex-shrink-0 ${(isSelected || isToday) ? 'bg-white text-zinc-900' : 'bg-blue-600 text-white'
                                        }`}>
                                        {dayLetters[day]}
                                    </span>
                                </div>
                            )}

                            {/* Número en esquina superior derecha */}
                            <div className="absolute top-0.5 right-0.5">
                                <span className={`text-base font-medium flex-shrink-0 ${(isSelected || isToday) ? 'text-white' : 'text-zinc-100'}`}>
                                    {day}
                                </span>
                            </div>

                            {/* Ingresos y Gastos alineados a la izquierda en la celda si hay datos */}
                            {showData && (
                                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-start justify-end px-1.5 pb-1.5 pt-8 overflow-hidden">
                                    {(dayInfo?.ingresos ?? 0) > 0 && (
                                        <div
                                            className={`text-left leading-tight w-full ${incomeTextClass}`}
                                            style={{
                                                fontSize: 'clamp(13px, 2.5vw, 17px)',
                                                width: '100%'
                                            }}
                                        >
                                            {(dayInfo.ingresos).toFixed(2).replace('.', ',')}
                                        </div>
                                    )}
                                    {(dayInfo?.gastos ?? 0) > 0 && (
                                        <div
                                            className={`text-left leading-tight w-full ${expenseTextClass}`}
                                            style={{
                                                fontSize: 'clamp(13px, 2.5vw, 17px)',
                                                width: '100%'
                                            }}
                                        >
                                            {(dayInfo.gastos).toFixed(2).replace('.', ',')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>



            {/* Modal de Detalle del Día */}
            {showDayModal && selectedDayForModal !== null && (() => {
                const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDayForModal).padStart(2, '0')}`;
                const dayInfo = dayData[dayKey] || { ingresos: 0, gastos: 0 };
                const ingresos = dayInfo.ingresos || 0;
                const gastos = dayInfo.gastos || 0;
                const balance = ingresos - gastos;

                const dayDate = new Date(year, month, selectedDayForModal);
                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const dayName = dayNames[dayDate.getDay()];

                return (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowDayModal(false)}
                    >
                        <div
                            className="bg-zinc-900 rounded-2xl w-11/12 max-w-md p-6 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header con fecha */}
                            <div className="bg-zinc-800 rounded-xl py-3 px-4 text-center">
                                <h2 className="text-cyan-400 text-lg font-semibold">
                                    {dayName}, {selectedDayForModal} de {monthNames[month].toLowerCase()}
                                </h2>
                            </div>

                            {/* Primera fila: Ingresos y Gastos */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Ingresos */}
                                <div className="bg-zinc-800 rounded-xl p-3 border border-green-500">
                                    <div className="flex items-center justify-center mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                                            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                                        </svg>
                                    </div>
                                    <div className="text-green-400 text-xs font-semibold mb-1 text-center">Ingresos</div>
                                    <div className="text-green-400 text-lg font-bold text-center">
                                        {ingresos.toFixed(2).replace('.', ',')} €
                                    </div>
                                </div>

                                {/* Gastos */}
                                <div className="bg-zinc-800 rounded-xl p-3 border border-pink-500">
                                    <div className="flex items-center justify-center mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                                            <path d="M7.07 11L6.5 9H2v2h4.57l1.5 4H2v2h5.07l1.5 4H2v2h5.07l1.5 4h2.86l-1.5-4H22v-2h-5.07l-1.5-4H22v-2h-5.07l-1.5-4h-2.86l1.5 4H9.07l-1.5-4H5.07zM9.07 15l-1.5-4h9.86l1.5 4H9.07z" />
                                        </svg>
                                    </div>
                                    <div className="text-pink-400 text-xs font-semibold mb-1 text-center">Gastos</div>
                                    <div className="text-pink-400 text-lg font-bold text-center">
                                        {gastos.toFixed(2).replace('.', ',')} €
                                    </div>
                                </div>
                            </div>

                            {/* Segunda fila: Balance (ancho completo) */}
                            <div className="bg-zinc-800 rounded-xl p-4 border border-cyan-500">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                                    </svg>
                                    <div className="text-cyan-400 text-base font-semibold">Balance</div>
                                </div>
                                <div className="text-green-400 text-2xl font-bold text-center">
                                    {balance.toFixed(2).replace('.', ',')} €
                                </div>
                            </div>

                            {/* Botón CERRAR */}
                            <button
                                onClick={() => setShowDayModal(false)}
                                className="w-full bg-zinc-800 border-2 border-pink-500 rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-white font-bold text-base hover:bg-zinc-700 hover:border-pink-400 transition-all active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                                <span>CERRAR</span>
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default CalendarScreen;

