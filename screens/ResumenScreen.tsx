import React from 'react';
import ScreenTopBar from '../components/ScreenTopBar';
import { Seccion } from '../types';

// Icons (ahora aceptan props como className)
const CalendarDayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="9" y1="14" x2="9" y2="14" strokeWidth="3"/>
    </svg>
);

const CalendarMonthIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
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

const GridIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
    </svg>
);

const CalendarYearIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
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
    const ItemCard: React.FC<{
        title: string;
        description?: string;
        onClick: () => void;
        Icon: React.FC<React.SVGProps<SVGSVGElement>>;
    }> = ({ title, description, onClick, Icon }) => (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:border-cyan-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
            {/* Contenedor del ícono: ahora h-8 w-8, centrado verticalmente */}
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/70 text-cyan-400">
                <Icon className="w-5 h-5" />
            </span>
            <span className="flex-1 space-y-1">
                <span className="block text-zinc-100 font-semibold text-base leading-tight">{title}</span>
                {description && (
                    <span className="block text-zinc-400 text-sm leading-snug">{description}</span>
                )}
            </span>
        </button>
    );

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 font-sans px-3 py-4 space-y-6">
            <ScreenTopBar
                title="Resúmenes"
                navigateTo={navigateTo}
                backTarget={Seccion.Home}
            />

            <section className="space-y-4">
                <div className="space-y-3">
                    <ItemCard
                        title="Resumen Diario"
                        onClick={() => navigateTo(Seccion.ResumenDiario)}
                        Icon={CalendarDayIcon}
                    />
                    <ItemCard
                        title="Resumen Mensual"
                        onClick={() => navigateTo(Seccion.ResumenMensualIngresos)}
                        Icon={CalendarMonthIcon}
                    />
                    <ItemCard
                        title="Resumen Mensual Detallado"
                        onClick={() => navigateTo(Seccion.ResumenMensualDetallado)}
                        Icon={GridIcon}
                    />
                    <ItemCard
                        title="Resumen de Gastos Mensual"
                        onClick={() => navigateTo(Seccion.ResumenGastosMensual)}
                        Icon={CalendarMonthIcon}
                    />
                    <ItemCard
                        title="Resumen Anual"
                        onClick={() => navigateTo(Seccion.ResumenMensual)}
                        Icon={CalendarYearIcon}
                    />
                </div>
            </section>
        </div>
    );
};

export default ResumenScreen;