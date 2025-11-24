# 📋 RESUMEN COMPLETO Y MINUCIOSO PARA REPLICAR TAppXI WEB

## 🎯 DESCRIPCIÓN GENERAL DEL PROYECTO

**TAppXI Web Replica** es una aplicación web progresiva (PWA) para la gestión completa de carreras, gastos y turnos de taxis. La aplicación replica la funcionalidad de una app móvil Android en formato web, con diseño moderno estilo neón/neumórfico, soporte offline y sincronización con Firebase Firestore.

### Características Principales:
- ✅ Gestión de carreras (ingresos) con múltiples formas de pago
- ✅ Gestión de gastos con IVA, facturas y proveedores
- ✅ Control de turnos con kilómetros
- ✅ Estadísticas y análisis avanzado
- ✅ Resúmenes diarios, mensuales y anuales
- ✅ Calendario de descansos con letras (A, B, C, D)
- ✅ Exportación a Excel, PDF, CSV
- ✅ Backup a Google Drive y Google Sheets
- ✅ Tema oscuro/claro personalizable
- ✅ Ajustes de tamaño de fuente
- ✅ Alto contraste (accesibilidad)
- ✅ PWA con soporte offline

---

## 🛠️ TECNOLOGÍAS Y DEPENDENCIAS

### Stack Tecnológico Principal:
- **React 19.2.0** - Biblioteca UI
- **TypeScript 5.8.2** - Tipado estático
- **Vite 6.2.0** - Build tool y dev server
- **Tailwind CSS 4.1.16** - Framework CSS utility-first
- **Firebase Firestore 8.10.1** - Base de datos NoSQL en tiempo real
- **Google APIs** - Drive y Sheets para backups

### Dependencias Principales (`package.json`):
```json
{
  "dependencies": {
    "@tailwindcss/vite": "^4.1.16",
    "jspdf": "^3.0.3",
    "jspdf-autotable": "^5.0.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "tailwindcss": "^4.1.16",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "canvas": "^3.2.0",
    "gh-pages": "^6.1.1",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "vite-plugin-pwa": "^1.1.0"
  }
}
```

### Scripts NPM:
- `npm run dev` - Servidor de desarrollo en http://localhost:5173
- `npm run build` - Construcción para producción
- `npm run preview` - Vista previa de la build
- `npm run deploy` - Despliegue a GitHub Pages
- `npm run generate-icons` - Genera iconos PWA

---

## 📁 ESTRUCTURA COMPLETA DEL PROYECTO

```
tappxi-web-replica/
├── public/                          # Archivos estáticos públicos
│   ├── generate-icons.html         # Generador de iconos PWA
│   ├── icon-180.svg               # Icono Apple Touch
│   ├── icon-192.svg               # Icono PWA 192x192
│   ├── icon-512.svg               # Icono PWA 512x512
│   └── pwa-icon.svg               # Icono principal
│
├── components/                      # Componentes reutilizables
│   ├── AnimatedIcon3D.tsx         # Iconos animados 3D
│   ├── BackButton.tsx             # Botón de retroceso
│   ├── InfoBoxNeonGrande.tsx      # Caja de información estilo neón
│   ├── KineticHeader.tsx          # Header animado
│   ├── NeumorphicCard.tsx         # Tarjetas estilo neumórfico
│   ├── QuickActionTile.tsx        # Tiles de acción rápida
│   └── ScreenTopBar.tsx           # Barra superior de pantallas
│
├── contexts/                        # Contextos React (estado global)
│   ├── FontSizeContext.tsx        # Contexto tamaño de fuente
│   └── ThemeContext.tsx           # Contexto de tema (oscuro/claro/colores)
│
├── screens/                         # Pantallas principales de la app
│   ├── AddEditRaceScreen.tsx      # Agregar/editar carrera
│   ├── AjustesScreen.tsx          # Pantalla de ajustes
│   ├── AnalisisAvanzadoScreen.tsx # Análisis avanzado de datos
│   ├── BreakConfigurationScreen.tsx # Configuración de descansos
│   ├── CalendarScreen.tsx         # Calendario de descansos
│   ├── CloseTurnScreen.tsx        # Cerrar turno
│   ├── EditTurnScreen.tsx         # Editar turno
│   ├── ExpensesScreen.tsx         # Gestión de gastos
│   ├── HistoricoScreen.tsx        # Histórico de carreras
│   ├── HomeScreen.tsx             # Pantalla principal/home
│   ├── IncomeScreen.tsx           # Vista de carreras/ingresos
│   ├── ReportsScreen.tsx          # Informes personalizados
│   ├── ResumenDiarioScreen.tsx    # Resumen diario
│   ├── ResumenGastosMensualScreen.tsx # Resumen gastos mensual
│   ├── ResumenMensualDetalladoScreen.tsx # Resumen mensual detallado
│   ├── ResumenMensualIngresosScreen.tsx # Resumen ingresos mensual
│   ├── ResumenMensualScreen.tsx   # Resumen mensual general
│   ├── ResumenScreen.tsx          # Pantalla de resúmenes
│   ├── ShiftsScreen.tsx           # Gestión de turnos
│   └── StatisticsScreen.tsx       # Estadísticas generales
│
├── services/                        # Servicios y lógica de negocio
│   ├── api.ts                     # API de Firestore (CRUD completo)
│   ├── backup.ts                  # Funciones de backup
│   ├── customReports.ts           # Informes personalizados
│   ├── exports.ts                 # Exportación a Excel/PDF/CSV
│   ├── google.ts                  # Integración con Google APIs
│   └── maintenance.ts             # Mantenimiento de datos
│
├── scripts/                         # Scripts de utilidad
│   └── generate-icons.js          # Generador de iconos PWA
│
├── dev-dist/                        # Archivos generados en desarrollo
│   ├── registerSW.js              # Service Worker registro
│   ├── sw.js                      # Service Worker
│   └── workbox-*.js               # Workbox para PWA
│
├── dist/                            # Build de producción
│   ├── assets/                    # Assets optimizados
│   └── index.html                 # HTML principal
│
├── index.html                       # HTML principal de la aplicación
├── index.tsx                       # Punto de entrada React
├── index.css                       # Estilos globales y temas
├── App.tsx                         # Componente raíz de la app
├── types.ts                        # Definiciones de tipos TypeScript
├── firebaseConfig.ts               # Configuración de Firebase
├── metadata.json                   # Metadatos de la aplicación
├── mockData.ts                     # Datos de prueba (vacío)
├── vite.config.ts                  # Configuración de Vite
├── tsconfig.json                   # Configuración de TypeScript
└── package.json                    # Dependencias y scripts
```

