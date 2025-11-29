import React from 'react';
import { Seccion } from '../types';

interface BottomNavBarProps {
    navigateTo: (page: Seccion) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ navigateTo }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-10">
            {/* Main bar */}
            <div className="relative h-10 bg-yellow-400 flex items-center justify-center">
                {/* Center Button - Home */}
                <button
                    onClick={() => navigateTo(Seccion.Home)}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl hover:bg-zinc-50 transition-all hover:scale-105 border-4 border-yellow-400"
                    aria-label="Ir a Home"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-zinc-900">
                        <path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default BottomNavBar;
