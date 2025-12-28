import React, { useState } from 'react';
import { ensureGoogleSignIn } from '../services/google';
import { useTheme } from '../contexts/ThemeContext';

interface LoginScreenProps {
    onLoginSuccess: () => void;
    onSkip: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onSkip }) => {
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isDark } = useTheme();

    const handleGoogleLogin = async () => {
        setIsAuthenticating(true);
        setError(null);

        try {
            await ensureGoogleSignIn();
            // El token se guarda en memoria en el servicio google.ts
            // Consideramos el login exitoso
            onLoginSuccess();
        } catch (err: any) {
            console.error('Error en autenticación:', err);

            const errorMsg = err?.message || '';
            if (errorMsg.includes('VITE_GOOGLE') || errorMsg.includes('archivo .env') || errorMsg.includes('faltante')) {
                setError('Configuración de Google incompleta. Contacta al administrador.');
            } else if (errorMsg.includes('popup_closed_by_user')) {
                setError('Inicio de sesión cancelado.');
            } else {
                setError('No se pudo conectar con Google. Inténtalo de nuevo o continúa sin conexión.');
            }
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-950 dark:to-zinc-900 transition-colors duration-300">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
                {/* Header / Logo Area */}
                <div className="text-center space-y-2">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <span className="text-4xl font-bold text-white tracking-tighter">T</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-6">
                        TAppXI
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Gestiona tu taxi de forma inteligente
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-blue-900/5">

                    <div className="space-y-6">
                        <div className="space-y-2 text-center">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Iniciar Sesión
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Conecta con Google para sincronizar tus copias de seguridad.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm text-red-600 dark:text-red-300 font-medium">
                                    {error}
                                </span>
                            </div>
                        )}

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isAuthenticating}
                            className="w-full group relative overflow-hidden rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            <div className="flex items-center justify-center gap-3 relative z-10">
                                {isAuthenticating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Conectando...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        <span>Continuar con Google</span>
                                    </>
                                )}
                            </div>
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-zinc-900 text-slate-500 dark:text-slate-400">
                                    O
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={onSkip}
                            className="w-full py-3 px-4 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors duration-200"
                        >
                            Continuar sin cuenta
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                    Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                </p>
            </div>
        </div>
    );
};