---

## ⚙️ CONFIGURACIÓN DEL ENTORNO

### 1. Requisitos Previos
- **Node.js** 18+ (recomendado 20+)
- **npm** o **yarn** como gestor de paquetes
- **Git** para control de versiones

### 2. Instalación Inicial
```bash
# Clonar el repositorio (si aplica)
git clone <url-repositorio>
cd tappxi-web-replica

# Instalar dependencias
npm install

# Crear archivo .env en la raíz del proyecto
touch .env
```

### 3. Variables de Entorno (`.env`)
```env
# Firebase Configuration (ya configurado en firebaseConfig.ts)
# Si quieres usar otro proyecto Firebase, modifica firebaseConfig.ts

# Google APIs (Opcional - para backups)
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
VITE_GOOGLE_API_KEY=tu_api_key_aqui

# Base path para GitHub Pages (si despliegas en subdirectorio)
VITE_BASE_PATH=/tappxi-web-replica/

# Gemini API (si se usa análisis avanzado con IA)
GEMINI_API_KEY=tu_api_key_aqui
```

### 4. Configuración de TypeScript (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["node"],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

---

## 🔥 CONFIGURACIÓN DE FIREBASE

### 1. Crear Proyecto Firebase
1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear nuevo proyecto o usar existente
3. Habilitar **Firestore Database**
4. Configurar reglas de seguridad (modo desarrollo inicialmente):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ Solo para desarrollo
    }
  }
}
```

### 2. Obtener Credenciales
1. Ir a **Configuración del proyecto** → **Tus aplicaciones**
2. Agregar aplicación web
3. Copiar el objeto de configuración

### 3. Configurar `firebaseConfig.ts`
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyA8bWJ0RPlhWyJPiWA6Qc9huE9EkFmzKZM",
  authDomain: "tappxi-21346.firebaseapp.com",
  projectId: "tappxi-21346",
  storageBucket: "tappxi-21346.firebasestorage.app",
  messagingSenderId: "673476741503",
  appId: "1:673476741503:web:3a5889a3ae8ebd6e34b24a",
  measurementId: "G-D9B359QTKC"
};
```

### 4. Estructura de Colecciones Firestore
La aplicación utiliza las siguientes colecciones:

- **`carreras`** - Carreras realizadas
  - `taximetro: number`
  - `cobrado: number`
  - `formaPago: 'Efectivo' | 'Tarjeta' | 'Bizum' | 'Vales'`
  - `tipoCarrera: 'Urbana' | 'Interurbana'`
  - `emisora: boolean`
  - `aeropuerto: boolean`
  - `estacion: boolean`
  - `fechaHora: Timestamp`
  - `turnoId?: string`
  - `valeInfo?: { despacho, numeroAlbaran, empresa, codigoEmpresa, autoriza }`
  - `notas?: string`

- **`gastos`** - Gastos registrados
  - `importe: number`
  - `fecha: Timestamp`
  - `tipo?: string`
  - `categoria?: string`
  - `formaPago?: string`
  - `proveedor?: string`
  - `concepto?: string`
  - `taller?: string`
  - `numeroFactura?: string`
  - `baseImponible?: number`
  - `ivaImporte?: number`
  - `ivaPorcentaje?: number`
  - `kilometros?: number`
  - `kilometrosVehiculo?: number`
  - `descuento?: number`
  - `servicios?: Array<{referencia, importe, cantidad, descuentoPorcentaje, descripcion}>`
  - `notas?: string`

- **`turnos`** - Turnos de trabajo
  - `fechaInicio: Timestamp`
  - `kilometrosInicio: number`
  - `fechaFin?: Timestamp`
  - `kilometrosFin?: number`
  - `numero?: number`

