import React from 'react';

interface AnimatedIcon3DProps {
    children: React.ReactNode;
}

const AnimatedIcon3D: React.FC<AnimatedIcon3DProps> = ({ children }) => {
    return (
        <div className="w-8 h-8 text-zinc-400">
            {children}
        </div>
    );
};

export default AnimatedIcon3D;