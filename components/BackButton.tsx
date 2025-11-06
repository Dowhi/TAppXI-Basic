
import React from 'react';
import { Seccion } from '../types';

const ArrowBackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
    </svg>
);

interface BackButtonProps {
    navigateTo: (page: Seccion) => void;
    targetPage?: Seccion;
    className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ 
    navigateTo, 
    targetPage = Seccion.Home,
    className = "p-2 text-zinc-300 hover:text-white transition-colors"
}) => {
    return (
        <button 
            onClick={() => navigateTo(targetPage)} 
            className={className}
            aria-label="Volver"
        >
            <ArrowBackIcon />
        </button>
    );
};

export default BackButton;