- **`talleres`** - Talleres registrados
  - `nombre: string`
  - `direccion?: string`
  - `telefono?: string`
  - `createdAt: Timestamp`

- **`proveedores`** - Proveedores
  - `nombre: string`
  - `direccion?: string`
  - `telefono?: string`
  - `nif?: string`
  - `createdAt: Timestamp`

- **`conceptos`** - Conceptos de gastos
  - `nombre: string`
  - `descripcion?: string`
  - `categoria?: string`
  - `createdAt: Timestamp`

- **`ajustes`** - Configuración de la app
  - `temaOscuro: boolean`
  - `tamanoFuente: number`
  - `letraDescanso: string`
  - `objetivoDiario: number`

- **`breakConfigurations`** - Configuración de descansos
  - `startDate: string` (DD/MM/YYYY)
  - `startDayLetter: string` (A, B, C, D)
  - `weekendPattern: string` (ej: "Sabado: AC / Domingo: BD")
  - `userBreakLetter: string` (A, B, C, D)
  - `updatedAt: Timestamp`

- **`excepciones`** - Excepciones de descanso (vacaciones, cambios de letra)
  - `fechaDesde: Timestamp`
  - `fechaHasta: Timestamp`
  - `tipo: string` ('Vacaciones' | 'Cambio de Letra')
  - `aplicaPar: boolean`
  - `aplicaImpar: boolean`
  - `descripcion?: string`
  - `nuevaLetra?: string`
  - `createdAt: Timestamp`

---

## 🔐 CONFIGURACIÓN DE GOOGLE APIs (Opcional)

### Para habilitar backups a Google Drive y Google Sheets:

