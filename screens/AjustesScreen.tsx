// Deploy trigger after secrets setup
import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useFontSize } from "../contexts/FontSizeContext";
import ScreenTopBar from "../components/ScreenTopBar";
import { Seccion } from "../types";
import { saveAjustes, getAjustes, deleteAllData, DeleteProgress, removeDuplicates, syncFromFirestore } from "../services/api";
import { downloadBackupJson, restoreBackup, restoreFromGoogleSheets, exportToGoogleSheets } from "../services/backup";
import { listFiles, getFileContent, isGoogleLoggedIn, signOutGoogle, ensureGoogleSignIn, extractGapiErrorMessage, listFolders } from "../services/google";
import { archiveOperationalDataOlderThan, getRelativeCutoffDate } from "../services/maintenance";
import { exportToExcel, exportToCSV, exportToPDFAdvanced, exportToHacienda, ExportFilter } from "../services/exports";
import { getCarreras, getGastos, getRecentTurnos } from "../services/api";
import { saveCustomReport, getCustomReports, deleteCustomReport, markReportAsUsed, CustomReport } from "../services/customReports";
import { ActivationService } from "../services/activation";

const parseSafeDate = (d: any): Date => {
    if (d instanceof Date) return d;
    if (!d) return new Date(0);

    if (typeof d === 'string' && d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
            // Asumir DD/MM/YYYY
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    }

    try {
        const date = new Date(d);
        return isNaN(date.getTime()) ? new Date(0) : date;
    } catch {
        return new Date(0);
    }
};

interface AjustesScreenProps {
    navigateTo: (page: Seccion) => void;
}

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-400">{label}</label>
        {children}
    </div>
);

