import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Calendar, Clock, Plus, X, BookOpen, MapPin, User, Building2, GraduationCap, Trash2 } from 'lucide-react';

const SchedulePage = () => {
    const { hasRole } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form data matching backend schema
    const emptyForm = {
        college_id: '', department_id: '', semester: '', subject: '',
        date: '', start_time_str: '', end_time_str: '',
        lab_name: '', lab_room: '', course_name: '', batch: '', instructor_name: '',
    };
    const [formData, setFormData] = useState({ ...emptyForm });

    // Cascading dropdown data
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => { fetchSchedules(); loadColleges(); }, []);

    const fetchSchedules = async () => {
        try { const data = await api.getSchedules(); setSchedules(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadColleges = async () => {
        try { setColleges(await api.getColleges()); } catch (err) { console.error(err); }
    };

    // Cascading handlers
    const handleCollegeChange = async (value) => {
        setFormData(prev => ({ ...prev, college_id: value, department_id: '', semester: '', subject: '' }));
        setDepartments([]); setSubjects([]);
        if (value) {
            try { setDepartments(await api.getDepartments(value)); } catch (err) { console.error(err); }
        }
    };

    const handleDeptChange = (value) => {
        setFormData(prev => ({ ...prev, department_id: value, semester: '', subject: '' }));
        setSubjects([]);
    };

    const handleSemesterChange = async (value) => {
        setFormData(prev => ({ ...prev, semester: value, subject: '' }));
        setSubjects([]);
        if (value && formData.department_id) {
            try { setSubjects(await api.getSubjects(formData.department_id, value)); }
            catch (err) { console.error(err); }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        // Build start_time and end_time from date + time strings
        if (!formData.date || !formData.start_time_str || !formData.end_time_str) {
            setError('Please fill in date and both start/end times.');
            setSubmitting(false);
            return;
        }

        const start_time = `${formData.date}T${formData.start_time_str}:00`;
        const end_time = `${formData.date}T${formData.end_time_str}:00`;

        if (new Date(end_time) <= new Date(start_time)) {
            setError('End time must be after start time.');
            setSubmitting(false);
            return;
        }

        const payload = {
            lab_name: formData.lab_name || formData.lab_room || 'Lab',
            start_time,
            end_time,
            course_name: formData.course_name,
            batch: formData.batch || '',
            college_id: formData.college_id ? parseInt(formData.college_id) : null,
            department_id: formData.department_id ? parseInt(formData.department_id) : null,
            semester: formData.semester ? parseInt(formData.semester) : null,
            subject: formData.subject || null,
            instructor_name: formData.instructor_name || null,
            lab_room: formData.lab_room || null,
        };

        try {
            await api.createSchedule(payload);
            fetchSchedules();
            setShowModal(false);
            setFormData({ ...emptyForm });
        } catch (err) {
            setError(err.message || 'Failed to book slot');
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this booking?')) return;
        try {
            await fetch(`http://127.0.0.1:8000/schedule/${id}`, { method: 'DELETE' });
            fetchSchedules();
        } catch (err) { console.error(err); }
    };

    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            });
        } catch { return dateStr; }
    };

    const formatTime = (dateStr) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch { return dateStr; }
    };

    const selectClass = "input-field appearance-none cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOTRBM0I4IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[right_1rem_center]";

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                        <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="page-header">Schedule</h1>
                        <p className="page-subtitle text-sm">Manage lab bookings and timetables</p>
                    </div>
                </div>
                {hasRole('assistant') && (
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={18} />
                        Book Slot
                    </button>
                )}
            </header>

            {/* Schedule Cards */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-3 border-lab-primary/20 border-t-lab-primary rounded-full animate-spin mx-auto" />
                    <p className="text-lab-muted mt-4 text-sm">Loading schedule...</p>
                </div>
            ) : schedules.length === 0 ? (
                <div className="section-card text-center py-16">
                    <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No bookings yet</p>
                    <p className="text-gray-400 text-sm mt-1">Book your first lab slot to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedules.map((s, i) => (
                        <div
                            key={s.id || i}
                            className="glass-card overflow-hidden animate-fade-in-up group"
                            style={{ opacity: 0, animationDelay: `${i * 80}ms` }}
                        >
                            <div className="flex">
                                <div className="w-1.5 bg-gradient-to-b from-violet-500 to-purple-600 flex-shrink-0" />
                                <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{s.course_name}</h3>
                                            {s.subject && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md">{s.subject}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                <Clock size={12} />
                                                {formatTime(s.start_time)} - {formatTime(s.end_time)}
                                            </div>
                                            {hasRole('assistant') && (
                                                <button onClick={() => handleDelete(s.id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    aria-label="Delete booking">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-lab-muted flex-shrink-0" />
                                            {formatDate(s.start_time)}
                                        </div>
                                        {(s.lab_room || s.lab_name) && (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-lab-muted flex-shrink-0" />
                                                {s.lab_room || s.lab_name}
                                            </div>
                                        )}
                                        {s.instructor_name && (
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-lab-muted flex-shrink-0" />
                                                {s.instructor_name}
                                            </div>
                                        )}
                                        {s.batch && (
                                            <div className="flex items-center gap-2">
                                                <GraduationCap size={14} className="text-lab-muted flex-shrink-0" />
                                                Batch: {s.batch}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Booking Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Book Lab Slot</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close modal">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Classification Section */}
                            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Building2 size={14} /> Classification
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={formData.college_id} onChange={e => handleCollegeChange(e.target.value)} className={selectClass}>
                                        <option value="">Select College</option>
                                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select value={formData.department_id} onChange={e => handleDeptChange(e.target.value)} className={selectClass} disabled={!formData.college_id}>
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <select value={formData.semester} onChange={e => handleSemesterChange(e.target.value)} className={selectClass} disabled={!formData.department_id}>
                                        <option value="">Select Semester</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>
                                    <select value={formData.subject} onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))} className={selectClass} disabled={!formData.semester}>
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        <option value="__other">Other...</option>
                                    </select>
                                </div>
                                {formData.subject === '__other' && (
                                    <input type="text" placeholder="Enter subject name..."
                                        onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value || '__other' }))}
                                        className="input-field" />
                                )}
                            </div>

                            {/* Course & Batch */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-course">Course / Lab Name *</label>
                                    <input id="sched-course" type="text" value={formData.course_name}
                                        onChange={e => setFormData(prev => ({ ...prev, course_name: e.target.value }))}
                                        className="input-field" placeholder="e.g. Network Security Lab" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-batch">Batch</label>
                                    <input id="sched-batch" type="text" value={formData.batch}
                                        onChange={e => setFormData(prev => ({ ...prev, batch: e.target.value }))}
                                        className="input-field" placeholder="e.g. A1, B2" />
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={14} /> Date & Time
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sched-date">Date *</label>
                                        <input id="sched-date" type="date" value={formData.date}
                                            onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                            className="input-field" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sched-start">Start *</label>
                                        <input id="sched-start" type="time" value={formData.start_time_str}
                                            onChange={e => setFormData(prev => ({ ...prev, start_time_str: e.target.value }))}
                                            className="input-field" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sched-end">End *</label>
                                        <input id="sched-end" type="time" value={formData.end_time_str}
                                            onChange={e => setFormData(prev => ({ ...prev, end_time_str: e.target.value }))}
                                            className="input-field" required />
                                    </div>
                                </div>
                            </div>

                            {/* Lab & Instructor */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-room">Lab Room</label>
                                    <input id="sched-room" type="text" value={formData.lab_room}
                                        onChange={e => setFormData(prev => ({ ...prev, lab_room: e.target.value, lab_name: e.target.value }))}
                                        className="input-field" placeholder="e.g. Room 204" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-instructor">Instructor</label>
                                    <input id="sched-instructor" type="text" value={formData.instructor_name}
                                        onChange={e => setFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                                        className="input-field" placeholder="e.g. Dr. Sharma" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
                                <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Plus size={16} />
                                    )}
                                    {submitting ? 'Booking...' : 'Book Slot'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulePage;
