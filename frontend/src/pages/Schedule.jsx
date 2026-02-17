import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Calendar, Clock, Plus, X, BookOpen, MapPin, User } from 'lucide-react';

const SchedulePage = () => {
    const { hasRole } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        course_name: '', date: '', time: '', lab_name: '', instructor: ''
    });

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const data = await api.getSchedules();
            setSchedules(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.createSchedule(formData);
            fetchSchedules();
            setShowModal(false);
            setFormData({ course_name: '', date: '', time: '', lab_name: '', instructor: '' });
        } catch (err) { console.error(err); }
    };

    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            });
        } catch { return dateStr; }
    };

    const formatTime = (timeStr) => {
        try {
            const [h, m] = timeStr.split(':');
            const hour = parseInt(h);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            return `${hour % 12 || 12}:${m} ${ampm}`;
        } catch { return timeStr; }
    };

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
                            className="glass-card overflow-hidden animate-fade-in-up"
                            style={{ opacity: 0, animationDelay: `${i * 80}ms` }}
                        >
                            <div className="flex">
                                {/* Left accent */}
                                <div className="w-1.5 bg-gradient-to-b from-violet-500 to-purple-600 flex-shrink-0" />
                                <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-gray-900 text-lg">{s.course_name}</h3>
                                        <div className="flex items-center gap-1.5 bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                                            <Clock size={12} />
                                            {formatTime(s.time)}
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-lab-muted" />
                                            {formatDate(s.date)}
                                        </div>
                                        {s.lab_name && (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-lab-muted" />
                                                {s.lab_name}
                                            </div>
                                        )}
                                        {s.instructor && (
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-lab-muted" />
                                                {s.instructor}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-md p-8 animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Book Lab Slot</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close modal">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-course">Course Name</label>
                                <input id="sched-course" type="text" value={formData.course_name}
                                    onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                                    className="input-field" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-date">Date</label>
                                    <input id="sched-date" type="date" value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="input-field" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-time">Time</label>
                                    <input id="sched-time" type="time" value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        className="input-field" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-lab">Lab Name</label>
                                <input id="sched-lab" type="text" value={formData.lab_name}
                                    onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                                    className="input-field" placeholder="e.g. Electronics Lab 2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-instructor">Instructor</label>
                                <input id="sched-instructor" type="text" value={formData.instructor}
                                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                                    className="input-field" />
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Book Slot</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulePage;
