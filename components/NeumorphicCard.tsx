import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`
            bg-zinc-900/50 border border-zinc-800 rounded-xl p-6
            ${className}
        `}>
            {children}
        </div>
    );
};

export default Card;