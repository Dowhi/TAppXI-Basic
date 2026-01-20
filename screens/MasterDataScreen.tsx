import React, { useState, useEffect } from 'react';
import { Seccion, Proveedor, Concepto, Taller, ValeDirectoryEntry } from '../types';
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
    deleteTaller,
    getValesDirectory,
    addValeDirectoryEntry,
    updateValeDirectoryEntry,
    deleteValeDirectoryEntry,
} from '../services/api';
import { useToast } from '../components/Toast';

interface MasterDataScreenProps {
    navigateTo: (page: Seccion) => void;
    initialTab?: Tab;
}

type Tab = 'proveedores' | 'conceptos' | 'talleres' | 'vales';

export const MasterDataScreen: React.FC<MasterDataScreenProps> = ({ navigateTo, initialTab = 'proveedores' }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [isLoading, setIsLoading] = useState(true);

    // Data lists
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [conceptos, setConceptos] = useState<Concepto[]>([]);
    const [talleres, setTalleres] = useState<Taller[]>([]);
    const [vales, setVales] = useState<ValeDirectoryEntry[]>([]);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [itemName, setItemName] = useState('');
    const [itemDetails, setItemDetails] = useState<any>({});

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
            } else if (activeTab === 'talleres') {
                const data = await getTalleres();
                setTalleres(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
            } else if (activeTab === 'vales') {
                const data = await getValesDirectory();
                setVales(data.sort((a, b) => a.empresa.localeCompare(b.empresa)));
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
    const handleAdd = () => {
        setCurrentItem(null);
        setItemName('');
        if (activeTab === 'vales') {
            setItemDetails({
                codigoEmpresa: '',
                direccion: '',
                telefono: ''
            });
        } else if (activeTab === 'proveedores' || activeTab === 'talleres') {
            setItemDetails({
                direccion: '',
                telefono: '',
                nif: ''
            });
        } else if (activeTab === 'conceptos') {
            setItemDetails({
                descripcion: '',
                categoria: ''
            });
        }
        setIsEditModalOpen(true);
    };

    const handleEdit = (item: any) => {
        setCurrentItem(item);
        if (activeTab === 'vales') {
            setItemName(item.empresa);
            setItemDetails({
                codigoEmpresa: item.codigoEmpresa || '',
                direccion: item.direccion || '',
                telefono: item.telefono || ''
            });
        } else {
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
            } else if (activeTab === 'talleres') {
                setItemDetails({
                    direccion: item.direccion || '',
                    telefono: item.telefono || '',
                    nif: item.nif || ''
                });
            }
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
            } else if (activeTab === 'talleres') {
                await deleteTaller(id);
            } else {
                await deleteValeDirectoryEntry(id);
            }
            showToast('Elemento eliminado correctamente', 'success');
            loadData();
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('Error al eliminar el elemento', 'error');
        }
    };

    const handleSave = async () => {
        const isCreating = !currentItem;

        if (!itemName.trim()) {
            showToast(activeTab === 'vales' ? 'El nombre de la empresa es obligatorio' : 'El nombre es obligatorio', 'error');
            return;
        }

        if (activeTab === 'vales' && !itemDetails.codigoEmpresa.trim()) {
            showToast('El código de empresa es obligatorio', 'error');
            return;
        }

        try {
            if (isCreating) {
                // Creating new entry
                if (activeTab === 'vales') {
                    await addValeDirectoryEntry({
                        empresa: itemName,
                        codigoEmpresa: itemDetails.codigoEmpresa,
                        direccion: itemDetails.direccion || undefined,
                        telefono: itemDetails.telefono || undefined
                    });
                }
                showToast('Elemento creado correctamente', 'success');
            } else {
                // Updating existing entry
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
                } else if (activeTab === 'talleres') {
                    await updateTaller(currentItem.id, {
                        nombre: itemName,
                        direccion: itemDetails.direccion || null,
                        telefono: itemDetails.telefono || null,
                        nif: itemDetails.nif || null
                    });
                } else if (activeTab === 'vales') {
                    await updateValeDirectoryEntry(currentItem.id, {
                        empresa: itemName,
                        codigoEmpresa: itemDetails.codigoEmpresa || '',
                        direccion: itemDetails.direccion || null,
                        telefono: itemDetails.telefono || null
                    });
                }
                showToast('Cambios guardados', 'success');
            }
            setIsEditModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving item:', error);
            showToast('Error al guardar', 'error');
        }
    };

    const currentList = activeTab === 'proveedores'
        ? proveedores
        : activeTab === 'conceptos'
            ? conceptos
            : activeTab === 'talleres'
                ? talleres
                : vales;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
            <ScreenTopBar
                title={activeTab === 'vales' ? "Gestión de Vales / Empresas" : "Gestión de Prov., Talleres y Conc."}
                onBack={() => navigateTo(Seccion.Varios)}
            />

            <div className="p-4 space-y-4 max-w-2xl mx-auto">
                {/* Tabs */}
                {((initialTab === 'vales' ? ['vales'] : ['proveedores', 'conceptos', 'talleres']) as Tab[]).length > 1 && (
                    <div className="flex border-b border-zinc-800 overflow-x-auto scroller-hidden">
                        {(['proveedores', 'conceptos', 'talleres'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                className={`flex-1 min-w-[100px] py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                    }`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab} ({
                                    tab === 'proveedores' ? proveedores.length :
                                        tab === 'conceptos' ? conceptos.length :
                                            talleres.length
                                })
                            </button>
                        ))}
                    </div>
                )}

                {/* List */}
                {isLoading ? (
                    <div className="text-center py-8 text-zinc-500">Cargando...</div>
                ) : (
                    <div className="space-y-2">
                        {currentList.length === 0 && (
                            <div className="text-center py-8 text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed">
                                No hay elementos registrados en {activeTab}.
                            </div>
                        )}

                        {currentList.map((item: any) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/80 transition-colors"
                            >
                                <div>
                                    <div className="font-semibold">{activeTab === 'vales' ? item.empresa : item.nombre}</div>
                                    <div className="text-xs text-zinc-500">
                                        {activeTab === 'vales'
                                            ? item.codigoEmpresa || 'Sin código'
                                            : activeTab === 'proveedores'
                                                ? item.nif || item.telefono || 'Sin detalles'
                                                : activeTab === 'conceptos'
                                                    ? item.categoria || 'Sin categoría'
                                                    : item.nif || item.telefono || 'Sin detalles'
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
                                        onClick={() => handleDelete(item.id, activeTab === 'vales' ? item.empresa : item.nombre)}
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

                {/* Floating Add Button (only for vales tab) */}
                {activeTab === 'vales' && (
                    <button
                        onClick={handleAdd}
                        className="fixed bottom-20 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl shadow-blue-900/50 transition-all hover:scale-110 active:scale-95 z-40"
                        title="Añadir nueva empresa"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
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

                        <h3 className="text-lg font-bold">{currentItem ? 'Editar' : 'Añadir'} {
                            activeTab === 'proveedores' ? 'Proveedor' :
                                activeTab === 'conceptos' ? 'Concepto' :
                                    activeTab === 'vales' ? 'Empresa de Vale' :
                                        'Taller'
                        }</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre / Empresa</label>
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
                                </>
                            )}

                            {(activeTab === 'proveedores' || activeTab === 'talleres' || activeTab === 'vales') && (
                                <>
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

                            {activeTab === 'vales' && (
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                                        Código Empresa <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={itemDetails.codigoEmpresa || ''}
                                        onChange={(e) => setItemDetails({ ...itemDetails, codigoEmpresa: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Ej: UBER, CABIFY, etc."
                                    />
                                </div>
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
                                {currentItem ? 'Guardar Cambios' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterDataScreen;