1. **Crear Proyecto en Google Cloud Console**
   - Ir a [Google Cloud Console](https://console.cloud.google.com/)
   - Crear nuevo proyecto o seleccionar existente

2. **Habilitar APIs**
   - Google Drive API
   - Google Sheets API

3. **Crear Credenciales OAuth 2.0**
   - Ir a **APIs y servicios** → **Credenciales**
   - Crear **ID de cliente OAuth 2.0** (Tipo: Aplicación web)
   - Agregar **Orígenes autorizados de JavaScript**:
     - `http://localhost:5173` (desarrollo)
     - `https://tu-dominio.com` (producción)
   - Agregar **URI de redirección autorizados**:
     - `http://localhost:5173` (desarrollo)
     - `https://tu-dominio.com` (producción)

4. **Configurar Variables de Entorno**
   ```env
   VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
   VITE_GOOGLE_API_KEY=tu_api_key_aqui
   ```

---

## 🎨 SISTEMA DE TEMAS Y ESTILOS

### Tema Oscuro/Claro
La aplicación soporta modo oscuro y claro, gestionado por `ThemeContext.tsx`:
- **LocalStorage**: Guarda preferencia en `temaOscuro`
- **Clases CSS**: Aplica `.dark` al `<html>` según el tema

### Temas de Color
Cuatro variantes de color disponibles:
- **Azul** (por defecto): `#3b82f6`
- **Esmeralda**: `#22c55e`
- **Ámbar**: `#f59e0b`
- **Fucsia**: `#e879f9`

LocalStorage: `temaColor` (azul | esmeralda | ambar | fucsia)

### Alto Contraste
Modo de alto contraste para accesibilidad:
- **Activación**: Toggle en ajustes
- **LocalStorage**: `altoContraste` (true/false)
- **Aplicación**: A través de `data-high-contrast` en `<html>`

### Tamaño de Fuente
Tamaño de fuente personalizable:
- **Rango**: Probablemente 12px - 20px
- **LocalStorage**: `tamanoFuente` (número)
- **Aplicación**: Variable CSS `--base-font-size`

### Estilos Globales (`index.css`)
- Variables de tema (alto contraste)
- Temas de color personalizados
- Animación `fadeInUp` para pantallas
- Ajustes para móvil (tamaños de input, safe area)
- Soporte para iPhone con notch

---

## 📱 CONFIGURACIÓN PWA (Progressive Web App)

### Manifest (`vite.config.ts`)
```typescript
manifest: {
  name: 'TAppXI - Gestión de Taxis',
  short_name: 'TAppXI',
  description: 'Aplicación para gestión de carreras, gastos y turnos de taxis',
  theme_color: '#3b82f6',
  background_color: '#18181b',
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  start_url: '/',
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
  ]
}
```

### Service Worker (Workbox)
- **Estrategia**: Cache First para assets estáticos
- **Runtime Caching**: Fuentes de Google, recursos de gstatic
- **Auto Update**: Registro automático del SW

### Iconos PWA
Generar iconos con:
```bash
npm run generate-icons
# Luego usar public/generate-icons.html para convertir a PNG
```

Iconos necesarios:
- `pwa-192x192.png` (192x192px)
- `pwa-512x512.png` (512x512px)
- `apple-touch-icon.png` (180x180px para iOS)

---

## 🧩 DETALLES DE COMPONENTES PRINCIPALES

### 1. App.tsx (Componente Raíz)
- **Estado global**: `currentPage` (navegación)
- **Estado**: `editingRaceId`, `editingTurnoId`
- **Navegación**: Sistema de enrutamiento basado en enum `Seccion`
- **Botón Home**: Visible cuando no estás en HomeScreen

### 2. HomeScreen.tsx
- **Datos mostrados**:
  - Ingresos del mes actual
  - Gastos del mes actual
  - Balance (ingresos - gastos)
  - Estado del turno activo (si existe)
  - Total del turno
  - Accesos rápidos (9 botones en grid 3x3)
- **Suscripciones en tiempo real**: Turno activo, carreras
- **Diseño**: Gradiente azul oscuro, estilo neón

### 3. ThemeContext.tsx
- **Estados**: `isDark`, `themeName`, `highContrast`
- **Funciones**: `toggleTheme()`, `setThemeName()`, `toggleHighContrast()`
- **Persistencia**: LocalStorage

### 4. FontSizeContext.tsx
- **Estado**: `fontSize` (número)
- **Función**: `setFontSize(size: number)`
- **Persistencia**: LocalStorage como `tamanoFuente`

---

## 🔄 SERVICIOS Y API

### api.ts (Servicio Principal de Firestore)
Funciones principales:

#### Carreras:
- `getCarreras()` - Obtener todas las carreras
- `getCarrerasPaginadas(limit, startAfterFecha)` - Paginación
- `getCarrerasByTurnoId(turnoId)` - Carreras de un turno
- `getCarrera(id)` - Obtener una carrera
- `addCarrera(carrera)` - Agregar carrera
- `updateCarrera(id, carrera)` - Actualizar carrera
- `deleteCarrera(id)` - Eliminar carrera
- `subscribeToCarreras(callback)` - Suscripción en tiempo real

#### Gastos:
- `getGastos()` - Obtener todos los gastos
- `getGastosForCurrentMonth()` - Gastos del mes actual
- `getGastosForToday()` - Gastos de hoy
- `getGastosByMonth(month, year)` - Gastos por mes
- `addGasto(gasto)` - Agregar gasto
- `subscribeToGastos(callback)` - Suscripción en tiempo real

#### Turnos:
- `getActiveTurno()` - Turno activo actual
- `getTurno(id)` - Obtener turno
- `getRecentTurnos(limit)` - Turnos recientes
- `getTurnosByDate(date)` - Turnos de un día
- `addTurno(kilometrosInicio)` - Iniciar turno
- `updateTurno(id, updates)` - Actualizar turno
- `closeTurno(id, kilometrosFin)` - Cerrar turno
- `subscribeToActiveTurno(callback)` - Suscripción en tiempo real

#### Análisis Avanzado:
- `isRestDay(date)` - Determinar si es día de descanso
- `getWorkingDays(startDate, endDate)` - Días trabajados
- `getIngresosByHour(startDate, endDate)` - Ingresos por hora (0-23)
- `getIngresosByDayOfWeek(startDate, endDate)` - Promedio por día de semana
- `getTotalIngresosByDayOfWeek(startDate, endDate)` - Total por día de semana
- `getIngresosByMonthYear(month, year)` - Ingresos por mes (solo días trabajados)
- `getIngresosByYear(year)` - Array de 12 meses
- `getGastosByYear(year)` - Array de 12 meses
- `getTotalIngresosByYear(year)` - Total anual
- `getTotalGastosByYear(year)` - Total anual

#### Configuración:
- `getAjustes()` - Obtener ajustes
- `saveAjustes(ajustes)` - Guardar ajustes
- `getBreakConfiguration()` - Configuración de descansos
- `saveBreakConfiguration(config)` - Guardar configuración
- `getExcepciones()` - Excepciones de descanso
- `addExcepcion(excepcion)` - Agregar excepción
- `updateExcepcion(id, excepcion)` - Actualizar excepción
- `deleteExcepcion(id)` - Eliminar excepción

#### Catálogos:
- `getProveedores()` - Lista de proveedores
- `getConceptos()` - Lista de conceptos
- `getTalleres()` - Lista de talleres
- `addProveedor(proveedor)` - Agregar proveedor
- `addConcepto(concepto)` - Agregar concepto
- `addTaller(taller)` - Agregar taller
- `getValesDirectory()` - Directorio de empresas de vales

### backup.ts
- `buildBackupPayload()` - Construir payload JSON con todos los datos
- `downloadBackupJson()` - Descargar backup como JSON
- `uploadBackupToGoogleDrive()` - Subir backup a Google Drive
- `exportToGoogleSheets()` - Exportar a Google Sheets con múltiples hojas

### exports.ts
- `exportToExcel(data, filters, filename)` - Exportar a Excel (.xlsx)
- `exportToCSV(data, filters, filename)` - Exportar a CSV
- `exportToPDFAdvanced(data, filters, filename)` - Exportar a PDF con jspdf

### google.ts
- `initGoogleClient()` - Inicializar cliente de Google APIs
- `ensureGoogleSignIn()` - Asegurar inicio de sesión
- `getCurrentUserEmail()` - Obtener email del usuario actual
- `uploadFileToDrive(opts)` - Subir archivo a Drive
- `createSpreadsheetWithSheets(title, sheetTitles)` - Crear spreadsheet
- `writeSheetValues(spreadsheetId, sheetTitle, values)` - Escribir datos en hoja

---

## 📊 TIPOS DE DATOS (types.ts)

### Enum Seccion (Navegación)
```typescript
enum Seccion {
  Home, VistaCarreras, IntroducirCarrera, EditarCarrera,
  Gastos, Turnos, EditarTurno, CerrarTurno, Historico,
  Resumen, ResumenDiario, ResumenMensual, ResumenMensualDetallado,
  ResumenGastosMensual, ResumenMensualIngresos, AjustesGenerales,
  Estadisticas, Calendario, ConfiguracionDescansos, Informes,
  AnalisisAvanzado
}
```

### Interfaces Principales
- `CarreraVista` - Modelo de carrera
- `Gasto` - Modelo de gasto
- `Turno` - Modelo de turno
- `Proveedor` - Proveedor
- `Concepto` - Concepto de gasto
- `Taller` - Taller
- `ValeInfo` - Información de vales
- `CarrerasResumen` - Resumen de carreras

---

## 🚀 CONFIGURACIÓN DE DESPLIEGUE

### Desarrollo Local
```bash
npm run dev
# Servidor en http://localhost:5173
# Accesible desde la red local en http://[IP]:5173
```

### Build de Producción
```bash
npm run build
# Genera carpeta dist/ con archivos optimizados
```

### Despliegue a GitHub Pages
1. Configurar base path en `vite.config.ts`:
   ```typescript
   const base = process.env.VITE_BASE_PATH || '/tappxi-web-replica/';
   ```

2. Desplegar:
   ```bash
   npm run deploy
   ```

3. Configurar GitHub Pages:
   - Ir a Settings → Pages
   - Source: `gh-pages` branch
   - Folder: `/ (root)`

### Despliegue a Firebase Hosting
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar proyecto
firebase init hosting

# Desplegar
npm run build
firebase deploy --only hosting
```

### Variables de Entorno en Producción
Asegúrate de configurar las variables de entorno en tu plataforma de hosting:
- Firebase Hosting: Usar Firebase Functions o configuración en `firebase.json`
- Vercel: Configurar en dashboard
- Netlify: Configurar en dashboard o `netlify.toml`

---

## 🔧 CONFIGURACIÓN DE VITE (vite.config.ts)

### Configuración Principal
```typescript
{
  base: '/tappxi-web-replica/', // Para GitHub Pages
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // Acceso desde red local
    open: true
  },
  plugins: [
    react(),
    VitePWA({ /* configuración PWA */ })
  ],
  define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
}
```

---

## 📝 FUNCIONALIDADES DETALLADAS

### 1. Gestión de Carreras
- **Agregar carrera**: Taxímetro, cobrado, forma de pago, tipo, emisora, aeropuerto, estación, notas
- **Formas de pago**: Efectivo, Tarjeta, Bizum, Vales
- **Vales**: Si la forma de pago es Vales, se puede agregar información del vale (despacho, número de albarán, empresa, código empresa, autoriza)
- **Asignación automática**: Las carreras se asignan automáticamente al turno activo si existe
- **Edición**: Editar cualquier campo de una carrera existente
- **Eliminación**: Eliminar carreras

### 2. Gestión de Gastos
- **Campos principales**: Importe, fecha, tipo, categoría, forma de pago
- **Proveedores/Talleres**: Relación con catálogos
- **Facturación**: Número de factura, base imponible, IVA (porcentaje e importe)
- **Servicios**: Array de servicios con referencia, importe, cantidad, descuento
- **Kilómetros**: Kilómetros del gasto y del vehículo
- **Descuentos**: Campo de descuento
- **Notas**: Campo de texto libre

### 3. Gestión de Turnos
- **Iniciar turno**: Kilómetros iniciales, fecha/hora automática
- **Cerrar turno**: Kilómetros finales, fecha/hora automática
- **Editar turno**: Modificar fecha inicio, kilómetros inicio, fecha fin, kilómetros fin
- **Vista de carreras**: Ver todas las carreras de un turno específico
- **Resumen del turno**: Total de carreras, total cobrado

### 4. Sistema de Descansos (Letras A, B, C, D)
- **Configuración inicial**: Fecha de inicio, letra del día inicial
- **Patrón de fin de semana**: Configurar letras para sábado y domingo (ej: "Sabado: AC / Domingo: BD")
- **Letra de descanso del usuario**: Configurar letra personal (A, B, C, D)
- **Cálculo automático**: La app calcula la letra de cada día según el patrón
- **Excepciones**:
  - **Vacaciones**: Marcar rango de fechas como días de descanso
  - **Cambio de letra**: Cambiar la letra de un rango de fechas
- **Aplicación en análisis**: Los análisis excluyen automáticamente los días de descanso

### 5. Resúmenes y Estadísticas
- **Resumen Diario**: Carreras, ingresos, gastos del día
- **Resumen Mensual**: Resumen del mes seleccionado
- **Resumen Mensual Detallado**: Desglose día por día
- **Resumen Gastos Mensual**: Desglose de gastos por categoría/proveedor
- **Resumen Ingresos Mensual**: Desglose de ingresos por forma de pago
- **Estadísticas**: Gráficos y métricas generales
- **Análisis Avanzado**: 
  - Ingresos por hora del día (0-23)
  - Promedio por día de la semana
  - Total por día de la semana
  - Comparativas mensuales/anuales

### 6. Exportación y Backup
- **Excel (.xlsx)**: Hojas separadas para carreras, gastos, turnos, resumen
- **PDF**: Informe profesional con tablas y formato
- **CSV**: Exportación simple en formato CSV
- **JSON Backup**: Descargar backup completo como JSON
- **Google Drive**: Subir backup a Google Drive
- **Google Sheets**: Exportar a Google Sheets con múltiples hojas

### 7. Calendario
- Vista mensual mostrando días de descanso
- Indicadores visuales de letras (A, B, C, D)
- Resaltado de días de descanso del usuario

---

## 🎯 FLUJO DE NAVEGACIÓN

1. **HomeScreen** → Pantalla principal con resumen y accesos rápidos
2. **Ingresos** → `IncomeScreen` → Lista de carreras → `AddEditRaceScreen` (agregar/editar)
3. **Gastos** → `ExpensesScreen` → Lista de gastos → Formulario de gasto
4. **Turnos** → `ShiftsScreen` → Lista de turnos → `EditTurnScreen` o `CloseTurnScreen`
5. **Histórico** → `HistoricoScreen` → Vista paginada de todas las carreras
6. **Resúmenes** → `ResumenScreen` → Submenú → `ResumenDiarioScreen`, `ResumenMensualScreen`, etc.
7. **Estadísticas** → `StatisticsScreen` → Gráficos y métricas
8. **Análisis Avanzado** → `AnalisisAvanzadoScreen` → Análisis detallado con filtros
9. **Calendario** → `CalendarScreen` → Vista mensual de descansos
10. **Configuración Descansos** → `BreakConfigurationScreen` → Configurar letras y excepciones
11. **Informes** → `ReportsScreen` → Exportación personalizada
12. **Ajustes** → `AjustesScreen` → Configuración de tema, fuente, etc.

---

## 🔍 DETALLES DE IMPLEMENTACIÓN

### Suscripciones en Tiempo Real
La aplicación utiliza suscripciones de Firestore para actualización en tiempo real:
- **Carreras**: `subscribeToCarreras()` - Actualiza lista automáticamente
- **Gastos**: `subscribeToGastos()` - Actualiza total del día
- **Turno Activo**: `subscribeToActiveTurno()` - Actualiza estado del turno

### Manejo de Fechas
- **Firestore Timestamps**: Conversión automática a/desde Date de JavaScript
- **Formateo**: Formato español (es-ES) para fechas y horas
- **Zonas horarias**: Considerar zona horaria del servidor/cliente

### Persistencia Local
- **LocalStorage**: Preferencias de usuario (tema, tamaño de fuente, alto contraste)
- **Keys utilizadas**:
  - `temaOscuro`: "true" | "false"
  - `temaColor`: "azul" | "esmeralda" | "ambar" | "fucsia"
  - `altoContraste`: "true" | "false"
  - `tamanoFuente`: número (string)

### Optimización de Rendimiento
- **Paginación**: `getCarrerasPaginadas()` para listados grandes
- **Memoización**: `useMemo` en componentes para cálculos pesados
- **Lazy Loading**: Carga de pantallas bajo demanda (si se implementa)
- **Service Worker**: Cache de assets estáticos

---

## 🐛 TROUBLESHOOTING COMÚN

### Error: Firebase no inicializado
- Verificar que los scripts de Firebase estén cargados en `index.html`
- Verificar credenciales en `firebaseConfig.ts`
- Verificar conexión a internet

### Error: Google APIs no funcionan
- Verificar variables de entorno `VITE_GOOGLE_CLIENT_ID` y `VITE_GOOGLE_API_KEY`
- Verificar que el origen esté autorizado en Google Cloud Console
- Verificar que las APIs estén habilitadas (Drive y Sheets)

### Error: PWA no se instala
- Verificar que se ejecute en HTTPS (o localhost)
- Verificar que los iconos PWA existan (`pwa-192x192.png`, `pwa-512x512.png`)
- Verificar manifest en `vite.config.ts`

### Error: No se cargan datos
- Verificar reglas de Firestore
- Verificar que las colecciones existan
- Verificar consola del navegador para errores

---

## 📚 RECURSOS ADICIONALES

### Documentación Referenciada
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Google APIs Documentation](https://developers.google.com/apis)

### Archivos de Configuración Importantes
- `package.json` - Dependencias y scripts
- `vite.config.ts` - Configuración de Vite y PWA
- `tsconfig.json` - Configuración de TypeScript
- `firebaseConfig.ts` - Configuración de Firebase
- `index.html` - HTML principal con meta tags PWA
- `index.css` - Estilos globales y temas

---

## ✅ CHECKLIST PARA REPLICAR LA APLICACIÓN

### Paso 1: Configuración Inicial
- [ ] Clonar/descargar código fuente
- [ ] Instalar Node.js 18+
- [ ] Ejecutar `npm install`
- [ ] Crear archivo `.env` con variables necesarias

### Paso 2: Firebase
- [ ] Crear proyecto en Firebase Console
- [ ] Habilitar Firestore Database
- [ ] Configurar reglas de seguridad
- [ ] Copiar credenciales a `firebaseConfig.ts`

### Paso 3: Google APIs (Opcional)
- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Google Drive API y Sheets API
- [ ] Crear credenciales OAuth 2.0
- [ ] Configurar orígenes autorizados
- [ ] Agregar variables de entorno

### Paso 4: Iconos PWA
- [ ] Ejecutar `npm run generate-icons`
- [ ] Convertir SVGs a PNG usando `public/generate-icons.html`
- [ ] Verificar que existan `pwa-192x192.png` y `pwa-512x512.png` en `public/`

### Paso 5: Desarrollo
- [ ] Ejecutar `npm run dev`
- [ ] Verificar que la app cargue correctamente
- [ ] Probar funcionalidades básicas (agregar carrera, gasto, turno)
- [ ] Verificar suscripciones en tiempo real

### Paso 6: Build y Despliegue
- [ ] Ejecutar `npm run build`
- [ ] Verificar carpeta `dist/`
- [ ] Configurar hosting (GitHub Pages, Firebase Hosting, etc.)
- [ ] Desplegar aplicación
- [ ] Verificar PWA funciona correctamente

### Paso 7: Verificación Final
- [ ] Probar todas las pantallas
- [ ] Verificar persistencia de datos en Firestore
- [ ] Probar exportación (Excel, PDF, CSV)
- [ ] Probar backups (Google Drive, Google Sheets)
- [ ] Verificar temas y ajustes
- [ ] Probar en dispositivos móviles
- [ ] Verificar instalación PWA

---

## 🔐 SEGURIDAD

### Reglas de Firestore Recomendadas (Producción)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura solo si el usuario está autenticado
    // (Si implementas autenticación)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // O si es una aplicación pública con validaciones:
    match /carreras/{carreraId} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasAll(['taximetro', 'cobrado', 'formaPago']) 
                   && request.resource.data.taximetro is number
                   && request.resource.data.cobrado is number;
    }
    // ... aplicar reglas similares para otras colecciones
  }
}
```

