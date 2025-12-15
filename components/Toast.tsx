import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration: 3000 };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const { isDark } = useTheme();
  
  const colors = {
    success: {
      bg: isDark ? 'bg-green-600' : 'bg-green-500',
      text: 'text-white',
      icon: '✓',
    },
    error: {
      bg: isDark ? 'bg-red-600' : 'bg-red-500',
      text: 'text-white',
      icon: '✕',
    },
    warning: {
      bg: isDark ? 'bg-yellow-600' : 'bg-yellow-500',
      text: 'text-white',
      icon: '⚠',
    },
    info: {
      bg: isDark ? 'bg-blue-600' : 'bg-blue-500',
      text: 'text-white',
      icon: 'ℹ',
    },
  };

  const colorScheme = colors[toast.type];

  return (
    <div
      className={`${colorScheme.bg} ${colorScheme.text} px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px] animate-slide-in-right border-l-4 ${
        toast.type === 'success' ? 'border-green-700' :
        toast.type === 'error' ? 'border-red-700' :
        toast.type === 'warning' ? 'border-yellow-700' :
        'border-blue-700'
      }`}
      role="alert"
      aria-live="polite"
    >
      <span className="text-xl font-bold">{colorScheme.icon}</span>
      <span className="flex-1 font-medium">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 font-bold text-xl leading-none"
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};





