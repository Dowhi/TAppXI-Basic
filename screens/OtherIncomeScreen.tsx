import React, { useState, useEffect } from 'react';
import { Seccion, OtroIngreso } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getOtrosIngresos, addOtroIngreso, deleteOtroIngreso } from '../services/api';
import ScreenTopBar from '../components/ScreenTopBar';

const PlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const TrashIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

interface OtherIncomeScreenProps {
    navigateTo: (page: Seccion, id?: string) => void;
}

const OtherIncomeScreen: React.FC<OtherIncomeScreenProps> = ({ navigateTo }) => {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [ingresos, setIngresos] = useState<OtroIngreso[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        concepto: '',
        importe: '',
        formaPago: 'Efectivo',
        notas: ''
    });

    useEffect(() => {
        fetchIngresos();
    }, []);

    const fetchIngresos = async () => {
        try {
            setLoading(true);
            const data = await getOtrosIngresos();
            setIngresos(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        } catch (error) {
            console.error('Error fetching otros ingresos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await addOtroIngreso({
                fecha: new Date(formData.fecha),
                concepto: formData.concepto,
                importe: parseFloat(formData.importe),
                formaPago: formData.formaPago,
                notas: formData.notas
            });
            setShowModal(false);
            setFormData({
                fecha: new Date().toISOString().split('T')[0],
                concepto: '',
                importe: '',
                formaPago: 'Efectivo',
                notas: ''
            });
            await fetchIngresos();
        } catch (error) {
            console.error('Error adding otro ingreso:', error);
            alert('Error al guardar el ingreso');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este ingreso?')) {
            try {
                setLoading(true);
                // In api.ts it might be deleteOtroIngreso
                const { deleteOtroIngreso } = await import('../services/api');
                await deleteOtroIngreso(id);
                await fetchIngresos();
            } catch (error) {
                console.error('Error deleting otro ingreso:', error);
                alert('Error al eliminar el ingreso');
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading && ingresos.length === 0) return <LoadingSpinner />;

    return (
        <div className={`min-h-screen ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
            <ScreenTopBar
                title="Otros Ingresos"
                onBack={() => navigateTo(Seccion.Varios)}
            />

            <div className="p-4 pb-20 max-w-xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Gestiona tus ingresos extra como publicidad, propinas o eventos.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon />
                    </button>
                </div>

                <div className="space-y-4">
                    {ingresos.length === 0 ? (
                        <div className={`p-8 text-center rounded-2xl ${isDark ? 'bg-zinc-900/50' : 'bg-white'} border ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                            <p className="text-zinc-500 italic">No hay otros ingresos registrados.</p>
                        </div>
                    ) : (
                        ingresos.map((ing) => (
                            <div
                                key={ing.id}
                                className={`p-4 rounded-2xl ${isDark ? 'bg-zinc-900' : 'bg-white'} shadow-sm flex justify-between items-center border ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}
                            >
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
                                            {new Date(ing.fecha).toLocaleDateString()}
                                        </span>
                                        <span className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                            +{ing.importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                    </div>
                                    <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{ing.concepto}</h3>
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                                            {ing.formaPago}
                                        </span>
                                        {ing.notas && <span className="truncate max-w-[150px] italic">"{ing.notas}"</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(ing.id)}
                                    className={`ml-4 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition`}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Total Summary */}
                <div className={`mt-8 p-6 rounded-3xl ${isDark ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50 border-blue-100'} border-2 flex justify-between items-center`}>
                    <div>
                        <p className="text-blue-500 font-medium">Total Acumulado</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-2xl font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {ingresos.reduce((sum, i) => sum + i.importe, 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-md p-6 rounded-3xl ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'} shadow-2xl animate-in fade-in zoom-in duration-200`}>
                        <h2 className="text-xl font-bold mb-6">Nuevo Ingreso</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 opacity-70">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fecha}
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 opacity-70">Concepto</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Publicidad en puertas"
                                    value={formData.concepto}
                                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                                    className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 opacity-70">Importe (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={formData.importe}
                                        onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
                                        className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 opacity-70">Forma Pago</label>
                                    <select
                                        value={formData.formaPago}
                                        onChange={(e) => setFormData({ ...formData, formaPago: e.target.value })}
                                        className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    >
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Bizum">Bizum</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 opacity-70">Notas (opcional)</label>
                                <textarea
                                    rows={2}
                                    value={formData.notas}
                                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                    className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className={`flex-1 p-3 rounded-2xl font-bold ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} hover:opacity-80 transition`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 p-3 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OtherIncomeScreen;
