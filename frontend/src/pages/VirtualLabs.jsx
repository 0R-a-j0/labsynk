import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookOpen, Filter, ExternalLink, Search, ChevronDown, Beaker, Code } from 'lucide-react';

const VirtualLabs = () => {
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        college: '', department: '', semester: '', subject: ''
    });

    useEffect(() => {
        loadColleges();
    }, []);

    const loadColleges = async () => {
        try { const data = await api.getColleges(); setColleges(data); }
        catch (err) { console.error(err); }
    };

    const handleFilterChange = async (key, value) => {
        const newFilters = { ...filters, [key]: value };

        // Reset downstream
        if (key === 'college') {
            newFilters.department = '';
            newFilters.semester = '';
            newFilters.subject = '';
            setDepartments([]);
            setSubjects([]);
            setExperiments([]);
            if (value) {
                try { const data = await api.getDepartments(value); setDepartments(data); }
                catch (err) { console.error(err); }
            }
        } else if (key === 'department' || key === 'semester') {
            newFilters.subject = '';
            setSubjects([]);
            setExperiments([]);
            if (newFilters.department && newFilters.semester) {
                try {
                    const data = await api.getSubjects(newFilters.department, newFilters.semester);
                    setSubjects(data);
                } catch (err) { console.error(err); }
            }
        } else if (key === 'subject') {
            setExperiments([]);
            if (value) {
                setLoading(true);
                try {
                    const data = await api.getVLabExperiments(value);
                    setExperiments(data);
                } catch (err) { console.error(err); }
                finally { setLoading(false); }
            }
        }

        setFilters(newFilters);
    };

    const selectClass = "input-field appearance-none cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOTRBM0I4IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[right_1rem_center]";

    const currentSubject = subjects.find(s => s.id === parseInt(filters.subject));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="page-header">Virtual Labs</h1>
                    <p className="page-subtitle text-sm">Browse IIT vLabs simulations linked to your syllabus</p>
                </div>
            </header>

            {/* Filters */}
            <div className="section-card">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={16} className="text-lab-muted" />
                    <span className="text-sm font-semibold text-gray-700">Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <select value={filters.college} onChange={(e) => handleFilterChange('college', e.target.value)} className={selectClass}>
                        <option value="">Select College</option>
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)} className={selectClass} disabled={!filters.college}>
                        <option value="">Select Department</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select value={filters.semester} onChange={(e) => handleFilterChange('semester', e.target.value)} className={selectClass} disabled={!filters.department}>
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                    <select value={filters.subject} onChange={(e) => handleFilterChange('subject', e.target.value)} className={selectClass} disabled={!filters.semester}>
                        <option value="">Select Subject</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-3 border-lab-primary/20 border-t-lab-primary rounded-full animate-spin mx-auto" />
                    <p className="text-lab-muted mt-4 text-sm">Loading experiments...</p>
                </div>
            ) : experiments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {experiments.map((exp, i) => (
                        <div
                            key={exp.id || i}
                            className="glass-card p-5 animate-fade-in-up"
                            style={{ opacity: 0, animationDelay: `${i * 80}ms` }}
                        >
                            <div className="flex items-start gap-3">
                                <div className="bg-teal-100 text-teal-600 p-2 rounded-xl flex-shrink-0 mt-0.5">
                                    <Beaker size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 mb-1">{exp.topic}</h3>
                                    {exp.description && (
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{exp.description}</p>
                                    )}
                                    {exp.simulation_links?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {exp.simulation_links.map((link, j) => {
                                                const isYouTube = link.source?.toLowerCase().includes('youtube');
                                                if (link.source?.toLowerCase().includes('programiz')) return null;

                                                return (
                                                    <a
                                                        key={j}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${isYouTube
                                                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                                            : 'bg-lab-accent/10 text-lab-accent hover:bg-lab-accent hover:text-white'
                                                            }`}
                                                        title={link.description}
                                                    >
                                                        {isYouTube ? 'Watch Video' : link.source}
                                                        <ExternalLink size={12} />
                                                    </a>
                                                );
                                            })}
                                            {currentSubject?.default_compiler && (
                                                <a
                                                    href={currentSubject.default_compiler}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 bg-lab-accent/10 text-lab-accent hover:bg-lab-accent hover:text-white"
                                                >
                                                    Online Compiler
                                                    <Code size={12} />
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {currentSubject?.default_compiler && (
                                                <a
                                                    href={currentSubject.default_compiler}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 bg-lab-accent/10 text-lab-accent hover:bg-lab-accent hover:text-white"
                                                >
                                                    Online Compiler
                                                    <Code size={12} />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filters.subject ? (
                <div className="section-card text-center py-16">
                    <Beaker size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No experiments found</p>
                    <p className="text-gray-400 text-sm mt-1">Try selecting different filters</p>
                </div>
            ) : (
                <div className="section-card text-center py-16">
                    <Search size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Use the filters above</p>
                    <p className="text-gray-400 text-sm mt-1">Select a college, department, semester, and subject to browse experiments</p>
                </div>
            )}
        </div>
    );
};

export default VirtualLabs;
