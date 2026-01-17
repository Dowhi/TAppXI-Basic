import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
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
    // Estado para el modo de calendario (Taxi vs Aeropuerto)
    const [calendarMode, setCalendarMode] = useState<'taxi' | 'airport'>('taxi');

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
        if (!date || !fechaDesde || !fechaHasta) return false;
        if (isNaN(date.getTime()) || isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) return false;

        const dateTime = date.getTime();
        const desdeTime = fechaDesde.getTime();
        const hastaTime = fechaHasta.getTime();
        return dateTime >= desdeTime && dateTime <= hastaTime;
    };

    const parseWeekendPattern = (patternRaw: string) => {
        // ... (unchanged)
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

    // Helper para asegurar Date válido
    const ensureDate = (date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
        try {
            const parsed = new Date(date);
            return isNaN(parsed.getTime()) ? null : parsed;
        } catch {
            return null;
        }
    };

    // Calcular las letras para todos los días del mes
    const dayLetters = useMemo(() => {
        const letters: Record<number, string> = {};

        if (calendarMode === 'taxi') {
            if (!breakConfig || !breakConfig.startDate) return {};

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

                const mondayOfStartWeekLetterIndex = mod(startLetterIndex - startWeekday, 4);

                for (let day = 1; day <= daysInMonth; day++) {
                    const currentDayDate = new Date(year, month, day);
                    const diffTime = currentDayDate.getTime() - startDate.getTime();
                    // Use Math.round to handle DST changes (23h or 25h days) correctly
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) continue; // Día antes del inicio del ciclo

                    // Verificar si hay una excepción que afecte a este día
                    let skipStandardCalc = false;
                    for (const excepcion of excepciones) {
                        const fechaDesde = ensureDate(excepcion.fechaDesde);
                        const fechaHasta = ensureDate(excepcion.fechaHasta);

                        if (!fechaDesde || !fechaHasta) continue;

                        fechaDesde.setHours(0, 0, 0, 0);
                        fechaHasta.setHours(23, 59, 59, 999);
                        const dayDate = new Date(currentDayDate);
                        dayDate.setHours(0, 0, 0, 0);

                        if (isDateInRange(dayDate, fechaDesde, fechaHasta)) {
                            if (excepcion.tipo === 'Cambio de Letra' && excepcion.nuevaLetra) {
                                letters[day] = excepcion.nuevaLetra;
                                skipStandardCalc = true;
                                break;
                            }
                            if (['Festivo (sin descanso)', 'Liberacion Especial'].includes(excepcion.tipo)) {
                                skipStandardCalc = true;
                                break;
                            }
                        }
                    }

                    if (skipStandardCalc) continue;

                    // ... (standard calculations)
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
                        const weekday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        const weekNumber = Math.floor((diffDays + startWeekday) / 7);
                        const mondayLetterIndex = mod(mondayOfStartWeekLetterIndex + weekNumber, 4);
                        const letterIndex = mod(mondayLetterIndex + weekday, 4);
                        letters[day] = lettersArray[letterIndex];
                    }
                }
            } catch (error) {
                console.error('Error al calcular letras de descanso (Taxi):', error);
            }
        } else {
            // Modo Aeropuerto
            try {
                // Epoch: 1 Enero 2026 = A
                const epochDate = new Date(2026, 0, 1);
                const lettersArray = ['A', 'B', 'C', 'D'];
                let currentLetterIdx = 0; // Starts with A

                // Iterar desde Epoch hasta fin del mes solicitado
                const targetEndDate = new Date(year, month + 1, 0);
                const iterDate = new Date(epochDate);
                iterDate.setHours(0, 0, 0, 0);

                // Si la fecha solicitada es anterior a 2026, esto no generará letras (intencional por ahora)
                while (iterDate <= targetEndDate) {
                    const dYear = iterDate.getFullYear();
                    const dMonth = iterDate.getMonth();
                    const dDay = iterDate.getDate();

                    // Guardar letra si está en el mes visualizado
                    if (dYear === year && dMonth === month) {
                        letters[dDay] = lettersArray[currentLetterIdx];
                    }

                    // Lógica de avance:
                    // Viernes (5) -> Sábado (Misma letra) -> NO AVANZAR
                    // Domingo (0) -> Lunes (Misma letra) -> NO AVANZAR
                    // El resto avanza.
                    const dayOfWeek = iterDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
                    let shouldAdvance = true;
                    if (dayOfWeek === 5) shouldAdvance = false; // Friday (next day is Saturday, same letter)
                    if (dayOfWeek === 0) shouldAdvance = false; // Sunday (next day is Monday, same letter)

                    if (shouldAdvance) {
                        currentLetterIdx = (currentLetterIdx + 1) % 4;
                    }

                    iterDate.setDate(iterDate.getDate() + 1);
                }
            } catch (error) {
                console.error('Error al calcular letras de aeropuerto:', error);
            }
        }

        return letters;
    }, [year, month, daysInMonth, breakConfig, excepciones, calendarMode]);

    // Cargar excepciones
    useEffect(() => {
        const loadExcepciones = async () => {
            try {
                const data = await getExcepciones();
                // Safe Hydration
                const hydratedData = data.map(e => {
                    const fd = ensureDate(e.fechaDesde);
                    const fh = ensureDate(e.fechaHasta);
                    if (!fd || !fh) return null; // Skip invalid
                    return {
                        ...e,
                        fechaDesde: fd,
                        fechaHasta: fh
                    };
                }).filter((e) => e !== null) as Excepcion[];

                setExcepciones(hydratedData);
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

    const handleGeneratePDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Colores
        const COLOR_BG = [255, 255, 255];
        const COLOR_TEXT = [0, 0, 0];
        const COLOR_REST = [200, 255, 200];
        const COLOR_HOLIDAY = [255, 200, 200];
        const COLOR_SPECIAL = [230, 200, 255];
        const COLOR_HEADER_MONTH = [220, 240, 255];

        // Título Global
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(`Calendario Taxi & Aeropuerto - Año ${year}`, 148.5, 12, { align: 'center' });

        // Leyenda Rápida
        doc.setFontSize(8);
        doc.setFillColor(COLOR_REST[0], COLOR_REST[1], COLOR_REST[2]);
        doc.rect(210, 6, 4, 4, 'F');
        doc.text('Descanso Taxi', 215, 9);
        doc.setFillColor(COLOR_HOLIDAY[0], COLOR_HOLIDAY[1], COLOR_HOLIDAY[2]);
        doc.rect(235, 6, 4, 4, 'F');
        doc.text('Festivo', 240, 9);

        // Simular leyenda de letras
        doc.setTextColor(50, 50, 50);
        doc.setFont(undefined, 'bold');
        doc.text("A", 260, 9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(": Taxi", 263, 9);

        doc.setTextColor(0, 110, 200);
        doc.setFont(undefined, 'bold');
        doc.text("A", 275, 9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(": Aeropuerto", 278, 9);


        // Dimensiones A4 Landscape: 297x210
        // Layout 4x3
        const marginX = 10;
        const marginY = 18;
        const gapX = 6;
        const gapY = 8;
        const monthWidth = (297 - (marginX * 2) - (gapX * 3)) / 4;
        const monthHeight = (210 - (marginY * 2) - (gapY * 2)) / 3;

        const headerHeight = 5;
        const weekHeaderHeight = 4;
        const gridHeight = monthHeight - headerHeight - weekHeaderHeight;
        const cellWidth = monthWidth / 7;
        const cellHeight = gridHeight / 6;

        // --- PRE-CÁLCULO AEROPUERTO ---
        // Generar mapa de fechas -> Letra Aeropuerto para todo el año
        const airportMap: Record<string, string> = {};
        try {
            // Epoch: 1 Enero 2026 = A. 
            // Si el año es previo a 2026, no mostramos nada (fallback)
            if (year >= 2026) {
                let iter = new Date(2026, 0, 1);
                iter.setHours(0, 0, 0, 0);
                const endOfYear = new Date(year, 11, 31);
                endOfYear.setHours(23, 59, 59, 999);

                const letters = ['A', 'B', 'C', 'D'];
                let idx = 0;

                while (iter <= endOfYear) {
                    // Si estamos en el año actual, guardar
                    if (iter.getFullYear() === year) {
                        // Key format: YYYY-MM-DD
                        // Note: getMonth is 0-indexed.
                        const k = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}-${String(iter.getDate()).padStart(2, '0')}`;
                        airportMap[k] = letters[idx];
                    }

                    // Advance rules: Skip Fri(5) and Sun(0)
                    const dow = iter.getDay();
                    let advance = true;
                    if (dow === 5 || dow === 0) advance = false;

                    if (advance) idx = (idx + 1) % 4;
                    iter.setDate(iter.getDate() + 1);
                }
            }
        } catch (e) { console.error(e); }


        // Bucle 12 meses
        for (let m = 0; m < 12; m++) {
            const col = m % 4;
            const row = Math.floor(m / 4);
            const x = marginX + (col * (monthWidth + gapX));
            const y = marginY + (row * (monthHeight + gapY));

            // Título Mes
            doc.setFillColor(COLOR_HEADER_MONTH[0], COLOR_HEADER_MONTH[1], COLOR_HEADER_MONTH[2]);
            doc.rect(x, y, monthWidth, headerHeight, 'F');
            doc.rect(x, y, monthWidth, headerHeight, 'S');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(monthNames[m], x + (monthWidth / 2), y + 3.5, { align: 'center' });

            // Cabecera Semanal
            doc.setFontSize(7);
            const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
            let currentY = y + headerHeight;
            weekDaysShort.forEach((dStr, i) => {
                const cx = x + (i * cellWidth);
                doc.rect(cx, currentY, cellWidth, weekHeaderHeight, 'S');
                if (i >= 5) doc.setTextColor(200, 50, 50);
                else doc.setTextColor(0, 0, 0);
                doc.text(dStr, cx + (cellWidth / 2), currentY + 3, { align: 'center' });
            });
            currentY += weekHeaderHeight;

            const firstDay = new Date(year, m, 1);
            const lastDay = new Date(year, m + 1, 0);
            const numDays = lastDay.getDate();
            const startDayOfWeek = firstDay.getDay();
            const startPos = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

            // Días
            let dayCounter = 1;

            for (let i = 0; i < 42; i++) {
                if (dayCounter > numDays) break;

                const cx = x + ((i % 7) * cellWidth);
                const cy = currentY + (Math.floor(i / 7) * cellHeight);

                if (i >= startPos) {
                    const day = dayCounter;
                    const currentDate = new Date(year, m, day);
                    const dow = currentDate.getDay();

                    // --- 1. Letra TAXI ---
                    let taxiLetter = '';
                    if (breakConfig?.startDate) {
                        // Misma lógica que Main Component
                        const [ds, ms, ys] = breakConfig.startDate.split('/');
                        const startDate = new Date(parseInt(ys), parseInt(ms) - 1, parseInt(ds));
                        const lettersArray = ['A', 'B', 'C', 'D'];

                        const diffTime = currentDate.getTime() - startDate.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays >= 0) {
                            const startLetter = breakConfig.startDayLetter || breakConfig.initialBreakLetter || 'A';
                            const startIdx = lettersArray.indexOf(startLetter);
                            const startDow = startDate.getDay();
                            const startWd = startDow === 0 ? 6 : startDow - 1;
                            const mod = (v: number, d: number) => ((v % d) + d) % d;
                            const startWkMondayIdx = mod(startIdx - startWd, 4);

                            const isSat = dow === 6;
                            const isSun = dow === 0;
                            if (isSat || isSun) {
                                const weekendPattern = parseWeekendPattern(breakConfig.weekendPattern || '');
                                const weekNum = Math.floor((diffDays + startWd) / 7);
                                const swap = weekNum % 2 === 1;
                                taxiLetter = isSat
                                    ? (swap ? weekendPattern.sunday : weekendPattern.saturday)
                                    : (swap ? weekendPattern.saturday : weekendPattern.sunday);
                            } else {
                                const weekNum = Math.floor((diffDays + startWd) / 7);
                                const wd = dow === 0 ? 6 : dow - 1;
                                const mondayIdx = mod(startWkMondayIdx + weekNum, 4);
                                const finalIdx = mod(mondayIdx + wd, 4);
                                taxiLetter = lettersArray[finalIdx];
                            }
                        }
                    }

                    // --- 2. Letra AEROPUERTO ---
                    const dateKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const airportLetter = airportMap[dateKey] || '';

                    // --- 3. Determinar COLOR FONDO (Usamos Taxi User Letter) ---
                    const userLetter = breakConfig?.userBreakLetter?.toUpperCase();
                    const tl = taxiLetter.toUpperCase();
                    const isRest = Boolean(
                        userLetter && tl &&
                        (tl === userLetter ||
                            (tl === 'AC' && (userLetter === 'A' || userLetter === 'C')) ||
                            (tl === 'BD' && (userLetter === 'B' || userLetter === 'D')))
                    );

                    // Excepciones
                    const activeException = excepciones.find(e => {
                        const fd = ensureDate(e.fechaDesde);
                        const fh = ensureDate(e.fechaHasta);
                        if (!fd || !fh) return false;
                        // Range check logic...
                        const fds = new Date(fd); fds.setHours(0, 0, 0, 0);
                        const fhs = new Date(fh); fhs.setHours(23, 59, 59, 999);
                        const dDate = new Date(year, m, day); dDate.setHours(12, 0, 0, 0);
                        return dDate >= fds && dDate <= fhs;
                    });

                    let bg = COLOR_BG;
                    if (activeException && ['Vacaciones', 'Festivo (sin descanso)', 'Liberacion Especial'].includes(activeException.tipo)) {
                        if (activeException.tipo === 'Festivo (sin descanso)') bg = COLOR_HOLIDAY;
                        else if (activeException.tipo === 'Liberacion Especial') bg = COLOR_SPECIAL;
                        else bg = COLOR_REST;
                    } else if (isRest) {
                        bg = COLOR_REST;
                    }

                    // --- DRAW ---
                    doc.setFillColor(bg[0], bg[1], bg[2]);
                    doc.rect(cx, cy, cellWidth, cellHeight, 'FD');

                    // Number (Corner Small)
                    doc.setFontSize(6);
                    doc.setTextColor(0, 0, 0);
                    // Right Align
                    doc.text(String(day), cx + cellWidth - 0.5, cy + 2.5, { align: 'right' });

                    // Taxi Letter (Center Big)
                    if (taxiLetter) {
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'bold');
                        doc.setTextColor(50, 50, 50);
                        // Shift center slightly up to make room for bottom text
                        doc.text(taxiLetter, cx + (cellWidth / 2), cy + (cellHeight / 2) + 0.5, { align: 'center' });
                        doc.setFont(undefined, 'normal');
                    }

                    // Airport Letter (Bottom Small Blue)
                    if (airportLetter) {
                        doc.setFontSize(7);
                        doc.setFont(undefined, 'bold');
                        doc.setTextColor(0, 110, 200); // Blueish
                        doc.text(airportLetter, cx + (cellWidth / 2), cy + cellHeight - 1, { align: 'center' });
                        doc.setFont(undefined, 'normal');
                    }

                    dayCounter++;
                }
            }
        }

        doc.save(`Calendario_TAppXI_Anual_${year}.pdf`);
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

            {/* Navegación y Herramientas Unificadas */}
            <div className="bg-zinc-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between py-2 px-2 flex-shrink-0 shadow-sm relative z-20 gap-2">
                {/* Grupo Izquierda: Navegación Mes */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex-shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>

                    <h2 className="text-white text-base font-medium tracking-tight text-center select-none truncate flex-1 leading-tight">
                        {monthNames[month]} <span className="text-zinc-500 font-light text-sm hidden sm:inline">{year}</span>
                    </h2>

                    <button
                        onClick={() => navigateMonth('next')}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex-shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Grupo Derecha: Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Toggle Modo */}
                    <button
                        onClick={() => setCalendarMode(prev => prev === 'taxi' ? 'airport' : 'taxi')}
                        className={`
                            h-7 px-2 rounded-full text-[10px] font-bold tracking-wide transition-all border flex items-center gap-1.5 uppercase
                            ${calendarMode === 'taxi'
                                ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20'
                                : 'bg-sky-500/10 border-sky-500/50 text-sky-400 hover:bg-sky-500/20'}
                        `}
                        title={calendarMode === 'taxi' ? 'Modo Taxi' : 'Modo Aeropuerto'}
                    >
                        {calendarMode === 'taxi' ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                TAX
                            </>
                        ) : (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                                AERP
                            </>
                        )}
                    </button>

                    {/* PDF */}
                    <button
                        onClick={handleGeneratePDF}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/30"
                        title="Descargar PDF"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                    </button>

                    {/* Configuración */}
                    <button
                        onClick={() => navigateTo(Seccion.ConfiguracionDescansos)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Configuración"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.18-.08a2 2 0 0 0-2 0l-.45.45a2 2 0 0 0 0 2l.08.18a2 2 0 0 1 0 2l-.25.43a2 2 0 0 1-1.73 1H2a2 2 0 0 0-2 2v.45a2 2 0 0 0 2 2h.18a2 2 0 0 1 1.73 1l.25.43a2 2 0 0 1 0 2l-.08.18a2 2 0 0 0 0 2l.45.45a2 2 0 0 0 2 0l.18-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.18.08a2 2 0 0 0 2 0l.45-.45a2 2 0 0 0 0-2l-.08-.18a2 2 0 0 1 0-2l.25-.43a2 2 0 0 1 1.73-1H22a2 2 0 0 0 2-2v-.45a2 2 0 0 0-2-2h-.18a2 2 0 0 1-1.73-1l-.25-.43a2 2 0 0 1 0-2l.08-.18a2 2 0 0 0 0-2l-.45-.45a2 2 0 0 0-2 0l-.18.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
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

                    // Verificar si el día tiene una excepción (Vacaciones, Festivo, etc.)
                    const activeException = excepciones.find(excepcion => {
                        if (!['Vacaciones', 'Festivo (sin descanso)', 'Liberacion Especial'].includes(excepcion.tipo)) {
                            return false;
                        }

                        const fechaDesde = ensureDate(excepcion.fechaDesde);
                        const fechaHasta = ensureDate(excepcion.fechaHasta);

                        if (!fechaDesde || !fechaHasta) return false;

                        // Normalizar para comparación exacta de días
                        const fDesde = new Date(fechaDesde);
                        fDesde.setHours(0, 0, 0, 0);

                        const fHasta = new Date(fechaHasta);
                        fHasta.setHours(23, 59, 59, 999);

                        const dDate = new Date(year, month, day);
                        dDate.setHours(0, 0, 0, 0);

                        return isDateInRange(dDate, fDesde, fHasta);
                    });

                    const isExceptionDay = !!activeException;

                    // Determinar el color de fondo
                    let bgColor = '';
                    if (isSelected) {
                        bgColor = 'bg-gradient-to-b from-orange-500 via-orange-400 to-yellow-500 border-2 border-white shadow-lg z-10';
                    } else if (isToday) {
                        bgColor = 'bg-gradient-to-b from-cyan-500 via-blue-500 to-indigo-500 border-2 border-white shadow-md';
                    } else if (isRestDay) {
                        bgColor = 'bg-green-600 hover:bg-green-500 border border-green-500';
                    } else if (activeException) {
                        // Colores específicos según el tipo de excepción
                        if (activeException.tipo === 'Vacaciones') {
                            bgColor = 'bg-green-600 hover:bg-green-500 border border-green-500';
                        } else if (activeException.tipo === 'Festivo (sin descanso)') {
                            bgColor = 'bg-red-600 hover:bg-red-500 border border-red-500';
                        } else if (activeException.tipo === 'Liberacion Especial') {
                            bgColor = 'bg-purple-600 hover:bg-purple-500 border border-purple-500';
                        } else {
                            bgColor = 'bg-green-600 hover:bg-green-500 border border-green-500';
                        }
                    } else {
                        bgColor = 'bg-zinc-700 hover:bg-zinc-600 border border-zinc-600';
                    }

                    const incomeTextClass = (isSelected || isToday)
                        ? 'text-white'
                        : (isRestDay || isExceptionDay)
                            ? 'text-white'
                            : 'text-sky-200';

                    const expenseTextClass = (isSelected || isToday)
                        ? 'text-white'
                        : (isRestDay || isExceptionDay)
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

