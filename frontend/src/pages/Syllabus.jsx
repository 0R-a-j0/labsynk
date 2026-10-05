import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { buildSyllabusSubjects, validateSyllabusFile } from '../lib/syllabus';
import { Upload, FileText, Save, X, CheckCircle, AlertCircle } from 'lucide-react';

const Syllabus = () => {
    const { canUploadSyllabus, loading: authLoading } = useAuth();
    const allowed = canUploadSyllabus();
    const [mode, setMode] = useState('upload');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [rows, setRows] = useState([]);
    const [manualSubject, setManualSubject] = useState('');
    const [manualTopics, setManualTopics] = useState('');
    const [saved, setSaved] = useState(false);
    const requestRef = useRef(null);
    const [showSave, setShowSave] = useState(false);
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [college, setCollege] = useState('');
    const [department, setDepartment] = useState('');
    const [semester, setSemester] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const selectedCount = rows.filter(row => row.included).length;
    const subjectGroups = Array.from(rows.reduce((groups, row) => {
        const key = JSON.stringify([row.subject, row.subject_code || '']);
        if (!groups.has(key)) groups.set(key, { key, name: row.subject, code: row.subject_code, ids: [], selected: 0 });
        const group = groups.get(key);
        group.ids.push(row.id);
        if (row.included) group.selected += 1;
        return groups;
    }, new Map()).values());

    useEffect(() => () => requestRef.current?.abort(), []);
    useEffect(() => {
        if (!showSave) return;
        let active = true;
        api.getColleges().then(data => { if (active) setColleges(data); })
            .catch(() => { if (active) setSaveError('Could not load colleges. Close this dialog and try again.'); });
        return () => { active = false; };
    }, [showSave]);
    useEffect(() => {
        if (!college || !showSave) return;
        let active = true;
        api.getDepartments(college).then(data => { if (active) setDepartments(data); })
            .catch(() => { if (active) setSaveError('Could not load departments. Select the college again.'); });
        return () => { active = false; };
    }, [college, showSave]);

    const setResults = data => {
        setResult(data);
        setRows(data.experiments.map((row, index) => ({ ...row, id: index + 1, included: true })));
        setSaved(false);
    };
    const chooseFile = chosen => {
        if (loading) return;
        const message = validateSyllabusFile(chosen);
        setError(message);
        setFile(message ? null : chosen);
        setResult(null);
        setRows([]);
        setSaved(false);
    };
    const scan = async () => {
        if (!file || !allowed || loading) return;
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true); setError(''); setResult(null); setRows([]); setSaved(false);
        try {
            setResults(await api.uploadSyllabus(file, { signal: controller.signal }));
        } catch (err) {
            setError(err.name === 'AbortError' ? 'Scan cancelled. You can select another PDF.' : err.message);
        } finally {
            requestRef.current = null;
            setLoading(false);
        }
    };
    const submitManual = async () => {
        const topics = manualTopics.split('\n').map(topic => topic.trim()).filter(Boolean);
        if (!manualSubject.trim() || !topics.length) {
            setError('Enter a subject and at least one experiment, one per line.'); return;
        }
        if (topics.length > 100 || topics.some(topic => topic.length > 500)) {
            setError('Enter up to 100 topics, each with 500 characters or fewer.'); return;
        }
        setLoading(true); setError(''); setResult(null); setRows([]); setSaved(false);
        try {
            const experiments = await api.manualSyllabus({ subject: manualSubject.trim(), topics });
            setResults({ experiments: experiments.map(row => ({ ...row, subject: manualSubject.trim(), unit: null })), warnings: [] });
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };
    const editRow = (id, field, value) => {
        setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row));
        setSaved(false);
    };
    const openSave = () => {
        try { buildSyllabusSubjects(rows); }
        catch (err) { setError(err.message); return; }
        setError(''); setSaveError(''); setCollege(''); setDepartment(''); setSemester(''); setDepartments([]);
        setShowSave(true);
    };
    const save = async () => {
        setSaving(true); setSaveError('');
        try {
            await api.saveToVLabs(Number(college), Number(department), Number(semester), buildSyllabusSubjects(rows));
            setShowSave(false); setSaved(true);
        } catch (err) { setSaveError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <header className="flex gap-3 items-center">
                <FileText className="text-lab-accent" size={32} />
                <div><h1 className="page-header">Syllabus Scanner</h1>
                    <p className="page-subtitle">Upload a PDF, review the extracted experiments, then save them to Virtual Labs.</p></div>
            </header>
            {!authLoading && !allowed && <div className="section-card" role="status">
                Staff access is required to scan and save syllabi. <Link to="/login" className="text-lab-accent underline">Sign in</Link>
            </div>}
            {error && <div role="alert" className="p-4 rounded-xl bg-red-50 text-red-700 flex gap-2"><AlertCircle size={20} /><span>{error}</span></div>}
            {saved && <div role="status" className="p-4 rounded-xl bg-emerald-50 text-emerald-800 flex gap-2"><CheckCircle size={20} />
                Saved successfully. <Link to="/labs" className="underline">Open Virtual Labs</Link></div>}
            <div className="flex gap-2" aria-label="Syllabus input method">
                <button className={mode === 'upload' ? 'btn-primary' : 'btn-ghost'} disabled={loading} onClick={() => setMode('upload')}>Upload PDF</button>
                <button className={mode === 'manual' ? 'btn-primary' : 'btn-ghost'} disabled={loading} onClick={() => setMode('manual')}>Enter topics</button>
            </div>
            {mode === 'upload' ? <section className="section-card space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center"
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => { event.preventDefault(); if (allowed) chooseFile(event.dataTransfer.files[0]); }}>
                    <Upload size={32} className="mx-auto mb-3 text-lab-accent" />
                    <label htmlFor="syllabus-upload" className="block font-semibold mb-2">Choose a syllabus PDF or drop it here</label>
                    <input id="syllabus-upload" type="file" accept=".pdf,application/pdf" disabled={!allowed || loading}
                        onChange={event => { if (event.target.files[0]) chooseFile(event.target.files[0]); event.target.value = ''; }}
                        className="max-w-full text-sm" />
                    <p className="text-sm text-gray-500">Full semester PDFs are welcome. Only lab practicals are imported; choose your subjects after scanning.</p>
                    <p className="text-sm text-gray-500 mt-3">Selectable text or English scanned pages · Up to 10 MiB / 200 pages (20 scanned pages)</p>
                </div>
                {file && <p className="text-sm break-all"><strong>{file.name}</strong> · {(file.size / 1024 / 1024).toFixed(2)} MiB</p>}
                <button onClick={scan} disabled={!file || !allowed || loading} className="btn-primary disabled:opacity-50">Scan syllabus</button>
            </section> : <section className="section-card space-y-4">
                <label className="block">Subject name<input className="input-field mt-1" maxLength={200} value={manualSubject}
                    disabled={loading || !allowed} onChange={event => setManualSubject(event.target.value)} /></label>
                <label className="block">Experiments (one per line)<textarea className="input-field mt-1" rows={6} value={manualTopics}
                    disabled={loading || !allowed} onChange={event => setManualTopics(event.target.value)} /></label>
                <button className="btn-primary disabled:opacity-50" disabled={loading || !allowed} onClick={submitManual}>Review topics</button>
            </section>}
            {loading && <div role="status" className="section-card text-center space-y-3" aria-live="polite">
                <div className="w-8 h-8 border-4 border-lab-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p>{mode === 'upload' ? 'Reading the PDF and recognizing scanned text. This can take up to 90 seconds.' : 'Preparing your topics…'}</p>
                {mode === 'upload' && <button className="btn-ghost" onClick={() => requestRef.current?.abort()}>Cancel scan</button>}
            </div>}
            {result && !loading && <section className="space-y-4" aria-label="Review extracted experiments">
                <div className="section-card space-y-3">
                    <h2 className="text-xl font-bold">Review extracted experiments</h2>
                    <p>{rows.length} experiments found{result.page_count ? ` across ${result.page_count} pages` : ''}.
                        {result.ocr_pages?.length ? ` OCR used on pages ${result.ocr_pages.join(', ')}.` : ''}</p>
                    <p className="text-sm text-gray-500">Correct subject names, units, and topics below. Uncheck rows you do not want to save. Simulation links are generated from your saved topics.</p>
                    {result.branch && <p className="text-sm">Department: {result.branch}</p>}
                    {result.warnings?.map((warning, index) => <p key={index} role="status" className="p-3 bg-amber-50 text-amber-900 rounded-lg">{warning}</p>)}
                    {subjectGroups.length > 1 && <fieldset className="space-y-2">
                        <legend className="font-semibold mb-2">Choose subjects and electives to import</legend>
                        {subjectGroups.map(group => <label key={group.key} className="flex items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-1" checked={group.selected === group.ids.length}
                                ref={element => { if (element) element.indeterminate = group.selected > 0 && group.selected < group.ids.length; }}
                                onChange={event => {
                                    const included = event.target.checked;
                                    setRows(current => current.map(row => group.ids.includes(row.id) ? { ...row, included } : row));
                                    setSaved(false);
                                }} />
                            <span>{group.name}{group.code ? ` (${group.code})` : ''} · {group.selected}/{group.ids.length} selected</span>
                        </label>)}
                    </fieldset>}
                    <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedCount === rows.length && rows.length > 0}
                            onChange={event => { setRows(current => current.map(row => ({ ...row, included: event.target.checked }))); setSaved(false); }} />Select all</label>
                        <span>{selectedCount} selected</span>
                        <button className="btn-primary disabled:opacity-50 flex gap-2 items-center" disabled={!selectedCount || saved || !allowed} onClick={openSave}><Save size={16} />Save selected to Virtual Labs</button>
                    </div>
                </div>
                {rows.map(row => <article key={row.id} className={`section-card space-y-3 ${row.included ? '' : 'opacity-60'}`}>
                    <div className="flex items-center justify-between">
                        <label className="font-semibold flex items-center gap-2"><input type="checkbox" checked={row.included}
                            onChange={event => editRow(row.id, 'included', event.target.checked)} />Experiment {row.id}</label>
                        {row.source_page && <span className="text-sm text-gray-500">PDF page {row.source_page}</span>}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                        <label className="text-sm">Subject<input aria-label={`Subject for experiment ${row.id}`} className="input-field mt-1" value={row.subject}
                            onChange={event => editRow(row.id, 'subject', event.target.value)} /></label>
                        <label className="text-sm">Subject code<input aria-label={`Subject code for experiment ${row.id}`} className="input-field mt-1" value={row.subject_code || ''}
                            onChange={event => editRow(row.id, 'subject_code', event.target.value)} /></label>
                        <label className="text-sm">Unit (optional)<input aria-label={`Unit for experiment ${row.id}`} className="input-field mt-1" type="number" min="1" max="100" value={row.unit ?? ''}
                            onChange={event => editRow(row.id, 'unit', event.target.value)} /></label>
                    </div>
                    <label className="block text-sm">Experiment topic<textarea aria-label={`Topic for experiment ${row.id}`} className="input-field mt-1" rows={2} maxLength={2000}
                        value={row.topic} onChange={event => editRow(row.id, 'topic', event.target.value)} /></label>
                </article>)}
            </section>}
            {showSave && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <section role="dialog" aria-modal="true" aria-labelledby="save-syllabus-title" className="section-card w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center"><h2 id="save-syllabus-title" className="text-xl font-bold">Save {selectedCount} experiments</h2>
                        <button aria-label="Close save dialog" disabled={saving} onClick={() => setShowSave(false)}><X /></button></div>
                    {saveError && <p role="alert" className="text-red-600">{saveError}</p>}
                    <label className="block">College<select className="input-field mt-1" value={college} disabled={saving}
                        onChange={event => { setCollege(event.target.value); setDepartment(''); setDepartments([]); setSaveError(''); }}>
                        <option value="">Select college</option>{colleges.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label className="block">Department<select className="input-field mt-1" value={department} disabled={!college || saving} onChange={event => setDepartment(event.target.value)}>
                        <option value="">Select department</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label className="block">Semester<select className="input-field mt-1" value={semester} disabled={saving} onChange={event => setSemester(event.target.value)}>
                        <option value="">Select semester</option>{[1,2,3,4,5,6,7,8].map(value => <option key={value}>{value}</option>)}</select></label>
                    <p className="text-sm text-gray-500">Missing a college or department? Ask an HOD or principal to add it in Admin.</p>
                    <button className="btn-primary w-full disabled:opacity-50" disabled={saving || !college || !department || !semester} onClick={save}>{saving ? 'Saving…' : 'Save experiments'}</button>
                </section>
            </div>}
        </main>
    );
};
export default Syllabus;