const AjustesScreen: React.FC<AjustesScreenProps> = ({ navigateTo }) => {
    const { isDark, setTheme, themeName, setThemeName, highContrast, toggleHighContrast } = useTheme();
    const { fontSize, setFontSize } = useFontSize();

    const [temaOscuro, setTemaOscuro] = useState<boolean>(isDark);
    const [tamanoFuente, setTamanoFuente] = useState<number>(fontSize);
    const [objetivoDiario, setObjetivoDiario] = useState<number>(
        parseFloat(localStorage.getItem("objetivoDiario") || "100")
    );
    const [guardado, setGuardado] = useState<boolean>(false);
    const [guardando, setGuardando] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [temaColor, setTemaColor] = useState<string>(themeName);
    const [altoContraste, setAltoContraste] = useState<boolean>(highContrast);
    const [archiving, setArchiving] = useState<boolean>(false);
    const [archiveMonths, setArchiveMonths] = useState<number>(24);
    const [archiveResult, setArchiveResult] = useState<string | null>(null);
    const [hasUserChanged, setHasUserChanged] = useState<boolean>(false);

    // Configuración Tarifas
    const [tarifa1, setTarifa1] = useState<number>(() => {
        const stored = localStorage.getItem("tarifa1");
        return stored ? parseFloat(stored) : 4.40;
    });
    const [tarifa2, setTarifa2] = useState<number>(() => {
        const stored = localStorage.getItem("tarifa2");
        return stored ? parseFloat(stored) : 5.47;
    });
    const [tarifa3, setTarifa3] = useState<number>(() => {
        const stored = localStorage.getItem("tarifa3");
        return stored ? parseFloat(stored) : 6.85;
    });
    const [tarifaAeropuertoDia, setTarifaAeropuertoDia] = useState<number>(() => {
        const stored = localStorage.getItem("tarifaAeropuertoDia");
        return stored ? parseFloat(stored) : 25.72;
    });
    const [tarifaAeropuertoNoche, setTarifaAeropuertoNoche] = useState<number>(() => {
        const stored = localStorage.getItem("tarifaAeropuertoNoche");
        return stored ? parseFloat(stored) : 28.67;
    });

    // Estados para backup
    const [uploadingToDrive, setUploadingToDrive] = useState<boolean>(false);
    const [exportingToSheets, setExportingToSheets] = useState<boolean>(false);
    const [syncingCloud, setSyncingCloud] = useState<boolean>(false);

    // Exportación avanzada
    const [exportFechaDesde, setExportFechaDesde] = useState<string>('');
    const [exportFechaHasta, setExportFechaHasta] = useState<string>('');
    const [exportTipo, setExportTipo] = useState<'excel' | 'pdf' | 'csv'>('excel');
    const [exporting, setExporting] = useState<boolean>(false);

    // Exportación para Hacienda
    const [haciendaFilter, setHaciendaFilter] = useState<ExportFilter>('trimestre');
    const [haciendaYear, setHaciendaYear] = useState<number>(new Date().getFullYear());
    const [haciendaQuarter, setHaciendaQuarter] = useState<number>(Math.floor((new Date().getMonth() + 3) / 3));

    // Admin Mode / License Generator
    const [adminMode, setAdminMode] = useState(false);
    const [adminTriggerCount, setAdminTriggerCount] = useState(0);
    const [targetDeviceId, setTargetDeviceId] = useState('');
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [haciendaFechaDesde, setHaciendaFechaDesde] = useState<string>('');
    const [haciendaFechaHasta, setHaciendaFechaHasta] = useState<string>('');
    const [exportingHacienda, setExportingHacienda] = useState<boolean>(false);

    // Reportes personalizados
    const [customReports, setCustomReports] = useState<CustomReport[]>([]);
    const [showReportBuilder, setShowReportBuilder] = useState<boolean>(false);
    const [newReportNombre, setNewReportNombre] = useState<string>('');
    const [newReportDescripcion, setNewReportDescripcion] = useState<string>('');
    const [newReportFiltros, setNewReportFiltros] = useState<ExportFilter>({});
    const [newReportTipo, setNewReportTipo] = useState<'excel' | 'pdf' | 'csv'>('excel');

    // Branding State
    const [logo, setLogo] = useState<string>('');
    const [fiscalData, setFiscalData] = useState({
        nombre: '',
        nif: '',
        direccion: '',
        telefono: '',
        email: ''
    });

    // Restore
    const [restoring, setRestoring] = useState<boolean>(false);
    const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
    const [backupsList, setBackupsList] = useState<any[]>([]);
    const [loadingBackups, setLoadingBackups] = useState<boolean>(false);

    // Progress state
    const [restoreProgress, setRestoreProgress] = useState<number>(0);
    const [restoreMessage, setRestoreMessage] = useState<string>("");
    const [showRestoreProgress, setShowRestoreProgress] = useState<boolean>(false);


    // Deletion progress state
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deletionProgress, setDeletionProgress] = useState<number>(0);
    const [deletionMessage, setDeletionMessage] = useState<string>("");

    const [isCleaning, setIsCleaning] = useState<boolean>(false);

    // Custom Modal State
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
    const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

    // Estado de sesión de Google
    const [isLoggedIn, setIsLoggedIn] = useState(isGoogleLoggedIn());
    const [driveFolders, setDriveFolders] = useState<{id: string, name: string}[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>(localStorage.getItem('tappxi_drive_export_folder') || '');
    const [lastBackupStatus, setLastBackupStatus] = useState<string | null>(localStorage.getItem('tappxi_last_auto_backup_status'));

    useEffect(() => {
        if (isLoggedIn) {
            listFolders().then(setDriveFolders).catch(console.error);
        }
    }, [isLoggedIn]);

    // Actualizar status de backup cada vez que se abre la pantalla
    useEffect(() => {
        setLastBackupStatus(localStorage.getItem('tappxi_last_auto_backup_status'));
    }, []);

    const handleGoogleLogin = async () => {
        try {
            await ensureGoogleSignIn();
            setIsLoggedIn(true);
            showAlert("✅ Conectado con Google correctamente.");
        } catch (error: any) {
            console.error("Error login Google:", error);
            const msg = extractGapiErrorMessage(error);
            showAlert(`❌ Error al conectar con Google: ${msg}`);
        }
    };

    const handleGoogleLogout = () => {
        signOutGoogle();
        setIsLoggedIn(false);
        showAlert("Sesión de Google cerrada.");
    };

    // Handler para descargar backup JSON local
    const handleDownloadBackupJSON = async () => {
        try {
            await downloadBackupJson();
            showAlert("✅ Backup JSON descargado correctamente.");
        } catch (error: any) {
            console.error("Error descargando backup JSON:", error);
            showAlert(`❌ Error al descargar backup: ${error.message || error}`);
        }
    };

    // Handler para restaurar desde archivo JSON local
    const handleRestoreFromJSONFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);

            showConfirm(
                `¿Estás seguro de que quieres restaurar desde "${file.name}"?\n\n` +
                `⚠️ ADVERTENCIA: Esto eliminará todos los datos locales actuales y los reemplazará con los del archivo.`,
                async () => {
                    setRestoring(true);
                    setShowRestoreProgress(true);
                    try {
                        const stats = await restoreBackup(jsonData, (progress, message) => {
                            setRestoreProgress(progress);
                            setRestoreMessage(message);
                        });

                        setRestoreProgress(100);
                        setRestoreMessage("Restauración completada");

                        setTimeout(() => {
                            showAlert(
                                `✅ Restauración completada exitosamente.\n\n` +
                                `Carreras restauradas: ${stats.carreras}\n` +
                                `Gastos restaurados: ${stats.gastos}\n` +
                                `Turnos restaurados: ${stats.turnos}`
                            );
                            setShowRestoreProgress(false);
                            window.location.reload();
                        }, 1500);
                    } catch (err: any) {
                        console.error("Error restaurando backup:", err);
                        showAlert(`❌ Error al restaurar: ${err.message || err}`);
                        setShowRestoreProgress(false);
                    } finally {
                        setRestoring(false);
                        event.target.value = ''; // Resetear input file
                    }
                }
            );
        } catch (error: any) {
            console.error("Error leyendo archivo:", error);
            showAlert(`❌ Error al leer el archivo: ${error.message || error}`);
            event.target.value = ''; // Resetear input file
        }
    };


    const showAlert = (message: string) => {
        setAlertMessage(message);
    };

    const showConfirm = (message: string, onConfirm: () => void) => {
        setConfirmMessage(message);
        setOnConfirmAction(() => onConfirm);
    };

    const closeAlert = () => {
        setAlertMessage(null);
    };

    const closeConfirm = () => {
        setConfirmMessage(null);
        setOnConfirmAction(null);
    };

    const handleConfirm = () => {
        const action = onConfirmAction;
        closeConfirm();
        if (action) {
            action();
        }
    };

    const handleCleanDuplicates = () => {
        showConfirm(
            "Se buscarán y eliminarán registros duplicados (Exactamente el mismo contenido). ¿Continuar?",
            async () => {
                setIsCleaning(true);
                try {
                    const result = await removeDuplicates();
                    showAlert(`✅ Completado.\n\nEliminados:\n- ${result.gastosRemoved} gastos duplicados.\n- ${result.carrerasRemoved} carreras duplicadas.`);
                } catch (e: any) {
                    console.error("Error limpiando duplicados:", e);
                    showAlert(`❌ Error: ${e.message}`);
                } finally {
                    setIsCleaning(false);
                }
            }
        );
    };

    useEffect(() => {
        const cargarAjustes = async () => {
            if (hasUserChanged) return;
            try {
                const ajustes = await getAjustes();
                if (ajustes) {
                    const fetchedTamano = ajustes.tamanoFuente ?? (ajustes as any)["tam\\u00f1oFuente"] ?? 14;
                    setTemaOscuro(ajustes.temaOscuro ?? false);
                    setTheme(ajustes.temaOscuro ?? false);
                    setTamanoFuente(fetchedTamano);
                    setFontSize(fetchedTamano);
                    setObjetivoDiario(ajustes.objetivoDiario ?? 100);

                    // Recuperar configuración de personalización
                    const storedThemeName = ajustes.temaColor || localStorage.getItem("temaColor") || "azul";
                    const storedHighContrast = ajustes.altoContraste ?? (localStorage.getItem("altoContraste") === "true");

                    setTemaColor(storedThemeName);
                    setThemeName(storedThemeName);
                    setAltoContraste(storedHighContrast);

                    if (storedHighContrast !== undefined) {
                        if (!!storedHighContrast !== highContrast) {
                            toggleHighContrast();
                        }
                    }

                    // Sincronizar localStorage con lo que viene de la nube
                    localStorage.setItem("temaOscuro", (ajustes.temaOscuro ?? false).toString());
                    localStorage.setItem("tamanoFuente", fetchedTamano.toString());
                    localStorage.removeItem("tam\\u00f1oFuente");
                    localStorage.setItem("objetivoDiario", (ajustes.objetivoDiario ?? 100).toString());
                    localStorage.setItem("temaColor", storedThemeName);
                    localStorage.setItem("altoContraste", String(storedHighContrast));

                    // Tarifas
                    if (ajustes.tarifa1 !== undefined) {
                        setTarifa1(ajustes.tarifa1);
                        localStorage.setItem("tarifa1", ajustes.tarifa1.toString());
                    }
                    if (ajustes.tarifa2 !== undefined) {
                        setTarifa2(ajustes.tarifa2);
                        localStorage.setItem("tarifa2", ajustes.tarifa2.toString());
                    }
                    if (ajustes.tarifa3 !== undefined) {
                        setTarifa3(ajustes.tarifa3);
                        localStorage.setItem("tarifa3", ajustes.tarifa3.toString());
                    }
                    if (ajustes.tarifaAeropuertoDia !== undefined) {
                        setTarifaAeropuertoDia(ajustes.tarifaAeropuertoDia);
                        localStorage.setItem("tarifaAeropuertoDia", ajustes.tarifaAeropuertoDia.toString());
                    }
                    if (ajustes.tarifaAeropuertoNoche !== undefined) {
                        setTarifaAeropuertoNoche(ajustes.tarifaAeropuertoNoche);
                        localStorage.setItem("tarifaAeropuertoNoche", ajustes.tarifaAeropuertoNoche.toString());
                    }

                    // Branding
                    if (ajustes.logo) {
                        setLogo(ajustes.logo);
                        localStorage.setItem('branding_logo', ajustes.logo);
                    }
                    if (ajustes.datosFiscales) {
                        setFiscalData(ajustes.datosFiscales);
                        localStorage.setItem('branding_datosFiscales', JSON.stringify(ajustes.datosFiscales));
                    }
                } else {
                    // Fallback a localStorage si no hay nada en la nube todavía
                    const storedLogo = localStorage.getItem('branding_logo');
                    if (storedLogo) setLogo(storedLogo);
                    const storedFiscal = localStorage.getItem('branding_datosFiscales');
                    if (storedFiscal) setFiscalData(JSON.parse(storedFiscal));
                }
            } catch (err) {
                console.error("Error cargando ajustes:", err);
            }
        };

        cargarAjustes();
    }, [setFontSize, setTheme, setThemeName, highContrast, toggleHighContrast, hasUserChanged]);

    // Inicializar fechas de exportación con mes actual
    useEffect(() => {
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        setExportFechaDesde(primerDia.toISOString().split('T')[0]);
        setExportFechaHasta(ultimoDia.toISOString().split('T')[0]);
    }, []);

    // Cargar reportes personalizados
    useEffect(() => {
        const cargarReportes = async () => {
            try {
                const reportes = await getCustomReports();
                setCustomReports(reportes);
            } catch (err) {
                console.error("Error cargando reportes personalizados:", err);
            }
        };
        cargarReportes();
    }, []);

    const handleGuardar = async () => {
        setGuardando(true);
        setError(null);

        try {
            await saveAjustes({
                temaOscuro,
                tamanoFuente,
                letraDescanso: "",
                objetivoDiario,
                // nuevos campos de personalización de tema
                temaColor: temaColor,
                altoContraste: altoContraste,
                // tarifas
                tarifa1,
                tarifa2,
                tarifa3,
                tarifaAeropuertoDia,
                tarifaAeropuertoNoche,
                // branding
                logo,
                datosFiscales: fiscalData,
            });

            setTheme(temaOscuro);
            setFontSize(tamanoFuente);
            setThemeName(temaColor);
            if (altoContraste !== highContrast) {
                toggleHighContrast();
            }

            localStorage.setItem("temaOscuro", temaOscuro.toString());
            localStorage.setItem("tamanoFuente", tamanoFuente.toString());
            localStorage.removeItem("tam\\u00f1oFuente");
            localStorage.setItem("objetivoDiario", objetivoDiario.toString());
            localStorage.setItem("temaColor", temaColor);
            localStorage.setItem("altoContraste", altoContraste.toString());
            localStorage.setItem("tarifa1", tarifa1.toString());
            localStorage.setItem("tarifa2", tarifa2.toString());
            localStorage.setItem("tarifa3", tarifa3.toString());
            localStorage.setItem("tarifaAeropuertoDia", tarifaAeropuertoDia.toString());
            localStorage.setItem("tarifaAeropuertoNoche", tarifaAeropuertoNoche.toString());
            localStorage.setItem("branding_logo", logo);
            localStorage.setItem("branding_datosFiscales", JSON.stringify(fiscalData));

            setHasUserChanged(false);
            setGuardado(true);
            setTimeout(() => setGuardado(false), 2000);
        } catch (err) {
            console.error("Error guardando ajustes:", err);
            setError("Error al guardar los ajustes. Por favor, intentalo de nuevo.");
        } finally {
            setGuardando(false);
        }
    };

    const handleArchiveOldData = async () => {
        showConfirm(
            `Se archivarán y eliminarán datos anteriores a aproximadamente ${archiveMonths} meses.\n\n` +
            "Esto puede tardar varios minutos dependiendo del volumen de datos. ¿Continuar?",
            async () => {
                setArchiving(true);
                setArchiveResult(null);
                try {
                    const cutoff = getRelativeCutoffDate(archiveMonths);
                    const results = await archiveOperationalDataOlderThan(cutoff);
                    const resumen = results
                        .map(r => `${r.collection}: ${r.moved} documentos movidos`)
                        .join(" · ");
                    setArchiveResult(resumen || "No se encontraron datos antiguos para archivar.");
                } catch (e) {
                    console.error("Error archivando datos antiguos:", e);
                    setArchiveResult("Error al archivar datos. Revisa la consola para más detalles.");
                } finally {
                    setArchiving(false);
                }
            }
        );
    };

    // Funciones deshabilitadas (syncService eliminado)

    // handleForceCloudSync eliminado



    const handleExportToSheets = async () => {
        if (!isLoggedIn) {
            showAlert("⚠️ Debes conectar tu cuenta de Google primero.");
            return;
        }

        setExporting(true);
        try {
            // Pasar el folder ID seleccionado (si existe)
            const result = await exportToGoogleSheets(selectedFolderId || undefined);
            showAlert(`✅ Exportación completada con éxito.\n\nSe ha creado una hoja de cálculo en tu Google Drive.`);
            // Opcionalmente abrir la URL
            if (result.url) {
                window.open(result.url, '_blank');
            }
        } catch (error: any) {
            console.error("Error exportando a Sheets:", error);
            const msg = error?.message || JSON.stringify(error);
            showAlert(`❌ Error al exportar: ${msg}`);
        } finally {
            setExporting(false);
        }
    };

    const handleAdminTrigger = () => {
        if (adminMode) return;
        setAdminTriggerCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 5) {
                setAdminMode(true);
                return 0;
            }
            return newCount;
        });
    };

    const handleGenerateLicense = () => {
        if (targetDeviceId.length < 5) return; // Simple check
        const code = ActivationService.generateValidCode(targetDeviceId);
        setGeneratedCode(code);
    };
    // END NEW CODE
    const handleListBackups = async () => {
        if (!isLoggedIn) {
            showAlert("⚠️ Debes conectar tu cuenta de Google primero para ver los backups en Drive.");
            return;
        }
        setLoadingBackups(true);
        setShowRestoreModal(true);
        setBackupsList([]);
        try {
            const query = "(name contains 'tappxi' or name contains 'TAppXI') and trashed = false";
            console.log("Buscando backups con query:", query);

            const files = await listFiles(query);
            console.log("Archivos encontrados (raw):", files);
            setBackupsList(files);
        } catch (e: any) {
            console.error("Error cargando backups:", e);
            const msg = e?.message || JSON.stringify(e);
            showAlert(
                `❌ Error al cargar backups: ${msg}\n\n` +
                `Asegúrate de:\n` +
                `1. Tener conexión a internet\n` +
                `2. Haber autorizado el acceso a Google Drive\n` +
                `3. Tener espacio disponible en tu cuenta de Google`
            );
        } finally {
            setLoadingBackups(false);
        }
    };

    const handleRestoreBackup = async (fileId: string, fileName: string, mimeType: string) => {
        showConfirm(
            `¿Estás seguro de que quieres restaurar el backup "${fileName}"?\n\n⚠️ ESTO SOBREESCRIBIRÁ LOS DATOS EXISTENTES QUE COINCIDAN.`,
            async () => {
                setRestoring(true);
                setRestoreProgress(0);
                setRestoreMessage("Iniciando restauración...");

                try {
                    let stats;
                    const onProgress = (progress: number, message: string) => {
                        setRestoreProgress(progress);
                        setRestoreMessage(message);
                    };

                    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                        stats = await restoreFromGoogleSheets(fileId, onProgress);
                    } else {
                        const content = await getFileContent(fileId);
                        stats = await restoreBackup(content, onProgress);
                    }

                    setRestoreProgress(100);
                    setRestoreMessage("¡Restauración completada!");
                    await new Promise(resolve => setTimeout(resolve, 500));

                    showAlert(
                        `✅ Restauración completada con éxito.\n\n` +
                        `Resumen:\n` +
                        `- Carreras: ${stats.carreras}\n` +
                        `- Gastos: ${stats.gastos}\n` +
                        `- Turnos: ${stats.turnos}\n\n` +
                        `La aplicación se recargará para aplicar los cambios.`
                    );

                    setTimeout(() => window.location.reload(), 3000);

                } catch (e: any) {
                    console.error("Error restaurando backup:", e);
                    showAlert(`❌ Error al restaurar el backup: ${e.message}`);
                } finally {
                    setRestoring(false);
                    setShowRestoreModal(false);
                    setRestoreProgress(0);
                    setRestoreMessage("");
                }
            }
        );
    };

    const handleSyncFromFirestore = async () => {
        showConfirm(
            "¿Quieres sincronizar los datos desde Firestore?\n\n⚠️ Esto descargará los datos de la nube y los fusionará con los locales (actualizando los existentes). Se recomienda hacer un backup JSON antes.",
            async () => {
                setRestoring(true);
                setRestoreProgress(0);
                setRestoreMessage("Conectando con Firestore...");

                try {
                    await syncFromFirestore((progress, message) => {
                        setRestoreProgress(progress);
                        setRestoreMessage(message);
                    });

                    showAlert("✅ Sincronización desde Firestore completada con éxito.\n\nLa aplicación se recargará para aplicar los cambios.");
                    setTimeout(() => window.location.reload(), 2000);
                } catch (e: any) {
                    console.error("Error sincronizando desde Firestore:", e);
                    showAlert(`❌ Error en la sincronización: ${e.message || e}`);
                } finally {
                    setRestoring(false);
                }
            }
        );
    };

    const handleEliminacionTotal = () => {
        showConfirm(
            "Estas seguro de que quieres eliminar TODOS los datos? Esta accion no se puede deshacer.",
            () => {
                showConfirm(
                    "ULTIMA CONFIRMACION: Esta accion eliminara todos los datos permanentemente. Continuar?",
                    async () => {
                        // Cerrar el modal de confirmación primero
                        closeConfirm();

                        // Esperar un momento para que el modal se cierre
                        await new Promise(resolve => setTimeout(resolve, 100));

                        setIsDeleting(true);
                        setDeletionProgress(0);
                        setDeletionMessage("Iniciando eliminación...");

                        try {
                            const onProgress = (progress: DeleteProgress) => {
                                setDeletionProgress(progress.percentage);
                                setDeletionMessage(progress.message);
                            };

                            await deleteAllData(onProgress);

                            // Limpiar localStorage después de eliminar datos de Firestore
                            setDeletionMessage("Limpiando datos locales...");
                            localStorage.clear();

                            setDeletionProgress(100);
                            setDeletionMessage("¡Eliminación completada!");
                            await new Promise(resolve => setTimeout(resolve, 500));

                            showAlert(
                                "✅ Todos los datos han sido eliminados correctamente.\n\n" +
                                "La aplicación se recargará para reflejar los cambios."
                            );

                            setTimeout(() => window.location.reload(), 3000);

                        } catch (e: any) {
                            console.error("Error eliminando datos:", e);
                            let errorMessage = `❌ Error al eliminar los datos: ${e.message}`;

                            if (e?.message?.includes('permission') || e?.code === 'permission-denied') {
                                errorMessage += '\n\n🔧 SOLUCIÓN:\n';
                                errorMessage += '1. Ve a Firebase Console: https://console.firebase.google.com/\n';
                                errorMessage += '2. Selecciona tu proyecto (tappxi-21346)\n';
                                errorMessage += '3. Ve a Firestore Database > Reglas\n';
                                errorMessage += '4. Copia y pega las reglas del archivo firestore.rules\n';
                                errorMessage += '5. Haz clic en "Publicar"\n';
                                errorMessage += '6. Recarga la aplicación\n\n';
                                errorMessage += '📖 Consulta PASOS_SOLUCION_PERMISOS.md para instrucciones detalladas.';
                            }

                            showAlert(errorMessage);
                        } finally {
                            setIsDeleting(false);
                            setDeletionProgress(0);
                            setDeletionMessage("");
                        }
                    }
                );
            }
        );
    };

    const handleExportAvanzada = async () => {
        if (!exportFechaDesde || !exportFechaHasta) {
            showAlert("Por favor, selecciona ambas fechas.");
            return;
        }

        setExporting(true);
        try {
            const fechaDesde = new Date(exportFechaDesde);
            fechaDesde.setHours(0, 0, 0, 0);
            const fechaHasta = new Date(exportFechaHasta);
            fechaHasta.setHours(23, 59, 59, 999);

            const [carreras, gastos, turnos] = await Promise.all([
                getCarreras(),
                getGastos(),
                getRecentTurnos(1000),
            ]);

            // Filtrar por fechas
            const carrerasFiltradas = carreras.filter(c => {
                const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                return fecha >= fechaDesde && fecha <= fechaHasta;
            });

            const gastosFiltrados = gastos.filter(g => {
                const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                return fecha >= fechaDesde && fecha <= fechaHasta;
            });

            const turnosFiltrados = turnos.filter(t => {
                const fecha = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
                return fecha >= fechaDesde && fecha <= fechaHasta;
            });

            const filtros: ExportFilter = {
                fechaDesde,
                fechaHasta,
            };

            const data = {
                carreras: carrerasFiltradas,
                gastos: gastosFiltrados,
                turnos: turnosFiltrados,
            };

            if (exportTipo === 'excel') {
                exportToExcel(data, filtros);
            } else if (exportTipo === 'csv') {
                exportToCSV(data, filtros);
            } else {
                await exportToPDFAdvanced(data, filtros);
            }

            showAlert(`Exportación a ${exportTipo.toUpperCase()} completada exitosamente.`);
        } catch (err) {
            console.error("Error en exportación avanzada:", err);
            showAlert("Error al exportar los datos. Por favor, intenta de nuevo.");
        } finally {
            setExporting(false);
        }
    };

    const handleExportHacienda = async () => {
        if (!haciendaFechaDesde || !haciendaFechaHasta) {
            showAlert("Por favor, selecciona ambas fechas para la exportación fiscal.");
            return;
        }

        setExportingHacienda(true);
        try {
            const fechaDesde = new Date(haciendaFechaDesde);
            fechaDesde.setHours(0, 0, 0, 0);
            const fechaHasta = new Date(haciendaFechaHasta);
            fechaHasta.setHours(23, 59, 59, 999);

            const [carreras, gastos, turnos] = await Promise.all([
                getCarreras(),
                getGastos(),
                getRecentTurnos(1000),
            ]);

            // Filtrar por fechas
            const carrerasFiltradas = carreras.filter(c => {
                const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                return fecha >= fechaDesde && fecha <= fechaHasta;
            });

            const gastosFiltrados = gastos.filter(g => {
                const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                return fecha >= fechaDesde && fecha <= fechaHasta;
            });

            const turnosFiltrados = turnos.filter(t => {
                const fecha = t.fechaInicio instanceof Date ? t.fechaInicio : new Date(t.fechaInicio);
                return fecha >= fechaDesde && fecha <= fechaHasta;
            });

            const filtros: ExportFilter = {
                fechaDesde,
                fechaHasta,
            };

            const data = {
                carreras: carrerasFiltradas,
                gastos: gastosFiltrados,
                turnos: turnosFiltrados,
            };

            exportToHacienda(data, filtros);
            showAlert("✅ Exportación para Hacienda completada exitosamente.\n\nEl archivo Excel contiene:\n- Resumen fiscal mensual\n- Ingresos detallados\n- Gastos deducibles\n- Información fiscal");
        } catch (err) {
            console.error("Error en exportación para Hacienda:", err);
            showAlert("Error al exportar los datos fiscales. Por favor, intenta de nuevo.");
        } finally {
            setExportingHacienda(false);
        }
    };

    const handleGuardarReportePersonalizado = async () => {
        if (!newReportNombre.trim()) {
            showAlert("Por favor, ingresa un nombre para el reporte.");
            return;
        }

        if (!exportFechaDesde || !exportFechaHasta) {
            showAlert("Por favor, selecciona ambas fechas.");
            return;
        }

        try {
            const fechaDesde = new Date(exportFechaDesde);
            fechaDesde.setHours(0, 0, 0, 0);
            const fechaHasta = new Date(exportFechaHasta);
            fechaHasta.setHours(23, 59, 59, 999);

            const filtros: ExportFilter = {
                fechaDesde,
                fechaHasta,
                ...newReportFiltros,
            };

            await saveCustomReport({
                nombre: newReportNombre,
                descripcion: newReportDescripcion,
                filtros,
                tipoExportacion: newReportTipo,
                agrupacion: 'ninguna',
            });

            // Recargar lista
            const reportes = await getCustomReports();
            setCustomReports(reportes);

            // Limpiar formulario
            setNewReportNombre('');
            setNewReportDescripcion('');
            setShowReportBuilder(false);
            showAlert("Reporte personalizado guardado exitosamente.");
        } catch (err) {
            console.error("Error guardando reporte personalizado:", err);
            showAlert("Error al guardar el reporte. Por favor, intenta de nuevo.");
        }
    };

    const handleEliminarReporte = async (id: string) => {
        showConfirm("¿Estás seguro de que quieres eliminar este reporte personalizado?", async () => {
            try {
                await deleteCustomReport(id);
                const reportes = await getCustomReports();
                setCustomReports(reportes);
            } catch (err) {
                console.error("Error eliminando reporte:", err);
                showAlert("Error al eliminar el reporte.");
            }
        });
    };

    const handleUsarReporte = async (reporte: CustomReport) => {
        setExporting(true);
        try {
            const [carreras, gastos, turnos] = await Promise.all([
                getCarreras(),
                getGastos(),
                getRecentTurnos(1000),
            ]);

            // Parsear fechas de los filtros si existen (vienen como strings de localStorage)
            const filtros = { ...reporte.filtros };
            if (filtros.fechaDesde) {
                filtros.fechaDesde = new Date(filtros.fechaDesde);
            }
            if (filtros.fechaHasta) {
                filtros.fechaHasta = new Date(filtros.fechaHasta);
            }

            // Aplicar filtros del reporte con las fechas parseadas
            let carrerasFiltradas = carreras;
            let gastosFiltrados = gastos;
            let turnosFiltrados = turnos;

            if (filtros.fechaDesde && filtros.fechaHasta) {
                carrerasFiltradas = carreras.filter(c => {
                    const fecha = c.fechaHora instanceof Date ? c.fechaHora : new Date(c.fechaHora);
                    return fecha >= filtros.fechaDesde! && fecha <= filtros.fechaHasta!;
                });
                gastosFiltrados = gastos.filter(g => {
                    const fecha = g.fecha instanceof Date ? g.fecha : new Date(g.fecha);
                    return fecha >= filtros.fechaDesde! && fecha <= filtros.fechaHasta!;
                });
            }

            const data = {
                carreras: carrerasFiltradas,
                gastos: gastosFiltrados,
                turnos: turnosFiltrados,
            };

            if (reporte.tipoExportacion === 'excel') {
                exportToExcel(data, filtros, `${reporte.nombre}.xlsx`);
            } else if (reporte.tipoExportacion === 'csv') {
                exportToCSV(data, filtros, `${reporte.nombre}.csv`);
            } else {
                exportToPDFAdvanced(data, filtros, `${reporte.nombre}.pdf`);
            }

            await markReportAsUsed(reporte.id);
            showAlert(`Exportación "${reporte.nombre}" completada exitosamente.`);
        } catch (err) {
            console.error("Error usando reporte:", err);
            showAlert("Error al exportar con el reporte. Por favor, intenta de nuevo.");
        } finally {
            setExporting(false);
        }
    };

    const handleLogout = () => {
        showConfirm(
            "¿Quieres cerrar sesión y volver a la pantalla de inicio? Esto no borrará tus datos.",
            () => {
                localStorage.removeItem('tappxi_setup_complete');
                window.location.reload();
            }
        );
    };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-zinc-950' : 'bg-slate-50'} pb-24`}>
            <ScreenTopBar title="Ajustes" navigateTo={navigateTo} backTarget={Seccion.Home} />

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* Sección Cuenta / Sesión */}
                <div className={`${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200'} rounded-2xl border p-5 shadow-sm space-y-4`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            Cuenta y Sesión
                        </h2>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleLogout}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors border ${isDark
                                ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            Cerrar Sesión / Resetear Inicio
                        </button>
                    </div>
                    <p className="text-xs text-center text-zinc-500">
                        Esto te llevará de nuevo a la pantalla de Login. Tus datos se mantendrán seguros.
                    </p>
                </div>

                {/* Admin Section - Only for Admin 'NQLY-PSY3' */}
                {localStorage.getItem('tappxi_device_id') === 'NQLY-PSY3' && (
                    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 shadow-sm">
                        <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor" className="text-blue-500">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                            </svg>
                            Administración de Licencias
                        </h3>

                        <div className="space-y-4">
                            <FormField label="Generar Código de Activación">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        placeholder="ID Terminal"
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono uppercase w-full"
                                        id="license-target-id"
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('license-target-id') as HTMLInputElement;
                                            const targetId = input.value.trim().toUpperCase();
                                            if (targetId.length < 4) {
                                                showAlert("Introduce un ID válido");
                                                return;
                                            }
                                            import('../services/activation').then(({ ActivationService }) => {
                                                const code = ActivationService.generateValidCode(targetId);
                                                showAlert(`Código para ${targetId}:\n\n${code}`);
                                            });
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                                    >
                                        Generar
                                    </button>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Introduce el ID del terminal bloqueado.
                                </p>
                            </FormField>

                            <div className="pt-4 border-t border-zinc-800">
                                <p className="text-xs text-zinc-500 mb-2">Tu ID de Dispositivo:</p>
                                <div className="bg-zinc-950 p-2 rounded border border-zinc-800 font-mono text-center text-zinc-300 select-all">
                                    {localStorage.getItem('tappxi_device_id') || 'No disponible'}
                                </div>
                            </div>
                        </div>
                    </div >
                )}


                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-zinc-100 font-bold text-base mb-0.5">Tema Oscuro</h3>
                            <p className="text-zinc-400 text-sm">Activar o desactivar el tema oscuro</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={temaOscuro}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setTemaOscuro(e.target.checked);
                                    setTheme(e.target.checked);
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="mb-2">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Tema de color</h3>
                        <p className="text-zinc-400 text-sm">
                            Elige el color principal de la interfaz
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: "azul", label: "Azul" },
                            { id: "esmeralda", label: "Esmeralda" },
                            { id: "ambar", label: "Ámbar" },
                            { id: "fucsia", label: "Fucsia" },
                        ].map((tema) => (
                            <button
                                key={tema.id}
                                type="button"
                                onClick={() => {
                                    setHasUserChanged(true);
                                    setTemaColor(tema.id);
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all
                                ${temaColor === tema.id
                                        ? "border-yellow-400 bg-yellow-400/10 text-yellow-200"
                                        : "border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-yellow-300"
                                    }`}
                            >
                                <span>{tema.label}</span>
                                <span
                                    className={`w-4 h-4 rounded-full ${tema.id === "azul"
                                        ? "bg-blue-500"
                                        : tema.id === "esmeralda"
                                            ? "bg-emerald-500"
                                            : tema.id === "ambar"
                                                ? "bg-amber-400"
                                                : "bg-fuchsia-500"
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="mb-2">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Tarifas Urbanas (Mínimas)</h3>
                        <p className="text-zinc-400 text-sm">Configura los importes para las tarifas 1, 2 y 3.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tarifa 1 (Día Lab)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={tarifa1}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setTarifa1(parseFloat(e.target.value) || 0);
                                }}
                                className="w-full p-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tarifa 2 (Noche L-J/Finde)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={tarifa2}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setTarifa2(parseFloat(e.target.value) || 0);
                                }}
                                className="w-full p-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tarifa 3 (Noche Vi-Sa)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={tarifa3}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setTarifa3(parseFloat(e.target.value) || 0);
                                }}
                                className="w-full p-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="mb-2">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Tarifas Aeropuerto</h3>
                        <p className="text-zinc-400 text-sm">Configura los importes fijos para T4 y T5.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tarifa 4 (Día)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={tarifaAeropuertoDia}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setTarifaAeropuertoDia(parseFloat(e.target.value) || 0);
                                }}
                                className="w-full p-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Tarifa 5 (Noche/Finde)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={tarifaAeropuertoNoche}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setTarifaAeropuertoNoche(parseFloat(e.target.value) || 0);
                                }}
                                className="w-full p-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-zinc-100 font-bold text-base mb-0.5">Modo alto contraste</h3>
                            <p className="text-zinc-400 text-sm">
                                Mejora la legibilidad con colores más contrastados
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={altoContraste}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setAltoContraste(e.target.checked);
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                        </label>
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="mb-2">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Tamano de Fuente</h3>
                        <p className="text-zinc-400 text-sm mb-1.5">
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
                            setHasUserChanged(true);
                            setTamanoFuente(size);
                        }}
                        onPointerUp={(e) => {
                            setFontSize(Number((e.target as HTMLInputElement).value));
                        }}
                        className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-400 mt-1">
                        <span>12px</span>
                        <span>16px</span>
                        <span>20px</span>
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="mb-2">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Objetivo Diario</h3>
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

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="mb-2">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Datos Fiscales y Marca</h3>
                        <p className="text-zinc-400 text-sm">Configura tus datos para los informes y facturas.</p>
                    </div>
                    <div className="space-y-3">
                        <FormField label="URL del Logo">
                            <input
                                type="text"
                                value={logo}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setLogo(e.target.value);
                                }}
                                placeholder="https://ejemplo.com/logo.png"
                                className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </FormField>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField label="Nombre / Razón Social">
                                <input
                                    type="text"
                                    value={fiscalData.nombre}
                                    onChange={(e) => {
                                        setHasUserChanged(true);
                                        setFiscalData({ ...fiscalData, nombre: e.target.value });
                                    }}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </FormField>
                            <FormField label="NIF / CIF">
                                <input
                                    type="text"
                                    value={fiscalData.nif}
                                    onChange={(e) => {
                                        setHasUserChanged(true);
                                        setFiscalData({ ...fiscalData, nif: e.target.value });
                                    }}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </FormField>
                        </div>
                        <FormField label="Dirección Fiscal">
                            <input
                                type="text"
                                value={fiscalData.direccion}
                                onChange={(e) => {
                                    setHasUserChanged(true);
                                    setFiscalData({ ...fiscalData, direccion: e.target.value });
                                }}
                                className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </FormField>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField label="Teléfono">
                                <input
                                    type="tel"
                                    value={fiscalData.telefono}
                                    onChange={(e) => {
                                        setHasUserChanged(true);
                                        setFiscalData({ ...fiscalData, telefono: e.target.value });
                                    }}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </FormField>
                            <FormField label="Email">
                                <input
                                    type="email"
                                    value={fiscalData.email}
                                    onChange={(e) => {
                                        setHasUserChanged(true);
                                        setFiscalData({ ...fiscalData, email: e.target.value });
                                    }}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </FormField>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center pb-2 space-y-1.5">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <button
                        onClick={handleGuardar}
                        disabled={guardando}
                        className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg transition-colors flex items-center gap-2 ${guardado ? "bg-green-600 hover:bg-green-700" : ""
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

                {/* Sección: Backup Local (Sin Google) */}
                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <h3 className="text-zinc-100 font-bold text-base mb-1">Backup Local</h3>
                    <p className="text-zinc-400 text-sm mb-3">Descarga o restaura tus datos en formato JSON desde este dispositivo.</p>

                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={handleDownloadBackupJSON}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center gap-2 text-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Descargar JSON
                        </button>

                        <label className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center gap-2 cursor-pointer text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Restaurar JSON
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleRestoreFromJSONFile}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Sección: Google Cloud (Importar/Exportar) */}
                <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-zinc-100 font-bold text-base mb-0.5">Google Cloud</h3>
                            <p className="text-zinc-400 text-sm">Respalda tus datos en Google Sheets y Drive.</p>
                        </div>
                        {isLoggedIn ? (
                            <button
                                onClick={handleGoogleLogout}
                                className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors"
                            >
                                Desconectar
                            </button>
                        ) : (
                            <button
                                onClick={handleGoogleLogin}
                                className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-xs font-bold transition-colors"
                            >
                                Conectar
                            </button>
                        )}
                    </div>

                    {isLoggedIn && (
                        <>
                            <div className="space-y-2 pt-2 border-t border-zinc-700">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                                    Carpeta de Destino en Google Drive
                                </label>
                                <select
                                    value={selectedFolderId || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedFolderId(val);
                                        localStorage.setItem('tappxi_drive_export_folder', val);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="">📁 Carpeta por defecto (TAppXI)</option>
                                    {driveFolders.map(f => (
                                        <option key={f.id} value={f.id}>📁 {f.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-zinc-500 italic">
                                    Las exportaciones y copias automáticas se guardarán aquí.
                                </p>
                            </div>

                            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <div className="flex items-center gap-2 text-orange-500 mb-1">
                                    <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                                    <span className="text-xs font-bold uppercase tracking-wider">Último Backup Automático</span>
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                    {lastBackupStatus || 'No hay registros de copias recientes.'}
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                                    * La app intenta guardar una copia en la nube cada vez que se cierra o se oculta (si hay conexión y sesión activa).
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleListBackups}
                                    disabled={restoring || exporting}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                >
                                    <i className="fa-solid fa-cloud-arrow-down shadow-sm"></i>
                                    <span>Importar</span>
                                </button>

                                <button
                                    onClick={handleExportToSheets}
                                    disabled={restoring || exporting}
                                    className={`flex-1 font-bold py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                                        exporting ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    }`}
                                >
                                    {exporting ? (
                                        <><i className="fa-solid fa-spinner fa-spin"></i> Exportando...</>
                                    ) : (
                                        <><i className="fa-solid fa-file-excel"></i> Exportar</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={handleSyncFromFirestore}
                            disabled={restoring || exporting}
                            className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                            <i className="fa-solid fa-rotate"></i>
                            Sincronizar desde Firestore
                        </button>
                    </div>
                </div>


                {/* Modal de Selección de Backup */}
                {
                    showRestoreModal && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                            <div className="bg-zinc-800 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col border border-zinc-700 shadow-2xl">
                                <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white">Seleccionar Copia de Seguridad</h3>
                                    <button
                                        onClick={() => setShowRestoreModal(false)}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4">
                                    {loadingBackups ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                                            <svg className="animate-spin h-8 w-8 mb-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <p>Buscando backups en Drive...</p>
                                        </div>
                                    ) : backupsList.length === 0 ? (
                                        <div className="text-center py-8 text-zinc-400">
                                            <p>No se encontraron copias de seguridad recientes.</p>
                                            <p className="text-xs mt-2 opacity-70">Asegúrate de haber subido backups previamente.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {backupsList.map((file) => (
                                                <button
                                                    key={file.id}
                                                    onClick={() => handleRestoreBackup(file.id, file.name, file.mimeType)}
                                                    disabled={restoring}
                                                    className="w-full text-left p-3 rounded-lg bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 transition-colors group"
                                                >
                                                    <div className="font-medium text-zinc-200 group-hover:text-white truncate flex items-center gap-2">
                                                        <span>{file.mimeType === 'application/vnd.google-apps.spreadsheet' ? '📊' : '📄'}</span>
                                                        <span>{file.name}</span>
                                                    </div>
                                                    <div className="text-xs text-zinc-400 mt-1">
                                                        {new Date(file.createdTime).toLocaleString()}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-zinc-700 bg-zinc-800/50 rounded-b-xl">
                                    <button
                                        onClick={() => setShowRestoreModal(false)}
                                        className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Modal de Carga para Google Drive */}
                {
                    uploadingToDrive && (
                        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
                            <div className="bg-zinc-800 rounded-xl w-full max-w-sm p-6 border border-zinc-700 shadow-2xl flex flex-col items-center text-center">
                                <div className="w-16 h-16 mb-4 relative flex items-center justify-center">
                                    <svg className="animate-spin w-full h-full text-blue-500 absolute" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Subiendo a Google Drive</h3>
                                <p className="text-zinc-400 text-sm mb-4">Preparando y subiendo tu copia de seguridad...</p>
                                <p className="text-xs text-zinc-500 mt-2">Por favor, no cierres la aplicación.</p>
                            </div>
                        </div>
                    )
                }

                {/* Modal de Carga para Google Sheets */}
                {
                    exportingToSheets && (
                        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
                            <div className="bg-zinc-800 rounded-xl w-full max-w-sm p-6 border border-zinc-700 shadow-2xl flex flex-col items-center text-center">
                                <div className="w-16 h-16 mb-4 relative flex items-center justify-center">
                                    <svg className="animate-spin w-full h-full text-green-500 absolute" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Exportando a Google Sheets</h3>
                                <p className="text-zinc-400 text-sm mb-4">Creando hojas y exportando tus datos...</p>
                                <p className="text-xs text-zinc-500 mt-2">Por favor, no cierres la aplicación.</p>
                            </div>
                        </div>
                    )
                }

                {/* Modal de Carga para Cloud Sync */}
                {
                    syncingCloud && (
                        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
                            <div className="bg-zinc-800 rounded-xl w-full max-w-sm p-6 border border-zinc-700 shadow-2xl flex flex-col items-center text-center">
                                <div className="w-16 h-16 mb-4 relative flex items-center justify-center">
                                    <svg className="animate-spin w-full h-full text-blue-500 absolute" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Sincronizando con la Nube</h3>
                                <p className="text-zinc-400 text-sm mb-4">Subiendo todos los datos a TAppXI_DB...</p>
                                <p className="text-xs text-zinc-500 mt-2">Por favor, no cierres la aplicación.</p>
                            </div>
                        </div>
                    )
                }

                {/* Modal de Progreso de Restauración */}
                {
                    restoring && (
                        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
                            <div className="bg-zinc-800 rounded-xl w-full max-w-sm p-6 border border-zinc-700 shadow-2xl flex flex-col items-center text-center">
                                <div className="w-16 h-16 mb-4 relative flex items-center justify-center">
                                    <svg className="animate-spin w-full h-full text-blue-500 absolute" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-xs font-bold text-white relative z-10">{restoreProgress}%</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Restaurando Datos</h3>
                                <p className="text-zinc-400 text-sm mb-4">{restoreMessage}</p>

                                <div className="w-full bg-zinc-700 rounded-full h-2.5 mb-1 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${restoreProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">Por favor, no cierres la aplicación.</p>
                            </div>
                        </div>
                    )
                }

                {/* Custom Alert Modal */}
                {
                    alertMessage && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
                            <div className="bg-zinc-800 rounded-xl w-full max-w-sm p-6 border border-zinc-700 shadow-2xl flex flex-col items-center text-center scale-100 animate-in zoom-in-95 duration-200">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 text-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Aviso</h3>
                                <p className="text-zinc-300 text-sm mb-6 whitespace-pre-wrap">{alertMessage}</p>
                                <button
                                    onClick={closeAlert}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Custom Confirm Modal */}
                {
                    confirmMessage && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
                            <div className="bg-zinc-800 rounded-xl w-full max-w-sm p-6 border border-zinc-700 shadow-2xl flex flex-col items-center text-center scale-100 animate-in zoom-in-95 duration-200">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 text-yellow-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Confirmación</h3>
                                <p className="text-zinc-300 text-sm mb-6 whitespace-pre-wrap">{confirmMessage}</p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={closeConfirm}
                                        className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Exportación Avanzada de Datos */}
                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <h3 className="text-zinc-100 font-bold text-base mb-3">Exportación Avanzada de Datos</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1">Fecha Desde</label>
                                <input
                                    type="date"
                                    value={exportFechaDesde}
                                    onChange={(e) => setExportFechaDesde(e.target.value)}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1">Fecha Hasta</label>
                                <input
                                    type="date"
                                    value={exportFechaHasta}
                                    onChange={(e) => setExportFechaHasta(e.target.value)}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1">Formato de Exportación</label>
                            <select
                                value={exportTipo}
                                onChange={(e) => setExportTipo(e.target.value as 'excel' | 'pdf' | 'csv')}
                                className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="excel">Excel (.xlsx)</option>
                                <option value="pdf">PDF Profesional</option>
                                <option value="csv">CSV (para contadores)</option>
                            </select>
                        </div>
                        <button
                            onClick={handleExportAvanzada}
                            disabled={exporting || !exportFechaDesde || !exportFechaHasta}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {exporting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Exportando...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span>Exportar Datos</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Exportación para Hacienda */}
                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <h3 className="text-zinc-100 font-bold text-base mb-2">📋 Exportación para Hacienda</h3>
                    <p className="text-zinc-400 text-xs mb-3">
                        Genera un Excel con formato específico para la declaración de impuestos. Incluye resumen mensual, ingresos y gastos deducibles.
                    </p>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1">Año Fiscal Desde</label>
                                <input
                                    type="date"
                                    value={haciendaFechaDesde}
                                    onChange={(e) => setHaciendaFechaDesde(e.target.value)}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="01/01/2024"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1">Año Fiscal Hasta</label>
                                <input
                                    type="date"
                                    value={haciendaFechaHasta}
                                    onChange={(e) => setHaciendaFechaHasta(e.target.value)}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="31/12/2024"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleExportHacienda}
                            disabled={exportingHacienda || !haciendaFechaDesde || !haciendaFechaHasta}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {exportingHacienda ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generando...
                                </>
                            ) : (
                                <>💰 Exportar para Hacienda</>
                            )}
                        </button>
                        <div className="text-zinc-500 text-xs space-y-1">
                            <p>• El archivo incluye 4 hojas: Resumen Fiscal, Ingresos, Gastos e Información</p>
                            <p>• Formato optimizado para autónomos en España</p>
                            <p>• Los ingresos de taxistas NO están sujetos a IVA</p>
                        </div>
                    </div>
                </div>

                {/* Reportes Personalizados */}
                <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-zinc-100 font-bold text-base">Reportes Personalizados</h3>
                        <button
                            onClick={() => setShowReportBuilder(!showReportBuilder)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg transition-colors text-sm"
                        >
                            {showReportBuilder ? 'Cancelar' : '+ Nuevo Reporte'}
                        </button>
                    </div>

                    {showReportBuilder && (
                        <div className="bg-zinc-900 rounded-lg p-3 mb-3 space-y-3 border border-zinc-600">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1">Nombre del Reporte *</label>
                                <input
                                    type="text"
                                    value={newReportNombre}
                                    onChange={(e) => setNewReportNombre(e.target.value)}
                                    placeholder="Ej: Informe Mensual Ingresos"
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1">Descripción (opcional)</label>
                                <input
                                    type="text"
                                    value={newReportDescripcion}
                                    onChange={(e) => setNewReportDescripcion(e.target.value)}
                                    placeholder="Descripción breve del reporte"
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1">Formato</label>
                                <select
                                    value={newReportTipo}
                                    onChange={(e) => setNewReportTipo(e.target.value as 'excel' | 'pdf' | 'csv')}
                                    className="w-full bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="excel">Excel</option>
                                    <option value="pdf">PDF</option>
                                    <option value="csv">CSV</option>
                                </select>
                            </div>
                            <button
                                onClick={handleGuardarReportePersonalizado}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Guardar Reporte
                            </button>
                        </div>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {customReports.length === 0 ? (
                            <p className="text-zinc-400 text-sm text-center py-4">No hay reportes personalizados guardados</p>
                        ) : (
                            customReports.map((reporte) => (
                                <div key={reporte.id} className="bg-zinc-900 rounded-lg p-2.5 border border-zinc-600">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="text-zinc-100 font-semibold text-sm">{reporte.nombre}</h4>
                                            {reporte.descripcion && (
                                                <p className="text-zinc-400 text-xs mt-0.5">{reporte.descripcion}</p>
                                            )}
                                            <div className="flex gap-2 mt-1.5">
                                                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                                                    {reporte.tipoExportacion.toUpperCase()}
                                                </span>
                                                {reporte.lastUsed && (
                                                    <span className="text-xs text-zinc-500">
                                                        Usado: {reporte.lastUsed.toLocaleDateString('es-ES')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleUsarReporte(reporte)}
                                                disabled={exporting}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs transition-colors disabled:opacity-50"
                                                title="Usar este reporte"
                                            >
                                                Usar
                                            </button>
                                            <button
                                                onClick={() => handleEliminarReporte(reporte.id)}
                                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs transition-colors"
                                                title="Eliminar reporte"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>


                <div className="bg-zinc-800 rounded-lg p-2.5 border border-orange-500/50 mb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-orange-400 font-bold text-base mb-0.5">Mantenimiento de Datos</h3>
                            <p className="text-zinc-400 text-sm">Eliminar registros duplicados de gastos y carreras</p>
                        </div>
                        <button
                            onClick={handleCleanDuplicates}
                            disabled={isCleaning}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isCleaning ? 'Limpiando...' : 'Limpiar Duplicados'}
                        </button>
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-2.5 border border-red-500/50">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-red-400 font-bold text-base mb-0.5">Eliminacion Total de Datos</h3>
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

                {/* Modal de progreso de eliminación */}
                {
                    isDeleting && (
                        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] px-4">
                            <div className="bg-zinc-800 rounded-lg p-6 max-w-md w-full border border-red-500 shadow-2xl">
                                <h3 className="text-xl font-bold text-red-400 mb-4 text-center">
                                    Eliminando Datos
                                </h3>

                                <div className="mb-4">
                                    <div className="bg-zinc-700 rounded-full h-4 overflow-hidden">
                                        <div
                                            className="bg-red-500 h-full transition-all duration-300"
                                            style={{ width: `${deletionProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-center text-zinc-300 mt-2 text-sm">
                                        {deletionProgress}%
                                    </p>
                                </div>

                                <p className="text-zinc-300 text-center text-sm">
                                    {deletionMessage}
                                </p>

                                <div className="mt-4 text-zinc-500 text-xs text-center">
                                    Por favor, no cierres esta ventana...
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Admin / License Generator */}
                {adminMode && (
                    <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-4 mt-8">
                        <h3 className="text-purple-400 font-bold text-lg mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Generador de Licencias
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs uppercase text-purple-300/70 mb-1">ID del Terminal Bloqueado</label>
                                <input
                                    type="text"
                                    value={targetDeviceId}
                                    onChange={(e) => setTargetDeviceId(e.target.value.toUpperCase())}
                                    placeholder="XXXX-XXXX"
                                    className="w-full bg-zinc-900/50 border border-purple-500/30 rounded p-2 text-purple-200 font-mono text-center tracking-widest placeholder:text-purple-500/20"
                                />
                            </div>
                            <button
                                onClick={handleGenerateLicense}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded transition-colors"
                            >
                                Generar Código
                            </button>

                            {generatedCode && (
                                <div className="bg-black/50 p-3 rounded border border-purple-500/30 text-center mt-2">
                                    <p className="text-xs text-purple-400 mb-1">CÓDIGO DE DESBLOQUEO</p>
                                    <p className="text-3xl font-mono font-bold text-white tracking-[0.5em]">{generatedCode}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <p
                    onClick={handleAdminTrigger}
                    className="mt-8 text-zinc-600 text-xs text-center select-none cursor-pointer active:text-zinc-500"
                >
                    TAppXI v1.0 • Acceso Restringido
                </p>
            </div>
        </div>
    );
};

export default AjustesScreen;
