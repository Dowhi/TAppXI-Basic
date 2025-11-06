import React from 'react';
import BackButton from '../components/BackButton';
import { Seccion } from '../types';

// Icons
const CalendarDayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="9" y1="14" x2="9" y2="14" strokeWidth="3"/>
    </svg>
);

const CalendarMonthIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2"/>
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2"/>
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2"/>
        <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2"/>
        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2"/>
        <line x1="16" y1="18" x2="16" y2="18" strokeWidth="2"/>
    </svg>
);

const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
    </svg>
);

const CalendarYearIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <rect x="4" y="4" width="4" height="4" fill="currentColor" opacity="0.3"/>
    </svg>
);

interface ResumenScreenProps {
    navigateTo: (page: Seccion) => void;
}

const ResumenScreen: React.FC<ResumenScreenProps> = ({ navigateTo }) => {
    return (
        <div className="space-y-6">
            <header className="flex items-center space-x-3">
                <BackButton navigateTo={navigateTo} />
                <h1 className="text-zinc-100 text-xl font-bold">ResÃºmenes</h1>
            </header>

            {/* ResÃºmenes por perÃ­odo */}
            <div>
                <h2 className="text-zinc-100 text-lg font-bold mb-4">ResÃºmenes por perÃ­odo</h2>
                <div className="space-y-3">
                    {/* Resumen Diario */}
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:bg-zinc-750 transition-shadow cursor-pointer" onClick={() => navigateTo(Seccion.ResumenDiario)}>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-blue-400">
                                <CalendarDayIcon />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-zinc-100 font-bold text-base mb-1">Resumen Diario</h3>
                                <p className="text-zinc-400 text-sm">Consulta los ingresos y gastos del dÃ­a</p>
                            </div>
                        </div>
                    </div>

                    {/* Resumen Mensual */}
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:bg-zinc-750 transition-shadow cursor-pointer" onClick={() => navigateTo(Seccion.ResumenMensualIngresos)}>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-blue-400">
                                <CalendarMonthIcon />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-zinc-100 font-bold text-base mb-1">Resumen Mensual</h3>
                                <p className="text-zinc-400 text-sm">Consulta los ingresos y gastos del mes</p>
                            </div>
                        </div>
                    </div>

                    {/* Resumen Mensual Detallado */}
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:bg-zinc-750 transition-shadow cursor-pointer" onClick={() => navigateTo(Seccion.ResumenMensualDetallado)}>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-blue-400">
                                <GridIcon />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-zinc-100 font-bold text-base mb-1">
                                    Resumen Mensual<br />
                                    <span className="font-bold">Detallado</span>
                                </h3>
                                <p className="text-zinc-400 text-sm">Consulta el detalle de ingresos y gastos del mes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ResÃºmenes anuales */}
            <div>
                <h2 className="text-zinc-100 text-lg font-bold mb-4">ResÃºmenes anuales</h2>
                <div className="space-y-3">
                    {/* Resumen Anual */}
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:bg-zinc-750 transition-shadow cursor-pointer" onClick={() => navigateTo(Seccion.ResumenMensual)}>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-blue-400">
                                <CalendarYearIcon />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-zinc-100 font-bold text-base mb-1">Resumen Anual</h3>
                                <p className="text-zinc-400 text-sm">Consulta los ingresos y gastos del aÃ±o</p>
                            </div>
                        </div>
                    </div>

                    {/* Resumen de Gastos Mensual */}
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:bg-zinc-750 transition-shadow cursor-pointer" onClick={() => navigateTo(Seccion.ResumenGastosMensual)}>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-blue-400">
                                <CalendarMonthIcon />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-zinc-100 font-bold text-base mb-1">Resumen de Gastos Mensual</h3>
                                <p className="text-zinc-400 text-sm">Consulta el detalle de gastos del mes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumenScreen;


