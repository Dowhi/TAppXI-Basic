# 🔧 SOLUCIÓN: Errores de Permisos de Firebase

## 🚨 Problema
Estás viendo errores como:
- `FirebaseError: Missing or insufficient permissions`
- `Error subscribing to carreras: FirebaseError: Missing or insufficient permissions`
- `Error obteniendo ajustes: FirebaseError: Missing or insufficient permissions`
- `Error exportando a Google Sheets: FirebaseError: Missing or insufficient permissions`

## ✅ Solución: Configurar Reglas de Firestore

### Paso 1: Ir a Firebase Console
1. Abre [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto (`tappxi-21346` o el que estés usando)
3. Ve a **Firestore Database** en el menú lateral
4. Haz clic en la pestaña **Reglas** (Rules)

### Paso 2: Aplicar Reglas Permisivas (Desarrollo)
Copia y pega estas reglas en el editor de reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas permisivas para desarrollo
    // ⚠️ ADVERTENCIA: Estas reglas permiten acceso completo sin autenticación
    // Solo para uso en desarrollo. En producción, implementa autenticación.
    
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Paso 3: Publicar las Reglas
1. Haz clic en el botón **Publicar** (Publish)
2. Espera a que se confirme la publicación (puede tardar unos segundos)

### Paso 4: Verificar
1. Recarga tu aplicación web
2. Los errores de permisos deberían desaparecer
3. La exportación a Google Sheets debería funcionar

## 🔐 Reglas para Producción (Opcional)

Si en el futuro quieres implementar autenticación, usa estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📝 Notas Importantes

- ⚠️ **Las reglas permisivas (`allow read, write: if true`) son solo para desarrollo**
- 🔒 **En producción, siempre implementa autenticación y reglas más restrictivas**
- 📚 **El archivo `firestore.rules` en la raíz del proyecto contiene las reglas recomendadas**

## 🆘 Si los Errores Persisten

1. **Verifica que las reglas se publicaron correctamente:**
   - Ve a Firebase Console > Firestore > Reglas
   - Asegúrate de que las reglas mostradas coincidan con las que copiaste

2. **Limpia la caché del navegador:**
   - Presiona `Ctrl + Shift + Delete` (Windows) o `Cmd + Shift + Delete` (Mac)
   - Selecciona "Caché" y "Datos de sitios web"
   - Haz clic en "Borrar datos"

3. **Verifica la configuración de Firebase:**
   - Asegúrate de que `firebaseConfig.ts` tenga las credenciales correctas
   - Verifica que el `projectId` coincida con tu proyecto en Firebase Console

4. **Revisa la consola del navegador:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña "Console"
   - Busca errores específicos que puedan dar más información

## 📞 Soporte

Si después de seguir estos pasos los errores persisten, verifica:
- Que tu proyecto de Firebase esté activo
- Que Firestore Database esté habilitado
- Que no hayas excedido los límites del plan gratuito











