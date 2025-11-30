import React from 'react';

interface InfoBoxProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    color?: string;
}

const semanticPalette: Record<string, { tone: string; surface: string }> = {
    '#3b82f6': { tone: '#3B82F6', surface: 'rgba(59, 130, 246, 0.25)' },
    '#ef4444': { tone: '#EF4444', surface: 'rgba(239, 68, 68, 0.25)' },
    '#22c55e': { tone: '#22C55E', surface: 'rgba(34, 197, 94, 0.25)' },
};

const InfoBox: React.FC<InfoBoxProps> = ({ icon, title, value, color = '#00CFFF' }) => {
    const palette = semanticPalette[color] ?? {
        tone: color,
        surface: 'rgba(0, 212, 255, 0.28)',
    };

    return (
        <div
            className="flex-1 min-h-[122px] rounded-2xl border border-[#1F2A37] bg-[#1A1A1F] px-5 py-6 flex flex-col justify-between gap-4 shadow-[0_16px_38px_rgba(0,0,0,0.55)]"
        >
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#00D4FF' }}>
                    {title}
                </span>
                <span
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                        backgroundImage: `linear-gradient(135deg, ${palette.surface}, rgba(0, 212, 255, 0.15))`,
                        color: palette.tone,
                    }}
                >
                    <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
                </span>
            </div>
            <span
                className="text-3xl font-semibold tracking-tight"
                style={{ color: palette.tone }}
            >
                {value}
            </span>
        </div>
    );
};

export default InfoBox;
