import React, { useState } from 'react';
import { ActivationService } from '../services/activation';

export const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const deviceId = ActivationService.getDeviceId();

    const handleUnlock = () => {
        if (ActivationService.activate(code)) {
            onUnlock();
        } else {
            setError(true);
            setTimeout(() => setError(false), 2000); // Reset error animation
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 0 24 24" width="32px" fill="white">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Terminal Bloqueado</h1>
                    <p className="text-zinc-400 text-sm">
                        Esta aplicación es de uso privado. Para acceder, solicita el código de activación al administrador.
                    </p>
                </div>

                <div className="bg-zinc-950 rounded-lg p-4 mb-6 border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">ID de Terminal</p>
                    <p className="text-2xl font-mono text-blue-400 font-bold tracking-widest select-all">
                        {deviceId}
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        type="tel" // Numeric keyboard
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Código de Activación"
                        maxLength={6}
                        className={`w-full bg-zinc-800 text-center text-xl font-mono text-white py-3 px-4 rounded-lg border-2 focus:outline-none transition-colors
                            ${error ? 'border-red-500 animate-shake' : 'border-zinc-700 focus:border-blue-500'}`}
                    />

                    <button
                        onClick={handleUnlock}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <span>Desbloquear</span>
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                        </svg>
                    </button>

                    {error && (
                        <p className="text-red-400 text-sm font-semibold animate-pulse">
                            Código incorrecto
                        </p>
                    )}
                </div>
            </div>

            <p className="mt-8 text-zinc-600 text-xs">
                TAppXI v1.0 • Acceso Restringido
            </p>
        </div>
    );
};
