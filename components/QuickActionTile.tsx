import React from 'react';

interface QuickActionTileProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

const QuickActionTile: React.FC<QuickActionTileProps> = ({ icon, label, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 flex flex-col items-center justify-center space-y-2 
                       aspect-square transition-colors duration-150 ease-in-out active:scale-95 
                       hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
            <div className="w-7 h-7 text-zinc-400">
                {icon}
            </div>
            <span className="text-xs text-center text-zinc-300">{label}</span>
        </button>
    );
};

export default QuickActionTile;