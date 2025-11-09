import React from 'react';

interface AnimatedIcon3DProps {
    children: React.ReactNode;
}

const AnimatedIcon3D: React.FC<AnimatedIcon3DProps> = ({ children }) => {
    return (
        <span
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
                backgroundColor: 'var(--accent-muted)',
                color: 'var(--accent)',
            }}
        >
            <span className="w-6 h-6 flex items-center justify-center">{children}</span>
        </span>
    );
};

export default AnimatedIcon3D;