### Variables de Entorno
- ⚠️ **NUNCA** commitees archivos `.env` con credenciales reales
- Usa `.env.example` como plantilla
- Configura variables de entorno en tu plataforma de hosting

---

## 📱 DETALLES ESPECÍFICOS DE PANTALLAS PRINCIPALES

### HomeScreen.tsx (Pantalla Principal)
**Características**:
- **Gradiente de fondo**: `linear-gradient(180deg, #08A8D7 0%, #072639 28%, #090B13 100%)`
- **Tarjetas de resumen**: 3 tarjetas (Ingresos, Gastos, Balance) con colores específicos:
  - Ingresos: `#00D4FF` (cyan)
  - Gastos: `#FF3DD0` (rosa)
  - Balance: `#00FF94` (verde)
- **Estado del turno activo**:
  - Muestra si hay turno activo o no
  - Si hay turno: muestra total, kms inicio, hora inicio, número de carreras
  - Si no hay turno: mensaje "NO HAY TURNO ACTIVO" con fecha actual
- **Grid de accesos rápidos**: 3x3 (9 botones) con navegación condicional
  - "Ingresos" → Navega a `VistaCarreras` si hay turno activo, sino a `Turnos`
- **Suscripciones en tiempo real**: Turno activo y carreras

### AddEditRaceScreen.tsx (Agregar/Editar Carrera)
**Características**:
- **Modo edición**: Detecta si `raceId` es `null` (nuevo) o tiene valor (editar)
- **Teclado numérico personalizado**: Para taxímetro y cobrado
- **Forma de pago**: Dropdown con opciones (Efectivo, Tarjeta, Bizum, Vales)
- **Vales**: 
  - Si forma de pago es "Vales", muestra formulario específico
  - Directorio de empresas de vales con autocompletado
  - Campos: despacho, número albarán, empresa, código empresa, autoriza
