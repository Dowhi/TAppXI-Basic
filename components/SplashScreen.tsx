import React from 'react';

export const SplashScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 overflow-hidden">
            <video
                src={`${import.meta.env.BASE_URL}splash-video.mp4`}
                autoPlay
                muted
                playsInline
                loop
                className="w-full h-full object-cover"
                onContextMenu={(e) => e.preventDefault()}
            />

            {/* Overlay sutil para suavizar si es necesario */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        </div>
    );
};
