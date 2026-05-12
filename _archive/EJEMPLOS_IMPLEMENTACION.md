# 💻 Ejemplos de Implementación - Mejoras TAppXI

## 1. Sistema de Notificaciones Toast

### Componente Toast

```typescript
// components/Toast.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

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
      <div className="fixed top-4 right-4 z-50 space-y-2">
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
    success: isDark ? 'bg-green-600' : 'bg-green-500',
    error: isDark ? 'bg-red-600' : 'bg-red-500',
    warning: isDark ? 'bg-yellow-600' : 'bg-yellow-500',
    info: isDark ? 'bg-blue-600' : 'bg-blue-500',
  };

  return (
    <div
      className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in-right`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 font-bold"
        aria-label="Cerrar"
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
```

### Uso

```typescript
// Antes:
alert('Gasto guardado correctamente');

// Después:
const { showToast } = useToast();
showToast('Gasto guardado correctamente', 'success');
```

---

## 2. Error Boundary

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    // Aquí podrías enviar el error a un servicio de logging
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      <div className={`max-w-md w-full p-6 rounded-xl ${isDark ? 'bg-zinc-900' : 'bg-white'} shadow-xl`}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            Algo salió mal
          </h2>
          <p className={`mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Ha ocurrido un error inesperado. Por favor, recarga la página.
          </p>
          {error && (
            <details className={`text-left mb-4 p-3 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <summary className={`cursor-pointer ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Detalles del error
              </summary>
              <pre className={`mt-2 text-xs overflow-auto ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                {error.message}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 rounded-lg font-semibold ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
```

### Uso en App.tsx

```typescript
// App.tsx
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* resto de la app */}
      </ThemeProvider>
    </ErrorBoundary>
  );
};
```

---

## 3. Hook de Validación de Formularios

```typescript
// hooks/useFormValidation.ts
import { useState, useCallback } from 'react';
import { z } from 'zod';

export function useFormValidation<T extends z.ZodTypeAny>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback((data: unknown): data is z.infer<T> => {
    try {
      schema.parse(data);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            const field = err.path[0] as string;
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  }, [schema]);

  const validateField = useCallback((field: string, value: unknown) => {
    try {
      const fieldSchema = (schema as any).shape?.[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [field]: error.errors[0]?.message || 'Campo inválido',
        }));
      }
    }
  }, [schema]);

  const setFieldTouched = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validate,
    validateField,
    setFieldTouched,
    reset,
  };
}
```

### Uso en Formulario

```typescript
// screens/AddEditRaceScreen.tsx
import { z } from 'zod';
import { useFormValidation } from '../hooks/useFormValidation';

const carreraSchema = z.object({
  taximetro: z.number().min(0, 'El taxímetro debe ser mayor o igual a 0'),
  cobrado: z.number().min(0, 'El cobrado debe ser mayor o igual a 0'),
  formaPago: z.enum(['Efectivo', 'Tarjeta', 'Bizum', 'Vales']),
});

const AddEditRaceScreen: React.FC<AddEditRaceScreenProps> = ({ navigateTo, raceId }) => {
  const { errors, touched, validate, validateField, setFieldTouched } = useFormValidation(carreraSchema);
  
  const handleSave = async () => {
    const data = {
      taximetro: parseFloat(taximetro) || 0,
      cobrado: parseFloat(cobrado) || 0,
      formaPago,
    };
    
    if (!validate(data)) {
      return; // No guardar si hay errores
    }
    
    // Guardar...
  };

  return (
    <form>
      <input
        value={taximetro}
        onChange={(e) => {
          setTaximetro(e.target.value);
          validateField('taximetro', parseFloat(e.target.value) || 0);
        }}
        onBlur={() => setFieldTouched('taximetro')}
      />
      {touched.taximetro && errors.taximetro && (
        <span className="text-red-500 text-sm">{errors.taximetro}</span>
      )}
      {/* más campos... */}
    </form>
  );
};
```

---

## 4. Hook de Atajos de Teclado

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { Seccion } from '../types';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shiftKey === undefined 
          ? true 
          : shortcut.shiftKey === e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && metaMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
```

### Uso

```typescript
// App.tsx o HomeScreen.tsx
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateTo }) => {
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      action: () => navigateTo(Seccion.IntroducirCarrera),
      description: 'Nueva carrera',
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => navigateTo(Seccion.Gastos),
      description: 'Nuevo gasto',
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Abrir búsqueda global
        document.getElementById('global-search')?.focus();
      },
      description: 'Búsqueda global',
    },
  ]);

  // ...
};
```

---

## 5. Hook de Estado de Conexión

```typescript
// hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Sincronizar datos pendientes
        // syncPendingOperations();
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
```

### Uso

```typescript
// components/ConnectionStatus.tsx
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTheme } from '../contexts/ThemeContext';

