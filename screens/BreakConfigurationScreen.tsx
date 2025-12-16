import React, { useState, useEffect } from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import { addExcepcion, getExcepciones, deleteExcepcion, updateExcepcion, getBreakConfiguration, saveBreakConfiguration, Excepcion } from '../services/api';

interface BreakConfigurationScreenProps {
    navigateTo: (page: Seccion) => void;
}

const BreakConfigurationScreen: React.FC<BreakConfigurationScreenProps> = ({ navigateTo }) => {
    const { showToast } = useToast();
    const [startDate, setStartDate] = useState('');
    const [startDayLetter, setStartDayLetter] = useState('A'); // Letra del primer día configurado
    const [weekendPattern, setWeekendPattern] = useState('Sabado: AC / Domingo: BD');
    const [userBreakLetter, setUserBreakLetter] = useState('A'); // Letra de descanso del usuario
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);

    // Estados para modales
    const [showLetterSelector, setShowLetterSelector] = useState(false);
    const [showUserLetterSelector, setShowUserLetterSelector] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPatternSelector, setShowPatternSelector] = useState(false);
    const [showExceptionsModal, setShowExceptionsModal] = useState(false);
    const [showAddExceptionModal, setShowAddExceptionModal] = useState(false);
    const [showExceptionTypeSelector, setShowExceptionTypeSelector] = useState(false);
    const [showDateFromPicker, setShowDateFromPicker] = useState(false);
    const [showDateToPicker, setShowDateToPicker] = useState(false);

    // Estados para el formulario de excepción
    const [exceptionDateFrom, setExceptionDateFrom] = useState('');
    const [exceptionDateTo, setExceptionDateTo] = useState('');
    const [exceptionType, setExceptionType] = useState('Festivo (sin descanso)');
    const [appliesToPar, setAppliesToPar] = useState(false);
    const [appliesToImpar, setAppliesToImpar] = useState(false);
    const [exceptionDescription, setExceptionDescription] = useState('');
    const [exceptionNewLetter, setExceptionNewLetter] = useState('A');
    const [showNewLetterSelector, setShowNewLetterSelector] = useState(false);

    // Estados para calendarios de excepción
    const [exceptionCalendarMonthFrom, setExceptionCalendarMonthFrom] = useState(new Date());
    const [exceptionCalendarMonthTo, setExceptionCalendarMonthTo] = useState(new Date());
    const [selectedExceptionDateFrom, setSelectedExceptionDateFrom] = useState<Date | null>(null);
    const [selectedExceptionDateTo, setSelectedExceptionDateTo] = useState<Date | null>(null);

    const exceptionTypes = [
        'Festivo (sin descanso)',
        'Cambio de Letra',
        'Vacaciones',
        'Liberacion Especial'
    ];

    const newLetterOptions = ['A', 'B', 'C', 'D', 'AB', 'AC', 'AD', 'BC', 'BD', 'CD'];

    const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
    const [loadingExcepciones, setLoadingExcepciones] = useState(false);
    const [editingExceptionId, setEditingExceptionId] = useState<string | null>(null);

    // Estados para el calendario
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

    const breakLetters = ['A', 'B', 'C', 'D'];
    const weekendPatterns = [
        'Sabado: AC / Domingo: BD',
        'Sabado: BD / Domingo: AC'
    ];

    // Cargar configuración al montar el componente
    useEffect(() => {
        try {
            const savedConfig = localStorage.getItem('breakConfiguration');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                setStartDate(config.startDate || '');
                setStartDayLetter(config.startDayLetter || config.initialBreakLetter || 'A'); // Compatibilidad con versiones anteriores
                setWeekendPattern(config.weekendPattern || 'Sabado: AC / Domingo: BD');
                setUserBreakLetter(config.userBreakLetter || 'A');
            }
        } catch (error) {
            console.error('Error al cargar configuracion local:', error);
        }

        const loadRemoteConfig = async () => {
            try {
                const remoteConfig = await getBreakConfiguration();
                if (remoteConfig) {
                    setStartDate(remoteConfig.startDate || '');
                    setStartDayLetter(remoteConfig.startDayLetter || 'A');
                    setWeekendPattern(remoteConfig.weekendPattern || 'Sabado: AC / Domingo: BD');
                    setUserBreakLetter(remoteConfig.userBreakLetter || 'A');

                    const persistedConfig = {
                        startDate: remoteConfig.startDate || '',
                        startDayLetter: remoteConfig.startDayLetter || 'A',
                        weekendPattern: remoteConfig.weekendPattern || 'Sabado: AC / Domingo: BD',
                        userBreakLetter: remoteConfig.userBreakLetter || 'A',
                        savedAt: remoteConfig.updatedAt ? remoteConfig.updatedAt.toISOString() : new Date().toISOString(),
                    };
                    localStorage.setItem('breakConfiguration', JSON.stringify(persistedConfig));
                }
            } catch (error) {
                console.error('Error al cargar configuracion de descansos desde Firestore:', error);
            } finally {
                setLoadingConfig(false);
            }
        };

        loadRemoteConfig();
    }, []);

    const handleSave = async () => {
        if (!startDate) {
            showToast('Por favor, selecciona una fecha de inicio del ciclo', 'warning');
            return;
        }

        const config = {
            startDate: startDate,
            startDayLetter: startDayLetter, // Letra del dia de inicio
            weekendPattern: weekendPattern,
            userBreakLetter: userBreakLetter,
            savedAt: new Date().toISOString()
        };

        try {
            setSavingConfig(true);
            localStorage.setItem('breakConfiguration', JSON.stringify(config));

            await saveBreakConfiguration({
                startDate: config.startDate,
                startDayLetter: config.startDayLetter,
                weekendPattern: config.weekendPattern,
                userBreakLetter: config.userBreakLetter,
            });

            window.dispatchEvent(new Event('breakConfigUpdated'));
            showToast('Configuración guardada correctamente', 'success');
            navigateTo(Seccion.Calendario);
        } catch (error) {
            ErrorHandler.handle(error, 'BreakConfigurationScreen - handleSave');
        } finally {
            setSavingConfig(false);
        }
    };
    const loadExcepciones = async () => {
        setLoadingExcepciones(true);
        try {
            const data = await getExcepciones();
            setExcepciones(data);
        } catch (error) {
            console.error('Error cargando excepciones:', error);
        } finally {
            setLoadingExcepciones(false);
        }
    };

    const handleManageExceptions = () => {
        setShowExceptionsModal(true);
        loadExcepciones();
    };

    const handleEditException = (excepcion: Excepcion) => {
        // Cargar datos de la excepción en el formulario
        const fechaDesdeDate = new Date(excepcion.fechaDesde);
        setExceptionDateFrom(fechaDesdeDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }));
        const fechaHastaDate = new Date(excepcion.fechaHasta);
        setExceptionDateTo(fechaHastaDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }));
        setExceptionType(excepcion.tipo);
        setAppliesToPar(excepcion.aplicaPar);
        setAppliesToImpar(excepcion.aplicaImpar);
        setExceptionDescription(excepcion.descripcion || '');
        setExceptionNewLetter(excepcion.nuevaLetra || 'A');
        setSelectedExceptionDateFrom(excepcion.fechaDesde);
        setSelectedExceptionDateTo(excepcion.fechaHasta);
        setEditingExceptionId(excepcion.id);

        // Cerrar modal de gestión y abrir modal de edición
        setShowExceptionsModal(false);
        setShowAddExceptionModal(true);
    };

    const resetExceptionForm = () => {
        setExceptionDateFrom('');
        setExceptionDateTo('');
        setExceptionType('Festivo (sin descanso)');
        setAppliesToPar(false);
        setAppliesToImpar(false);
        setExceptionDescription('');
        setExceptionNewLetter('A');
        setSelectedExceptionDateFrom(null);
        setSelectedExceptionDateTo(null);
        setEditingExceptionId(null);
    };

    const handleLetterSelect = (letter: string) => {
        setStartDayLetter(letter);
        setShowLetterSelector(false);
    };

    const handleUserLetterSelect = (letter: string) => {
        setUserBreakLetter(letter);
        setShowUserLetterSelector(false);
    };

    const handlePatternSelect = (pattern: string) => {
        setWeekendPattern(pattern);
        setShowPatternSelector(false);
    };

    const handleDateSelect = (date: Date) => {
        setSelectedCalendarDate(date);
        const formattedDate = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        setStartDate(formattedDate);
        setShowDatePicker(false);
    };

    const navigateCalendarMonth = (direction: 'prev' | 'next') => {
        setCalendarMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    const getCalendarDays = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        const days = [];
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    };

    // Asegurar que el scroll esté en la parte superior al montar
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-zinc-950 min-h-screen flex flex-col">
            <ScreenTopBar
                title="Configuración Descansos"
                navigateTo={navigateTo}
                backTarget={Seccion.Calendario}
                className="rounded-none border-b border-yellow-300/40"
            />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-1 pt-1 space-y-2">
                {/* Fecha de Inicio del Ciclo Section */}
                <div className="bg-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="text-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                            </svg>
                        </div>
                        <h2 className="text-cyan-400 text-lg font-semibold">Fecha de Inicio del Ciclo</h2>
                    </div>
                    <button
                        onClick={() => setShowDatePicker(true)}
                        className="w-full bg-zinc-900 border-2 border-green-500 rounded-lg px-4 py-3 text-left text-white placeholder-zinc-500 focus:outline-none focus:border-green-400 hover:border-green-400 transition-colors"
                    >
                        {startDate || <span className="text-zinc-500">DD/MM/AAAA</span>}
                    </button>
                </div>

                {/* Letra del Día de Inicio Section */}
                <button
                    onClick={() => setShowLetterSelector(true)}
                    className="w-full bg-zinc-800 rounded-xl p-4 text-left hover:bg-zinc-700 transition-colors"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{startDayLetter}</span>
                        </div>
                        <h2 className="text-green-400 text-lg font-semibold">Letra del Día de Inicio</h2>
                    </div>
                    <div className="text-white text-sm mb-1">Fecha: {startDate || 'No seleccionada'}</div>
                    <div className="text-white text-2xl font-bold">
                        {startDayLetter}
                    </div>
                    <div className="text-zinc-400 text-xs mt-1">Letra que corresponde al día de inicio seleccionado</div>
                </button>

                {/* Letra de Descanso del Usuario Section */}
                <button
                    onClick={() => setShowUserLetterSelector(true)}
                    className="w-full bg-zinc-800 rounded-xl p-4 text-left hover:bg-zinc-700 transition-colors"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{userBreakLetter}</span>
                        </div>
                        <h2 className="text-cyan-400 text-lg font-semibold">Mi Letra de Descanso</h2>
                    </div>
                    <div className="text-white text-2xl font-bold">
                        {userBreakLetter}
                    </div>
                </button>

                {/* Patrón de Fin de Semana Section */}
                <button
                    onClick={() => setShowPatternSelector(true)}
                    className="w-full bg-zinc-800 rounded-xl p-4 text-left hover:bg-zinc-700 transition-colors"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="text-cyan-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                            </svg>
                        </div>
                        <h2 className="text-pink-400 text-lg font-semibold">Patrón de Fin de Semana</h2>
                    </div>
                    <div className="text-white text-base">
                        {weekendPattern}
                    </div>
                </button>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-3 bg-zinc-950 border-t border-zinc-800">
                {/* Guardar Configuración Button */}
                <button
                    onClick={handleSave}
                    disabled={loadingConfig || savingConfig}
                    className="w-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-white font-bold text-base hover:from-green-400 hover:to-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                    </svg>
                    <span>GUARDAR CONFIGURACIÓN</span>
                </button>

                {/* Gestionar Excepciones Button */}
                <button
                    onClick={handleManageExceptions}
                    className="w-full bg-zinc-800 border-2 border-pink-500 rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-white font-bold text-base hover:bg-zinc-700 hover:border-pink-400 transition-all active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l1.2-1.2c.5-.4.5-1.1.1-1.5z" />
                    </svg>
                    <span>GESTIONAR EXCEPCIONES</span>
                </button>
            </div>

            {/* Modal Selector de Letras */}
            {showLetterSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowLetterSelector(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Letra del Día de Inicio</h3>
                        <p className="text-zinc-400 text-sm mb-4">Selecciona la letra que corresponde al día de inicio que configuraste</p>
                        <div className="grid grid-cols-4 gap-3">
                            {breakLetters.map((letter) => (
                                <button
                                    key={letter}
                                    onClick={() => handleLetterSelect(letter)}
                                    className={`p-4 rounded-lg font-bold text-2xl transition-all ${startDayLetter === letter
                                            ? 'bg-red-500 text-white'
                                            : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                        }`}
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowLetterSelector(false)}
                            className="mt-4 w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Selector de Letra del Usuario */}
            {showUserLetterSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowUserLetterSelector(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Mi Letra de Descanso</h3>
                        <div className="grid grid-cols-4 gap-3">
                            {breakLetters.map((letter) => (
                                <button
                                    key={letter}
                                    onClick={() => handleUserLetterSelect(letter)}
                                    className={`p-4 rounded-lg font-bold text-2xl transition-all ${userBreakLetter === letter
                                            ? 'bg-green-500 text-white'
                                            : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                        }`}
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowUserLetterSelector(false)}
                            className="mt-4 w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Selector de Patrón de Fin de Semana */}
            {showPatternSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPatternSelector(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Patrón de Fin de Semana</h3>
                        <div className="space-y-3">
                            {weekendPatterns.map((pattern) => (
                                <button
                                    key={pattern}
                                    onClick={() => handlePatternSelect(pattern)}
                                    className={`w-full p-4 rounded-lg text-left transition-all ${weekendPattern === pattern
                                            ? 'bg-pink-500 text-white'
                                            : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                        }`}
                                >
                                    {pattern}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowPatternSelector(false)}
                            className="mt-4 w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Calendario para Fecha */}
            {showDatePicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDatePicker(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Fecha</h3>

                        {/* Navegación del Calendario */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => navigateCalendarMonth('prev')}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </svg>
                            </button>
                            <h4 className="text-white font-semibold">
                                {calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </h4>
                            <button
                                onClick={() => navigateCalendarMonth('next')}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                </svg>
                            </button>
                        </div>

                        {/* Grid del Calendario */}
                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                                <div key={idx} className={`text-center text-xs font-medium ${idx >= 5 ? 'text-orange-500' : 'text-cyan-400'}`}>
                                    {day}
                                </div>
                            ))}
                            {getCalendarDays().map((day, idx) => {
                                if (day === null) {
                                    return <div key={idx} className="aspect-square" />;
                                }
                                const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                                const isSelected = selectedCalendarDate &&
                                    dayDate.toDateString() === selectedCalendarDate.toDateString();
                                const isToday = dayDate.toDateString() === new Date().toDateString();

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDateSelect(dayDate)}
                                        className={`aspect-square rounded-lg text-sm font-medium transition-all ${isSelected
                                                ? 'bg-green-500 text-white'
                                                : isToday
                                                    ? 'bg-zinc-600 text-white'
                                                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowDatePicker(false)}
                            className="w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Gestión de Excepciones */}
            {showExceptionsModal && (
                <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
                    {/* Header */}
                    <div className="bg-zinc-900 flex items-center py-3 px-4 border-b border-zinc-700 flex-shrink-0">
                        <button
                            onClick={() => setShowExceptionsModal(false)}
                            className="text-white mr-4 hover:text-cyan-400 transition-colors p-2 -ml-2 cursor-pointer z-10"
                            aria-label="Cerrar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" pointerEvents="none">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                            </svg>
                        </button>
                        <h1 className="text-white text-lg font-semibold flex-1 text-center -ml-8">Gestión de Excepciones</h1>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Área de lista de excepciones */}
                        <div className="bg-zinc-800 rounded-xl p-4 min-h-[300px]">
                            {loadingExcepciones ? (
                                <div className="flex items-center justify-center py-8">
                                    <p className="text-zinc-400 text-sm">Cargando excepciones...</p>
                                </div>
                            ) : excepciones.length === 0 ? (
                                <div className="flex items-center justify-center py-8">
                                    <p className="text-zinc-500 text-sm">No hay excepciones configuradas</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {excepciones.map((excepcion) => (
                                        <div
                                            key={excepcion.id}
                                            onClick={() => handleEditException(excepcion)}
                                            className="bg-zinc-900 rounded-lg p-4 border border-zinc-700 cursor-pointer hover:bg-zinc-800 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="text-cyan-400 font-semibold text-sm mb-1">
                                                        {excepcion.tipo}
                                                    </div>
                                                    <div className="text-white text-xs mb-1">
                                                        {excepcion.fechaDesde.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {excepcion.fechaHasta.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    </div>
                                                    {excepcion.descripcion && (
                                                        <div className="text-zinc-400 text-xs mt-2">
                                                            {excepcion.descripcion}
                                                        </div>
                                                    )}
                                                    {excepcion.tipo === 'Cambio de Letra' && excepcion.nuevaLetra && (
                                                        <div className="text-blue-400 text-xs mt-2 font-semibold">
                                                            Nueva letra: {excepcion.nuevaLetra}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation(); // Evitar que se active el click del contenedor
                                                        if (confirm('¿Estás seguro de que quieres eliminar esta excepción?')) {
                                                            try {
                                                                await deleteExcepcion(excepcion.id);
                                                                await loadExcepciones();
                                                                showToast('Excepción eliminada correctamente', 'success');
                                                            } catch (error) {
                                                                ErrorHandler.handle(error, 'BreakConfigurationScreen - deleteExcepcion');
                                                            }
                                                        }
                                                    }}
                                                    className="text-red-400 hover:text-red-300 ml-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botón AÑADIR EXCEPCIÓN */}
                    <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                        <button
                            onClick={() => {
                                resetExceptionForm();
                                setShowAddExceptionModal(true);
                            }}
                            className="w-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-zinc-900 font-bold text-base hover:from-green-400 hover:to-cyan-400 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            <span>AÑADIR EXCEPCIÓN</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Añadir Excepción */}
            {showAddExceptionModal && (
                <div className="fixed inset-0 bg-zinc-950 z-[60] flex flex-col">
                    {/* Header */}
                    <div className="bg-zinc-900 flex items-center py-3 px-4 border-b border-zinc-700 flex-shrink-0">
                        <button
                            onClick={() => {
                                setShowAddExceptionModal(false);
                                resetExceptionForm();
                            }}
                            className="text-white mr-4 hover:text-cyan-400 transition-colors p-2 -ml-2 cursor-pointer z-10"
                            aria-label="Cerrar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" pointerEvents="none">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                            </svg>
                        </button>
                        <h1 className="text-white text-lg font-semibold flex-1 text-center -ml-8">
                            {editingExceptionId ? 'Editar Excepción' : 'Añadir Excepción'}
                        </h1>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {/* Rango de Fechas */}
                        <div className="bg-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
                                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                                </svg>
                                <h2 className="text-cyan-400 text-lg font-semibold">Rango de Fechas</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowDateFromPicker(true)}
                                    className="w-full bg-zinc-900 border-2 border-green-500 rounded-lg px-4 py-3 text-left text-white focus:outline-none focus:border-green-400 hover:border-green-400 transition-colors"
                                >
                                    {exceptionDateFrom || <span className="text-zinc-500">Desde</span>}
                                </button>
                                <button
                                    onClick={() => setShowDateToPicker(true)}
                                    className="w-full bg-zinc-900 border-2 border-green-500 rounded-lg px-4 py-3 text-left text-white focus:outline-none focus:border-green-400 hover:border-green-400 transition-colors"
                                >
                                    {exceptionDateTo || <span className="text-zinc-500">Hasta</span>}
                                </button>
                            </div>
                        </div>

                        {/* Tipo de Excepción */}
                        <button
                            onClick={() => setShowExceptionTypeSelector(true)}
                            className="w-full bg-zinc-800 rounded-xl p-4 text-left hover:bg-zinc-700 transition-colors"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                                    <circle cx="12" cy="12" r="10" fill="white" />
                                    <circle cx="12" cy="12" r="6" fill="red" />
                                    <circle cx="12" cy="12" r="2" fill="white" />
                                </svg>
                                <h2 className="text-green-400 text-lg font-semibold">Tipo de Excepción</h2>
                            </div>
                            <div className="text-white text-base">
                                {exceptionType}
                            </div>
                        </button>

                        {/* Nueva Letra (solo si el tipo es "Cambio de Letra") */}
                        {exceptionType === 'Cambio de Letra' && (
                            <button
                                onClick={() => setShowNewLetterSelector(true)}
                                className="w-full bg-zinc-800 rounded-xl p-4 text-left hover:bg-zinc-700 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">{exceptionNewLetter}</span>
                                    </div>
                                    <h2 className="text-cyan-400 text-lg font-semibold">Nueva Letra</h2>
                                </div>
                                <div className="text-white text-2xl font-bold">
                                    {exceptionNewLetter}
                                </div>
                                <div className="text-zinc-400 text-xs mt-1">Letra que sustituirá a la existente en el rango de fechas</div>
                            </button>
                        )}

                        {/* Descripción (opcional) */}
                        <div className="bg-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                </svg>
                                <h2 className="text-cyan-400 text-lg font-semibold">Descripción (opcional)</h2>
                            </div>
                            <textarea
                                value={exceptionDescription}
                                onChange={(e) => setExceptionDescription(e.target.value)}
                                className="w-full bg-zinc-900 border-2 border-green-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400 resize-none"
                                placeholder="Descripción de la excepción..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Botón GUARDAR EXCEPCIÓN */}
                    <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                        <button
                            onClick={async () => {
                                if (!exceptionDateFrom || !exceptionDateTo) {
                                    showToast('Por favor, selecciona las fechas de inicio y fin', 'warning');
                                    return;
                                }

                                try {
                                    // Convertir fechas de formato DD/MM/AAAA a Date
                                    const [dayFrom, monthFrom, yearFrom] = exceptionDateFrom.split('/');
                                    const fechaDesde = new Date(parseInt(yearFrom), parseInt(monthFrom) - 1, parseInt(dayFrom));

                                    const [dayTo, monthTo, yearTo] = exceptionDateTo.split('/');
                                    const fechaHasta = new Date(parseInt(yearTo), parseInt(monthTo) - 1, parseInt(dayTo));

                                    if (editingExceptionId) {
                                        // Actualizar excepción existente
                                        await updateExcepcion(editingExceptionId, {
                                            fechaDesde,
                                            fechaHasta,
                                            tipo: exceptionType,
                                            aplicaPar: appliesToPar,
                                            aplicaImpar: appliesToImpar,
                                            descripcion: exceptionDescription,
                                            nuevaLetra: exceptionType === 'Cambio de Letra' ? exceptionNewLetter : undefined
                                        });
                                        showToast('Excepción actualizada correctamente', 'success');
                                    } else {
                                        // Crear nueva excepción
                                        await addExcepcion({
                                            fechaDesde,
                                            fechaHasta,
                                            tipo: exceptionType,
                                            aplicaPar: appliesToPar,
                                            aplicaImpar: appliesToImpar,
                                            descripcion: exceptionDescription,
                                            nuevaLetra: exceptionType === 'Cambio de Letra' ? exceptionNewLetter : undefined
                                        });
                                        showToast('Excepción guardada correctamente', 'success');
                                    }

                                    // Resetear formulario
                                    resetExceptionForm();
                                    setShowAddExceptionModal(false);

                                    // Recargar excepciones
                                    await loadExcepciones();
                                } catch (error) {
                                    ErrorHandler.handle(error, 'BreakConfigurationScreen - saveExcepcion');
                                }
                            }}
                            className="w-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-white font-bold text-base hover:from-green-400 hover:to-cyan-400 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                            </svg>
                            <span>{editingExceptionId ? 'ACTUALIZAR EXCEPCIÓN' : 'GUARDAR EXCEPCIÓN'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Selector de Tipo de Excepción */}
            {showExceptionTypeSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]" onClick={() => setShowExceptionTypeSelector(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Tipo de Excepción</h3>
                        <div className="space-y-3">
                            {exceptionTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setExceptionType(type);
                                        setShowExceptionTypeSelector(false);
                                    }}
                                    className={`w-full p-4 rounded-lg text-left transition-all ${exceptionType === type
                                            ? 'bg-green-500 text-white'
                                            : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowExceptionTypeSelector(false)}
                            className="mt-4 w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Selector de Nueva Letra */}
            {showNewLetterSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]" onClick={() => setShowNewLetterSelector(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Nueva Letra</h3>
                        <p className="text-zinc-400 text-sm mb-4">Selecciona la letra que sustituirá a la existente en el rango de fechas</p>
                        <div className="grid grid-cols-5 gap-3">
                            {newLetterOptions.map((letter) => (
                                <button
                                    key={letter}
                                    onClick={() => {
                                        setExceptionNewLetter(letter);
                                        setShowNewLetterSelector(false);
                                    }}
                                    className={`p-4 rounded-lg font-bold text-lg transition-all ${exceptionNewLetter === letter
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                        }`}
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowNewLetterSelector(false)}
                            className="mt-4 w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Calendario para Fecha Desde */}
            {showDateFromPicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]" onClick={() => setShowDateFromPicker(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Fecha Desde</h3>

                        {/* Navegación del Calendario */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setExceptionCalendarMonthFrom(prev => {
                                    const newDate = new Date(prev);
                                    newDate.setMonth(prev.getMonth() - 1);
                                    return newDate;
                                })}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </svg>
                            </button>
                            <h4 className="text-white font-semibold">
                                {exceptionCalendarMonthFrom.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </h4>
                            <button
                                onClick={() => setExceptionCalendarMonthFrom(prev => {
                                    const newDate = new Date(prev);
                                    newDate.setMonth(prev.getMonth() + 1);
                                    return newDate;
                                })}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                </svg>
                            </button>
                        </div>

                        {/* Grid del Calendario */}
                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                                <div key={idx} className={`text-center text-xs font-medium ${idx >= 5 ? 'text-orange-500' : 'text-cyan-400'}`}>
                                    {day}
                                </div>
                            ))}
                            {(() => {
                                const year = exceptionCalendarMonthFrom.getFullYear();
                                const month = exceptionCalendarMonthFrom.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const lastDay = new Date(year, month + 1, 0);
                                const daysInMonth = lastDay.getDate();
                                const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

                                const days = [];
                                for (let i = 0; i < startingDay; i++) {
                                    days.push(null);
                                }
                                for (let day = 1; day <= daysInMonth; day++) {
                                    days.push(day);
                                }

                                return days.map((day, idx) => {
                                    if (day === null) {
                                        return <div key={idx} className="aspect-square" />;
                                    }
                                    const dayDate = new Date(year, month, day);
                                    const isSelected = selectedExceptionDateFrom &&
                                        dayDate.toDateString() === selectedExceptionDateFrom.toDateString();
                                    const isToday = dayDate.toDateString() === new Date().toDateString();

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedExceptionDateFrom(dayDate);
                                                const formattedDate = dayDate.toLocaleDateString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                });
                                                setExceptionDateFrom(formattedDate);
                                                setShowDateFromPicker(false);
                                            }}
                                            className={`aspect-square rounded-lg text-sm font-medium transition-all ${isSelected
                                                    ? 'bg-green-500 text-white'
                                                    : isToday
                                                        ? 'bg-zinc-600 text-white'
                                                        : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                });
                            })()}
                        </div>

                        <button
                            onClick={() => setShowDateFromPicker(false)}
                            className="w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Calendario para Fecha Hasta */}
            {showDateToPicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]" onClick={() => setShowDateToPicker(false)}>
                    <div className="bg-zinc-800 rounded-xl p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold mb-4">Seleccionar Fecha Hasta</h3>

                        {/* Navegación del Calendario */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setExceptionCalendarMonthTo(prev => {
                                    const newDate = new Date(prev);
                                    newDate.setMonth(prev.getMonth() - 1);
                                    return newDate;
                                })}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </svg>
                            </button>
                            <h4 className="text-white font-semibold">
                                {exceptionCalendarMonthTo.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </h4>
                            <button
                                onClick={() => setExceptionCalendarMonthTo(prev => {
                                    const newDate = new Date(prev);
                                    newDate.setMonth(prev.getMonth() + 1);
                                    return newDate;
                                })}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                </svg>
                            </button>
                        </div>

                        {/* Grid del Calendario */}
                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                                <div key={idx} className={`text-center text-xs font-medium ${idx >= 5 ? 'text-orange-500' : 'text-cyan-400'}`}>
                                    {day}
                                </div>
                            ))}
                            {(() => {
                                const year = exceptionCalendarMonthTo.getFullYear();
                                const month = exceptionCalendarMonthTo.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const lastDay = new Date(year, month + 1, 0);
                                const daysInMonth = lastDay.getDate();
                                const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

                                const days = [];
                                for (let i = 0; i < startingDay; i++) {
                                    days.push(null);
                                }
                                for (let day = 1; day <= daysInMonth; day++) {
                                    days.push(day);
                                }

                                return days.map((day, idx) => {
                                    if (day === null) {
                                        return <div key={idx} className="aspect-square" />;
                                    }
                                    const dayDate = new Date(year, month, day);
                                    const isSelected = selectedExceptionDateTo &&
                                        dayDate.toDateString() === selectedExceptionDateTo.toDateString();
                                    const isToday = dayDate.toDateString() === new Date().toDateString();

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedExceptionDateTo(dayDate);
                                                const formattedDate = dayDate.toLocaleDateString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                });
                                                setExceptionDateTo(formattedDate);
                                                setShowDateToPicker(false);
                                            }}
                                            className={`aspect-square rounded-lg text-sm font-medium transition-all ${isSelected
                                                    ? 'bg-green-500 text-white'
                                                    : isToday
                                                        ? 'bg-zinc-600 text-white'
                                                        : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                });
                            })()}
                        </div>

                        <button
                            onClick={() => setShowDateToPicker(false)}
                            className="w-full bg-zinc-700 text-white py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BreakConfigurationScreen;

