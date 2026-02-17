import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    Shield, Building2, GraduationCap, Users, BarChart3, Plus, Trash2,
    CheckCircle, AlertCircle, Beaker, BookOpen,
    RefreshCw, X, Undo2, Clock, Edit3, TestTube2, Link as LinkIcon
} from 'lucide-react';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [stats, setStats] = useState(null);
    const [newCollegeName, setNewCollegeName] = useState('');
    const [newDeptName, setNewDeptName] = useState('');
    const [selectedCollegeForDept, setSelectedCollegeForDept] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [deletedItems, setDeletedItems] = useState([]);
    const [showUndo, setShowUndo] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setDeletedItems(prev => prev.filter(item => Date.now() - item.timestamp < 5 * 60 * 1000));
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { setShowUndo(deletedItems.length > 0); }, [deletedItems]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [collegesData, deptsData] = await Promise.all([api.getColleges(), api.getDepartments()]);
            setColleges(collegesData);
            setDepartments(deptsData);
            const experimentsData = await api.getVLabExperiments();
            const subjectsData = await api.getSubjects();
            setStats({
                colleges: collegesData.length, departments: deptsData.length,
                subjects: subjectsData.length, experiments: experimentsData.length
            });
        } catch (err) { console.error('Failed to load data:', err); }
        finally { setLoading(false); }
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleAddCollege = async () => {
        if (!newCollegeName.trim()) return;
        try {
            await api.createCollege(newCollegeName.trim());
            setNewCollegeName('');
            await loadData();
            showMessage('success', 'College added successfully!');
        } catch (err) { showMessage('error', err.message || 'Failed to add college'); }
    };

    const handleAddDepartment = async () => {
        if (!newDeptName.trim() || !selectedCollegeForDept) return;
        try {
            await api.createDepartment(newDeptName.trim(), parseInt(selectedCollegeForDept));
            setNewDeptName('');
            setSelectedCollegeForDept('');
            await loadData();
            showMessage('success', 'Department added successfully!');
        } catch (err) { showMessage('error', err.message || 'Failed to add department'); }
    };

    const handleDeleteCollege = async (college) => {
        try {
            await api.deleteCollege(college.id);
            setDeletedItems(prev => [...prev, { type: 'college', data: college, timestamp: Date.now() }]);
            await loadData();
            showMessage('success', `Deleted "${college.name}". Click Undo to restore.`);
        } catch (err) { showMessage('error', err.message || 'Failed to delete college'); }
        setConfirmDelete(null);
    };

    const handleDeleteDepartment = async (dept) => {
        try {
            await api.deleteDepartment(dept.id);
            const college = colleges.find(c => c.id === dept.college_id);
            setDeletedItems(prev => [...prev, { type: 'department', data: { ...dept, collegeName: college?.name }, timestamp: Date.now() }]);
            await loadData();
            showMessage('success', `Deleted "${dept.name}". Click Undo to restore.`);
        } catch (err) { showMessage('error', err.message || 'Failed to delete department'); }
        setConfirmDelete(null);
    };

    const handleUndo = async (item) => {
        try {
            if (item.type === 'college') {
                await api.createCollege(item.data.name);
                showMessage('success', `Restored "${item.data.name}"!`);
            } else if (item.type === 'department') {
                const college = colleges.find(c => c.name === item.data.collegeName);
                if (college) {
                    await api.createDepartment(item.data.name, college.id);
                    showMessage('success', `Restored "${item.data.name}"!`);
                } else {
                    showMessage('error', 'Cannot restore: Parent college not found');
                }
            }
            setDeletedItems(prev => prev.filter(i => i !== item));
            await loadData();
        } catch (err) { showMessage('error', err.message || 'Failed to restore'); }
    };

    const tabs = [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'labs', label: 'Labs', icon: TestTube2 },
        { id: 'colleges', label: 'Colleges', icon: Building2 },
        { id: 'departments', label: 'Departments', icon: GraduationCap },
        { id: 'users', label: 'Users', icon: Users },
    ];

    const statCards = [
        { icon: Building2, label: 'Colleges', value: stats?.colleges || 0, gradient: 'from-indigo-500 to-violet-600' },
        { icon: GraduationCap, label: 'Departments', value: stats?.departments || 0, gradient: 'from-violet-500 to-purple-600' },
        { icon: BookOpen, label: 'Subjects', value: stats?.subjects || 0, gradient: 'from-fuchsia-500 to-pink-600' },
        { icon: Beaker, label: 'Experiments', value: stats?.experiments || 0, gradient: 'from-pink-500 to-rose-600' },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative animate-fade-in">
            {/* Undo Toast */}
            {showUndo && (
                <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up" style={{ maxWidth: '340px' }}>
                    <div className="glass-dark text-white rounded-2xl shadow-glass-lg p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <Undo2 size={16} />
                                <span className="font-semibold text-sm">Recently Deleted</span>
                            </div>
                            <button onClick={() => setDeletedItems([])} className="text-white/50 hover:text-white transition-colors" aria-label="Dismiss">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {deletedItems.slice(-3).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{item.data.name}</div>
                                        <div className="text-xs text-white/50 flex items-center gap-1">
                                            <Clock size={10} />
                                            {Math.round((Date.now() - item.timestamp) / 1000 / 60)}m ago
                                        </div>
                                    </div>
                                    <button onClick={() => handleUndo(item)}
                                        className="flex-shrink-0 bg-white text-lab-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">
                                        Undo
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-md p-8 animate-scale-in">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="bg-red-100 p-2 rounded-xl"><Trash2 size={20} /></div>
                            <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                        </div>
                        <p className="text-gray-600 mb-4 text-sm">
                            Are you sure you want to delete <strong>"{confirmDelete.name}"</strong>?
                            {confirmDelete.type === 'college' && (
                                <span className="block text-red-500 mt-2 text-xs">⚠️ This will also delete all departments under this college.</span>
                            )}
                            {confirmDelete.type === 'department' && (
                                <span className="block text-red-500 mt-2 text-xs">⚠️ This will also delete all subjects and experiments.</span>
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
                            <button
                                onClick={() => confirmDelete.type === 'college' ? handleDeleteCollege(confirmDelete) : handleDeleteDepartment(confirmDelete)}
                                className="flex-1 bg-red-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors active:scale-[0.98]">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="page-header">Admin Dashboard</h1>
                        <p className="page-subtitle text-sm">Manage colleges, departments, users, and analytics</p>
                    </div>
                </div>
                <button onClick={loadData} disabled={loading}
                    className="btn-ghost flex items-center gap-2 text-sm">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </header>

            {/* Message Toast */}
            {message.text && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-scale-in ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            {/* Tab Navigation — Pill style */}
            <div className="bg-gray-100 p-1 rounded-2xl flex gap-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-white shadow-md text-lab-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {statCards.map((card, i) => (
                                <div key={card.label}
                                    className={`bg-gradient-to-br ${card.gradient} text-white rounded-2xl p-6 shadow-lg animate-fade-in-up`}
                                    style={{ opacity: 0, animationDelay: `${i * 100}ms` }}>
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="bg-white/20 p-2 rounded-xl"><card.icon size={20} /></div>
                                        <span className="text-sm text-white/80 font-medium">{card.label}</span>
                                    </div>
                                    <div className="text-4xl font-extrabold">{card.value}</div>
                                </div>
                            ))}
                        </div>
                        <div className="section-card">
                            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                                <BarChart3 size={20} className="text-lab-primary" />
                                VLabs Summary
                            </h3>
                            <div className="space-y-0.5">
                                {[
                                    { label: 'Total Colleges', value: stats?.colleges || 0 },
                                    { label: 'Total Departments', value: stats?.departments || 0 },
                                    { label: 'Total Subjects Stored', value: stats?.subjects || 0 },
                                    { label: 'Total Experiments Saved', value: stats?.experiments || 0 },
                                ].map((row, i) => (
                                    <div key={row.label} className={`flex items-center justify-between py-3.5 px-2 rounded-xl ${i % 2 === 0 ? 'bg-gray-50/60' : ''}`}>
                                        <span className="text-gray-600 text-sm">{row.label}</span>
                                        <span className="font-bold text-gray-900">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Colleges Tab */}
                {activeTab === 'colleges' && (
                    <div className="space-y-6">
                        <div className="section-card">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-lab-primary" /> Add New College
                            </h3>
                            <div className="flex gap-3">
                                <input type="text" value={newCollegeName}
                                    onChange={(e) => setNewCollegeName(e.target.value)}
                                    placeholder="Enter college name..."
                                    className="input-field flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCollege()} />
                                <button onClick={handleAddCollege} disabled={!newCollegeName.trim()}
                                    className="btn-primary text-sm">Add College</button>
                            </div>
                        </div>
                        <div className="section-card !p-0 overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-200/60 bg-gray-50/80">
                                <h3 className="font-semibold text-gray-900 text-sm">Existing Colleges ({colleges.length})</h3>
                            </div>
                            {colleges.length === 0 ? (
                                <div className="p-10 text-center text-gray-400 text-sm">No colleges added yet. Add your first college above.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {colleges.map(college => (
                                        <div key={college.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-lab-primary/5 rounded-xl"><Building2 size={18} className="text-lab-primary" /></div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{college.name}</div>
                                                    <div className="text-xs text-gray-400">{departments.filter(d => d.college_id === college.id).length} departments</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-300 font-mono">ID: {college.id}</span>
                                                <button onClick={() => setConfirmDelete({ ...college, type: 'college' })}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                    aria-label={`Delete ${college.name}`}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Departments Tab */}
                {activeTab === 'departments' && (
                    <div className="space-y-6">
                        <div className="section-card">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-lab-primary" /> Add New Department
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <select value={selectedCollegeForDept} onChange={(e) => setSelectedCollegeForDept(e.target.value)} className="input-field">
                                    <option value="">Select College</option>
                                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                                    placeholder="Department name (e.g., CSE, ECE)..."
                                    className="input-field" onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()} />
                                <button onClick={handleAddDepartment} disabled={!newDeptName.trim() || !selectedCollegeForDept}
                                    className="btn-primary text-sm">Add Department</button>
                            </div>
                        </div>
                        <div className="section-card !p-0 overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-200/60 bg-gray-50/80">
                                <h3 className="font-semibold text-gray-900 text-sm">Existing Departments ({departments.length})</h3>
                            </div>
                            {departments.length === 0 ? (
                                <div className="p-10 text-center text-gray-400 text-sm">No departments added yet. Add a college first, then add departments.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {departments.map(dept => {
                                        const college = colleges.find(c => c.id === dept.college_id);
                                        return (
                                            <div key={dept.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-lab-secondary/5 rounded-xl"><GraduationCap size={18} className="text-lab-secondary" /></div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{dept.name}</div>
                                                        <div className="text-xs text-gray-400">{college?.name || 'Unknown College'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-300 font-mono">ID: {dept.id}</span>
                                                    <button onClick={() => setConfirmDelete({ ...dept, type: 'department' })}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                        aria-label={`Delete ${dept.name}`}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Labs Tab */}
                {activeTab === 'labs' && (
                    <LabsTab colleges={colleges} departments={departments} showMessage={showMessage} />
                )}

                {/* Users Tab */}

                {/* Users Tab */}
                {activeTab === 'users' && <UsersTab showMessage={showMessage} />}
            </div>
        </div>
    );
};

// Users Tab Component
const UsersTab = ({ showMessage }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'assistant' });
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ email: '', password: '', role: '' });

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try { const data = await api.getUsers(); setUsers(data); }
        catch (err) { console.error('Failed to load users:', err); }
        finally { setLoading(false); }
    };

    const handleAddUser = async () => {
        if (!newUser.email || !newUser.password) return;
        try {
            await api.createUser(newUser.email, newUser.password, newUser.role);
            setNewUser({ email: '', password: '', role: 'assistant' });
            setShowAddForm(false);
            await loadUsers();
            showMessage('success', 'User created successfully!');
        } catch (err) { showMessage('error', err.message || 'Failed to create user'); }
    };

    const handleDeleteUser = async (userId) => {
        try { await api.deleteUser(userId); await loadUsers(); showMessage('success', 'User deleted'); }
        catch (err) { showMessage('error', err.message || 'Failed to delete user'); }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditForm({ email: user.email, password: '', role: user.role });
    };

    const handleEditSubmit = async () => {
        if (!editForm.email) return;
        try {
            const updates = { email: editForm.email, role: editForm.role };
            if (editForm.password) updates.password = editForm.password;
            await api.updateUser(editingUser.id, updates);
            setEditingUser(null);
            setEditForm({ email: '', password: '', role: '' });
            await loadUsers();
            showMessage('success', 'User updated successfully!');
        } catch (err) { showMessage('error', err.message || 'Failed to update user'); }
    };

    const roleColors = {
        principal: 'bg-purple-100 text-purple-700 border-purple-200',
        hod: 'bg-blue-100 text-blue-700 border-blue-200',
        assistant: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };

    if (loading) {
        return (
            <div className="text-center py-20">
                <div className="w-10 h-10 border-3 border-lab-primary/20 border-t-lab-primary rounded-full animate-spin mx-auto" />
                <p className="text-lab-muted mt-4 text-sm">Loading users...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-md p-8 animate-scale-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <Edit3 size={20} className="text-lab-primary" /> Edit User
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="edit-email">Email</label>
                                <input id="edit-email" type="email" value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="edit-password">
                                    New Password <span className="text-gray-400 text-xs">(leave blank to keep current)</span>
                                </label>
                                <input id="edit-password" type="password" value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    placeholder="Enter new password..." className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="edit-role">Role</label>
                                <select id="edit-role" value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="input-field">
                                    <option value="assistant">Lab Assistant</option>
                                    <option value="hod">HOD</option>
                                    <option value="principal">Principal</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setEditingUser(null)} className="btn-ghost flex-1">Cancel</button>
                            <button onClick={handleEditSubmit} disabled={!editForm.email}
                                className="btn-primary flex-1">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User */}
            {showAddForm ? (
                <div className="section-card">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-lab-primary" /> Add New User
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="email" value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            placeholder="Email address..." className="input-field" />
                        <input type="password" value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            placeholder="Password..." className="input-field" />
                        <select value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className="input-field">
                            <option value="assistant">Lab Assistant</option>
                            <option value="hod">HOD</option>
                            <option value="principal">Principal</option>
                        </select>
                        <div className="flex gap-2">
                            <button onClick={handleAddUser} disabled={!newUser.email || !newUser.password}
                                className="btn-primary flex-1 text-sm">Create</button>
                            <button onClick={() => setShowAddForm(false)}
                                className="btn-ghost text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            ) : (
                <button onClick={() => setShowAddForm(true)}
                    className="btn-primary flex items-center gap-2 text-sm">
                    <Plus size={18} /> Add User
                </button>
            )}

            {/* Users List */}
            <div className="section-card !p-0 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-200/60 bg-gray-50/80">
                    <h3 className="font-semibold text-gray-900 text-sm">Staff Users ({users.length})</h3>
                </div>
                {users.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-sm">No users found. Add your first staff member.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {users.map(user => (
                            <div key={user.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 rounded-full"><Users size={18} className="text-gray-600" /></div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{user.email}</div>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${roleColors[user.role] || 'bg-gray-100'}`}>
                                            {user.role?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleEditClick(user)}
                                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                        aria-label={`Edit ${user.email}`}>
                                        <Edit3 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        aria-label={`Delete ${user.email}`}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const LabsTab = ({ colleges, departments, showMessage }) => {
    const [selectedCollege, setSelectedCollege] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    const [editingSubject, setEditingSubject] = useState(null);
    const [showAddSubject, setShowAddSubject] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: '', code: '', semester: '', default_compiler: '' });

    const [expandedSubject, setExpandedSubject] = useState(null);
    const [experiments, setExperiments] = useState([]);
    const [loadingExperiments, setLoadingExperiments] = useState(false);
    const [showAddExperiment, setShowAddExperiment] = useState(null); // subjectId
    const [editingExperiment, setEditingExperiment] = useState(null);

    // Experiment Form State
    const [expForm, setExpForm] = useState({ topic: '', unit: '', description: '', suggested_simulation: '', links: [{ source: 'IIT Bombay', url: '' }] });

    useEffect(() => {
        if (selectedDept && selectedSemester) {
            loadSubjects();
        } else {
            setSubjects([]);
        }
    }, [selectedDept, selectedSemester]);

    useEffect(() => {
        if (expandedSubject) {
            loadExperiments(expandedSubject);
        }
    }, [expandedSubject]);

    const loadSubjects = async () => {
        setLoadingSubjects(true);
        try {
            const data = await api.getSubjects(selectedDept, selectedSemester);
            setSubjects(data);
        } catch (err) { showMessage('error', 'Failed to load subjects'); }
        finally { setLoadingSubjects(false); }
    };

    const loadExperiments = async (subjectId) => {
        setLoadingExperiments(true);
        try {
            const data = await api.getVLabExperiments(subjectId);
            setExperiments(data);
        } catch (err) { showMessage('error', 'Failed to load experiments'); }
        finally { setLoadingExperiments(false); }
    };

    const handleSaveSubject = async () => {
        if (!newSubject.name || !newSubject.semester) return;
        const data = {
            name: newSubject.name,
            code: newSubject.code,
            semester: parseInt(newSubject.semester),
            department_id: parseInt(selectedDept),
            default_compiler: newSubject.default_compiler
        };
        try {
            if (editingSubject) {
                await api.updateSubject(editingSubject.id, data);
                showMessage('success', 'Subject updated');
            } else {
                await api.createSubject(data);
                showMessage('success', 'Subject created');
            }
            setShowAddSubject(false);
            setEditingSubject(null);
            setNewSubject({ name: '', code: '', semester: '', default_compiler: '' });
            loadSubjects();
        } catch (err) { showMessage('error', err.message); }
    };

    const handleDeleteSubject = async (id) => {
        if (!window.confirm('Delete subject and all experiments?')) return;
        try {
            await api.deleteSubject(id);
            showMessage('success', 'Subject deleted');
            loadSubjects();
        } catch (err) { showMessage('error', err.message); }
    };

    const openExpModal = (subjectId, exp = null) => {
        if (exp) {
            setEditingExperiment(exp);
            setExpForm({
                topic: exp.topic,
                unit: exp.unit || '',
                description: exp.description || '',
                suggested_simulation: exp.suggested_simulation || '',
                links: exp.simulation_links?.length ? exp.simulation_links : [{ source: 'IIT Bombay', url: '' }]
            });
            setShowAddExperiment(null);
        } else {
            setEditingExperiment(null);
            setExpForm({ topic: '', unit: '', description: '', suggested_simulation: '', links: [{ source: 'IIT Bombay', url: '' }] });
            setShowAddExperiment(subjectId);
        }
    };

    const handleSaveExperiment = async () => {
        const subjectId = showAddExperiment || editingExperiment.subject_id;
        const links = expForm.links.filter(l => l.url.trim());
        const data = {
            subject_id: subjectId,
            topic: expForm.topic,
            unit: parseInt(expForm.unit) || null,
            description: expForm.description,
            suggested_simulation: expForm.suggested_simulation,
            simulation_links: links
        };
        try {
            if (editingExperiment) {
                await api.updateExperiment(editingExperiment.id, data);
                showMessage('success', 'Experiment updated');
            } else {
                await api.createExperiment(data);
                showMessage('success', 'Experiment created');
            }
            setShowAddExperiment(null);
            setEditingExperiment(null);
            if (subjectId === expandedSubject) loadExperiments(subjectId);
        } catch (err) { showMessage('error', err.message); }
    };

    const handleDeleteExperiment = async (id) => {
        if (!window.confirm('Delete this experiment?')) return;
        try {
            await api.deleteExperiment(id);
            showMessage('success', 'Experiment deleted');
            loadExperiments(expandedSubject);
        } catch (err) { showMessage('error', err.message); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="section-card">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TestTube2 size={20} className="text-lab-primary" /> Manage Labs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select value={selectedCollege} onChange={(e) => { setSelectedCollege(e.target.value); setSelectedDept(''); }}
                        className="input-field">
                        <option value="">Select College</option>
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
                        disabled={!selectedCollege}
                        className="input-field disabled:opacity-50">
                        <option value="">Select Department</option>
                        {departments.filter(d => d.college_id === parseInt(selectedCollege)).map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}
                        disabled={!selectedDept}
                        className="input-field disabled:opacity-50">
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>
            </div>

            {/* Subjects List */}
            {selectedDept && selectedSemester && (
                <div className="section-card !p-0 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-200/60 bg-gray-50/80 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm">Subjects</h3>
                        <button onClick={() => { setShowAddSubject(true); setNewSubject({ name: '', code: '', semester: selectedSemester, default_compiler: '' }); }}
                            className="btn-primary text-xs flex items-center gap-1">
                            <Plus size={14} /> Add Subject
                        </button>
                    </div>

                    {showAddSubject && (
                        <div className="p-4 bg-lab-primary/5 border-b border-lab-primary/10">
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-gray-600">Subject Name</label>
                                    <input type="text" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} className="input-field mt-1" placeholder="e.g. Physics" />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs font-medium text-gray-600">Code</label>
                                    <input type="text" value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} className="input-field mt-1" placeholder="PH101" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-gray-600">Default Compiler URL</label>
                                    <input type="text" value={newSubject.default_compiler} onChange={e => setNewSubject({ ...newSubject, default_compiler: e.target.value })} className="input-field mt-1" placeholder="https://www.programiz.com/..." />
                                </div>
                                <button onClick={handleSaveSubject} className="btn-primary mb-0.5">Save</button>
                                <button onClick={() => setShowAddSubject(false)} className="btn-ghost mb-0.5">Cancel</button>
                            </div>
                        </div>
                    )}

                    {loadingSubjects ? (
                        <div className="p-10 text-center"><div className="w-6 h-6 border-2 border-lab-primary rounded-full animate-spin mx-auto" /></div>
                    ) : subjects.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm">No subjects found.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {subjects.map(subject => (
                                <div key={subject.id} className="group">
                                    <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 rounded-xl"><BookOpen size={18} className="text-purple-600" /></div>
                                            <div>
                                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                    {editingSubject?.id === subject.id ? (
                                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                            <input value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} className="input-field py-1 h-8 w-96 text-sm" placeholder="Subject Name" />
                                                            <input value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} className="input-field py-1 h-8 w-36 text-sm" placeholder="Code" />
                                                            <input value={newSubject.default_compiler || ''} onChange={e => setNewSubject({ ...newSubject, default_compiler: e.target.value })} className="input-field py-1 h-8 w-64 text-sm" placeholder="Default Compiler URL" />
                                                            <button onClick={() => handleSaveSubject()} className="bg-green-100 text-green-700 p-1 rounded-lg"><CheckCircle size={16} /></button>
                                                            <button onClick={() => setEditingSubject(null)} className="bg-gray-100 text-gray-600 p-1 rounded-lg"><X size={16} /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {subject.name}
                                                            {subject.code && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{subject.code}</span>}
                                                        </>
                                                    )}
                                                </div>
                                                {subject.default_compiler && (
                                                    <a href={subject.default_compiler} target="_blank" rel="noreferrer"
                                                        className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 flex items-center gap-1 mt-1"
                                                        onClick={e => e.stopPropagation()}>
                                                        <LinkIcon size={10} /> Compiler
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingSubject(subject); setNewSubject({ name: subject.name, code: subject.code || '', semester: subject.semester }); }}
                                                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="Edit Subject">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Delete Subject">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Experiments Expansion */}
                                    {expandedSubject === subject.id && (
                                        <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Experiments</h4>
                                                <button onClick={() => openExpModal(subject.id)} className="text-xs btn-ghost text-lab-primary flex items-center gap-1">
                                                    <Plus size={14} /> Add Experiment
                                                </button>
                                            </div>

                                            {/* Add/Edit Experiment Form */}
                                            {(showAddExperiment === subject.id || (editingExperiment && editingExperiment.subject_id === subject.id)) && (
                                                <div className="bg-white p-4 rounded-xl border border-blue-100 mb-4 animate-scale-in">
                                                    <h5 className="font-semibold text-sm mb-3 text-lab-primary">{editingExperiment ? 'Edit Experiment' : 'New Experiment'}</h5>
                                                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                                                        <input value={expForm.topic} onChange={e => setExpForm({ ...expForm, topic: e.target.value })} placeholder="Experiment Topic" className="input-field" />
                                                        <input value={expForm.unit} onChange={e => setExpForm({ ...expForm, unit: e.target.value })} placeholder="Unit No." type="number" className="input-field" />
                                                        <input value={expForm.suggested_simulation} onChange={e => setExpForm({ ...expForm, suggested_simulation: e.target.value })} placeholder="Suggested Simulation Name" className="input-field col-span-2" />
                                                    </div>

                                                    {/* Links */}
                                                    <div className="space-y-2 mb-3">
                                                        <label className="text-xs font-medium text-gray-500">Redirect Links</label>
                                                        {expForm.links.map((link, idx) => (
                                                            <div key={idx} className="flex gap-2">
                                                                <input value={link.url} onChange={e => {
                                                                    const newLinks = [...expForm.links];
                                                                    newLinks[idx].url = e.target.value;
                                                                    setExpForm({ ...expForm, links: newLinks });
                                                                }} placeholder="https://..." className="input-field flex-1" />
                                                                {idx > 0 && <button onClick={() => {
                                                                    const newLinks = expForm.links.filter((_, i) => i !== idx);
                                                                    setExpForm({ ...expForm, links: newLinks });
                                                                }} className="text-red-400 p-2"><Trash2 size={16} /></button>}
                                                            </div>
                                                        ))}
                                                        <button onClick={() => setExpForm({ ...expForm, links: [...expForm.links, { source: 'Other', url: '' }] })} className="text-xs text-blue-500 hover:underline">+ Add another link</button>
                                                    </div>

                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => { setShowAddExperiment(null); setEditingExperiment(null); }} className="btn-ghost text-xs">Cancel</button>
                                                        <button onClick={handleSaveExperiment} className="btn-primary text-xs">Save Experiment</button>
                                                    </div>
                                                </div>
                                            )}

                                            {loadingExperiments ? (
                                                <div className="text-center py-4"><span className="loading-spinner w-4 h-4 inline-block"></span></div>
                                            ) : experiments.length === 0 ? (
                                                <div className="text-center py-2 text-sm text-gray-400 italic">No experiments added.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {experiments.map(exp => (
                                                        <div key={exp.id} className="bg-white border boundary-gray-200 rounded-lg p-3 flex justify-between items-start">
                                                            <div>
                                                                <div className="font-medium text-gray-800 text-sm flex items-center gap-2">
                                                                    <span className="bg-gray-100 text-gray-500 text-xs px-1.5 rounded">U{exp.unit}</span>
                                                                    {exp.topic}
                                                                </div>
                                                                {exp.suggested_simulation && <div className="text-xs text-blue-600 mt-0.5">{exp.suggested_simulation}</div>}
                                                                <div className="flex gap-2 mt-1 flex-wrap">
                                                                    {exp.simulation_links?.map((l, i) => (
                                                                        <a key={i} href={l.url} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 hover:bg-blue-100">
                                                                            <LinkIcon size={10} /> {l.source || 'Link'}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => openExpModal(subject.id, exp)} className="text-gray-400 hover:text-blue-500 p-1"><Edit3 size={14} /></button>
                                                                <button onClick={() => handleDeleteExperiment(exp.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Admin;
