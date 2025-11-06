import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import { Seccion } from '../types';
import { saveAjustes, getAjustes } from '../services/api';

interface AjustesScreenProps {
    navigateTo: (page: Seccion) => void;
}

const AjustesScreen: React.FC<AjustesScreenProps> = ({ navigateTo }) => {
    const [temaOscuro, setTemaOscuro] = useState<boolean>(
        localStorage.getItem('temaOscuro') === 'true' || localStorage.getItem('temaOscuro') === null
    );
    const [tamañoFuente, setTamañoFuente] = useState<number>(
        parseFloat(localStorage.getItem('tamañoFuente') || '14')
    );
    const [letraDescanso, setLetraDescanso] = useState<string>(
        localStorage.getItem('letraDescanso') || ''
    );
    const [objetivoDiario, setObjetivoDiario] = useState<number>(
        parseFloat(localStorage.getItem('objetivoDiario') || '100')
    );
    const [guardado, setGuardado] = useState<boolean>(false);
    const [guardando, setGuardando] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar ajustes desde Firestore al montar el componente
    useEffect(() => {
        const cargarAjustes = async () => {
            try {
                const ajustes = await getAjustes();
                if (ajustes) {
                    setTemaOscuro(ajustes.temaOscuro);
                    setTamañoFuente(ajustes.tamañoFuente);
                    setLetraDescanso(ajustes.letraDescanso);
                    setObjetivoDiario(ajustes.objetivoDiario);
                    // También actualizar localStorage como respaldo
                    localStorage.setItem('temaOscuro', ajustes.temaOscuro.toString());
                    localStorage.setItem('tamañoFuente', ajustes.tamañoFuente.toString());
                    localStorage.setItem('letraDescanso', ajustes.letraDescanso);
                    localStorage.setItem('objetivoDiario', ajustes.objetivoDiario.toString());
                }
            } catch (error) {
                console.error('Error cargando ajustes:', error);
                // Si falla, usar valores de localStorage como respaldo
            }
        };
        cargarAjustes();
    }, []);

    const handleGuardar = async () => {
        setGuardando(true);
        setError(null);
        
        try {
            // Guardar en Firestore
            await saveAjustes({
                temaOscuro,
                tamañoFuente,
                letraDescanso,
                objetivoDiario
            });
            
            // También guardar en localStorage como respaldo
            localStorage.setItem('temaOscuro', temaOscuro.toString());
            localStorage.setItem('tamañoFuente', tamañoFuente.toString());
            localStorage.setItem('letraDescanso', letraDescanso);
            localStorage.setItem('objetivoDiario', objetivoDiario.toString());
            
            // Mostrar confirmación
            setGuardado(true);
            setTimeout(() => {
                setGuardado(false);
            }, 2000);
        } catch (error) {
            console.error('Error guardando ajustes:', error);
            setError('Error al guardar los ajustes. Por favor, intenta de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    const handleBackupGoogleDrive = () => {
        // TODO: Implementar backup en Google Drive
        alert('Función de backup en Google Drive próximamente');
    };

    const handleEliminacionTotal = () => {
        const confirmacion = window.confirm(
            '¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.'
        );
        if (confirmacion) {
            const segundaConfirmacion = window.confirm(
                'ÚLTIMA CONFIRMACIÓN: Esto eliminará TODOS los datos permanentemente. ¿Continuar?'
            );
            if (segundaConfirmacion) {
                // TODO: Implementar eliminación total de datos
                alert('Función de eliminación total próximamente');
            }
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center space-x-3">
                <BackButton navigateTo={navigateTo} />
                <h1 className="text-zinc-100 text-xl font-bold">Ajustes</h1>
            </header>

            {/* Tema Oscuro */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-zinc-100 font-bold text-base mb-1">Tema Oscuro</h3>
                        <p className="text-zinc-400 text-sm">Activar o desactivar el tema oscuro</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={temaOscuro}
                            onChange={(e) => setTemaOscuro(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            {/* Tamaño de Fuente */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <div className="mb-3">
                    <h3 className="text-zinc-100 font-bold text-base mb-1">Tamaño de Fuente</h3>
                    <p className="text-zinc-400 text-sm mb-2">Ajusta el tamaño de la fuente: {tamañoFuente}px</p>
                </div>
                <input
                    type="range"
                    min="12"
                    max="20"
                    value={tamañoFuente}
                    onChange={(e) => setTamañoFuente(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>12px</span>
                    <span>16px</span>
                    <span>20px</span>
                </div>
            </div>

            {/* Letra de Descanso */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <div className="mb-3">
                    <h3 className="text-zinc-100 font-bold text-base mb-1">Letra de Descanso</h3>
                    <p className="text-zinc-400 text-sm mb-2">Introduce la letra de descanso (A-F)</p>
                </div>
                <div className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={letraDescanso}
                        onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            // Solo permitir letras A-F y máximo 1 carácter
                            if (value === '' || /^[A-F]$/.test(value)) {
                                setLetraDescanso(value);
                            }
                        }}
                        placeholder="A-F"
                        maxLength={1}
                        className="w-20 bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-4 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    <div className="flex-1">
                        <p className="text-zinc-400 text-xs">Selecciona una letra de A a F</p>
                    </div>
                </div>
            </div>

            {/* Objetivo Diario */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <div className="mb-3">
                    <h3 className="text-zinc-100 font-bold text-base mb-1">Objetivo Diario</h3>
                    <p className="text-zinc-400 text-sm">Establece tu objetivo diario de ingresos</p>
                </div>
                <div className="flex items-center space-x-3">
                    <input
                        type="number"
                        value={objetivoDiario}
                        onChange={(e) => setObjetivoDiario(Number(e.target.value))}
                        className="flex-1 bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                    />
                    <span className="text-zinc-400 font-medium">€</span>
                </div>
            </div>

            {/* Botón Guardar */}
            <div className="flex flex-col items-center pb-4 space-y-2">
                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                <button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2 ${
                        guardado ? 'bg-green-600 hover:bg-green-700' : ''
                    } ${guardando ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {guardando ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Guardando...</span>
                        </>
                    ) : guardado ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            <span>Guardado</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            <span>Guardar Ajustes</span>
                        </>
                    )}
                </button>
            </div>

            {/* Backup en Google Drive */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-zinc-100 font-bold text-base mb-1">Backup en Google Drive</h3>
                        <p className="text-zinc-400 text-sm">Realiza una copia de seguridad en Google Drive</p>
                    </div>
                    <button
                        onClick={handleBackupGoogleDrive}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Backup
                    </button>
                </div>
            </div>

            {/* Eliminación Total de Datos */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-red-500/50">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-red-400 font-bold text-base mb-1">Eliminación Total de Datos</h3>
                        <p className="text-zinc-400 text-sm">Elimina permanentemente todos los datos de la aplicación</p>
                    </div>
                    <button
                        onClick={handleEliminacionTotal}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AjustesScreen;
