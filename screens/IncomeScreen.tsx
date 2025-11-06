import React, { useState, useEffect, useMemo } from 'react';
import { Seccion, CarrerasResumen, CarreraVista, Turno } from '../types';
import KineticHeader from '../components/KineticHeader';
import BackButton from '../components/BackButton';
import { subscribeToCarreras, subscribeToGastos, subscribeToActiveTurno, getAjustes } from '../services/api';

// Icons
const VisibilityIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>;
const VisibilityOffIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>;
const EuroIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H3v2h3.06c-.04.33-.06.66-.06 1s.02.67.06 1H3v2h3.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.78-1.77C18.09 17.91 16.61 18.5 15 18.5z"/></svg>;
const CreditCardIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>;
// Icono de Emisora/Antena - nuevo diseño más reconocible
const CellTowerIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 611.999 611.999" fill="currentColor" className={className}>
        <g>
            <g>
                <path d="M194.84,254.637l117.295-117.295L198.831,120.14c-12.402-1.883-23.076,8.792-21.193,21.193L194.84,254.637z"/>
                <path d="M388.511,516.293c-19.922,8.436-40.467,14.752-61.48,18.924l-61.826,55.115c-8.509,7.586-3.144,21.669,8.256,21.669
                    h236.204c10.278,0,18.611-8.333,18.611-18.611V401.134c-11.354,16.822-24.347,32.568-38.9,47.121
                    C460.228,477.402,426.293,500.294,388.511,516.293z"/>
                <path d="M483.292,33.806c-3.697-4.241-8.867-6.389-14.048-6.389c-4.749,0-9.508,1.803-13.155,5.45L346.411,142.546
                    L200.044,288.912L73.988,414.969c-7.626,7.627-7.191,20.116,0.939,27.203c50.854,44.334,117.347,71.185,190.111,71.185
                    c39.538,0,77.24-7.96,111.595-22.357c59.747-25.038,109.362-69.553,140.869-125.576c23.54-41.856,36.976-90.132,36.976-141.507
                    C554.477,151.153,527.626,84.66,483.292,33.806z"/>
                <path d="M194.98,87.453c13.356,0,25.913,5.201,35.358,14.645c5.451,5.45,14.289,5.45,19.74-0.001
                    c5.451-5.451,5.45-14.289-0.001-19.74c-14.718-14.716-34.285-22.821-55.097-22.821c-42.967,0-77.923,34.957-77.923,77.923
                    c0,20.815,8.106,40.384,22.824,55.101c2.725,2.725,6.297,4.088,9.869,4.088s7.145-1.363,9.87-4.089
                    c5.451-5.451,5.451-14.289-0.001-19.739c-9.446-9.445-14.647-22.003-14.647-35.361C144.973,109.886,167.406,87.453,194.98,87.453z
                    "/>
                <path d="M106.833,233.962c3.572,0,7.145-1.363,9.87-4.089c5.451-5.451,5.45-14.289-0.001-19.739
                    c-20.161-20.16-31.264-46.966-31.264-75.478C85.437,75.8,133.321,27.916,192.177,27.916c28.509,0,55.313,11.102,75.472,31.26
                    c5.451,5.451,14.289,5.45,19.739-0.001c5.451-5.451,5.451-14.289-0.001-19.739C261.956,14.005,228.143,0,192.177,0
                    c-35.969,0-69.783,14.007-95.216,39.439s-39.439,59.248-39.439,95.216c0,35.969,14.007,69.785,39.442,95.218
                    C99.689,232.599,103.261,233.962,106.833,233.962z"/>
            </g>
        </g>
    </svg>
);

// Icono de Aeropuerto/Avión - más reconocible y bonito
const FlightTakeoffIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
);
const AccessTimeIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>;
const AddIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;
const ExitToAppIcon: React.FC<{className?: string}> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>;

const ResumenBox: React.FC<{ title: string; value: string;}> = ({ title, value }) => (
    <div className="flex-1 text-center">
        <p className="text-xs text-zinc-400">{title}</p>
        <p className="font-semibold text-sm text-zinc-100">{value}</p>
    </div>
);

