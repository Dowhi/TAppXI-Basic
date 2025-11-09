import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useFontSize } from "../contexts/FontSizeContext";
import ScreenTopBar from "../components/ScreenTopBar";
import { Seccion } from "../types";
import { saveAjustes, getAjustes } from "../services/api";

interface AjustesScreenProps {
    navigateTo: (page: Seccion) => void;
}

const AjustesScreen: React.FC<AjustesScreenProps> = ({ navigateTo }) => {
    const { isDark, setTheme } = useTheme();
    const { fontSize, setFontSize } = useFontSize();

    const [temaOscuro, setTemaOscuro] = useState<boolean>(isDark);
    const [tamanoFuente, setTamanoFuente] = useState<number>(fontSize);
    const [letraDescanso, setLetraDescanso] = useState<string>(
        localStorage.getItem("letraDescanso") || ""
    );
    const [objetivoDiario, setObjetivoDiario] = useState<number>(
        parseFloat(localStorage.getItem("objetivoDiario") || "100")
    );
    const [guardado, setGuardado] = useState<boolean>(false);
    const [guardando, setGuardando] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargarAjustes = async () => {
            try {
                const ajustes = await getAjustes();
                if (ajustes) {
                    const fetchedTamano = (ajustes as any).tamanoFuente ?? (ajustes as any)["tam\\u00f1oFuente"] ?? 14;
                    setTemaOscuro(ajustes.temaOscuro ?? false);
                    setTheme(ajustes.temaOscuro ?? false);
                    setTamanoFuente(fetchedTamano);
                    setFontSize(fetchedTamano);
                    setLetraDescanso(ajustes.letraDescanso ?? "");
                    setObjetivoDiario(ajustes.objetivoDiario ?? 100);

                    localStorage.setItem("temaOscuro", (ajustes.temaOscuro ?? false).toString());
                    localStorage.setItem("tamanoFuente", fetchedTamano.toString());
                    localStorage.removeItem("tam\\u00f1oFuente");
                    localStorage.setItem("letraDescanso", ajustes.letraDescanso ?? "");
                    localStorage.setItem("objetivoDiario", (ajustes.objetivoDiario ?? 100).toString());
                }
            } catch (err) {
                console.error("Error cargando ajustes:", err);
            }
        };

        cargarAjustes();
    }, [setFontSize, setTheme]);

    const handleGuardar = async () => {
        setGuardando(true);
        setError(null);

        try {
            await saveAjustes({
                temaOscuro,
                tamanoFuente,
                letraDescanso,
                objetivoDiario,
            });

            setTheme(temaOscuro);
            setFontSize(tamanoFuente);

            localStorage.setItem("temaOscuro", temaOscuro.toString());
            localStorage.setItem("tamanoFuente", tamanoFuente.toString());
            localStorage.removeItem("tam\\u00f1oFuente");
            localStorage.setItem("letraDescanso", letraDescanso);
            localStorage.setItem("objetivoDiario", objetivoDiario.toString());

            setGuardado(true);
            setTimeout(() => setGuardado(false), 2000);
        } catch (err) {
            console.error("Error guardando ajustes:", err);
            setError("Error al guardar los ajustes. Por favor, intentalo de nuevo.");
        } finally {
            setGuardando(false);
        }
    };

    const handleBackupGoogleDrive = () => {
        alert("Funcion de backup en Google Drive disponible proximamente.");
    };

    const handleEliminacionTotal = () => {
        const confirmacion = window.confirm(
            "Estas seguro de que quieres eliminar TODOS los datos? Esta accion no se puede deshacer."
        );
        if (!confirmacion) return;

        const segundaConfirmacion = window.confirm(
            "ULTIMA CONFIRMACION: Esta accion eliminara todos los datos permanentemente. Continuar?"
        );

        if (segundaConfirmacion) {
            alert("Funcion de eliminacion total disponible proximamente.");
        }
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-24 space-y-6">
            <ScreenTopBar title="Ajustes" navigateTo={navigateTo} backTarget={Seccion.Home} />

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
                            onChange={(e) => {
                                setTemaOscuro(e.target.checked);
                                setTheme(e.target.checked);
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <div className="mb-3">
                    <h3 className="text-zinc-100 font-bold text-base mb-1">Tamano de Fuente</h3>
                    <p className="text-zinc-400 text-sm mb-2">
                        Ajusta el tamano de la fuente: {tamanoFuente}px
                    </p>
                </div>
                <input
                    type="range"
                    min="12"
                    max="20"
                    value={tamanoFuente}
                    onChange={(e) => {
                        const size = Number(e.target.value);
                        setTamanoFuente(size);
                        setFontSize(size);
                    }}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>12px</span>
                    <span>16px</span>
                    <span>20px</span>
                </div>
            </div>

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
                            if (value === "" || /^[A-F]$/.test(value)) {
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
                    <span className="text-zinc-400 font-medium">EUR</span>
                </div>
            </div>

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
                        guardado ? "bg-green-600 hover:bg-green-700" : ""
                    } ${guardando ? "opacity-50 cursor-not-allowed" : ""}`}
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
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span>Guardado</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            <span>Guardar Ajustes</span>
                        </>
                    )}
                </button>
            </div>

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

            <div className="bg-zinc-800 rounded-lg p-4 border border-red-500/50">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-red-400 font-bold text-base mb-1">Eliminacion Total de Datos</h3>
                        <p className="text-zinc-400 text-sm">Elimina permanentemente todos los datos de la aplicacion</p>
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
