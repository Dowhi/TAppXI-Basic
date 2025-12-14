import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`glass-card rounded-xl border border-white/5 shadow-xl ${className}`}>
            {children}
        </div>
    );
};

export default Card;