- **Tipo de carrera**: Urbana / Interurbana (por defecto Urbana)
- **Checkboxes**: Emisora, Aeropuerto, Estación
- **Notas**: Campo de texto opcional
- **Validación**: Verifica que los campos obligatorios estén completos
- **Asignación automática**: Si hay turno activo, se asigna automáticamente

### ExpensesScreen.tsx (Gestión de Gastos)
**Características**:
- **Lista de gastos**: Ordenados por fecha descendente
- **Formulario completo**:
  - Importe, fecha, tipo, categoría, forma de pago
  - Relación con proveedores, conceptos, talleres
  - Facturación: número factura, base imponible, IVA (porcentaje e importe)
  - Servicios: Array de servicios con referencia, importe, cantidad, descuento
  - Kilómetros: del gasto y del vehículo
  - Descuentos
  - Notas
- **Catálogos**: Desplegables de proveedores, conceptos, talleres
- **Edición**: Permite editar gastos existentes
- **Eliminación**: Permite eliminar gastos

### ShiftsScreen.tsx (Gestión de Turnos)
**Características**:
- **Lista de turnos**: Recientes ordenados por fecha fin descendente
- **Turno activo**: Se muestra destacado (si existe)
- **Iniciar turno**: Formulario con kilómetros inicio
- **Cerrar turno**: Formulario con kilómetros fin
- **Editar turno**: Permite modificar fecha inicio, kms inicio, fecha fin, kms fin
- **Información del turno**: Fecha inicio, hora inicio, kms inicio, fecha fin, hora fin, kms fin, kms recorridos, duración, total de carreras, total cobrado

