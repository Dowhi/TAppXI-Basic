import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useFontSize } from "../contexts/FontSizeContext";
import ScreenTopBar from "../components/ScreenTopBar";
import { Seccion } from "../types";
import { saveAjustes, getAjustes, deleteAllData, DeleteProgress } from "../services/api";
import { downloadBackupJson, uploadBackupToGoogleDrive, exportToGoogleSheets, restoreBackup, restoreFromGoogleSheets } from "../services/backup";
import { listFiles, getFileContent } from "../services/google";
import { archiveOperationalDataOlderThan, getRelativeCutoffDate } from "../services/maintenance";
import { exportToExcel, exportToCSV, exportToPDFAdvanced, exportToHacienda, ExportFilter } from "../services/exports";
import { getCarreras, getGastos, getRecentTurnos } from "../services/api";
import { saveCustomReport, getCustomReports, deleteCustomReport, markReportAsUsed, CustomReport } from "../services/customReports";

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

    // Exportación avanzada
    const [exportFechaDesde, setExportFechaDesde] = useState<string>('');
    const [exportFechaHasta, setExportFechaHasta] = useState<string>('');
    const [exportTipo, setExportTipo] = useState<'excel' | 'pdf' | 'csv'>('excel');
    const [exporting, setExporting] = useState<boolean>(false);

    // Exportación para Hacienda
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

    // Deletion progress state
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deletionProgress, setDeletionProgress] = useState<number>(0);
    const [deletionMessage, setDeletionMessage] = useState<string>("");

    // Custom Modal State
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
    const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

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

    const handleBackupGoogleDrive = async () => {
        if (uploadingToDrive) return;

        setUploadingToDrive(true);
        try {
            await uploadBackupToGoogleDrive();
            showAlert("✅ Copia de seguridad subida a Google Drive correctamente.\n\nEl archivo está disponible en tu Google Drive.");
        } catch (e: any) {
            console.error("Error realizando backup:", e);
            const msg = e?.message || e?.error || String(e);
            let errorMessage = "❌ Error al subir a Google Drive.\n\n";

            if (typeof msg === 'string') {
                if (msg.includes('Configuración de Google faltante') || msg.includes('VITE_GOOGLE')) {
                    errorMessage += "❌ Faltan credenciales de Google.\n\n";
                    errorMessage += "Pasos para solucionarlo:\n";
                    errorMessage += "1. Crea un archivo .env en la raíz del proyecto\n";
                    errorMessage += "2. Añade estas líneas:\n";
                    errorMessage += "   VITE_GOOGLE_CLIENT_ID=tu_client_id\n";
                    errorMessage += "   VITE_GOOGLE_API_KEY=tu_api_key\n";
                    errorMessage += "3. Reinicia el servidor (npm run dev)\n\n";
                    errorMessage += "📖 Consulta el archivo SOLUCION_BACKUP_GOOGLE.md para instrucciones detalladas.";
                } else if (msg.includes('origin') || msg.includes('idpiframe_initialization_failed')) {
                    errorMessage += "❌ El origen no está permitido en Google Cloud Console.\n\n";
                    errorMessage += `Tu origen actual: ${window.location.origin}\n\n`;
                    errorMessage += "Pasos para solucionarlo:\n";
                    errorMessage += "1. Ve a: https://console.cloud.google.com/apis/credentials\n";
                    errorMessage += "2. Click en tu OAuth 2.0 Client ID\n";
                    errorMessage += "3. En 'Orígenes autorizados de JavaScript', añade:\n";
                    errorMessage += `   ${window.location.origin}\n`;
                    errorMessage += "4. Guarda y espera 5-15 minutos\n\n";
                    errorMessage += "📖 Consulta SOLUCION_BACKUP_GOOGLE.md para más ayuda.";
                } else if (msg.includes('popup_closed_by_user')) {
                    errorMessage += "❌ Inicio de sesión cancelado.\n\n";
                    errorMessage += "Por favor, completa el proceso de autorización cuando se abra la ventana de Google.";
                } else if (msg.includes('insufficientPermissions') || msg.includes('permission')) {
                    errorMessage += "❌ Error de permisos.\n\n";
                    errorMessage += "Asegúrate de haber autorizado el acceso a Google Drive cuando se te solicitó.";
                } else if (msg.includes('quota') || msg.includes('storage')) {
                    errorMessage += "❌ Sin espacio en Google Drive.\n\n";
                    errorMessage += "Libera espacio en tu cuenta de Google Drive e intenta de nuevo.";
                } else {
                    errorMessage += `Detalles del error:\n${msg}\n\n`;
                    errorMessage += "📖 Consulta SOLUCION_BACKUP_GOOGLE.md para más ayuda.";
                }
            } else {
                errorMessage += "Revisa la consola del navegador (F12) para más detalles.\n\n";
                errorMessage += "📖 Consulta SOLUCION_BACKUP_GOOGLE.md para más ayuda.";
            }

            showAlert(errorMessage);

            // Ofrecer descarga local como alternativa
            showConfirm("¿Quieres descargar el backup JSON localmente como alternativa?", async () => {
                try {
                    await downloadBackupJson();
                    showAlert("✅ Backup descargado localmente correctamente.");
                } catch (downloadError) {
                    console.error("Error descargando backup:", downloadError);
                    showAlert("❌ Error al descargar el backup localmente.");
                }
            });
        } finally {
            setUploadingToDrive(false);
        }
    };

    const handleExportGoogleSheets = async () => {
        if (exportingToSheets) return;

        setExportingToSheets(true);
        try {
            const { spreadsheetId, url } = await exportToGoogleSheets();
            showConfirm(
                `✅ Exportación a Google Sheets completada.\n\n` +
                `ID: ${spreadsheetId}\n\n` +
                `¿Quieres abrir la hoja de cálculo ahora?`,
                () => {
                    window.open(url, '_blank');
                }
            );
        } catch (e: any) {
            console.error("Error exportando a Google Sheets:", e);
            const msg = e?.message || e?.error || String(e);
            let errorMessage = "❌ Error al exportar a Google Sheets.\n\n";

            if (typeof msg === 'string') {
                if (msg.includes('Configuración de Google faltante') || msg.includes('VITE_GOOGLE')) {
                    errorMessage += "❌ Faltan credenciales de Google.\n\n";
                    errorMessage += "Pasos para solucionarlo:\n";
                    errorMessage += "1. Crea un archivo .env en la raíz del proyecto\n";
                    errorMessage += "2. Añade estas líneas:\n";
                    errorMessage += "   VITE_GOOGLE_CLIENT_ID=tu_client_id\n";
                    errorMessage += "   VITE_GOOGLE_API_KEY=tu_api_key\n";
                    errorMessage += "3. Reinicia el servidor (npm run dev)\n\n";
                    errorMessage += "📖 Consulta el archivo SOLUCION_BACKUP_GOOGLE.md para instrucciones detalladas.";
                } else if (msg.includes('origin') || msg.includes('idpiframe_initialization_failed')) {
                    errorMessage += "❌ El origen no está permitido en Google Cloud Console.\n\n";
                    errorMessage += `Tu origen actual: ${window.location.origin}\n\n`;
                    errorMessage += "Pasos para solucionarlo:\n";
                    errorMessage += "1. Ve a: https://console.cloud.google.com/apis/credentials\n";
                    errorMessage += "2. Click en tu OAuth 2.0 Client ID\n";
                    errorMessage += "3. En 'Orígenes autorizados de JavaScript', añade:\n";
                    errorMessage += `   ${window.location.origin}\n`;
                    errorMessage += "4. Guarda y espera 5-15 minutos\n\n";
                    errorMessage += "📖 Consulta SOLUCION_BACKUP_GOOGLE.md para más ayuda.";
                } else if (msg.includes('popup_closed_by_user')) {
                    errorMessage += "❌ Inicio de sesión cancelado.\n\n";
                    errorMessage += "Por favor, completa el proceso de autorización cuando se abra la ventana de Google.";
                } else if (msg.includes('insufficientPermissions') || msg.includes('permission')) {
                    errorMessage += "❌ Error de permisos.\n\n";
                    errorMessage += "Asegúrate de haber autorizado el acceso a Google Sheets cuando se te solicitó.";
                } else if (msg.includes('not found') || msg.includes('does not exist')) {
                    errorMessage += "❌ La hoja no se encontró.\n\n";
                    errorMessage += "Esto puede ser un error temporal. Intenta exportar de nuevo.";
                } else {
                    errorMessage += `Detalles del error:\n${msg}\n\n`;
                    errorMessage += "📖 Consulta SOLUCION_BACKUP_GOOGLE.md para más ayuda.";
                }
            } else {
                errorMessage += "Revisa la consola del navegador (F12) para más detalles.\n\n";
                errorMessage += "📖 Consulta SOLUCION_BACKUP_GOOGLE.md para más ayuda.";
            }

            showAlert(errorMessage);
        } finally {
            setExportingToSheets(false);
        }
    };

    const handleListBackups = async () => {
        setLoadingBackups(true);
        setShowRestoreModal(true);
        setBackupsList([]);
        try {
            const query = "(name contains 'tappxi' or name contains 'TAppXI') and trashed = false";
            console.log("Buscando backups con query:", query);

            const files = await listFiles(query);
            console.log("Archivos encontrados (raw):", files);

            const validFiles = files.filter(f =>
                f.mimeType === 'application/json' ||
                f.mimeType === 'application/vnd.google-apps.spreadsheet'
            );
            console.log("Archivos válidos tras filtrar:", validFiles);

            setBackupsList(validFiles);
        } catch (e) {
            console.error("Error listando backups:", e);
            showAlert("Error al buscar copias de seguridad en Google Drive. Revisa la consola.");
            setShowRestoreModal(false);
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

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 px-3 pt-3 pb-24 space-y-2">
            <ScreenTopBar title="Ajustes" navigateTo={navigateTo} backTarget={Seccion.Home} />

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
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Tarifa 3 (Especial/Noche Vi-Sa)</label>
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

            <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Copia de seguridad</h3>
                        <p className="text-zinc-400 text-sm">Sube el backup a Drive o exporta a Google Sheets</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleBackupGoogleDrive}
                            disabled={uploadingToDrive || exportingToSheets}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {uploadingToDrive ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Subiendo...</span>
                                </>
                            ) : (
                                <span>Subir a Drive</span>
                            )}
                        </button>
                        <button
                            onClick={handleExportGoogleSheets}
                            disabled={uploadingToDrive || exportingToSheets}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {exportingToSheets ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Exportando...</span>
                                </>
                            ) : (
                                <span>Google Sheets</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-2.5 border border-zinc-700">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-zinc-100 font-bold text-base mb-0.5">Restaurar Datos</h3>
                        <p className="text-zinc-400 text-sm">Recupera una copia de seguridad desde Drive</p>
                    </div>
                    <button
                        onClick={handleListBackups}
                        disabled={restoring}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {restoring ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Restaurando...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span>Restaurar desde Drive</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Modal de Selección de Backup */}
            {showRestoreModal && (
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
            {uploadingToDrive && (
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
            )}

            {/* Modal de Carga para Google Sheets */}
            {exportingToSheets && (
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
            )}

            {/* Modal de Progreso de Restauración */}
            {restoring && (
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
            )}

            {/* Custom Alert Modal */}
            {alertMessage && (
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
            )}

            {/* Custom Confirm Modal */}
            {confirmMessage && (
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
            )}

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
            {isDeleting && (
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
            )}
        </div >
    );
};

export default AjustesScreen;
