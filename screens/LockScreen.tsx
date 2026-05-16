import React, { useState } from 'react';
import { auth } from '../services/firebaseSync';
import { signOut } from 'firebase/auth';
import { SubscriptionService } from '../services/SubscriptionService';

export const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);

    const handleLogout = () => {
        signOut(auth);
    };

    const handleUnlock = async () => {
        const success = await SubscriptionService.activateWithCode(code);
        if (success) {
            onUnlock();
        } else {
            setError(true);
            setTimeout(() => setError(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 0 24 24" width="40px" fill="#ef4444">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Demo de 15 días agotada</h1>
                    <p className="text-zinc-400 text-sm">
                        Tu periodo de prueba ha finalizado. Para seguir usando TAppXI, realiza el pago de la cuota o introduce un código de activación.
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Código de Activación"
                        className={`w-full bg-zinc-950 text-center text-xl font-mono text-white py-4 px-4 rounded-xl border-2 focus:outline-none transition-all
                            ${error ? 'border-red-500 animate-shake' : 'border-zinc-800 focus:border-blue-500'}`}
                    />

                    <button
                        onClick={handleUnlock}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <span>Activar Licencia</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full text-zinc-500 hover:text-white text-sm font-medium py-2 transition-colors"
                    >
                        Cerrar sesión
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Tu Identificador de Usuario (UID)</p>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50 flex items-center justify-between">
                        <code className="text-[10px] text-zinc-500 font-mono truncate">{auth.currentUser?.uid}</code>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(auth.currentUser?.uid || '');
                                // Optional: add toast/alert
                            }}
                            className="text-[10px] text-blue-500 font-bold hover:text-blue-400 ml-2"
                        >
                            COPIAR
                        </button>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-4 leading-relaxed">
                        Envía este identificador al administrador tras realizar el pago para recibir tu código.
                    </p>
                </div>
            </div>

            <p className="mt-8 text-zinc-600 text-xs">
                TAppXI v1.0 • Acceso Restringido
            </p>
        </div>
    );
};