### AjustesScreen.tsx (Configuración)
**Características**:
- **Tema oscuro/claro**: Toggle para cambiar tema
- **Tema de color**: Selector entre Azul, Esmeralda, Ámbar, Fucsia
- **Alto contraste**: Toggle para accesibilidad
- **Tamaño de fuente**: Slider para ajustar tamaño (probablemente 12-20px)
- **Objetivo diario**: Input numérico para objetivo de ingresos diarios
- **Backup y Exportación**:
  - Descargar backup JSON
  - Subir backup a Google Drive
  - Exportar a Google Sheets
  - Exportación avanzada (Excel, PDF, CSV) con filtros de fecha
- **Archivado de datos**: Archivar datos operacionales más antiguos que X meses
- **Reportes personalizados**: Crear, editar, eliminar reportes personalizados

### AnalisisAvanzadoScreen.tsx (Análisis Avanzado)
**Características**:
- **Tabs**: "Horarios Óptimos" y "Comparativas"
- **Horarios Óptimos**:
  - Gráfico de ingresos por hora del día (0-23)
  - Gráfico de promedio por día de la semana
  - Filtros de rango de fechas
  - Solo incluye días trabajados (excluye descansos)
- **Comparativas**:
  - Comparativa anual (año actual vs año anterior)
  - Ingresos, gastos, balance, diferencia, porcentaje
  - Solo incluye días trabajados

