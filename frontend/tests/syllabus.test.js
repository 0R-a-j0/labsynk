import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSyllabusSubjects, validateSyllabusFile, MAX_PDF_BYTES } from '../src/lib/syllabus.js';

const row = { included: true, subject: 'Physics', subject_code: 'PHY1', topic: 'Measure current', unit: '' };
test('validates PDF size and extension before uploading', () => {
    assert.equal(validateSyllabusFile({ name: 'Syllabus.PDF', size: 100 }), '');
    for (const file of [{ name: 'photo.png', size: 100 }, { name: 'empty.pdf', size: 0 }, { name: 'big.pdf', size: MAX_PDF_BYTES + 1 }]) {
        assert.notEqual(validateSyllabusFile(file), '');
    }
});
test('saves reviewed topics and only included rows, grouped by name and code', () => {
    const result = buildSyllabusSubjects([row, { ...row, topic: 'Excluded', included: false },
        { ...row, subject_code: 'PHY2', topic: 'Corrected topic', unit: '2' }]);
    assert.equal(result.length, 2);
    assert.equal(result[0].experiments[0].unit, null);
    assert.equal(result[1].experiments[0].suggested_simulation, 'Corrected topic');
    assert.equal(result[1].experiments[0].unit, 2);
});
test('rejects missing subjects, empty selection and invalid units', () => {
    for (const input of [[], [{ ...row, subject: 'Unassigned subject' }], [{ ...row, topic: ' ' }],
        [{ ...row, unit: '-1' }], [{ ...row, unit: '2.5' }]]) {
        assert.throws(() => buildSyllabusSubjects(input));
    }
});
test('subject names cannot collide with object prototype properties', () => {
    assert.equal(buildSyllabusSubjects([{ ...row, subject: '__proto__' }])[0].subject, '__proto__');
});
