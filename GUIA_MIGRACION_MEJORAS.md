# 📘 Guía de Migración - Nuevas Mejoras Implementadas

## ✅ Mejoras Implementadas

Se han implementado las 5 mejoras críticas:

1. ✅ **Sistema de Notificaciones Toast** - Reemplazo de `alert()`
2. ✅ **Error Boundaries** - Prevención de crashes
3. ✅ **Manejo de Errores Centralizado** - ErrorHandler service
4. ✅ **Validación de Formularios** - Hook `useFormValidation` con Zod
5. ✅ **Estados de Carga** - Componentes `LoadingSpinner` y `LoadingSkeleton`

---

## 🔄 Cómo Migrar Código Existente

### 1. Reemplazar `alert()` por Toast

**Antes:**
```typescript
alert('Gasto guardado correctamente');
```

**Después:**
```typescript
import { useToast } from '../components/Toast';

const { showToast } = useToast();
showToast('Gasto guardado correctamente', 'success');
```

**Tipos de toast:**
- `'success'` - Operación exitosa (verde)
- `'error'` - Error (rojo)
- `'warning'` - Advertencia (amarillo)
- `'info'` - Información (azul)

---

### 2. Usar ErrorHandler para Manejo de Errores

**Antes:**
```typescript
try {
  await addCarrera(data);
} catch (error) {
  console.error('Error:', error);
  alert('Error al guardar');
}
```

**Después:**
```typescript
import { ErrorHandler } from '../services/errorHandler';

try {
  await addCarrera(data);
  showToast('Carrera guardada correctamente', 'success');
} catch (error) {
  ErrorHandler.handle(error, 'AddEditRaceScreen - addCarrera');
  // El toast de error se muestra automáticamente
}
```

**Métodos disponibles:**
- `ErrorHandler.handle(error, context?)` - Maneja errores y muestra toast
- `ErrorHandler.handleSuccess(message)` - Muestra toast de éxito
- `ErrorHandler.handleWarning(message)` - Muestra toast de advertencia
- `ErrorHandler.handleInfo(message)` - Muestra toast informativo
- `ErrorHandler.handleAsync(operation, context?, onSuccess?, onError?)` - Wrapper para operaciones async

---

### 3. Agregar Validación a Formularios

**Antes:**
```typescript
const handleSave = async () => {
  if (taximetro <= 0 && cobrado <= 0) {
    alert('Por favor, ingresa al menos un valor');
    return;
  }
  // ...
};
```

**Después:**
```typescript
import { z } from 'zod';
import { useFormValidation } from '../hooks/useFormValidation';

const carreraSchema = z.object({
  taximetro: z.number().min(0, 'El taxímetro debe ser mayor o igual a 0'),
  cobrado: z.number().min(0, 'El cobrado debe ser mayor o igual a 0'),
  formaPago: z.enum(['Efectivo', 'Tarjeta', 'Bizum', 'Vales']),
});

const AddEditRaceScreen = () => {
  const { errors, touched, validate, validateField, setFieldTouched, getFieldError, isFieldTouched } = useFormValidation(carreraSchema);
  
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
        className={isFieldTouched('taximetro') && getFieldError('taximetro') ? 'border-red-500' : ''}
      />
      {isFieldTouched('taximetro') && getFieldError('taximetro') && (
        <span className="text-red-500 text-sm">{getFieldError('taximetro')}</span>
      )}
    </form>
  );
};
```

---

### 4. Agregar Loading States

**Antes:**
```typescript
const [loading, setLoading] = useState(false);

{loading && <div>Cargando...</div>}
```

**Después:**
```typescript
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LoadingSkeleton, ListSkeleton } from '../components/LoadingSkeleton';

// Para spinners simples
{loading && <LoadingSpinner text="Cargando datos..." />}

// Para listas
{loading ? (
  <ListSkeleton items={5} />
) : (
  <div>{/* contenido */}</div>
)}

// Para cards
{loading ? (
  <CardSkeleton />
) : (
  <div>{/* contenido */}</div>
)}
```

---

## 📝 Archivos que Necesitan Migración

Los siguientes archivos aún usan `alert()` y deberían migrarse:

1. `screens/AddEditRaceScreen.tsx` - Reemplazar `alert()` y agregar validación
2. `screens/RemindersScreen.tsx` - Reemplazar `alert()`
3. `screens/ShiftsScreen.tsx` - Reemplazar `alert()`
4. `screens/ReportsScreen.tsx` - Reemplazar `alert()`
5. `screens/ResumenMensualScreen.tsx` - Reemplazar `alert()`
6. `screens/BreakConfigurationScreen.tsx` - Reemplazar `alert()`

---

## 🎯 Ejemplo Completo de Migración

### Antes:
```typescript
const handleSave = async () => {
  if (taximetro <= 0 && cobrado <= 0) {
    alert('Por favor, ingresa al menos un valor');
    return;
  }
  
  try {
    await addCarrera(data);
    alert('Carrera guardada correctamente');
    navigateTo(Seccion.Home);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar la carrera');
  }
};
```

### Después:
```typescript
import { useToast } from '../components/Toast';
import { ErrorHandler } from '../services/errorHandler';
import { z } from 'zod';
import { useFormValidation } from '../hooks/useFormValidation';

const carreraSchema = z.object({
  taximetro: z.number().min(0.01, 'El taxímetro debe ser mayor a 0'),
  cobrado: z.number().min(0.01, 'El cobrado debe ser mayor a 0'),
  formaPago: z.enum(['Efectivo', 'Tarjeta', 'Bizum', 'Vales']),
});

const AddEditRaceScreen = () => {
  const { showToast } = useToast();
  const { validate, getFieldError, isFieldTouched, setFieldTouched, validateField } = useFormValidation(carreraSchema);
  
  const handleSave = async () => {
    const data = {
      taximetro: parseFloat(taximetro) || 0,
      cobrado: parseFloat(cobrado) || 0,
      formaPago,
    };
    
    if (!validate(data)) {
      showToast('Por favor, corrige los errores en el formulario', 'warning');
      return;
    }
    
    try {
      await addCarrera(data);
      showToast('Carrera guardada correctamente', 'success');
      navigateTo(Seccion.Home);
    } catch (error) {
      ErrorHandler.handle(error, 'AddEditRaceScreen - handleSave');
    }
  };
  
  // ...
};
```

---

## 🔍 Verificación

Para verificar que todo funciona:

1. ✅ La app no se rompe si hay un error (ErrorBoundary)
2. ✅ Los `alert()` se reemplazaron por toasts
3. ✅ Los errores se manejan con ErrorHandler
4. ✅ Los formularios tienen validación
5. ✅ Los loading states son consistentes

---

## 📚 Referencias

- **Toast:** `components/Toast.tsx`
- **ErrorBoundary:** `components/ErrorBoundary.tsx`
- **ErrorHandler:** `services/errorHandler.ts`
- **useFormValidation:** `hooks/useFormValidation.ts`
- **LoadingSpinner:** `components/LoadingSpinner.tsx`
- **LoadingSkeleton:** `components/LoadingSkeleton.tsx`

---

**Nota:** La migración puede hacerse gradualmente. No es necesario migrar todo de una vez.





