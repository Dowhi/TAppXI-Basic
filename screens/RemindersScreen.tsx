import React, { useState, useEffect } from 'react';
import { Seccion } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import {
    getReminders,
    saveReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
} from '../services/reminders';
import { Reminder } from '../types';

const RemindersScreen: React.FC<{ navigateTo: (page: Seccion) => void }> = ({ navigateTo }) => {
    const { isDark } = useTheme();
    const { showToast } = useToast();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    // Estados del formulario
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tipo, setTipo] = useState<'mantenimiento' | 'pago' | 'documentacion' | 'personalizado'>('personalizado');
    const [fechaLimite, setFechaLimite] = useState('');
    const [horaRecordatorio, setHoraRecordatorio] = useState('');
    const [fechaRecordatorio, setFechaRecordatorio] = useState('');
    const [sonidoActivo, setSonidoActivo] = useState(false);
    const [kilometrosLimite, setKilometrosLimite] = useState('');
    const [kilometrosActuales, setKilometrosActuales] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupSubscription = async () => {
            try {
                const api = await import('../services/api');
                unsubscribe = api.subscribeToReminders((data: any[]) => {
                    setReminders(data);
                    setLoading(false);
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

    const loadReminders = () => {
        // Deprecated, using subscription
    };

    const resetForm = () => {
        setTitulo('');
        setDescripcion('');
        setTipo('personalizado');
        setFechaLimite('');
        setHoraRecordatorio('');
        setFechaRecordatorio('');
        setSonidoActivo(false);
        setKilometrosLimite('');
        setKilometrosActuales('');
        setEditingReminder(null);
    };

    const handleSave = async () => {
        if (!titulo.trim()) {
            showToast('Por favor, ingresa un título para el recordatorio', 'warning');
            return;
        }

        if (tipo === 'mantenimiento' && !kilometrosLimite) {
            showToast('Por favor, ingresa los kilómetros límite para mantenimiento', 'warning');
            return;
        }

        if (tipo !== 'mantenimiento' && !fechaLimite) {
            showToast('Por favor, selecciona una fecha límite', 'warning');
            return;
        }

        try {
            if (editingReminder) {
                await updateReminder(editingReminder.id, {
                    titulo: titulo.trim(),
                    descripcion: descripcion.trim() || undefined,
                    tipo,
                    fechaLimite: tipo === 'mantenimiento' ? new Date().toISOString() : fechaLimite,
                    horaRecordatorio: horaRecordatorio || undefined,
                    fechaRecordatorio: fechaRecordatorio || undefined,
                    sonidoActivo,
                    kilometrosLimite: kilometrosLimite ? parseFloat(kilometrosLimite) : undefined,
                    kilometrosActuales: kilometrosActuales ? parseFloat(kilometrosActuales) : undefined,
                });
                showToast('Recordatorio actualizado correctamente', 'success');
            } else {
                await saveReminder({
                    titulo: titulo.trim(),
                    descripcion: descripcion.trim() || undefined,
                    tipo,
                    fechaLimite: tipo === 'mantenimiento' ? new Date().toISOString() : fechaLimite,
                    horaRecordatorio: horaRecordatorio || undefined,
                    fechaRecordatorio: fechaRecordatorio || undefined,
                    sonidoActivo,
                    kilometrosLimite: kilometrosLimite ? parseFloat(kilometrosLimite) : undefined,
                    kilometrosActuales: kilometrosActuales ? parseFloat(kilometrosActuales) : undefined,
                });
                showToast('Recordatorio guardado correctamente', 'success');
            }

            resetForm();
            setShowAddModal(false);
        } catch (error) {
            console.error('Error saving reminder:', error);
            showToast('Error al guardar recordatorio', 'error');

        }
    };

    const handleEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setTitulo(reminder.titulo);
        setDescripcion(reminder.descripcion || '');
        setTipo(reminder.tipo);
        setFechaLimite(reminder.fechaLimite.split('T')[0]);
        setHoraRecordatorio(reminder.horaRecordatorio || '');
        setFechaRecordatorio(reminder.fechaRecordatorio ? reminder.fechaRecordatorio.split('T')[0] : '');
        setSonidoActivo(reminder.sonidoActivo || false);
        setKilometrosLimite(reminder.kilometrosLimite?.toString() || '');
        setKilometrosActuales(reminder.kilometrosActuales?.toString() || '');
        setShowAddModal(true);
    };

    const handleComplete = async (id: string) => {
        await completeReminder(id);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este recordatorio?')) {
            await deleteReminder(id);
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getTipoLabel = (tipo: string): string => {
        const labels: Record<string, string> = {
            mantenimiento: '🔧 Mantenimiento',
            pago: '💳 Pago',
            documentacion: '📄 Documentación',
            personalizado: '📌 Personalizado',
        };
        return labels[tipo] || tipo;
    };

    const pendingReminders = reminders.filter(r => !r.completado);
    const completedReminders = reminders.filter(r => r.completado);

    return (
        <div className={`min-h-screen ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'} text-zinc-100 px-3 pt-3 pb-24`}>
            <ScreenTopBar title="Recordatorios" navigateTo={navigateTo} backTarget={Seccion.Home} />

            <div className="max-w-xl mx-auto space-y-4 mt-4">
                <button
                    onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                    }}
                    className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${isDark
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Recordatorio
                </button>

                {pendingReminders.length > 0 && (
                    <div>
                        <h2 className={`text-lg font-bold mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            Pendientes ({pendingReminders.length})
                        </h2>
                        <div className="space-y-2">
                            {pendingReminders.map((reminder) => (
                                <div
                                    key={reminder.id}
                                    className={`p-4 rounded-xl border ${isDark
                                        ? 'bg-zinc-800 border-zinc-700'
                                        : 'bg-white border-zinc-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm">{getTipoLabel(reminder.tipo)}</span>
                                                {reminder.tipo === 'mantenimiento' && reminder.kilometrosLimite && (
                                                    <span className="text-xs text-zinc-400">
                                                        {reminder.kilometrosLimite} km
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={`font-semibold mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                                {reminder.titulo}
                                            </h3>
                                            {reminder.descripcion && (
                                                <p className={`text-sm mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                                    {reminder.descripcion}
                                                </p>
                                            )}
                                            {reminder.tipo !== 'mantenimiento' && (
                                                <div className="space-y-0.5">
                                                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                                        Fecha límite: {formatDate(reminder.fechaLimite)}
                                                    </p>
                                                    {reminder.horaRecordatorio && (
                                                        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                                            Hora: {reminder.horaRecordatorio}
                                                            {reminder.sonidoActivo && <span className="ml-1">🔊</span>}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-2">
                                            <button
                                                onClick={() => handleComplete(reminder.id)}
                                                className="text-green-400 hover:text-green-300 text-sm"
                                                title="Completar"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => handleEdit(reminder)}
                                                className="text-blue-400 hover:text-blue-300 text-sm"
                                                title="Editar"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onClick={() => handleDelete(reminder.id)}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                                title="Eliminar"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {completedReminders.length > 0 && (
                    <div>
                        <h2 className={`text-lg font-bold mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            Completados ({completedReminders.length})
                        </h2>
                        <div className="space-y-2">
                            {completedReminders.map((reminder) => (
                                <div
                                    key={reminder.id}
                                    className={`p-4 rounded-xl border opacity-60 ${isDark
                                        ? 'bg-zinc-800 border-zinc-700'
                                        : 'bg-white border-zinc-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <span className="text-sm">{getTipoLabel(reminder.tipo)}</span>
                                            <h3 className={`font-semibold line-through ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                {reminder.titulo}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(reminder.id)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {reminders.length === 0 && (
                    <div className={`text-center py-12 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        <p>No hay recordatorios</p>
                        <p className="text-sm mt-2">Crea un recordatorio para no olvidar nada importante</p>
                    </div>
                )}
            </div>

            {/* Modal Agregar/Editar Recordatorio */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-300'
                        }`}>
                        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            {editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    className={`w-full p-2 rounded-md ${isDark
                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                        : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                        } border`}
                                    placeholder="Ej: Cambio de aceite"
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Tipo
                                </label>
                                <select
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value as any)}
                                    className={`w-full p-2 rounded-md ${isDark
                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                        : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                        } border`}
                                >
                                    <option value="personalizado">📌 Personalizado</option>
                                    <option value="mantenimiento">🔧 Mantenimiento</option>
                                    <option value="pago">💳 Pago</option>
                                    <option value="documentacion">📄 Documentación</option>
                                </select>
                            </div>

                            {tipo === 'mantenimiento' ? (
                                <>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                            Kilómetros Límite *
                                        </label>
                                        <input
                                            type="number"
                                            value={kilometrosLimite}
                                            onChange={(e) => setKilometrosLimite(e.target.value)}
                                            className={`w-full p-2 rounded-md ${isDark
                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                                : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                                } border`}
                                            placeholder="Ej: 150000"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                            Kilómetros Actuales (opcional)
                                        </label>
                                        <input
                                            type="number"
                                            value={kilometrosActuales}
                                            onChange={(e) => setKilometrosActuales(e.target.value)}
                                            className={`w-full p-2 rounded-md ${isDark
                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                                : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                                } border`}
                                            placeholder="Ej: 145000"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                            Fecha Límite *
                                        </label>
                                        <input
                                            type="date"
                                            value={fechaLimite}
                                            onChange={(e) => setFechaLimite(e.target.value)}
                                            className={`w-full p-2 rounded-md ${isDark
                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                                : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                                } border`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                            Hora del Recordatorio (opcional)
                                        </label>
                                        <input
                                            type="time"
                                            value={horaRecordatorio}
                                            onChange={(e) => setHoraRecordatorio(e.target.value)}
                                            className={`w-full p-2 rounded-md ${isDark
                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                                : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                                } border`}
                                        />
                                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                            Se reproducirá un sonido a esta hora
                                        </p>
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                            Recordar el (opcional)
                                        </label>
                                        <input
                                            type="date"
                                            value={fechaRecordatorio}
                                            onChange={(e) => setFechaRecordatorio(e.target.value)}
                                            className={`w-full p-2 rounded-md ${isDark
                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                                : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                                } border`}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="sonidoActivo"
                                            checked={sonidoActivo}
                                            onChange={(e) => setSonidoActivo(e.target.checked)}
                                            className={`h-4 w-4 rounded ${isDark
                                                ? 'border-zinc-600 bg-zinc-800 text-blue-500'
                                                : 'border-zinc-300 bg-zinc-100 text-blue-500'
                                                }`}
                                        />
                                        <label htmlFor="sonidoActivo" className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                            🔊 Activar aviso sonoro
                                        </label>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Descripción (opcional)
                                </label>
                                <textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    rows={3}
                                    className={`w-full p-2 rounded-md ${isDark
                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                        : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                                        } border`}
                                    placeholder="Notas adicionales..."
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className={`flex-1 py-2 rounded-lg font-semibold ${isDark
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                >
                                    Guardar
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className={`px-4 py-2 rounded-lg ${isDark
                                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                                        }`}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemindersScreen;