### BreakConfigurationScreen.tsx (Configuración Descansos)
**Características**:
- **Fecha de inicio**: Input de fecha (DD/MM/YYYY)
- **Letra del día inicial**: Selector (A, B, C, D)
- **Patrón de fin de semana**: Texto (ej: "Sabado: AC / Domingo: BD")
- **Letra de descanso del usuario**: Selector (A, B, C, D)
- **Excepciones**: Lista de excepciones (vacaciones, cambios de letra)
  - Agregar excepción: Rango de fechas, tipo, descripción, nueva letra (si aplica)
  - Editar excepción
  - Eliminar excepción

### CalendarScreen.tsx (Calendario)
**Características**:
- **Vista mensual**: Calendario mostrando el mes actual
- **Indicadores visuales**: Días de descanso resaltados, letras (A, B, C, D) mostradas
- **Navegación**: Cambiar entre meses
- **Clic en día**: Muestra detalles del día (si es día de descanso, letra, etc.)

### ReportsScreen.tsx (Informes)
**Características**:
- **Reportes personalizados**: Lista de reportes guardados
- **Crear reporte**: Formulario con nombre, descripción, filtros
- **Filtros disponibles**:
  - Rango de fechas
  - Tipo (todos, ingresos, gastos, turnos)
  - Forma de pago
  - Proveedor
  - Concepto
  - Taller
- **Exportación**: Exportar reporte como Excel, PDF, CSV
- **Edición**: Editar reportes existentes
- **Eliminación**: Eliminar reportes

---

## 🎨 DISEÑO Y ESTILOS DETALLADOS

### Paleta de Colores Principal
- **Fondo oscuro**: `#18181b` (zinc-950)
- **Fondo claro**: `#fafafa` (zinc-50)
- **Amarillo principal**: `#facc15` (yellow-400) - Barra superior
- **Cyan**: `#00D4FF` - Acentos e iconos
- **Rosa**: `#FF3DD0` - Gastos
- **Verde**: `#00FF94` - Balance positivo

### Gradientes
- **HomeScreen fondo**: `linear-gradient(180deg, #08A8D7 0%, #072639 28%, #090B13 100%)`
- **Botones primarios**: `linear-gradient(135deg, rgba(0,255,148,0.85), rgba(0,224,255,0.95))`

### Tipografía
- **Fuente base**: System fonts (`font-sans` en Tailwind)
- **Tamaño base**: 14px (configurable via `--base-font-size`)
- **Formato de moneda**: Español (coma decimal, símbolo €)

### Animaciones
- **fadeInUp**: Animación de entrada suave para pantallas
  ```css
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  ```
- **Duración**: 0.25s ease-out

---

## 📞 NOTAS FINALES

Este documento contiene toda la información necesaria para replicar exactamente la aplicación TAppXI Web Replica en otro entorno. Cada sección está diseñada para ser completa y autocontenida.

**Última actualización**: Generado automáticamente basado en el estado actual del código.

**Versión de la aplicación**: 0.0.0 (según package.json)

---

## 🎉 CONCLUSIÓN

Con este documento, tienes toda la información necesaria para:
1. Entender completamente la arquitectura de la aplicación
2. Configurar el entorno de desarrollo
3. Replicar la aplicación en un nuevo proyecto
4. Personalizar y extender la funcionalidad
5. Desplegar la aplicación en producción

¡Buena suerte con tu réplica! 🚀

