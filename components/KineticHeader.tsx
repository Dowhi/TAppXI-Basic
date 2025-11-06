import React from 'react';

interface KineticHeaderProps {
    title: string;
}

const KineticHeader: React.FC<KineticHeaderProps> = ({ title }) => {
    return (
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            {title}
        </h1>
    );
};

export default KineticHeader;