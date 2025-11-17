import React, { useState, useEffect } from 'react';
import Card from '../components/NeumorphicCard';
import KineticHeader from '../components/KineticHeader';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion, Turno } from '../types';
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

    // Estados del formulario
    const [fechaInicio, setFechaInicio] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [kilometrosInicio, setKilometrosInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [kilometrosFin, setKilometrosFin] = useState('');

    // Función helper para convertir Date a formato YYYY-MM-DD (para input type="date")
    const dateToInputFormat = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Función helper para formatear fecha y hora para mostrar (DD/MM/YYYY HH:MM)
    const formatDateTime = (date: Date): string => {
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
                
                // Formatear fecha y hora de inicio (usar formato local para evitar problemas de zona horaria)
                const fechaInicioDate = turnoData.fechaInicio;
                const fechaInicioStr = dateToInputFormat(fechaInicioDate);
                const horaInicioStr = `${String(fechaInicioDate.getHours()).padStart(2, '0')}:${String(fechaInicioDate.getMinutes()).padStart(2, '0')}`;
                
                setFechaInicio(fechaInicioStr);
                setHoraInicio(horaInicioStr);
                setKilometrosInicio(turnoData.kilometrosInicio.toString());
                
                // Formatear fecha y hora de fin si existe
                if (turnoData.fechaFin) {
                    const fechaFinDate = turnoData.fechaFin;
                    const fechaFinStr = dateToInputFormat(fechaFinDate);
                    const horaFinStr = `${String(fechaFinDate.getHours()).padStart(2, '0')}:${String(fechaFinDate.getMinutes()).padStart(2, '0')}`;
                    
                    setFechaFin(fechaFinStr);
                    setHoraFin(horaFinStr);
                }
                
                if (turnoData.kilometrosFin !== undefined) {
                    setKilometrosFin(turnoData.kilometrosFin.toString());
                }
            } catch (err) {
                console.error("Error loading turno:", err);
                setError("Error al cargar el turno");
            } finally {
                setLoading(false);
            }
        };
        
        loadTurno();
    }, [turnoId]);

    const handleSave = async () => {
        if (!turno) return;

        // Validar kilómetros iniciales
        const kmsInicio = parseFloat(kilometrosInicio);
        if (isNaN(kmsInicio) || kmsInicio <= 0) {
            setError("Los kilómetros iniciales deben ser un valor válido mayor a 0");
            return;
        }

        // Validar kilómetros finales si se proporcionan
        let kmsFin: number | undefined = undefined;
        if (kilometrosFin.trim() !== '') {
            kmsFin = parseFloat(kilometrosFin);
            if (isNaN(kmsFin) || kmsFin <= 0) {
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
                kilometrosFin: kmsFin
            });
            
            // Volver a la pantalla de turnos
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
            <Card>
                <div className="space-y-4">
                    {/* Información actual del turno */}
                    {turno && (
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
                    )}

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

                    {error && (
                        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-lg disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors hover:bg-blue-700"
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button
                            onClick={() => navigateTo(Seccion.Turnos)}
                            className="px-4 py-3 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 py-4 space-y-4">
            <ScreenTopBar
                title="Editar Turno"
                navigateTo={navigateTo}
                backTarget={Seccion.Turnos}
            />

            <KineticHeader title="Editar Turno" />
            {renderContent()}
        </div>
    );
};

export default EditTurnScreen;


