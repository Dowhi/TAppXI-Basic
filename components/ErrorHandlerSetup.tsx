import { useEffect } from 'react';
import { ErrorHandler } from '../services/errorHandler';
import { useToast } from './Toast';

/**
 * Componente que configura el ErrorHandler con el toast handler
 * Debe estar dentro de ToastProvider
 */
export const ErrorHandlerSetup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  useEffect(() => {
    // Configurar el ErrorHandler con el toast handler
    ErrorHandler.setToastHandler(showToast);
  }, [showToast]);

  return <>{children}</>;
};





