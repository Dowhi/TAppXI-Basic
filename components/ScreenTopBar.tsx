import React from 'react';
import BackButton from './BackButton';
import { Seccion } from '../types';

interface ScreenTopBarProps {
    title: string;
    navigateTo?: (page: Seccion) => void;
    onBack?: () => void;
    backTarget?: Seccion;
    showBack?: boolean;
    rightSlot?: React.ReactNode;
    className?: string;
    showSave?: boolean;
    onSave?: () => void;
    saving?: boolean;
}

const ScreenTopBar: React.FC<ScreenTopBarProps> = ({
    title,
    navigateTo,
    onBack,
    backTarget = Seccion.Home,
    showBack = true,
    rightSlot,
    className = '',
    showSave = false,
    onSave,
    saving = false,
}) => {
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (navigateTo) {
            navigateTo(backTarget);
        }
    };

    const rightContent = rightSlot ?? (
        showSave ? (
            <button
                onClick={onSave}
                disabled={saving}
                className="bg-zinc-900 text-yellow-400 px-3 py-1 rounded-md text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
            >
                {saving ? (
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                    'GUARDAR'
                )}
            </button>
        ) : (
            <div className="w-6" />
        )
    );

    return (
        <div
            className={`bg-yellow-400 text-zinc-900 rounded-lg px-3 py-1.5 flex items-center gap-2 ${className}`}
        >
            {showBack ? (
                <BackButton
                    onClick={handleBack}
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