export const ConnectionStatus: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  const { isDark } = useTheme();

  if (isOnline) return null;

  return (
    <div
      className={`fixed bottom-20 left-0 right-0 z-50 p-3 ${
        isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
      } text-center`}
    >
      <span className="font-semibold">⚠️ Sin conexión</span>
      <span className="ml-2 text-sm">Los cambios se guardarán cuando se restablezca la conexión</span>
    </div>
  );
};
```

---

## 6. Sistema de Búsqueda Global

```typescript
// components/GlobalSearch.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { getCarreras, getGastos, getAllTurnos } from '../services/api';
import { Seccion } from '../types';

interface SearchResult {
  type: 'carrera' | 'gasto' | 'turno';
  id: string;
  title: string;
  subtitle: string;
  action: () => void;
}

export const GlobalSearch: React.FC<{ navigateTo: (page: Seccion, id?: string) => void }> = ({ navigateTo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const [carreras, gastos, turnos] = await Promise.all([
          getCarreras(),
          getGastos(),
          getAllTurnos(),
        ]);

        const searchResults: SearchResult[] = [];

        // Buscar en carreras
        carreras
          .filter(c => 
            c.cobrado.toString().includes(query) ||
            c.formaPago.toLowerCase().includes(query.toLowerCase()) ||
            (c.notas && c.notas.toLowerCase().includes(query.toLowerCase()))
          )
          .slice(0, 5)
          .forEach(c => {
            searchResults.push({
              type: 'carrera',
              id: c.id,
              title: `${c.cobrado.toFixed(2)} € - ${c.formaPago}`,
              subtitle: c.fechaHora.toLocaleDateString('es-ES'),
              action: () => {
                navigateTo(Seccion.EditarCarrera, c.id);
                setIsOpen(false);
              },
            });
          });

        // Buscar en gastos
        gastos
          .filter(g => 
            g.importe.toString().includes(query) ||
            (g.proveedor && g.proveedor.toLowerCase().includes(query.toLowerCase())) ||
            (g.concepto && g.concepto.toLowerCase().includes(query.toLowerCase()))
          )
          .slice(0, 5)
          .forEach(g => {
            searchResults.push({
              type: 'gasto',
              id: g.id,
              title: `${g.importe.toFixed(2)} €`,
              subtitle: g.proveedor || g.concepto || 'Sin descripción',
              action: () => {
                navigateTo(Seccion.EditarGasto, g.id);
                setIsOpen(false);
              },
            });
          });

        setResults(searchResults);
      } catch (error) {
        console.error('Error en búsqueda:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, navigateTo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar carreras, gastos, turnos... (Ctrl+K)"
          className="w-full px-4 py-3 text-lg border-b border-gray-200 dark:border-zinc-700 focus:outline-none"
          autoFocus
        />
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No se encontraron resultados</div>
          ) : (
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={result.action}
                className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 text-left border-b border-gray-100 dark:border-zinc-800"
              >
                <div className="font-semibold">{result.title}</div>
                <div className="text-sm text-gray-500">{result.subtitle}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## 📦 Dependencias Necesarias

```json
{
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.4",
    "vitest": "^1.0.0"
  }
}
```

---

## 🚀 Pasos de Implementación

1. **Instalar dependencias:**
   ```bash
   npm install zod
   npm install -D @testing-library/react @testing-library/jest-dom vitest
   ```

2. **Crear componentes base:**
   - Toast
   - ErrorBoundary
   - GlobalSearch

3. **Crear hooks:**
   - useFormValidation
   - useKeyboardShortcuts
   - useOnlineStatus

4. **Integrar en App.tsx:**
   - Envolver con ErrorBoundary
   - Agregar ToastProvider
   - Agregar GlobalSearch

5. **Reemplazar gradualmente:**
   - Reemplazar `alert()` por `showToast()`
   - Agregar validación a formularios
   - Agregar atajos de teclado

---

**Nota:** Estos son ejemplos básicos. Ajusta según las necesidades específicas del proyecto.





