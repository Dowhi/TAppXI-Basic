import React from 'react';
import BackButton from './BackButton';
import { Seccion } from '../types';

interface ScreenTopBarProps {
    title: string;
    navigateTo: (page: Seccion) => void;
    backTarget?: Seccion;
    showBack?: boolean;
    rightSlot?: React.ReactNode;
    className?: string;
}

const ScreenTopBar: React.FC<ScreenTopBarProps> = ({
    title,
    navigateTo,
    backTarget = Seccion.Home,
    showBack = true,
    rightSlot,
    className = '',
}) => {
    const rightContent = rightSlot ?? <div className="w-6" />;

    return (
        <div
            className={`bg-yellow-400 text-zinc-900 rounded-lg px-3 py-1.5 flex items-center gap-2 ${className}`}
        >
            {showBack ? (
                <BackButton
                    navigateTo={navigateTo}
                    targetPage={backTarget}
                    className="p-1.5 text-zinc-900 hover:text-zinc-700 transition-colors"
                />
            ) : (
                <div className="w-6" />
            )}
            <h1 className="flex-1 text-center font-bold text-base leading-tight">{title}</h1>
            <div className="flex items-center justify-end min-w-[24px]">
                {rightContent}
            </div>
        </div>
    );
};

export default ScreenTopBar;

