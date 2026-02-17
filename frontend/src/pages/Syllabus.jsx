import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { Upload, FileText, ExternalLink, Bot, Beaker, BookOpen, Filter, Save, X, Building2, GraduationCap, CheckCircle, Sparkles, Plus, AlertCircle } from 'lucide-react';

const Syllabus = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [syllabusData, setSyllabusData] = useState(null);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('upload');
    const [manualData, setManualData] = useState({ subject: '', topics: [''] });

    // Filters
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [selectedUnit, setSelectedUnit] = useState('all');

    // Save Modal States
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [saveCollege, setSaveCollege] = useState('');
    const [saveDepartment, setSaveDepartment] = useState('');
    const [saveSemester, setSaveSemester] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (showSaveModal) loadColleges();
    }, [showSaveModal]);

    useEffect(() => {
        if (saveCollege) {
            loadDepartments(saveCollege);
        } else {
            setDepartments([]);
            setSaveDepartment('');
        }
    }, [saveCollege]);

    const loadColleges = async () => {
        try { const data = await api.getColleges(); setColleges(data); }
        catch (err) { console.error('Failed to load colleges:', err); }
    };

    const loadDepartments = async (collegeId) => {
        try { const data = await api.getDepartments(collegeId); setDepartments(data); }
        catch (err) { console.error('Failed to load departments:', err); }
    };

    const handleSaveToVLabs = async () => {
        if (!saveCollege || !saveDepartment || !saveSemester) {
            setSaveError('Please select college, department, and semester');
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            const subjectsMap = {};
            syllabusData.experiments.forEach(exp => {
                const subjectName = exp.subject || 'Unknown';
                if (!subjectsMap[subjectName]) {
                    subjectsMap[subjectName] = {
                        subject: subjectName,
                        subject_code: exp.subject_code || '',
                        experiments: []
                    };
                }
                subjectsMap[subjectName].experiments.push({
                    unit: exp.unit, topic: exp.topic,
                    description: exp.description, suggested_simulation: exp.suggested_simulation
                });
            });
            const subjects = Object.values(subjectsMap);
            await api.saveToVLabs(parseInt(saveCollege), parseInt(saveDepartment), parseInt(saveSemester), subjects);
            setSaveSuccess(true);
            setTimeout(() => {
                setShowSaveModal(false);
                setSaveSuccess(false);
                setSaveCollege(''); setSaveDepartment(''); setSaveSemester('');
            }, 2000);
        } catch (err) {
            setSaveError(err.message || 'Failed to save');
        } finally { setSaving(false); }
    };

    const handleManualSubmit = async () => {
        setLoading(true); setError('');
        try {
            const validTopics = manualData.topics.filter(t => t.trim() !== '');
            if (validTopics.length === 0) throw new Error("Please enter at least one topic.");
            const data = await api.manualSyllabus({ subject: manualData.subject, topics: validTopics });
            setSyllabusData({
                branch: '',
                experiments: data.map((exp) => ({ ...exp, subject: manualData.subject, subject_code: '' }))
            });
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to generate results.');
        } finally { setLoading(false); }
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) { setFile(e.target.files[0]); setError(''); }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true); setError('');
        try {
            const data = await api.uploadSyllabus(file);
            setSyllabusData(data);
            setSelectedBranch('all'); setSelectedSubject('all'); setSelectedUnit('all');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to parse syllabus. Please try again.');
        } finally { setLoading(false); }
    };

    const uniqueSubjects = useMemo(() => {
        if (!syllabusData) return [];
        const subjects = new Set();
        syllabusData.experiments.forEach(exp => {
            if (exp.subject) subjects.add(JSON.stringify({ name: exp.subject, code: exp.subject_code }));
        });
        return Array.from(subjects).map(s => JSON.parse(s));
    }, [syllabusData]);

    const uniqueUnits = useMemo(() => {
        if (!syllabusData) return [];
        const units = new Set();
        syllabusData.experiments.forEach(exp => {
            if (exp.unit !== null && exp.unit !== undefined) units.add(exp.unit);
        });
        return Array.from(units).sort((a, b) => a - b);
    }, [syllabusData]);

    const filteredExperiments = useMemo(() => {
        if (!syllabusData) return [];
        return syllabusData.experiments.filter(exp => {
            if (selectedSubject !== 'all' && exp.subject !== selectedSubject) return false;
            if (selectedUnit !== 'all' && exp.unit !== selectedUnit) return false;
            return true;
        });
    }, [syllabusData, selectedSubject, selectedUnit]);

    const groupedData = useMemo(() => {
        const groups = {};
        filteredExperiments.forEach(exp => {
            const subjectKey = exp.subject || 'Unknown';
            if (!groups[subjectKey]) groups[subjectKey] = {};
            const unitKey = exp.unit !== null ? `Unit ${exp.unit}` : 'Other';
            if (!groups[subjectKey][unitKey]) groups[subjectKey][unitKey] = [];
            groups[subjectKey][unitKey].push(exp);
        });
        return groups;
    }, [filteredExperiments]);

    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg">
                    <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="page-header">AI Syllabus Parser</h1>
                    <p className="page-subtitle text-sm">Upload PDF or manually enter topics — supports multiple subjects!</p>
                </div>
            </header>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 animate-scale-in">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Mode Tabs */}
            <div className="flex justify-center">
                <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
                    <button onClick={() => setMode('upload')}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${mode === 'upload'
                            ? 'bg-white shadow-md text-lab-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        <Upload size={16} /> Upload PDF
                    </button>
                    <button onClick={() => setMode('manual')}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${mode === 'manual'
                            ? 'bg-white shadow-md text-lab-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        <FileText size={16} /> Manual Entry
                    </button>
                </div>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
                <div className="section-card border-2 border-dashed border-gray-200 hover:border-lab-primary/40 transition-colors text-center py-12">
                    <input type="file" id="syllabus-upload" className="hidden" accept=".pdf" onChange={handleFileChange} />
                    <label htmlFor="syllabus-upload" className="cursor-pointer flex flex-col items-center gap-4">
                        <div className="bg-gradient-to-br from-cyan-100 to-blue-100 p-5 rounded-2xl text-lab-accent animate-float">
                            <Upload size={32} />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900">
                                {file ? file.name : 'Click to upload your syllabus PDF'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">Supports multiple subjects in one file</p>
                        </div>
                        {file && (
                            <button onClick={(e) => { e.preventDefault(); handleUpload(); }} disabled={loading}
                                className="btn-primary mt-2">
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analyzing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Sparkles size={16} /> Analyze Syllabus
                                    </span>
                                )}
                            </button>
                        )}
                    </label>
                </div>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
                <div className="section-card">
                    <h2 className="text-xl font-bold mb-5 text-gray-900 flex items-center gap-2">
                        <FileText size={20} className="text-lab-accent" /> Manual Entry
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="manual-subject">Subject Name</label>
                            <input id="manual-subject" className="input-field"
                                placeholder="e.g. Physics Lab, Chemistry..."
                                value={manualData.subject}
                                onChange={(e) => setManualData({ ...manualData, subject: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Experiment Topics</label>
                            {manualData.topics.map((topic, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input className="input-field"
                                        placeholder={`Topic ${index + 1}`} value={topic}
                                        onChange={(e) => {
                                            const newTopics = [...manualData.topics];
                                            newTopics[index] = e.target.value;
                                            setManualData({ ...manualData, topics: newTopics });
                                        }} />
                                    {manualData.topics.length > 1 && (
                                        <button onClick={() => {
                                            const newTopics = manualData.topics.filter((_, i) => i !== index);
                                            setManualData({ ...manualData, topics: newTopics });
                                        }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                            aria-label="Remove topic">
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button onClick={() => setManualData({ ...manualData, topics: [...manualData.topics, ''] })}
                                className="flex items-center gap-1 text-sm text-lab-primary hover:text-lab-secondary font-semibold mt-1 transition-colors">
                                <Plus size={14} /> Add another topic
                            </button>
                        </div>
                        <button onClick={handleManualSubmit} disabled={loading}
                            className="btn-primary w-full">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Sparkles size={16} /> Generate Simulations
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="text-center py-16">
                    <div className="w-12 h-12 border-3 border-lab-primary/20 border-t-lab-primary rounded-full animate-spin mx-auto" />
                    <p className="text-lab-muted mt-4">AI is analyzing your syllabus...</p>
                </div>
            )}

            {/* Results */}
            {syllabusData && !loading && (
                <div className="space-y-6">
                    {/* Results Header */}
                    <div className="glass-card overflow-hidden">
                        <div className="bg-gradient-to-r from-lab-primary via-lab-secondary to-lab-accent p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <BookOpen size={24} />
                                        Lab Syllabus
                                    </h2>
                                    {syllabusData.branch && <p className="text-white/70 text-sm mt-1">{syllabusData.branch}</p>}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-white">{filteredExperiments.length}</div>
                                        <div className="text-xs text-white/70">Experiments</div>
                                    </div>
                                    <button onClick={() => setShowSaveModal(true)}
                                        className="bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors border border-white/20 backdrop-blur-sm">
                                        <Save size={18} />
                                        Save to V Labs
                                    </button>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-white/70 mb-1">Subject</label>
                                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="w-full bg-white/15 backdrop-blur text-white border border-white/20 rounded-xl px-3 py-2.5 text-sm outline-none">
                                        <option value="all" className="text-gray-800">All Subjects ({uniqueSubjects.length})</option>
                                        {uniqueSubjects.map((subj, idx) => (
                                            <option key={idx} value={subj.name} className="text-gray-800">
                                                {subj.name} {subj.code && `(${subj.code})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-white/70 mb-1">Unit</label>
                                    <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                        className="w-full bg-white/15 backdrop-blur text-white border border-white/20 rounded-xl px-3 py-2.5 text-sm outline-none">
                                        <option value="all" className="text-gray-800">All Units</option>
                                        {uniqueUnits.map(unit => (
                                            <option key={unit} value={unit} className="text-gray-800">Unit {unit}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grouped Experiments */}
                    {Object.entries(groupedData).map(([subject, units]) => (
                        <div key={subject} className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 px-1">
                                <FileText size={20} className="text-lab-primary" />
                                {subject}
                            </h3>
                            {Object.entries(units).map(([unitName, experiments]) => (
                                <div key={unitName} className="section-card overflow-hidden !p-0">
                                    <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-200/60">
                                        <h4 className="font-semibold text-gray-700 text-sm">
                                            {unitName} <span className="text-gray-400">({experiments.length} experiments)</span>
                                        </h4>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {experiments.map((item) => (
                                            <div key={item.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                                <div className="mb-3">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-xs font-mono bg-lab-primary/5 text-lab-primary px-2 py-0.5 rounded-lg">#{item.id}</span>
                                                        <h5 className="text-base font-bold text-gray-900">{item.topic}</h5>
                                                    </div>
                                                    <p className="text-gray-500 text-sm mb-3 leading-relaxed">{item.description}</p>
                                                    <div className="inline-flex items-center gap-1.5 text-xs text-lab-accent bg-lab-accent/5 px-3 py-1.5 rounded-full font-medium">
                                                        <Beaker size={12} />
                                                        {item.suggested_simulation}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {item.simulation_links?.map((link, idx) => (
                                                        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                                                            className="glass-card !p-3 text-center !rounded-xl group">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-semibold text-xs text-gray-800 group-hover:text-lab-primary transition-colors">{link.source}</span>
                                                                <ExternalLink size={12} className="text-gray-400 group-hover:text-lab-primary transition-colors" />
                                                            </div>
                                                            <span className="text-xs text-gray-500">{link.description}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveModal(false)} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-md p-8 animate-scale-in">
                        {saveSuccess ? (
                            <div className="text-center py-8">
                                <div className="bg-emerald-100 p-4 rounded-full inline-block mb-4">
                                    <CheckCircle size={48} className="text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Saved Successfully!</h3>
                                <p className="text-gray-500 mt-2 text-sm">Your experiments have been saved to V Labs.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Save size={20} className="text-lab-primary" />
                                        Save to V Labs
                                    </h3>
                                    <button onClick={() => setShowSaveModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close modal">
                                        <X size={20} className="text-gray-500" />
                                    </button>
                                </div>

                                <p className="text-gray-500 text-sm mb-6">
                                    Select the college, department, and semester to save {syllabusData?.experiments?.length || 0} experiments.
                                </p>

                                {saveError && (
                                    <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2.5 rounded-xl text-sm mb-4 border border-red-100">
                                        <AlertCircle size={16} />
                                        {saveError}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <Building2 size={14} /> College
                                        </label>
                                        <select value={saveCollege} onChange={(e) => setSaveCollege(e.target.value)} className="input-field">
                                            <option value="">Select College</option>
                                            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        {colleges.length === 0 && (
                                            <p className="text-xs text-gray-400 mt-1">No colleges found. Ask admin to add colleges first.</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <GraduationCap size={14} /> Department
                                        </label>
                                        <select value={saveDepartment} onChange={(e) => setSaveDepartment(e.target.value)} className="input-field" disabled={!saveCollege}>
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <BookOpen size={14} /> Semester
                                        </label>
                                        <select value={saveSemester} onChange={(e) => setSaveSemester(e.target.value)} className="input-field">
                                            <option value="">Select Semester</option>
                                            {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setShowSaveModal(false)} className="btn-ghost flex-1">Cancel</button>
                                    <button onClick={handleSaveToVLabs}
                                        disabled={saving || !saveCollege || !saveDepartment || !saveSemester}
                                        className="btn-primary flex-1">
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Syllabus;
