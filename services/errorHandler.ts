import { useToast } from '../components/Toast';

export interface AppError {
  message: string;
  code?: string;
  context?: string;
  originalError?: any;
}

export class ErrorHandler {
  private static toastHandler: ((message: string, type: 'success' | 'error' | 'warning' | 'info') => void) | null = null;

  static setToastHandler(handler: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void) {
    this.toastHandler = handler;
  }

  static handle(error: any, context?: string): AppError {
    const appError: AppError = {
      message: this.getErrorMessage(error),
      code: error?.code,
      context,
      originalError: error,
    };

    // Log estructurado
    console.error('Error Handler:', {
      message: appError.message,
      code: appError.code,
      context: appError.context,
      error: error,
      timestamp: new Date().toISOString(),
    });

    // Mostrar notificación al usuario
    if (this.toastHandler) {
      this.toastHandler(appError.message, 'error');
    } else {
      // Fallback si no hay toast handler configurado
      console.warn('Toast handler no configurado, usando console.error');
    }

    return appError;
  }

  static handleSuccess(message: string) {
    if (this.toastHandler) {
      this.toastHandler(message, 'success');
    }
  }

  static handleWarning(message: string) {
    if (this.toastHandler) {
      this.toastHandler(message, 'warning');
    }
  }

  static handleInfo(message: string) {
    if (this.toastHandler) {
      this.toastHandler(message, 'info');
    }
  }

  private static getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      // Errores de Firebase
      if (error.code === 'permission-denied') {
        return 'No tienes permisos para realizar esta acción. Verifica la configuración de Firebase.';
      }
      if (error.code === 'unavailable') {
        return 'El servicio no está disponible. Verifica tu conexión a internet.';
      }
      if (error.code === 'deadline-exceeded') {
        return 'La operación tardó demasiado. Por favor, intenta de nuevo.';
      }
      
      return error.message;
    }

    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    return 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.';
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    onSuccess?: (result: T) => void,
    onError?: (error: AppError) => void
  ): Promise<T | null> {
    try {
      const result = await operation();
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      const appError = this.handle(error, context);
      if (onError) {
        onError(appError);
      }
      return null;
    }
  }
}



