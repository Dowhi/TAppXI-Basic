// Servicio para gestionar plantillas de gastos
// Almacena plantillas en localStorage para acceso rápido

export interface ExpenseTemplate {
    id: string;
    nombre: string;
    // Campos del gasto
    importe?: number;
    formaPago?: string;
    proveedor?: string;
    concepto?: string;
    taller?: string;
    numeroFactura?: string;
    baseImponible?: number;
    ivaPorcentaje?: number;
    ivaImporte?: number;
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
    tipo?: 'actividad' | 'vehiculo';
    // Metadatos
    createdAt: string;
    lastUsed?: string;
    useCount: number;
}

const STORAGE_KEY = 'expenseTemplates';

/**
 * Obtener todas las plantillas
 */
export const getTemplates = (): ExpenseTemplate[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error leyendo plantillas:', error);
        return [];
    }
};

/**
 * Guardar una plantilla
 */
export const saveTemplate = (template: Omit<ExpenseTemplate, 'id' | 'createdAt' | 'useCount'>): string => {
    const templates = getTemplates();
    const newTemplate: ExpenseTemplate = {
        ...template,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        useCount: 0,
    };
    templates.push(newTemplate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return newTemplate.id;
};

/**
 * Actualizar una plantilla
 */
export const updateTemplate = (id: string, updates: Partial<ExpenseTemplate>): boolean => {
    const templates = getTemplates();
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    templates[index] = { ...templates[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
};

/**
 * Eliminar una plantilla
 */
export const deleteTemplate = (id: string): boolean => {
    const templates = getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length === templates.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
};

/**
 * Marcar plantilla como usada (incrementa contador y actualiza fecha)
 */
export const markTemplateAsUsed = (id: string): void => {
    const templates = getTemplates();
    const template = templates.find(t => t.id === id);
    if (template) {
        template.useCount = (template.useCount || 0) + 1;
        template.lastUsed = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
};

/**
 * Obtener plantillas más usadas (ordenadas por uso)
 */
export const getMostUsedTemplates = (limit: number = 5): ExpenseTemplate[] => {
    const templates = getTemplates();
    return templates
        .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
        .slice(0, limit);
};

/**
 * Obtener plantillas recientes (usadas recientemente)
 */
export const getRecentTemplates = (limit: number = 5): ExpenseTemplate[] => {
    const templates = getTemplates();
    return templates
        .filter(t => t.lastUsed)
        .sort((a, b) => {
            const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
            const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, limit);
};
















