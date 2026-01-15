import React, { useState, useEffect } from 'react';
import { Seccion, Proveedor, Concepto, Taller } from '../types';
import ScreenTopBar from '../components/ScreenTopBar';
import {
    getProveedores,
    updateProveedor,
    deleteProveedor,
    getConceptos,
    updateConcepto,
    deleteConcepto,
    getTalleres,
    updateTaller,
    deleteTaller
} from '../services/api';
import { useToast } from '../components/Toast';

interface MasterDataScreenProps {
    navigateTo: (page: Seccion) => void;
}

type Tab = 'proveedores' | 'conceptos' | 'talleres';

export const MasterDataScreen: React.FC<MasterDataScreenProps> = ({ navigateTo }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('proveedores');
    const [isLoading, setIsLoading] = useState(true);

    // Data lists
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [conceptos, setConceptos] = useState<Concepto[]>([]);
    const [talleres, setTalleres] = useState<Taller[]>([]);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null); // Proveedor or Concepto
    const [itemName, setItemName] = useState('');
    const [itemDetails, setItemDetails] = useState<any>({}); // Optional additional fields

    // Loading data
    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'proveedores') {
                const data = await getProveedores();
                setProveedores(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
            } else if (activeTab === 'conceptos') {
                const data = await getConceptos();
                setConceptos(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
            } else {
                const data = await getTalleres();
                setTalleres(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error al cargar datos', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    // Handlers
    const handleEdit = (item: any) => {
        setCurrentItem(item);
        setItemName(item.nombre);
        if (activeTab === 'proveedores') {
            setItemDetails({
                direccion: item.direccion || '',
                telefono: item.telefono || '',
                nif: item.nif || ''
            });
        } else if (activeTab === 'conceptos') {
            setItemDetails({
                descripcion: item.descripcion || '',
                categoria: item.categoria || ''
            });
        } else {
            setItemDetails({
                direccion: item.direccion || '',
                telefono: item.telefono || '',
                nif: item.nif || ''
            });
        }
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar "${name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            if (activeTab === 'proveedores') {
                await deleteProveedor(id);
            } else if (activeTab === 'conceptos') {
                await deleteConcepto(id);
            } else {
                await deleteTaller(id);
            }
            showToast('Elemento eliminado correctamente', 'success');
            loadData();
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('Error al eliminar el elemento', 'error');
        }
    };

    const handleSave = async () => {
        if (!itemName.trim()) {
            showToast('El nombre es obligatorio', 'error');
            return;
        }

        try {
            if (activeTab === 'proveedores') {
                await updateProveedor(currentItem.id, {
                    nombre: itemName,
                    direccion: itemDetails.direccion || null,
                    telefono: itemDetails.telefono || null,
                    nif: itemDetails.nif || null
                });
            } else if (activeTab === 'conceptos') {
                await updateConcepto(currentItem.id, {
                    nombre: itemName,
                    descripcion: itemDetails.descripcion || null,
                    categoria: itemDetails.categoria || null
                });
            } else {
                await updateTaller(currentItem.id, {
                    nombre: itemName,
                    direccion: itemDetails.direccion || null,
                    telefono: itemDetails.telefono || null,
                    nif: itemDetails.nif || null
                });
            }
            showToast('Cambios guardados', 'success');
            setIsEditModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving item:', error);
            showToast('Error al guardar los cambios', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
            <ScreenTopBar title="Gestión de Datos" onBack={() => navigateTo(Seccion.AjustesGenerales)} />

            <div className="p-4 space-y-4 max-w-2xl mx-auto">
                {/* Tabs */}
                <div className="flex border-b border-zinc-800">
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'proveedores'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                        onClick={() => setActiveTab('proveedores')}
                    >
                        Proveedores ({proveedores.length})
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'conceptos'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                        onClick={() => setActiveTab('conceptos')}
                    >
                        Conceptos ({conceptos.length})
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'talleres'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                        onClick={() => setActiveTab('talleres')}
                    >
                        Talleres ({talleres.length})
                    </button>
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="text-center py-8 text-zinc-500">Cargando...</div>
                ) : (
                    <div className="space-y-2">
                        {(activeTab === 'proveedores' ? proveedores : activeTab === 'conceptos' ? conceptos : talleres).length === 0 && (
                            <div className="text-center py-8 text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed">
                                No hay elementos registrados.
                            </div>
                        )}

                        {(activeTab === 'proveedores' ? proveedores : activeTab === 'conceptos' ? conceptos : talleres).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/80 transition-colors"
                            >
                                <div>
                                    <div className="font-semibold">{item.nombre}</div>
                                    <div className="text-xs text-zinc-500">
                                        {'tipo' in item // Check if it's not a generic object
                                            ? ''
                                            : activeTab === 'proveedores'
                                                ? (item as Proveedor).nif || (item as Proveedor).telefono || 'Sin detalles'
                                                : activeTab === 'conceptos'
                                                    ? (item as Concepto).categoria || 'Sin categoría'
                                                    : (item as Taller).nif || (item as Taller).telefono || 'Sin detalles'
                                        }
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-full transition-colors"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id, item.nombre)}
                                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <h3 className="text-lg font-bold">Editar {activeTab === 'proveedores' ? 'Proveedor' : activeTab === 'conceptos' ? 'Concepto' : 'Taller'}</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>

                            {(activeTab === 'proveedores' || activeTab === 'talleres') && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">NIF (Opcional)</label>
                                        <input
                                            type="text"
                                            value={itemDetails.nif || ''}
                                            onChange={(e) => setItemDetails({ ...itemDetails, nif: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Dirección (Opcional)</label>
                                        <input
                                            type="text"
                                            value={itemDetails.direccion || ''}
                                            onChange={(e) => setItemDetails({ ...itemDetails, direccion: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono (Opcional)</label>
                                        <input
                                            type="tel"
                                            value={itemDetails.telefono || ''}
                                            onChange={(e) => setItemDetails({ ...itemDetails, telefono: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'conceptos' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría (Opcional)</label>
                                        <input
                                            type="text"
                                            value={itemDetails.categoria || ''}
                                            onChange={(e) => setItemDetails({ ...itemDetails, categoria: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="Ej. Fiscal, Personal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción (Opcional)</label>
                                        <textarea
                                            value={itemDetails.descripcion || ''}
                                            onChange={(e) => setItemDetails({ ...itemDetails, descripcion: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[80px]"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterDataScreen;
