import React from 'react';

interface KineticHeaderProps {
    title: string;
}

const KineticHeader: React.FC<KineticHeaderProps> = ({ title }) => {
    return (
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
        </h1>
    );
};

export default KineticHeader;
