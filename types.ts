export enum Seccion {
    Home = "Home",
    Turnos = "Turnos",
    Carreras = "Carreras",
    Gastos = "Gastos",
    Estadisticas = "Estadísticas",
    Informes = "Informes",
    Configuracion = "Configuración",
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
    ResumenMensualIngresos = "Resumen Mensual Ingresos",
    Historico = "Histórico",
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

export interface CarreraVista {
    id: string; // Firestore document ID
    taximetro: number;
    cobrado: number;
    formaPago: 'Efectivo' | 'Tarjeta' | 'Bizum' | 'Vales';
    emisora: boolean;
    aeropuerto: boolean;
    fechaHora: Date;
    turnoId?: string; // ID del turno al que pertenece esta carrera
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
}
