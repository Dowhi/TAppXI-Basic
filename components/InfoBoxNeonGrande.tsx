import React from 'react';

interface InfoBoxProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    color?: string; // Kept for semantic coloring, e.g. text color
}

const InfoBox: React.FC<InfoBoxProps> = ({ icon, title, value, color = 'text-zinc-100' }) => {
    // Use a mapping for semantic colors to new theme
    const colorMap: { [key: string]: string } = {
        '#00CFFF': 'text-blue-400',
        '#FF00D6': 'text-pink-400',
        '#00FFB0': 'text-emerald-400',
    }
    const themeColor = colorMap[color] || color;


    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1 h-[100px] flex flex-col justify-between items-start">
            <div className={`w-6 h-6 ${themeColor}`}>
                {icon}
            </div>
            <div className="text-sm font-medium text-zinc-400">{title}</div>
            <div className={`text-xl font-semibold ${themeColor}`}>{value}</div>
        </div>
    );
};

export default InfoBox;