import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import KineticHeader from '../components/KineticHeader';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, Turno, Descanso } from '../types';
import { getTurno, updateTurno } from '../services/api';

const CustomTextField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-400">{label}</label>
        <input
            {...props}
            className="block w-full px-3 py-2 text-sm text-zinc-100 bg-zinc-900 rounded-md border border-zinc-700 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
);

interface EditTurnScreenProps {
    navigateTo: (page: Seccion) => void;
    turnoId: string;
}

const EditTurnScreen: React.FC<EditTurnScreenProps> = ({ navigateTo, turnoId }) => {
    const [turno, setTurno] = useState<Turno | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const parseSafeDate = (dateAny: any): Date => {
        if (!dateAny) return new Date();
        if (dateAny instanceof Date) {
            return isNaN(dateAny.getTime()) ? new Date() : dateAny;
        }
        const parsed = new Date(dateAny);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const safeParse = (val: string): number => {
        if (!val) return 0;
        const cleaned = val.replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(cleaned) || 0;
    };

    // Estados del formulario
    const [fechaInicio, setFechaInicio] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [kilometrosInicio, setKilometrosInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [kilometrosFin, setKilometrosFin] = useState('');
    const [descansos, setDescansos] = useState<Descanso[]>([]);

    // Función helper para convertir Date a formato YYYY-MM-DD (para input type="date")
    const dateToInputFormat = (dateAny: any): string => {
        const date = parseSafeDate(dateAny);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const timeToInputFormat = (dateAny: any): string => {
        const date = parseSafeDate(dateAny);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // Función helper para formatear fecha y hora para mostrar (DD/MM/YYYY HH:MM)
    const formatDateTime = (dateAny: any): string => {
        const date = parseSafeDate(dateAny);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    useEffect(() => {
        const loadTurno = async () => {
            try {
                setLoading(true);
                const turnoData = await getTurno(turnoId);
                if (!turnoData) {
                    setError("Turno no encontrado");
                    return;
                }

                setTurno(turnoData);

                // Formatear fecha y hora de inicio
                setFechaInicio(dateToInputFormat(turnoData.fechaInicio));
                setHoraInicio(timeToInputFormat(turnoData.fechaInicio));
                setKilometrosInicio(turnoData.kilometrosInicio.toString());

                // Formatear fecha y hora de fin si existe
                if (turnoData.fechaFin) {
                    setFechaFin(dateToInputFormat(turnoData.fechaFin));
                    setHoraFin(timeToInputFormat(turnoData.fechaFin));
                }

                if (turnoData.kilometrosFin !== undefined) {
                    setKilometrosFin(turnoData.kilometrosFin.toString());
                }

                // Cargar descansos
                setDescansos(turnoData.descansos || []);

            } catch (err) {
                console.error("Error loading turno:", err);
                setError("Error al cargar el turno");
            } finally {
                setLoading(false);
            }
        };

        loadTurno();
    }, [turnoId]);

    const handleUpdateDescanso = (id: string, updates: any) => {
        setDescansos(prev => prev.map(d => {
            if (d.id === id) {
                const newDescanso = { ...d };
                
                if (updates.fechaInicio !== undefined || updates.horaInicio !== undefined) {
                    const f = updates.fechaInicio !== undefined ? updates.fechaInicio : dateToInputFormat(d.fechaInicio);
                    const h = updates.horaInicio !== undefined ? updates.horaInicio : timeToInputFormat(d.fechaInicio);
                    newDescanso.fechaInicio = new Date(`${f}T${h}`);
                }

                if (updates.fechaFin !== undefined || updates.horaFin !== undefined) {
                    const f = updates.fechaFin !== undefined ? updates.fechaFin : (d.fechaFin ? dateToInputFormat(d.fechaFin) : dateToInputFormat(new Date()));
                    const h = updates.horaFin !== undefined ? updates.horaFin : (d.fechaFin ? timeToInputFormat(d.fechaFin) : timeToInputFormat(new Date()));
                    newDescanso.fechaFin = new Date(`${f}T${h}`);
                }

                if (updates.kilometrosInicio !== undefined) {
                    newDescanso.kilometrosInicio = safeParse(updates.kilometrosInicio);
                }

                if (updates.kilometrosFin !== undefined) {
                    newDescanso.kilometrosFin = safeParse(updates.kilometrosFin);
                }

                return newDescanso;
            }
            return d;
        }));
    };

    const handleDeleteDescanso = (id: string) => {
        if (window.confirm("¿Estás seguro de que quieres borrar este descanso?")) {
            setDescansos(prev => prev.filter(d => d.id !== id));
        }
    };

    const handleSave = async () => {
        if (!turno) return;

        // Validar kilómetros iniciales
        const kmsInicio = safeParse(kilometrosInicio);
        if (kmsInicio <= 0) {
            setError("Los kilómetros iniciales deben ser un valor válido mayor a 0");
            return;
        }

        // Validar kilómetros finales si se proporcionan
        let kmsFin: number | undefined = undefined;
        if (kilometrosFin.trim() !== '') {
            kmsFin = safeParse(kilometrosFin);
            if (kmsFin <= 0) {
                setError("Los kilómetros finales deben ser un valor válido mayor a 0");
                return;
            }
            if (kmsFin < kmsInicio) {
                setError("Los kilómetros finales deben ser mayores o iguales a los iniciales");
                return;
            }
        }

        // Construir fecha de inicio
        const fechaInicioDate = new Date(`${fechaInicio}T${horaInicio}`);
        if (isNaN(fechaInicioDate.getTime())) {
            setError("La fecha y hora de inicio no son válidas");
            return;
        }

        // Construir fecha de fin si se proporciona
        let fechaFinDate: Date | undefined = undefined;
        if (fechaFin.trim() !== '' && horaFin.trim() !== '') {
            fechaFinDate = new Date(`${fechaFin}T${horaFin}`);
            if (isNaN(fechaFinDate.getTime())) {
                setError("La fecha y hora de fin no son válidas");
                return;
            }
            if (fechaFinDate < fechaInicioDate) {
                setError("La fecha de fin debe ser posterior a la fecha de inicio");
                return;
            }
        }

        setIsSaving(true);
        setError(null);

        try {
            await updateTurno(turnoId, {
                fechaInicio: fechaInicioDate,
                kilometrosInicio: kmsInicio,
                fechaFin: fechaFinDate,
                kilometrosFin: kmsFin,
                descansos: descansos
            });

            navigateTo(Seccion.Turnos);
        } catch (err) {
            console.error("Error updating turno:", err);
            setError("Error al actualizar el turno. Por favor, inténtalo de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="text-center p-8 text-zinc-400">Cargando turno...</div>
            );
        }

        if (!turno) {
            return (
                <Card>
                    <div className="text-center p-4 text-zinc-400">
                        {error || "Turno no encontrado"}
                    </div>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                <Card>
                    <div className="space-y-4">
                        <div className="bg-zinc-800/50 rounded-lg p-3 mb-4 text-xs">
                            <p className="text-zinc-400 mb-1">Información actual:</p>
                            <p className="text-zinc-300">
                                <span className="font-semibold">Inicio:</span> {formatDateTime(turno.fechaInicio)}
                            </p>
                            {turno.fechaFin && (
                                <p className="text-zinc-300">
                                    <span className="font-semibold">Fin:</span> {formatDateTime(turno.fechaFin)}
                                </p>
                            )}
                        </div>

                        <div>
                            <h3 className="text-zinc-100 font-semibold mb-3 text-sm">Inicio del Turno</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <CustomTextField
                                    label="Fecha inicio"
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                                <CustomTextField
                                    label="Hora inicio"
                                    type="time"
                                    value={horaInicio}
                                    onChange={(e) => setHoraInicio(e.target.value)}
                                />
                            </div>
                            <div className="mt-3">
                                <CustomTextField
                                    label="Kilómetros inicio"
                                    type="number"
                                    value={kilometrosInicio}
                                    onChange={(e) => setKilometrosInicio(e.target.value)}
                                    placeholder="Ej: 45000"
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-zinc-100 font-semibold mb-3 text-sm">Fin del Turno (opcional)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <CustomTextField
                                    label="Fecha fin"
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    placeholder="Opcional"
                                />
                                <CustomTextField
                                    label="Hora fin"
                                    type="time"
                                    value={horaFin}
                                    onChange={(e) => setHoraFin(e.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div className="mt-3">
                                <CustomTextField
                                    label="Kilómetros fin"
                                    type="number"
                                    value={kilometrosFin}
                                    onChange={(e) => setKilometrosFin(e.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Sección de Descansos */}
                <div className="space-y-3">
                    <h3 className="text-lg font-bold text-zinc-100 px-1">Detalle Descansos / Pausas</h3>
                    {descansos.length === 0 ? (
                        <Card className="p-4 text-center text-zinc-500 text-sm">
                            No hay descansos registrados en este turno.
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {descansos.map((descanso, index) => (
                                <Card key={descanso.id} className="p-4 border-l-4 border-l-blue-600">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-blue-400 font-bold text-sm uppercase">Pausa {index + 1}</span>
                                        <button
                                            onClick={() => handleDeleteDescanso(descanso.id)}
                                            className="text-rose-400 p-1 hover:bg-rose-900/30 rounded transition-colors"
                                            title="Borrar pausa"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {/* Inicio de la pausa */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <CustomTextField
                                                label="Fecha Inicio Pausa"
                                                type="date"
                                                value={dateToInputFormat(descanso.fechaInicio)}
                                                onChange={(e) => handleUpdateDescanso(descanso.id, { fechaInicio: e.target.value })}
                                            />
                                            <CustomTextField
                                                label="Hora Inicio Pausa"
                                                type="time"
                                                value={timeToInputFormat(descanso.fechaInicio)}
                                                onChange={(e) => handleUpdateDescanso(descanso.id, { horaInicio: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <CustomTextField
                                                label="Kms Inicio Pausa"
                                                type="number"
                                                value={descanso.kilometrosInicio}
                                                onChange={(e) => handleUpdateDescanso(descanso.id, { kilometrosInicio: e.target.value })}
                                            />
                                        </div>

                                        <div className="border-t border-zinc-800 pt-3"></div>

                                        {/* Fin de la pausa */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <CustomTextField
                                                label="Fecha Fin Pausa"
                                                type="date"
                                                value={descanso.fechaFin ? dateToInputFormat(descanso.fechaFin) : ''}
                                                onChange={(e) => handleUpdateDescanso(descanso.id, { fechaFin: e.target.value })}
                                            />
                                            <CustomTextField
                                                label="Hora Fin Pausa"
                                                type="time"
                                                value={descanso.fechaFin ? timeToInputFormat(descanso.fechaFin) : ''}
                                                onChange={(e) => handleUpdateDescanso(descanso.id, { horaFin: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <CustomTextField
                                                label="Kms Fin Pausa"
                                                type="number"
                                                value={descanso.kilometrosFin || ''}
                                                onChange={(e) => handleUpdateDescanso(descanso.id, { kilometrosFin: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors hover:bg-blue-700 shadow-lg shadow-blue-900/20"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button
                        onClick={() => navigateTo(Seccion.Turnos)}
                        className="px-6 py-4 bg-zinc-800 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 py-4 space-y-4">
            <ScreenTopBar
                title="Editar Turno"
                navigateTo={navigateTo}
                backTarget={Seccion.Turnos}
            />

            <KineticHeader title="Detalles del Turno" />
            <div className="max-w-2xl mx-auto pb-20">
                {renderContent()}
            </div>
        </div>
    );
};

export default EditTurnScreen;


