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
            className="rounded-2xl p-[1px] aspect-square transition-transform duration-150 ease-out"
            style={{
                backgroundImage: 'linear-gradient(135deg, rgba(0,255,148,0.85), rgba(0,224,255,0.95))',
                boxShadow: '0 14px 32px rgba(0, 224, 255, 0.25)',
            }}
        >
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[18px] bg-[#1A1A1F]">
                <span className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                        backgroundImage: 'linear-gradient(135deg, rgba(0,255,148,0.25), rgba(0,224,255,0.35))',
                        color: '#00E0FF',
                    }}
                >
                    <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
                </span>
                <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9FB5D8] text-center">
                    {label}
                </span>
            </div>
        </button>
    );
};

export default QuickActionTile;
