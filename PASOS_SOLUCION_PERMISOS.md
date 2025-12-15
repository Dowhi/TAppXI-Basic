# 🔧 SOLUCIÓN PASO A PASO: Errores de Permisos de Firebase

## ⚠️ PROBLEMA
Estás viendo estos errores:
- `FirebaseError: Missing or insufficient permissions`
- `Error al eliminar los datos: Missing or insufficient permissions`
- `Error obteniendo ajustes: Missing or insufficient permissions`
- `Error subscribing to carreras: Missing or insufficient permissions`

## ✅ SOLUCIÓN (5 minutos)

### 📋 PASO 1: Abrir Firebase Console
1. Abre tu navegador
2. Ve a: **https://console.firebase.google.com/**
3. **Inicia sesión** con tu cuenta de Google (la misma que usaste para crear el proyecto)

### 📋 PASO 2: Seleccionar tu Proyecto
1. En la lista de proyectos, busca y haz clic en: **tappxi-21346**
   - Si no ves el proyecto, verifica que estés usando la cuenta correcta

### 📋 PASO 3: Ir a Firestore Database
1. En el menú lateral izquierdo, busca **"Firestore Database"**
2. Haz clic en **"Firestore Database"**
3. Si es la primera vez, puede que te pida crear la base de datos:
   - Haz clic en **"Crear base de datos"**
   - Selecciona **"Comenzar en modo de prueba"** (Start in test mode)
   - Elige una región (por ejemplo: `europe-west1` para Europa)
   - Haz clic en **"Habilitar"**

### 📋 PASO 4: Ir a la Pestaña "Reglas"
1. En la parte superior de la pantalla de Firestore, verás varias pestañas:
   - **Datos** (Data)
   - **Reglas** (Rules) ← **HAZ CLIC AQUÍ**
   - **Índices** (Indexes)
   - **Uso** (Usage)

### 📋 PASO 5: Copiar las Reglas Correctas
1. En el editor de reglas, **BORRA TODO** el contenido actual
2. **COPIA Y PEGA** exactamente esto (sin cambiar nada):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 📋 PASO 6: Publicar las Reglas
1. Haz clic en el botón **"Publicar"** (Publish) que está en la parte superior derecha
2. Espera a que aparezca un mensaje de confirmación (puede tardar 10-30 segundos)
3. Deberías ver un mensaje verde que dice algo como: **"Rules published successfully"**

### 📋 PASO 7: Limpiar Caché del Navegador
1. En tu aplicación web (https://dowhi.github.io/tappxi-web-replica/), presiona **F12** para abrir las herramientas de desarrollador
2. Haz clic derecho en el botón de recargar (🔄) en la barra de direcciones
3. Selecciona **"Vaciar caché y volver a cargar de forma forzada"** (Empty Cache and Hard Reload)
   - O presiona **Ctrl + Shift + Delete** (Windows) o **Cmd + Shift + Delete** (Mac)
   - Selecciona "Caché" y "Datos de sitios web"
   - Haz clic en "Borrar datos"

### 📋 PASO 8: Recargar la Aplicación
1. Cierra completamente la pestaña de la aplicación
2. Abre una nueva pestaña
3. Ve a: **https://dowhi.github.io/tappxi-web-replica/**
4. Espera a que cargue completamente
5. Abre la consola (F12 > Console) y verifica que **NO aparezcan más errores de permisos**

## ✅ VERIFICACIÓN

Después de seguir estos pasos, deberías poder:
- ✅ Ver tus datos sin errores
- ✅ Agregar nuevas carreras
- ✅ Exportar a Google Sheets
- ✅ Eliminar datos (si es necesario)
- ✅ Ver ajustes y configuración

## 🚨 SI LOS ERRORES PERSISTEN

### Verificación 1: ¿Las reglas se publicaron?
1. Ve a Firebase Console > Firestore Database > Reglas
2. Verifica que las reglas mostradas sean exactamente las que copiaste
3. Si no, repite los pasos 5 y 6

### Verificación 2: ¿El Project ID es correcto?
1. Ve a Firebase Console > Configuración del proyecto (⚙️)
2. Copia el **Project ID**
3. Compara con el `projectId` en `firebaseConfig.ts` (debe ser `tappxi-21346`)
4. Deben ser **exactamente iguales**

### Verificación 3: ¿Firestore está habilitado?
1. Ve a Firestore Database
2. Deberías ver una base de datos creada
3. Si no existe, créala siguiendo el Paso 3

### Verificación 4: ¿Hay problemas de red?
1. Verifica tu conexión a internet
2. Intenta desde otro navegador
3. Intenta desde modo incógnito

## 📸 CAPTURAS DE PANTALLA ÚTILES

Si necesitas ayuda adicional, toma capturas de pantalla de:
1. La pestaña de Reglas en Firebase Console (mostrando las reglas actuales)
2. La consola del navegador con los errores
3. La configuración del proyecto en Firebase Console

## 💡 NOTA IMPORTANTE

⚠️ **Las reglas permisivas (`allow read, write: if true`) son solo para desarrollo.**

En producción, deberías implementar autenticación y reglas más restrictivas. Pero para uso personal, estas reglas están bien.

## 🆘 AYUDA ADICIONAL

Si después de seguir todos estos pasos los errores persisten:
1. Verifica que estés usando la cuenta de Google correcta
2. Verifica que el proyecto Firebase esté activo (no suspendido)
3. Verifica que no hayas excedido los límites del plan gratuito de Firebase











