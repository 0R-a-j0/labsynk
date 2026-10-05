export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function validateSyllabusFile(file) {
    if (!file || !/\.pdf$/i.test(file.name)) return 'Choose a PDF file.';
    if (!file.size) return 'This PDF is empty.';
    if (file.size > MAX_PDF_BYTES) return 'Choose a PDF smaller than 10 MiB.';
    return '';
}

export function buildSyllabusSubjects(rows) {
    const selected = rows.filter(row => row.included);
    if (!selected.length) throw new Error('Select at least one experiment to save.');
    const groups = new Map();
    for (const row of selected) {
        const subject = row.subject.trim();
        const code = (row.subject_code || '').trim();
        const topic = row.topic.trim();
        if (!subject || subject === 'Unassigned subject') throw new Error('Assign a subject to every selected experiment.');
        if (!topic) throw new Error('Every selected experiment needs a topic.');
        if (topic.length > 2000) throw new Error('Experiment topics must be 2,000 characters or fewer.');
        const unit = row.unit === '' || row.unit == null ? null : Number(row.unit);
        if (unit !== null && (!Number.isInteger(unit) || unit < 1 || unit > 100)) {
            throw new Error('Units must be whole numbers between 1 and 100, or blank.');
        }
        const key = JSON.stringify([subject, code]);
        if (!groups.has(key)) groups.set(key, { subject, subject_code: code, experiments: [] });
        groups.get(key).experiments.push({ unit, topic, description: row.description || '', suggested_simulation: topic });
    }
    return [...groups.values()];
}
