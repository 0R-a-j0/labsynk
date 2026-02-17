import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
    Layers, Search, Plus, X, Edit2, AlertTriangle, Package, Hash, Tag,
    MapPin, ChevronDown, Building2, BookOpen, Filter, Trash2
} from 'lucide-react';

const Inventory = () => {
    const { hasRole } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Classification data
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Filter state
    const [filterCollege, setFilterCollege] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterDepts, setFilterDepts] = useState([]);

    // Form state — matches backend schema exactly
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        total_quantity: 0,
        available_quantity: 0,
        faulty_quantity: 0,
        location: '',
        description: '',
        low_stock_threshold: 10,
        college_id: '',
        department_id: '',
        subject: '',
    });

    // Form-specific department list (filtered by form's college selection)
    const [formDepts, setFormDepts] = useState([]);

    useEffect(() => {
        fetchItems();
        loadClassificationData();
    }, []);

    const loadClassificationData = async () => {
        try {
            const c = await api.getColleges();
            setColleges(c);
        } catch (err) { console.error('Failed to load colleges:', err); }
    };

    const fetchItems = useCallback(async (collegeId, deptId) => {
        setLoading(true);
        try {
            let url = `/inventory/?skip=0&limit=200`;
            if (collegeId) url += `&college_id=${collegeId}`;
            if (deptId) url += `&department_id=${deptId}`;
            const response = await fetch(`http://127.0.0.1:8000${url}`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setItems(data);
        } catch (err) {
            console.error(err);
            // fallback
            const data = await api.getInventory();
            setItems(data);
        }
        finally { setLoading(false); }
    }, []);

    // When filter college changes, load departments
    useEffect(() => {
        if (filterCollege) {
            api.getDepartments(filterCollege).then(setFilterDepts).catch(() => setFilterDepts([]));
        } else {
            setFilterDepts([]);
            setFilterDept('');
        }
    }, [filterCollege]);

    // When form college changes, load departments for form
    const handleFormCollegeChange = async (collegeId) => {
        setFormData(prev => ({ ...prev, college_id: collegeId, department_id: '' }));
        if (collegeId) {
            try {
                const depts = await api.getDepartments(collegeId);
                setFormDepts(depts);
            } catch { setFormDepts([]); }
        } else {
            setFormDepts([]);
        }
    };

    const applyFilters = () => {
        fetchItems(filterCollege || undefined, filterDept || undefined);
    };

    const clearFilters = () => {
        setFilterCollege('');
        setFilterDept('');
        setFilterDepts([]);
        fetchItems();
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
            // Build payload — only send non-empty fields
            const payload = {
                name: formData.name,
                category: formData.category || '',
                total_quantity: parseInt(formData.total_quantity) || 0,
                available_quantity: parseInt(formData.available_quantity) || 0,
                faulty_quantity: parseInt(formData.faulty_quantity) || 0,
                location: formData.location || '',
                description: formData.description || '',
                low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
            };

            // Add classification if selected
            if (formData.college_id) payload.college_id = parseInt(formData.college_id);
            if (formData.department_id) payload.department_id = parseInt(formData.department_id);
            if (formData.subject) payload.subject = formData.subject;

            if (editItem) {
                await api.updateItem(editItem.id, payload);
            } else {
                await api.createItem(payload);
            }
            fetchItems(filterCollege || undefined, filterDept || undefined);
            handleCloseModal();
        } catch (err) {
            console.error('Submit error:', err);
            alert('Failed to save item. Check console for details.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditItem(null);
        setFormData({
            name: '', category: '', total_quantity: 0, available_quantity: 0,
            faulty_quantity: 0, location: '', description: '', low_stock_threshold: 10,
            college_id: '', department_id: '', subject: '',
        });
        setFormDepts([]);
    };

    const handleEdit = async (item) => {
        setEditItem(item);
        setFormData({
            name: item.name || '',
            category: item.category || '',
            total_quantity: item.total_quantity || 0,
            available_quantity: item.available_quantity || 0,
            faulty_quantity: item.faulty_quantity || 0,
            location: item.location || '',
            description: item.description || '',
            low_stock_threshold: item.low_stock_threshold || 10,
            college_id: item.college_id || '',
            department_id: item.department_id || '',
            subject: item.subject || '',
        });
        // Load departments for form if college is set
        if (item.college_id) {
            try {
                const depts = await api.getDepartments(item.college_id);
                setFormDepts(depts);
            } catch { setFormDepts([]); }
        }
        setShowModal(true);
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Delete "${item.name}"?`)) return;
        try {
            await fetch(`http://127.0.0.1:8000/inventory/${item.id}`, { method: 'DELETE' });
            fetchItems(filterCollege || undefined, filterDept || undefined);
        } catch (err) { console.error(err); }
    };

    const getStockStatus = (item) => {
        if (item.available_quantity === 0) return { label: 'Out of Stock', style: 'bg-red-100 text-red-700 border-red-200' };
        if (item.available_quantity <= item.low_stock_threshold) return { label: 'Low Stock', style: 'bg-amber-100 text-amber-700 border-amber-200' };
        return { label: 'Available', style: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
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
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-ghost flex items-center gap-2 text-sm ${showFilters ? 'bg-lab-primary/10 text-lab-primary' : ''}`}
                    >
                        <Filter size={16} />
                        Filters
                    </button>
                    {hasRole('assistant') && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary flex items-center gap-2 text-sm"
                        >
                            <Plus size={18} />
                            Add Item
                        </button>
                    )}
                </div>
            </header>

            {/* Classification Filters */}
            {showFilters && (
                <div className="section-card animate-fade-in-up" style={{ opacity: 0, animationDelay: '50ms' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 size={18} className="text-lab-primary" />
                        <h3 className="font-semibold text-gray-800">Filter by Classification</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5" htmlFor="filter-college">College</label>
                            <select
                                id="filter-college"
                                value={filterCollege}
                                onChange={(e) => setFilterCollege(e.target.value)}
                                className="input-field text-sm"
                            >
                                <option value="">All Colleges</option>
                                {colleges.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5" htmlFor="filter-dept">Department</label>
                            <select
                                id="filter-dept"
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                className="input-field text-sm"
                                disabled={!filterCollege}
                            >
                                <option value="">All Departments</option>
                                {filterDepts.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <button onClick={applyFilters} className="btn-primary text-sm flex-1">
                                Apply
                            </button>
                            <button onClick={clearFilters} className="btn-ghost text-sm">
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            placeholder="Search by name or category..."
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
                    {items.map((item, i) => {
                        const status = getStockStatus(item);
                        return (
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
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-1.5 text-gray-400 hover:text-lab-primary hover:bg-lab-primary/5 rounded-lg transition-colors"
                                                aria-label={`Edit ${item.name}`}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                aria-label={`Delete ${item.name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5 text-sm mb-4">
                                    {item.category && (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Tag size={14} className="text-lab-muted" />
                                            <span>{item.category}</span>
                                        </div>
                                    )}
                                    {item.location && (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <MapPin size={14} className="text-lab-muted" />
                                            <span>{item.location}</span>
                                        </div>
                                    )}
                                    {item.subject && (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <BookOpen size={14} className="text-lab-muted" />
                                            <span>{item.subject}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="text-center">
                                            <span className={`text-xl font-bold ${item.available_quantity <= (item.low_stock_threshold || 10) ? 'text-amber-600' : 'text-gray-900'}`}>
                                                {item.available_quantity}
                                            </span>
                                            <span className="text-gray-400 text-xs ml-1">avail</span>
                                        </div>
                                        <span className="text-gray-200">|</span>
                                        <div className="text-center">
                                            <span className="text-sm font-medium text-gray-600">{item.total_quantity}</span>
                                            <span className="text-gray-400 text-xs ml-1">total</span>
                                        </div>
                                        {item.faulty_quantity > 0 && (
                                            <>
                                                <span className="text-gray-200">|</span>
                                                <div className="flex items-center gap-1">
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                    <span className="text-sm font-medium text-red-500">{item.faulty_quantity}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.style}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
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
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-name">
                                    Name *
                                </label>
                                <input
                                    id="item-name"
                                    type="text" value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field" required
                                    placeholder="e.g. Arduino Uno R3"
                                />
                            </div>

                            {/* Category & Location */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-category">Category</label>
                                    <input
                                        id="item-category"
                                        type="text" value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. Electronics"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-location">Location</label>
                                    <input
                                        id="item-location"
                                        type="text" value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. Lab 3, Shelf B"
                                    />
                                </div>
                            </div>

                            {/* Quantities */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-total">Total Qty</label>
                                    <input
                                        id="item-total"
                                        type="number" value={formData.total_quantity}
                                        onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
                                        className="input-field" min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-avail">Available</label>
                                    <input
                                        id="item-avail"
                                        type="number" value={formData.available_quantity}
                                        onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 0 })}
                                        className="input-field" min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-faulty">Faulty</label>
                                    <input
                                        id="item-faulty"
                                        type="number" value={formData.faulty_quantity}
                                        onChange={(e) => setFormData({ ...formData, faulty_quantity: parseInt(e.target.value) || 0 })}
                                        className="input-field" min="0"
                                    />
                                </div>
                            </div>

                            {/* Low Stock Threshold */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-threshold">
                                    Low Stock Threshold
                                </label>
                                <input
                                    id="item-threshold"
                                    type="number" value={formData.low_stock_threshold}
                                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 10 })}
                                    className="input-field" min="0"
                                    placeholder="10"
                                />
                            </div>

                            {/* Classification Section */}
                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Classification</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-college">College</label>
                                        <select
                                            id="item-college"
                                            value={formData.college_id}
                                            onChange={(e) => handleFormCollegeChange(e.target.value)}
                                            className="input-field"
                                        >
                                            <option value="">— None —</option>
                                            {colleges.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-dept">Department</label>
                                        <select
                                            id="item-dept"
                                            value={formData.department_id}
                                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                            className="input-field"
                                            disabled={!formData.college_id}
                                        >
                                            <option value="">— None —</option>
                                            {formDepts.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-subject">Subject</label>
                                    <input
                                        id="item-subject"
                                        type="text" value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. Digital Electronics"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-desc">Description</label>
                                <textarea
                                    id="item-desc"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input-field"
                                    rows={2}
                                    placeholder="Optional notes about this item..."
                                />
                            </div>

                            {/* Actions */}
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
