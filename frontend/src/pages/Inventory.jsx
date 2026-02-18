import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
    Layers, Search, Plus, X, Edit2, AlertTriangle, Package, Hash, Tag,
    MapPin, ChevronDown, Building2, BookOpen, Filter, Trash2, Wrench
} from 'lucide-react';

const Inventory = () => {
    const { hasRole } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Reporting state
    const [showReportModal, setShowReportModal] = useState(null); // Item object or { id: null, name: 'General Issue' }
    const [reportForm, setReportForm] = useState({ issue_description: '', reported_item_name: '', category: '', location: '', reporter_name: '' });
    const [reporting, setReporting] = useState(false);

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
            // Use local filtering if API filtering not available or complex
            // For now, simpler to fetch all and filter client side if needed, or use the API params
            // But let's stick to the URL structure but use the imported api object's base URL logic if possible
            // Actually, let's just use api.getInventory if params are empty, or construct URL using relative path if proxy is set, or full path matching api.js

            // To fix "Failed to fetch", we should ensure we are hitting the right port. 
            // The best way is to rely on api.js logic.

            // Let's implement a direct fetch using the variable from api.js context if we could, but we can't easily.
            // So we will just correct the URL to point to localhost:8000 which is standard, 
            // but wrapped in a try/catch that falls back to api.getInventory() which uses the constant.

            // Actually, api.js exports API_URL? No, it's internal.
            // Let's just use the fallback logic primarily.

            let data;
            if (collegeId || deptId) {
                let url = `http://127.0.0.1:8000/inventory/?skip=0&limit=200`;
                if (collegeId) url += `&college_id=${collegeId}`;
                if (deptId) url += `&department_id=${deptId}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch');
                data = await response.json();
            } else {
                data = await api.getInventory();
            }
            setItems(data);
        } catch (err) {
            console.error(err);
            try {
                const data = await api.getInventory();
                setItems(data);
            } catch (e) { console.error("Double fail", e); }
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
            handleCloseModal();
        } catch (err) {
            console.error('Submit error details:', err.response?.data || err.message);
            alert(`Failed to save item: ${JSON.stringify(err.response?.data?.detail || err.message)}`);
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

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!reportForm.issue_description) return;

        // If general report, require item name
        if (!showReportModal.id && !reportForm.reported_item_name) {
            alert('Please specify the item name');
            return;
        }

        setReporting(true);
        try {
            const payload = {
                inventory_item_id: showReportModal.id,
                issue_description: reportForm.issue_description,
                reported_item_name: showReportModal.id ? showReportModal.name : reportForm.reported_item_name,
                category: reportForm.category,
                location: reportForm.location,
                reporter_name: reportForm.reporter_name // Included for unauthenticated users
            };

            await api.reportInventoryIssue(payload);
            alert('Issue reported successfully!');
            setShowReportModal(null);
            setReportForm({ issue_description: '', reported_item_name: '', category: '', location: '', reporter_name: '' });
        } catch (err) {
            console.error(err);
            alert('Failed to report issue');
        } finally {
            setReporting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in pb-24">
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
                                        <button
                                            onClick={() => setShowReportModal(item)}
                                            className="ml-auto p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="Report Issue"
                                        >
                                            <AlertTriangle size={18} />
                                        </button>
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-4xl p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
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

                            {/* Quantities & Threshold */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="item-threshold">
                                        Low Stock
                                    </label>
                                    <input
                                        id="item-threshold"
                                        type="number" value={formData.low_stock_threshold}
                                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 10 })}
                                        className="input-field" min="0"
                                        placeholder="10"
                                    />
                                </div>
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
            {/* Report Issue Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReportModal(null)} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-md p-8 animate-scale-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Wrench size={20} className="text-orange-500" />
                            {showReportModal.id ? 'Report Faulty Equipment' : 'Report Missing/General Issue'}
                        </h3>

                        {showReportModal.id ? (
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    Reporting issue for: <strong>{showReportModal.name}</strong> (ID: {showReportModal.id})
                                </p>
                                {!hasRole('student') && !hasRole('assistant') && !hasRole('admin') && !hasRole('principal') && !hasRole('hod') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name *</label>
                                        <input
                                            type="text" required
                                            value={reportForm.reporter_name}
                                            onChange={e => setReportForm({ ...reportForm, reporter_name: e.target.value })}
                                            className="input-field"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name {(!hasRole('student') && !hasRole('assistant')) ? '*' : '(Optional)'}</label>
                                    <input
                                        type="text"
                                        required={!hasRole('student') && !hasRole('assistant')}
                                        value={reportForm.reporter_name}
                                        onChange={e => setReportForm({ ...reportForm, reporter_name: e.target.value })}
                                        className="input-field"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name / Component *</label>
                                    <input
                                        type="text" required
                                        value={reportForm.reported_item_name}
                                        onChange={e => setReportForm({ ...reportForm, reported_item_name: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. Soldering Iron Station 3"
                                    />
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleReportSubmit} className="space-y-4">
                            {!showReportModal.id && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                                        <input
                                            type="text"
                                            value={reportForm.category || ''}
                                            onChange={e => setReportForm({ ...reportForm, category: e.target.value })}
                                            className="input-field"
                                            placeholder="e.g. Electronics"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                                        <input
                                            type="text"
                                            value={reportForm.location || ''}
                                            onChange={e => setReportForm({ ...reportForm, location: e.target.value })}
                                            className="input-field"
                                            placeholder="e.g. Lab 3"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue Description *</label>
                                <textarea
                                    required rows="4"
                                    value={reportForm.issue_description}
                                    onChange={e => setReportForm({ ...reportForm, issue_description: e.target.value })}
                                    className="input-field" placeholder={showReportModal.id ? "Describe the problem..." : "Describe what is missing or broken..."}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowReportModal(null)} className="btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={reporting} className="btn-primary flex-1 bg-orange-600 hover:bg-orange-700 text-white border-none">
                                    {reporting ? 'Reporting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* General Report Banner */}
            <div className="mt-10 text-center">
                <button
                    onClick={() => setShowReportModal({ id: null, name: 'General Issue' })}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-sm font-medium hover:bg-orange-100 hover:border-orange-200 transition-all shadow-sm hover:shadow"
                >
                    <AlertTriangle size={18} />
                    Spot something broken or missing? Report it to the lab administrator!
                </button>
            </div>
        </div>
    );
};

export default Inventory;