const ResumenBoxGrande: React.FC<{ title: string; value: string; valueNumeric: number;}> = ({ title, value, valueNumeric }) => {
    let displayTitle = title;
    let valueColor = "text-zinc-100";

    if (title.toLowerCase() === 'pendiente') {
        // Si totalCobrado > objetivoDiario (valueNumeric < 0): "Excede" en verde (se queda como está)
        // Si totalCobrado < objetivoDiario (valueNumeric > 0): "Faltan" en rojo (cambios)
        if (valueNumeric < 0) {
            displayTitle = 'Excede';
            valueColor = 'text-emerald-400';
        } else if (valueNumeric > 0) {
            displayTitle = 'Faltan';
            valueColor = 'text-red-400';
        } else {
            displayTitle = 'Pendiente';
            valueColor = 'text-zinc-100';
        }
    } else {
        valueColor = 'text-emerald-400';
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex-1 flex flex-col justify-center items-center text-center">
            <p className="text-base font-bold text-zinc-100">{displayTitle}</p>
            <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
    );
};

interface IncomeScreenProps {
    navigateTo: (page: Seccion) => void;
    navigateToEditRace: (id: string) => void;
}

const IncomeScreen: React.FC<IncomeScreenProps> = ({ navigateTo, navigateToEditRace }) => {
    const [hideValues, setHideValues] = useState(false);
    const [carreras, setCarreras] = useState<CarreraVista[]>([]);
    const [gastosTotal, setGastosTotal] = useState<number>(0);
    const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [objetivoDiario, setObjetivoDiario] = useState<number>(100);

    // Real-time subscription to carreras - carga desde la base de datos
    useEffect(() => {
        setLoading(true);
        setError(null);
        const unsubscribe = subscribeToCarreras((data) => {
            setCarreras(data);
            setLoading(false);
            setError(null);
        }, (error) => {
            console.error("Error loading carreras:", error);
            setError("Error al cargar las carreras desde la base de datos");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Real-time subscription to gastos - carga desde la base de datos
    useEffect(() => {
        const unsubscribe = subscribeToGastos((total) => {
            setGastosTotal(total);
        }, (error) => {
            console.error("Error loading gastos:", error);
            setGastosTotal(0);
        });
        return () => unsubscribe();
    }, []);

    // Real-time subscription to active turno - carga desde la base de datos
    useEffect(() => {
        const unsubscribe = subscribeToActiveTurno((turno) => {
            setTurnoActivo(turno);
        }, (error) => {
            console.error("Error loading turno:", error);
            setTurnoActivo(null);
        });
        return () => unsubscribe();
    }, []);

    // Cargar objetivoDiario desde Firestore
    useEffect(() => {
        const cargarObjetivoDiario = async () => {
            try {
                const ajustes = await getAjustes();
                if (ajustes && ajustes.objetivoDiario) {
                    setObjetivoDiario(ajustes.objetivoDiario);
                    // También actualizar localStorage como respaldo
                    localStorage.setItem('objetivoDiario', ajustes.objetivoDiario.toString());
                } else {
                    // Si no hay ajustes en Firestore, usar localStorage
                    const objetivoLocal = parseFloat(localStorage.getItem('objetivoDiario') || '100');
                    setObjetivoDiario(objetivoLocal);
                }
            } catch (error) {
                console.error('Error cargando objetivo diario:', error);
                // Fallback a localStorage
                const objetivoLocal = parseFloat(localStorage.getItem('objetivoDiario') || '100');
                setObjetivoDiario(objetivoLocal);
            }
        };
        cargarObjetivoDiario();
    }, []);

    // Force re-render every minute to update horaTrabajo when there's an active turno
    useEffect(() => {
        if (turnoActivo) {
            const interval = setInterval(() => {
                setCurrentTime(new Date());
            }, 60000); // Update every minute
            return () => clearInterval(interval);
        }
    }, [turnoActivo]);
    
    const resumen: CarrerasResumen = useMemo(() => {
        const total = carreras.reduce((sum, c) => sum + c.taximetro, 0);
        const totalCobrado = carreras.reduce((sum, c) => sum + c.cobrado, 0);
        const propinaTotal = carreras.reduce((sum, c) => sum + (c.cobrado - c.taximetro), 0);
        const tarjetaRaces = carreras.filter(c => c.formaPago === 'Tarjeta');
        
        // Calcular pendiente: objetivoDiario - totalCobrado
        const pendienteValor = objetivoDiario - totalCobrado;
        // Si totalCobrado > objetivoDiario (pendienteValor < 0): mostrar con signo + (se queda como está)
        // Si totalCobrado < objetivoDiario (pendienteValor > 0): mostrar valor absoluto (lo que falta)
        const pendiente = pendienteValor > 0 
            ? `${Math.abs(pendienteValor).toFixed(2)}€` 
            : `+${Math.abs(pendienteValor).toFixed(2)}€`;

        // Calcular horaInicio: del turno activo o de la primera carrera del día
        let horaInicio = "00:00";
        if (turnoActivo) {
            const fechaInicio = turnoActivo.fechaInicio;
            horaInicio = fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (carreras.length > 0) {
            // Si no hay turno activo, usar la primera carrera del día
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const carrerasHoy = carreras.filter(c => {
                const fechaCarrera = new Date(c.fechaHora);
                return fechaCarrera >= today;
            });
            if (carrerasHoy.length > 0) {
                const primeraCarrera = carrerasHoy[carrerasHoy.length - 1]; // La más antigua
                horaInicio = primeraCarrera.fechaHora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            }
        }

        // Calcular horaTrabajo: diferencia entre ahora y horaInicio, o entre primera y última carrera del día
        let horaTrabajo = "00:00";
        if (turnoActivo) {
            const fechaInicio = turnoActivo.fechaInicio;
            const ahora = currentTime; // Use currentTime state to force updates
            const diffMs = ahora.getTime() - fechaInicio.getTime();
            const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            horaTrabajo = `${String(diffHoras).padStart(2, '0')}:${String(diffMinutos).padStart(2, '0')}`;
        } else if (carreras.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const carrerasHoy = carreras.filter(c => {
                const fechaCarrera = new Date(c.fechaHora);
                return fechaCarrera >= today;
            });
            if (carrerasHoy.length > 0) {
                const primeraCarrera = carrerasHoy[carrerasHoy.length - 1]; // La más antigua
                const ultimaCarrera = carrerasHoy[0]; // La más reciente
                const diffMs = ultimaCarrera.fechaHora.getTime() - primeraCarrera.fechaHora.getTime();
                const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                horaTrabajo = `${String(diffHoras).padStart(2, '0')}:${String(diffMinutos).padStart(2, '0')}`;
            }
        }

        // Kms inicio: del turno activo
        let kmsInicio = "0";
        if (turnoActivo) {
            kmsInicio = turnoActivo.kilometrosInicio.toString();
        }
        
        return {
            total: `${totalCobrado.toFixed(2)}€`,
            carreras: carreras.length.toString(),
            tarjeta: tarjetaRaces.length.toString(),
            propina: `${propinaTotal.toFixed(2)}€`,
            totalTarjeta: `${tarjetaRaces.reduce((sum, c) => sum + c.cobrado, 0).toFixed(2)}€`,
            pendiente,
            pendienteValor,
            horaInicio,
            horaTrabajo,
            kmsInicio,
        };
    }, [carreras, gastosTotal, turnoActivo, currentTime, objetivoDiario]);


    const getPaymentIconComponent = (formaPago: CarreraVista['formaPago']): React.FC<{ className?: string }> => {
        if (hideValues) return EuroIcon;
        switch (formaPago) {
            case 'Tarjeta': return CreditCardIcon;
            case 'Efectivo': default: return EuroIcon;
        }
    };

    return (
        <div className="space-y-2 pb-24">
            <header className="flex justify-between items-center mb-2">
                <BackButton navigateTo={navigateTo} />
                <KineticHeader title="Carreras" />
                <button onClick={() => setHideValues(!hideValues)} className="p-2 text-zinc-300 hover:text-white transition-colors">
                    {hideValues ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </button>
            </header>

            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 space-y-2">
                <div className="flex space-x-2">
                    <ResumenBoxGrande title="Pendiente" value={hideValues ? '****' : resumen.pendiente} valueNumeric={resumen.pendienteValor} />
                    <ResumenBoxGrande title="TOTAL" value={hideValues ? '****' : resumen.total} valueNumeric={parseFloat(resumen.total)} />
                </div>
                <div className="flex space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                    <ResumenBox title="Carr." value={resumen.carreras} />
                    <ResumenBox title="Tarjeta" value={resumen.tarjeta} />
                    <ResumenBox title="H.Inic." value={resumen.horaInicio} />
                    <ResumenBox title="H.Trab" value={resumen.horaTrabajo} />
                </div>
                 <div className="flex space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                    <ResumenBox title="Kms. Ini" value={resumen.kmsInicio} />
                    {parseFloat(resumen.propina) > 0 && <ResumenBox title="Propina" value={hideValues ? '****' : resumen.propina} />}
                    <ResumenBox title="Tarjeta" value={hideValues ? '****' : resumen.totalTarjeta} />
                </div>
            </section>
            
            <section>
                <div className="border-b border-zinc-800 p-1.5 flex items-center text-zinc-400 font-semibold text-center text-xs">
                    <span className="flex-1">€</span>
                    <span className="flex-1 flex justify-center items-center"><EuroIcon className="w-4 h-4" /></span>
                    <span className="flex-1">Propinas</span>
                    <span className="flex-1 flex justify-center items-center" title="Emisora"><CellTowerIcon className="w-5 h-5 text-pink-400" /></span>
                    <span className="flex-1 flex justify-center items-center" title="Aeropuerto"><FlightTakeoffIcon className="w-5 h-5 text-blue-400" /></span>
                    <span className="flex-1 flex justify-center items-center"><AccessTimeIcon className="w-4 h-4" /></span>
                </div>
                {loading && <div className="text-center p-2 text-zinc-400 text-sm">Cargando carreras...</div>}
                {error && <div className="text-center p-2 text-red-400 text-sm">{error}</div>}
                {!loading && !error && (
                    <div className="space-y-1 max-h-96 overflow-y-auto pt-1">
                        {carreras.map(carrera => {
                            const PaymentIcon = getPaymentIconComponent(carrera.formaPago);
                            const propina = carrera.cobrado - carrera.taximetro;
                            return (
                                <div key={carrera.id} onClick={() => navigateToEditRace(carrera.id)} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center text-center cursor-pointer hover:bg-zinc-800 transition-colors">
                                    <span className="flex-1 font-bold text-zinc-100 text-sm">{hideValues ? '****' : `${carrera.cobrado.toFixed(2)}€`}</span>
                                    <span className="flex-1 text-blue-400 flex justify-center items-center">
                                        <PaymentIcon className="w-4 h-4" />
                                    </span>
                                    <span className="flex-1 text-emerald-400 text-xs">{propina > 0 ? (hideValues ? '****' : `${propina.toFixed(2)}€`) : ''}</span>
                                    <span className="flex-1 text-pink-400 flex justify-center items-center">
                                        {carrera.emisora ? <CellTowerIcon className="w-5 h-5 text-pink-400" /> : null}
                                    </span>
                                    <span className="flex-1 text-blue-400 flex justify-center items-center">
                                        {carrera.aeropuerto ? <FlightTakeoffIcon className="w-5 h-5 text-blue-400" /> : null}
                                    </span>
                                    <span className="flex-1 text-xs text-zinc-400">{carrera.fechaHora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
            
            <div className="fixed bottom-10 left-6 z-10">
                 <button 
                     onClick={() => navigateTo(Seccion.CerrarTurno)}
                     className="bg-zinc-800 border border-zinc-700 text-zinc-300 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-700 transition-colors"
                     title="Cerrar Turno"
                 >
                     <ExitToAppIcon className="w-5 h-5" />
                 </button>
            </div>
            <div className="fixed bottom-10 right-6 z-10">
                 <button onClick={() => navigateTo(Seccion.IntroducirCarrera)} className="bg-zinc-50 text-zinc-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-200 transition-colors">
                     <AddIcon className="w-5 h-5" />
                 </button>
            </div>
        </div>
    );
};

export default IncomeScreen;