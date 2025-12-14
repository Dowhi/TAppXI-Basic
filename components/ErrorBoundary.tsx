import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Aquí podrías enviar el error a un servicio de logging
    // Ejemplo: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  getIsDark = (): boolean => {
    // Leer del localStorage o del DOM
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('temaOscuro');
      if (saved !== null) {
        return saved === 'true';
      }
      // Fallback: verificar clase en document
      return document.documentElement.classList.contains('dark');
    }
    return false;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} onReset={this.handleReset} isDark={this.getIsDark()} />;
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ 
  error: Error | null; 
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  isDark: boolean;
}> = ({ error, errorInfo, onReset, isDark }) => {

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      <div className={`max-w-md w-full p-6 rounded-xl ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'} shadow-xl`}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            Algo salió mal
          </h2>
          <p className={`mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Ha ocurrido un error inesperado. Por favor, recarga la página o intenta de nuevo.
          </p>
          {error && (
            <details className={`text-left mb-4 p-3 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <summary className={`cursor-pointer font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Detalles del error
              </summary>
              <pre className={`mt-2 text-xs overflow-auto ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                {error.message}
                {errorInfo && (
                  <>
                    {'\n\n'}
                    {errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={onReset}
              className={`px-4 py-2 rounded-lg font-semibold ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => window.location.reload()}
              className={`px-4 py-2 rounded-lg font-semibold ${
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
              }`}
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper funcional para usar hooks
const ErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

export default ErrorBoundary;

