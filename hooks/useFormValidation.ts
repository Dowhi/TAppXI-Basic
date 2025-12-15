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
      // Intentar obtener el schema del campo específico
      const fieldSchema = (schema as any).shape?.[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
        return true;
      }
      // Si no hay schema específico, validar todo el objeto
      return false;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [field]: error.errors[0]?.message || 'Campo inválido',
        }));
      }
      return false;
    }
  }, [schema]);

  const setFieldTouched = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    return errors[field];
  }, [errors]);

  const isFieldTouched = useCallback((field: string): boolean => {
    return touched[field] || false;
  }, [touched]);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    touched,
    validate,
    validateField,
    setFieldTouched,
    reset,
    getFieldError,
    isFieldTouched,
    hasErrors,
  };
}





