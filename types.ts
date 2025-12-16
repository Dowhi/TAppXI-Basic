export enum Seccion {
    Home = "Home",
    Turnos = "Turnos",
    Carreras = "Carreras",
    Gastos = "Gastos",
    Estadisticas = "Estad�sticas",
    Informes = "Informes",
    Configuracion = "Configuraci�n",
    VistaCarreras = "Vista Carreras",
    IntroducirCarrera = "Introducir Carrera",
    EditarCarrera = "Editar Carrera",
    EditarTurno = "Editar Turno",
    Calendario = "Calendario",
    CerrarTurno = "Cerrar Turno",
    AjustesGenerales = "Ajustes Generales",
    Backup = "Backup",
    Recordatorios = "Recordatorios",
    Resumen = "Resumen",
    ResumenDiario = "Resumen Diario",
    ResumenMensual = "Resumen Mensual",
    ResumenMensualDetallado = "Resumen Mensual Detallado",
    ResumenGastosMensual = "Resumen de Gastos Mensual",
    EditarGasto = "Editar Gasto",
    ResumenMensualIngresos = "Resumen Mensual Ingresos",
    Historico = "Hist�rico",
    ConfiguracionDescansos = "Configuración Descansos",
    AnalisisAvanzado = "Análisis Avanzado",
    EstacionTren = "Estación Tren",
    Aeropuerto = "Aeropuerto",
}

export interface Ajustes {
    temaOscuro: boolean;
    tamanoFuente: number;
    letraDescanso?: string;
    objetivoDiario: number;
    // Personalización
    temaColor?: string;
    altoContraste?: boolean;
    // Tarifas
    tarifa1?: number;
    tarifa2?: number;
    tarifa3?: number;
    tarifaAeropuertoDia?: number;
    tarifaAeropuertoNoche?: number;
    // Branding
    logo?: string;
    datosFiscales?: {
        nombre: string;
        nif: string;
        direccion: string;
        telefono: string;
        email: string;
    };
}


export interface CarrerasResumen {
    pendiente: string;
    total: string;
    carreras: string;
    tarjeta: string;
    horaInicio: string;
    horaTrabajo: string;
    kmsInicio: string;
    propina: string;
    totalTarjeta: string;
    pendienteValor: number;
}

export interface ValeInfo {
    despacho: string;
    numeroAlbaran: string;
    empresa: string;
    codigoEmpresa: string;
    autoriza: string;
}

export interface CarreraVista {
    id: string; // Firestore document ID
    taximetro: number;
    cobrado: number;
    formaPago: 'Efectivo' | 'Tarjeta' | 'Bizum' | 'Vales';
    tipoCarrera?: 'Urbana' | 'Interurbana'; // Tipo de carrera, 'Urbana' por defecto
    emisora: boolean;
    aeropuerto: boolean;
    estacion?: boolean; // Nueva opción para estación
    fechaHora: Date;
    turnoId?: string; // ID del turno al que pertenece esta carrera
    valeInfo?: ValeInfo | null;
    notas?: string | null;
}

export interface Gasto {
    id: string;
    importe: number;
    fecha: Date;
    tipo?: string;
    categoria?: string;
    formaPago?: string;
    proveedor?: string;
    concepto?: string;
    taller?: string;
    numeroFactura?: string;
    baseImponible?: number;
    ivaImporte?: number;
    ivaPorcentaje?: number;
    kilometros?: number;
    kilometrosVehiculo?: number;
    kmParciales?: number;
    litros?: number;
    precioPorLitro?: number;
    descuento?: number;
    servicios?: Array<{
        referencia?: string;
        importe?: number;
        cantidad?: number;
        descuentoPorcentaje?: number;
        descripcion?: string;
    }>;
    notas?: string;
}

export interface Taller {
    id: string;
    nombre: string;
    direccion?: string | null;
    telefono?: string | null;
}

export interface Proveedor {
    id: string;
    nombre: string;
    direccion?: string | null;
    telefono?: string | null;
    nif?: string | null;
}

export interface Concepto {
    id: string;
    nombre: string;
    descripcion?: string | null;
    categoria?: string | null;
}

export interface Turno {
    id: string;
    fechaInicio: Date;
    kilometrosInicio: number;
    fechaFin?: Date;
    kilometrosFin?: number;
    numero?: number;
}

export interface Reminder {
    id: string;
    titulo: string;
    descripcion?: string;
    tipo: 'mantenimiento' | 'pago' | 'documentacion' | 'personalizado';
    fechaLimite: string; // ISO string
    horaRecordatorio?: string; // HH:MM formato
    fechaRecordatorio?: string; // ISO string - fecha para mostrar alerta antes
    sonidoActivo: boolean; // Si debe reproducir sonido
    completado: boolean;
    fechaCompletado?: string; // ISO string
    // Para mantenimiento por kilómetros
    kilometrosLimite?: number;
    kilometrosActuales?: number;
    // Metadatos
    createdAt: string;
    lastNotified?: string; // Última vez que se mostró la notificación
}
