import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Layers, Search, Plus, X, Edit2, AlertTriangle, Package, Hash, Tag } from 'lucide-react';

const Inventory = () => {
    const { hasRole } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '', component_id: '', quantity: 0, category: '', status: 'available'
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const data = await api.getInventory();
            setItems(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) { fetchItems(); return; }
        try {
            const data = await api.searchInventory(searchQuery);
            setItems(data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editItem) {
                await api.updateItem(editItem.id, formData);
            } else {
                await api.createItem(formData);
            }
            fetchItems();
            handleCloseModal();
        } catch (err) { console.error(err); }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditItem(null);
        setFormData({ name: '', component_id: '', quantity: 0, category: '', status: 'available' });
    };

    const handleEdit = (item) => {
        setEditItem(item);
        setFormData({
            name: item.name,
            component_id: item.component_id,
            quantity: item.quantity,
            category: item.category || '',
            status: item.status
        });
        setShowModal(true);
    };

    const getStatusStyle = (status) => {
        const styles = {
            available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            low: 'bg-amber-100 text-amber-700 border-amber-200',
            out_of_stock: 'bg-red-100 text-red-700 border-red-200',
        };
        return styles[status] || styles.available;
    };

    const getStatusLabel = (status) => {
        const labels = { available: 'Available', low: 'Low Stock', out_of_stock: 'Out of Stock' };
        return labels[status] || status;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg">
                        <Layers className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="page-header">Inventory</h1>
                        <p className="page-subtitle text-sm">Track lab equipment and components</p>
                    </div>
                </div>
                {hasRole('assistant') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary flex items-center gap-2 text-sm"
                    >
                        <Plus size={18} />
                        Add Item
                    </button>
                )}
            </header>

            {/* Search */}
            <div className="section-card">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="input-field !pl-11"
                            placeholder="Search by name or component ID..."
                        />
                    </div>
                    <button onClick={handleSearch} className="btn-primary text-sm !px-5">
                        Search
                    </button>
                </div>
            </div>

            {/* Items Grid */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-3 border-lab-primary/20 border-t-lab-primary rounded-full animate-spin mx-auto" />
                    <p className="text-lab-muted mt-4 text-sm">Loading inventory...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="section-card text-center py-16">
                    <Package size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No items found</p>
                    <p className="text-gray-400 text-sm mt-1">
                        {searchQuery ? 'Try a different search term' : 'Add your first inventory item'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, i) => (
                        <div
                            key={item.id || i}
                            className="glass-card p-5 group animate-fade-in-up"
                            style={{ opacity: 0, animationDelay: `${i * 50}ms` }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-lab-primary transition-colors">
                                    {item.name}
                                </h3>
                                {hasRole('assistant') && (
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-1.5 text-gray-400 hover:text-lab-primary hover:bg-lab-primary/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        aria-label={`Edit ${item.name}`}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Hash size={14} className="text-lab-muted" />
                                    <span>{item.component_id}</span>
                                </div>
                                {item.category && (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Tag size={14} className="text-lab-muted" />
                                        <span>{item.category}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5">
                                    {item.quantity <= 5 && (
                                        <AlertTriangle size={14} className="text-amber-500" />
                                    )}
                                    <span className={`text-xl font-bold ${item.quantity <= 5 ? 'text-amber-600' : 'text-gray-900'
                                        }`}>
                                        {item.quantity}
                                    </span>
                                    <span className="text-gray-400 text-xs">units</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(item.status)}`}>
                                    {getStatusLabel(item.status)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-md p-8 animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editItem ? 'Edit Item' : 'Add New Item'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                aria-label="Close modal"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-name">Name</label>
                                <input
                                    id="item-name"
                                    type="text" value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field" required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-component-id">Component ID</label>
                                <input
                                    id="item-component-id"
                                    type="text" value={formData.component_id}
                                    onChange={(e) => setFormData({ ...formData, component_id: e.target.value })}
                                    className="input-field" required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-quantity">Quantity</label>
                                    <input
                                        id="item-quantity"
                                        type="number" value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                        className="input-field" required min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-status">Status</label>
                                    <select
                                        id="item-status"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="available">Available</option>
                                        <option value="low">Low Stock</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-category">Category</label>
                                <input
                                    id="item-category"
                                    type="text" value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="input-field" placeholder="e.g. Electronics, Optics..."
                                />
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={handleCloseModal} className="btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    {editItem ? 'Save Changes' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
