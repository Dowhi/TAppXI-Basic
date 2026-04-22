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

// Settings Components
import AppearanceSection from "../components/settings/AppearanceSection";
import TaxiRatesSection from "../components/settings/TaxiRatesSection";
import BrandingSection from "../components/settings/BrandingSection";
import BackupSection from "../components/settings/BackupSection";
import ReportingSection from "../components/settings/ReportingSection";
import DataActionsSection from "../components/settings/DataActionsSection";
import DeveloperSection from "../components/settings/DeveloperSection";


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
    const [exporting, setExporting] = useState<boolean>(false);

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

    const handleDownloadBackupJSON = async () => {
        try {
            await downloadBackupJson();
            showAlert("✅ Backup JSON descargado correctamente.");
        } catch (error: any) {
            console.error("Error descargando backup JSON:", error);
            showAlert(`❌ Error al descargar backup: ${error.message || error}`);
        }
    };

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
                            window.location.reload();
                        }, 1500);
                    } catch (err: any) {
                        console.error("Error restaurando backup:", err);
                        showAlert(`❌ Error al restaurar: ${err.message || err}`);
                    } finally {
                        setRestoring(false);
                        event.target.value = '';
                    }
                }
            );
        } catch (error: any) {
            console.error("Error leyendo archivo:", error);
            showAlert(`❌ Error al leer el archivo: ${error.message || error}`);
            event.target.value = '';
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

                    localStorage.setItem("temaOscuro", (ajustes.temaOscuro ?? false).toString());
                    localStorage.setItem("tamanoFuente", fetchedTamano.toString());
                    localStorage.setItem("objetivoDiario", (ajustes.objetivoDiario ?? 100).toString());
                    localStorage.setItem("temaColor", storedThemeName);
                    localStorage.setItem("altoContraste", String(storedHighContrast));

                    if (ajustes.tarifa1 !== undefined) setTarifa1(ajustes.tarifa1);
                    if (ajustes.tarifa2 !== undefined) setTarifa2(ajustes.tarifa2);
                    if (ajustes.tarifa3 !== undefined) setTarifa3(ajustes.tarifa3);
                    if (ajustes.tarifaAeropuertoDia !== undefined) setTarifaAeropuertoDia(ajustes.tarifaAeropuertoDia);
                    if (ajustes.tarifaAeropuertoNoche !== undefined) setTarifaAeropuertoNoche(ajustes.tarifaAeropuertoNoche);

                    if (ajustes.logo) setLogo(ajustes.logo);
                    if (ajustes.datosFiscales) setFiscalData(ajustes.datosFiscales);
                }
            } catch (err) {
                console.error("Error cargando ajustes:", err);
            }
        };

        cargarAjustes();
    }, [setFontSize, setTheme, setThemeName, highContrast, toggleHighContrast, hasUserChanged]);

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
                temaColor,
                altoContraste,
                tarifa1,
                tarifa2,
                tarifa3,
                tarifaAeropuertoDia,
                tarifaAeropuertoNoche,
                logo,
                datosFiscales: fiscalData,
            });

            setTheme(temaOscuro);
            setFontSize(tamanoFuente);
            setThemeName(temaColor);
            if (altoContraste !== highContrast) toggleHighContrast();

            localStorage.setItem("temaOscuro", temaOscuro.toString());
            localStorage.setItem("tamanoFuente", tamanoFuente.toString());
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
            showAlert("✅ Ajustes guardados correctamente.");
        } catch (err) {
            console.error("Error guardando ajustes:", err);
            setError("Error al guardar los ajustes.");
            showAlert("❌ Error al guardar ajustes.");
        } finally {
            setGuardando(false);
        }
    };

    const handleArchiveOldData = async () => {
        showConfirm(
            `Se archivarán y eliminarán datos anteriores a aproximadamente ${archiveMonths} meses.\n\n` +
            "¿Continuar?",
            async () => {
                setArchiving(true);
                setArchiveResult(null);
                try {
                    const cutoff = getRelativeCutoffDate(archiveMonths);
                    const results = await archiveOperationalDataOlderThan(cutoff);
                    const resumen = results.map(r => `${r.collection}: ${r.moved} movidos`).join(" · ");
                    setArchiveResult(resumen || "No se encontraron datos antiguos.");
                    showAlert(`✅ Archivador completado: ${resumen}`);
                } catch (e) {
                    console.error("Error archivando:", e);
                    setArchiveResult("Error al archivar.");
                } finally {
                    setArchiving(false);
                }
            }
        );
    };

    const handleSubirDrive = async () => {
        if (!isLoggedIn) {
            showAlert("⚠️ Conecta con Google primero.");
            return;
        }
        setUploadingToDrive(true);
        try {
            await downloadBackupJson();
            showAlert("✅ Backup subido a Drive correctamente.");
        } catch (e) {
            console.error(e);
            showAlert("❌ Error al subir a Drive.");
        } finally {
            setUploadingToDrive(false);
        }
    };

    const handleExportarHojas = async () => {
        if (!isLoggedIn) {
            showAlert("⚠️ Conecta con Google primero.");
            return;
        }
        setExportingToSheets(true);
        try {
            await exportToGoogleSheets(selectedFolderId || undefined);
            showAlert("✅ Exportación a Google Sheets completada.");
        } catch (e) {
            console.error(e);
            showAlert("❌ Error al exportar a Sheets.");
        } finally {
            setExportingToSheets(false);
        }
    };

    const handleSyncFromFirestore = async () => {
        showConfirm(
            "¿Descargar todos los datos desde la nube?",
            async () => {
                setSyncingCloud(true);
                try {
                    await syncFromFirestore((p, m) => {
                        setRestoreProgress(p);
                    });
                    showAlert("✅ Sincronización finalizada.");
                    window.location.reload();
                } catch (e) {
                    console.error(e);
                    showAlert("❌ Error sincronizando.");
                } finally {
                    setSyncingCloud(false);
                }
            }
        );
    };

    const handleExportHacienda = async () => {
        if (!haciendaFechaDesde || !haciendaFechaHasta) {
            showAlert("Selecciona fechas.");
            return;
        }
        setExportingHacienda(true);
        try {
            const [carreras, gastos, turnos] = await Promise.all([getCarreras(), getGastos(), getRecentTurnos(5000)]);
            const filtros = { fechaDesde: new Date(haciendaFechaDesde), fechaHasta: new Date(haciendaFechaHasta) };
            await exportToHacienda({ carreras, gastos, turnos }, filtros);
            showAlert("✅ Exportación fiscal generada.");
        } catch (e) {
            console.error(e);
            showAlert("❌ Error en exportación fiscal.");
        } finally {
            setExportingHacienda(false);
        }
    };

    const handleGuardarReportePersonalizado = async () => {
        if (!newReportNombre) { showAlert("Nombre obligatorio."); return; }
        try {
            const report: CustomReport = {
                id: Date.now().toString(),
                nombre: newReportNombre,
                descripcion: newReportDescripcion,
                filtros: {},
                tipoExportacion: newReportTipo,
                fechaCreacion: new Date()
            };
            await saveCustomReport(report);
            setCustomReports([...customReports, report]);
            setShowReportBuilder(false);
            setNewReportNombre('');
            setNewReportDescripcion('');
            showAlert("✅ Reporte guardado.");
        } catch (err) {
            showAlert("❌ Error al guardar reporte.");
        }
    };

    const handleEliminarReporte = async (id: string) => {
        try {
            await deleteCustomReport(id);
            setCustomReports(customReports.filter(r => r.id !== id));
        } catch (err) {
            showAlert("❌ Error al eliminar.");
        }
    };

    const handleUsarReporte = async (reporte: CustomReport) => {
        setExporting(true);
        try {
            const [carreras, gastos, turnos] = await Promise.all([getCarreras(), getGastos(), getRecentTurnos(5000)]);
            const data = { carreras, gastos, turnos };
            if (reporte.tipoExportacion === 'excel') exportToExcel(data, reporte.filtros);
            else if (reporte.tipoExportacion === 'csv') exportToCSV(data, reporte.filtros);
            else await exportToPDFAdvanced(data, reporte.filtros);
            
            await markReportAsUsed(reporte.id);
            showAlert(`✅ Exportación "${reporte.nombre}" completada.`);
        } catch (err) {
            showAlert("❌ Error al exportar.");
        } finally {
            setExporting(false);
        }
    };

    const handleAdminTrigger = () => {
        setAdminTriggerCount(prev => {
            const next = prev + 1;
            if (next >= 5) { setAdminMode(true); return 0; }
            return next;
        });
    };

    const handleGenerateLicense = () => {
        if (!targetDeviceId) return;
        const code = ActivationService.generateValidCode(targetDeviceId);
        setGeneratedCode(code);
    };

    const handleListBackups = async () => {
        if (!isLoggedIn) { showAlert("Conecta Google."); return; }
        setLoadingBackups(true);
        setShowRestoreModal(true);
        try {
            const files = await listFiles("(name contains 'tappxi') and trashed = false");
            setBackupsList(files);
        } catch (e) {
            showAlert("Error listando backups.");
        } finally {
            setLoadingBackups(false);
        }
    };

    const handleRestoreBackup = async (fileId: string, fileName: string, mimeType: string) => {
        showConfirm(`Restaurar "${fileName}"?`, async () => {
            setRestoring(true);
            try {
                let stats;
                if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                    stats = await restoreFromGoogleSheets(fileId, (p) => setRestoreProgress(p));
                } else {
                    const content = await getFileContent(fileId);
                    stats = await restoreBackup(content, (p) => setRestoreProgress(p));
                }
                showAlert("✅ Restaurado. Reiniciando...");
                setTimeout(() => window.location.reload(), 2000);
            } catch (e) {
                showAlert("Error restaurando.");
            } finally {
                setRestoring(false);
            }
        });
    };

    const handleLogout = () => {
        showConfirm("¿Cerrar sesión?", () => {
            localStorage.removeItem('tappxi_setup_complete');
            window.location.reload();
        });
    };

    const handleEliminacionTotal = () => {
        showConfirm("⚠️ ELIMINAR TODO?", () => {
            showConfirm("CONFIRMACIÓN FINAL: Borrar todo?", async () => {
                setIsDeleting(true);
                try {
                    await deleteAllData((p) => {
                        setDeletionProgress(p.percentage);
                        setDeletionMessage(p.message);
                    });
                    localStorage.clear();
                    showAlert("✅ Eliminado.");
                    window.location.reload();
                } catch (e) {
                    showAlert("Error al borrar.");
                } finally {
                    setIsDeleting(false);
                }
            });
        });
    };

    return (
        <div className={`min-h-screen pb-20 ${isDark ? 'bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
            <ScreenTopBar
                titulo="Ajustes PRO"
                onBack={() => navigateTo(Seccion.Home)}
                showSave={true}
                onSave={handleGuardar}
                saving={guardando}
            />

            <div className="max-w-md mx-auto p-4 space-y-6">
                
                <AppearanceSection 
                    temaOscuro={temaOscuro}
                    setTemaOscuro={setTemaOscuro}
                    temaColor={temaColor}
                    setTemaColor={setTemaColor}
                    altoContraste={altoContraste}
                    setAltoContraste={setAltoContraste}
                    tamanoFuente={tamanoFuente}
                    setTamanoFuente={setTamanoFuente}
                    objetivoDiario={objetivoDiario}
                    setObjetivoDiario={setObjetivoDiario}
                    setHasUserChanged={setHasUserChanged}
                />

                <TaxiRatesSection 
                    tarifa1={tarifa1} setTarifa1={setTarifa1}
                    tarifa2={tarifa2} setTarifa2={setTarifa2}
                    tarifa3={tarifa3} setTarifa3={setTarifa3}
                    tarifaAeropuertoDia={tarifaAeropuertoDia} setTarifaAeropuertoDia={setTarifaAeropuertoDia}
                    tarifaAeropuertoNoche={tarifaAeropuertoNoche} setTarifaAeropuertoNoche={setTarifaAeropuertoNoche}
                    setHasUserChanged={setHasUserChanged}
                />

                <BrandingSection 
                    logo={logo} setLogo={setLogo}
                    fiscalData={fiscalData} setFiscalData={setFiscalData}
                    setHasUserChanged={setHasUserChanged}
                />

                <BackupSection 
                    isLoggedIn={isLoggedIn}
                    lastBackupStatus={lastBackupStatus}
                    uploadingToDrive={uploadingToDrive}
                    exportingToSheets={exportingToSheets}
                    syncingCloud={syncingCloud || restoring}
                    onGoogleLogin={handleGoogleLogin}
                    onGoogleLogout={handleGoogleLogout}
                    onDownloadBackupJSON={handleDownloadBackupJSON}
                    onRestoreFromJSONFile={handleRestoreFromJSONFile}
                    onUploadToDrive={handleSubirDrive}
                    onExportToSheets={handleExportarHojas}
                    onSyncFromFirestore={handleSyncFromFirestore}
                    onRestoreFromDrive={handleListBackups}
                />

                <ReportingSection 
                    haciendaFechaDesde={haciendaFechaDesde}
                    haciendaFechaHasta={haciendaFechaHasta}
                    exportingHacienda={exportingHacienda}
                    showReportBuilder={showReportBuilder}
                    newReportNombre={newReportNombre}
                    newReportDescripcion={newReportDescripcion}
                    newReportTipo={newReportTipo}
                    customReports={customReports}
                    exporting={exporting}
                    setHaciendaFechaDesde={setHaciendaFechaDesde}
                    setHaciendaFechaHasta={setHaciendaFechaHasta}
                    setShowReportBuilder={setShowReportBuilder}
                    setNewReportNombre={setNewReportNombre}
                    setNewReportDescripcion={setNewReportDescripcion}
                    setNewReportTipo={setNewReportTipo}
                    onExportHacienda={handleExportHacienda}
                    onGuardarReporte={handleGuardarReportePersonalizado}
                    onUsarReporte={handleUsarReporte}
                    onEliminarReporte={handleEliminarReporte}
                />

                <DataActionsSection 
                    isCleaning={isCleaning}
                    isDeleting={isDeleting}
                    onCleanDuplicates={handleCleanDuplicates}
                    onDeleteAllData={handleEliminacionTotal}
                    archiving={archiving}
                    archiveMonths={archiveMonths}
                    archiveResult={archiveResult}
                    onArchiveData={handleArchiveOldData}
                    setArchiveMonths={setArchiveMonths}
                />

                <DeveloperSection 
                    adminMode={adminMode}
                    targetDeviceId={targetDeviceId}
                    generatedCode={generatedCode || ''}
                    onSetTargetDeviceId={setTargetDeviceId}
                    onGenerateLicense={handleGenerateLicense}
                    onAdminTrigger={handleAdminTrigger}
                />

                <div className="flex flex-col items-center pb-8 border-t border-zinc-800 pt-6">
                    <button
                        onClick={handleLogout}
                        className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'} transition-colors`}
                    >
                        Cerrar Sesión
                    </button>
                    <p className="text-[10px] text-zinc-600 mt-4 font-mono tracking-tighter opacity-50">TAppXI PRO ARCHITECTURE • V2.0.0</p>
                </div>

            </div>

            {/* Modales Compartidos */}
            {alertMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAlert} />
                    <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-6 rounded-2xl shadow-2xl relative z-10 max-w-sm w-full animate-in zoom-in-95 duration-200`}>
                        <p className="text-center font-medium leading-relaxed whitespace-pre-line">{alertMessage}</p>
                        <button onClick={closeAlert} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all">Entendido</button>
                    </div>
                </div>
            )}

            {confirmMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeConfirm} />
                    <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-6 rounded-2xl shadow-2xl relative z-10 max-w-sm w-full animate-in zoom-in-95 duration-200`}>
                        <h3 className="text-xl font-bold mb-2">Confirmar acción</h3>
                        <p className="text-sm opacity-70 leading-relaxed whitespace-pre-line">{confirmMessage}</p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeConfirm} className={`flex-1 py-3 rounded-xl font-bold transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}>Cancelar</button>
                            <button onClick={handleConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleting && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] px-4">
                    <div className="bg-zinc-900 rounded-3xl p-8 max-w-sm w-full border border-red-500/50 shadow-2xl text-center space-y-6">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-10 h-10 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Eliminando Datos</h3>
                            <p className="text-zinc-400 text-sm mt-2">{deletionMessage}</p>
                        </div>
                        <div className="space-y-2">
                            <div className="bg-zinc-800 rounded-full h-3 overflow-hidden">
                                <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${deletionProgress}%` }} />
                            </div>
                            <p className="text-red-500 font-mono font-bold">{deletionProgress}%</p>
                        </div>
                    </div>
                </div>
            )}

            {showRestoreModal && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRestoreModal(false)} />
                    <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-6 rounded-3xl shadow-2xl relative z-10 max-w-md w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200`}>
                        <div className="mb-6">
                            <h3 className="text-xl font-bold">Restaurar Copia de Seguridad</h3>
                            <p className="text-xs text-zinc-500">Selecciona un archivo de Google Drive para restaurar.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {loadingBackups ? (
                                <div className="flex flex-col items-center py-10 space-y-3">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-50">Buscando copias...</p>
                                </div>
                            ) : backupsList.length === 0 ? (
                                <div className="text-center py-10 opacity-50 italic text-sm">No se encontraron copias en Drive.</div>
                            ) : (
                                backupsList.map(file => (
                                    <button
                                        key={file.id}
                                        onClick={() => handleRestoreBackup(file.id, file.name, file.mimeType)}
                                        className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${isDark ? 'bg-zinc-800/50 border-zinc-700 hover:border-blue-500/50' : 'bg-zinc-50 border-zinc-100 hover:border-blue-600/30'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${file.mimeType.includes('spreadsheet') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-600/10 text-blue-600'}`}>
                                            {file.mimeType.includes('spreadsheet') ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-bold text-sm truncate">{file.name}</p>
                                            <p className="text-[10px] opacity-50">{file.mimeType.includes('spreadsheet') ? 'Google Sheets' : 'Copia TAppXI'}</p>
                                        </div>
                                        <svg className="w-4 h-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setShowRestoreModal(false)}
                            className={`w-full mt-6 py-4 rounded-2xl font-bold transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AjustesScreen;
