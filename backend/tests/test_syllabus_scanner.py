from io import BytesIO
import shutil

import pytest
from pypdf import PdfReader, PdfWriter

from services import syllabus_scanner as scanner
from tests.pdf_fixtures import text_pdf, scanned_pdf


@pytest.fixture
def document():
    return text_pdf([
        ['Department: Computer Science', 'Subject: Programming Laboratory', 'Subject Code: CS101',
         'List of experiments', 'Unit I', '1. Write a program to sort an array',
         'using insertion sort and compare results.', '2. Implement a stack using an array.'],
        ['Subject: Programming Laboratory', 'Subject Code: CS101', 'List of experiments',
         '3. Implement a linked list.', 'Course Outcomes', '1. Understand basic data structures.'],
        ['Subject: Physics Laboratory', 'Subject Code: PHY101', 'List of experiments',
         'Experiment 1: Measure the resistance of a wire.'],
    ])


def test_text_lists_continuation_subjects_and_page_provenance(document):
    result = scanner.scan_pdf(document)
    assert result['page_count'] == 3
    assert result['ocr_pages'] == []
    assert result['branch'] == 'Computer Science'
    assert len(result['subjects']) == 2
    first, second = result['subjects']
    assert first['subject_code'] == 'CS101'
    assert len(first['experiments']) == 3
    assert 'insertion sort' in first['experiments'][0]['topic']
    assert first['experiments'][0]['unit'] == 1
    assert first['experiments'][2]['source_page'] == 2
    assert second['experiments'][0]['source_page'] == 3
    assert second['subject_code'] == 'PHY101'


def test_table_extraction_excludes_hours_column():
    pdf = text_pdf([['Subject: Electrical Laboratory', 'Subject Code: EE101']], tables={0: [
        ['Unit', 'Contents', 'Hours'], ['UNIT-01', 'Measure current in a series circuit.', '4'],
        ['UNIT-02', 'Verify Kirchhoff laws.', '6'],
    ]})
    result = scanner.scan_document(pdf)
    rows = result['subjects'][0]['experiments']
    assert len(rows) == 2
    assert rows[0]['unit'] == 1
    assert rows[0]['topic'] == 'Measure current in a series circuit.'
    assert rows[1]['unit'] == 2


def test_numbered_table_and_wrapped_cells():
    pdf = text_pdf([['Subject: Chemistry Laboratory']], tables={0: [
        ['Experiment No.', 'Description', 'Hours'], ['1', 'Prepare a standard solution.', '3'],
        ['', 'Calculate the concentration.', ''], ['2', 'Measure the pH of the solution.', '2'],
    ]})
    rows = scanner.scan_document(pdf)['subjects'][0]['experiments']
    assert len(rows) == 2
    assert rows[0]['topic'] == 'Prepare a standard solution. Calculate the concentration.'


def test_codes_before_titles_and_deduplication():
    parser = scanner.SyllabusParser()
    parser.feed('Subject Code: CS101\nSubject: Programming Lab\nExperiment 1: Write a sorting program.', 1)
    parser.feed('Subject Code: CS101\nSubject: Programming Lab\nExperiment 1: Write a sorting program.', 2)
    parser.feed('Subject Code: EE101\nSubject: Electrical Lab\nExperiment 1: Measure current.', 3)
    groups = parser.result()['subjects']
    assert [group['subject_code'] for group in groups] == ['CS101', 'EE101']
    assert len(groups[0]['experiments']) == 1


def test_scanned_pdf_uses_real_local_ocr():
    if not shutil.which('tesseract'):
        pytest.skip('Tesseract is not installed')
    result = scanner.scan_pdf(scanned_pdf())
    assert result['ocr_pages'] == [1]
    assert result['warnings']
    assert len(result['subjects'][0]['experiments']) == 2
    assert 'resistance' in result['subjects'][0]['experiments'][0]['topic'].lower()


def test_missing_ocr_is_actionable(monkeypatch):
    monkeypatch.setattr(scanner.shutil, 'which', lambda _: None)
    with pytest.raises(scanner.ScanError, match='Install Tesseract') as error:
        scanner.scan_document(scanned_pdf())
    assert error.value.status_code == 503


@pytest.mark.parametrize('content', [b'%PDF-invalid', text_pdf([['This document has no laboratory experiments.']])])
def test_bad_or_unrecognized_pdf_returns_actionable_error(content):
    with pytest.raises(scanner.ScanError):
        scanner.scan_pdf(content)


def test_password_protected_document():
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    writer.encrypt('synthetic-password')
    output = BytesIO()
    writer.write(output)
    with pytest.raises(scanner.ScanError, match='password protected'):
        scanner.scan_pdf(output.getvalue())


def test_upload_response_and_save_roundtrip(client, auth_headers, document):
    headers = auth_headers('assistant')
    response = client.post('/syllabus/upload', files={'file': ('Syllabus.PDF', document, 'application/pdf')}, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data['experiments']) == 4
    assert data['experiments'][0]['source_page'] == 1
    assert data['experiments'][0]['simulation_links']
    principal = auth_headers('principal')
    college = client.post('/vlabs/colleges', json={'name': 'Fixture College'}, headers=principal).json()
    department = client.post('/vlabs/departments', json={'name': 'Fixture Dept', 'college_id': college['id']}, headers=principal).json()
    response = client.post('/vlabs/save', headers=headers, json={'college_id': college['id'], 'department_id': department['id'],
        'semester': 1, 'subjects': [{'subject': 'Corrected subject', 'subject_code': 'CS101', 'experiments': [{'topic': 'Corrected experiment', 'unit': 1}]}]})
    assert response.status_code == 200
    assert client.get('/vlabs/experiments').json()[0]['topic'] == 'Corrected experiment'


def test_empty_pdf_is_validation_error_not_server_error(client, auth_headers):
    response = client.post('/syllabus/upload', files={'file': ('empty.pdf', text_pdf([[]]), 'application/pdf')}, headers=auth_headers('assistant'))
    assert response.status_code == 422
    assert 'No experiments' in response.json()['detail']


def test_worker_timeout_and_busy_errors(document, monkeypatch):
    import threading
    monkeypatch.setattr(scanner, 'SCAN_TIMEOUT', 0.00001)
    with pytest.raises(scanner.ScanError) as timeout:
        scanner.scan_pdf(document)
    assert timeout.value.status_code == 408
    monkeypatch.setattr(scanner, '_slots', threading.BoundedSemaphore(0))
    with pytest.raises(scanner.ScanError) as busy:
        scanner.scan_pdf(document)
    assert busy.value.status_code == 429


def test_page_limit_enforced_in_worker():
    writer = PdfWriter()
    for _ in range(scanner.MAX_PDF_PAGES + 1):
        writer.add_blank_page(width=100, height=100)
    output = BytesIO()
    writer.write(output)
    with pytest.raises(scanner.ScanError, match='1 to 200 pages'):
        scanner.scan_pdf(output.getvalue())


def test_legacy_parse_route_uses_same_scanner(client, auth_headers, document):
    response = client.post('/ai/parse-syllabus', files={'file': ('syllabus.pdf', document)}, headers=auth_headers('assistant'))
    assert response.status_code == 200
    assert len(response.json()) == 4
    assert 'insertion sort' in response.json()[0]['experiment']


def test_save_keeps_distinct_subject_codes(client, auth_headers):
    headers = auth_headers('principal')
    college = client.post('/vlabs/colleges', json={'name': 'Code College'}, headers=headers).json()
    department = client.post('/vlabs/departments', json={'name': 'Code Dept', 'college_id': college['id']}, headers=headers).json()
    response = client.post('/vlabs/save', headers=headers, json={'college_id': college['id'], 'department_id': department['id'], 'semester': 1,
        'subjects': [{'subject': 'Laboratory', 'subject_code': code, 'experiments': [{'topic': 'Study a circuit.'}]} for code in ['EE1', 'EE2']]})
    assert response.status_code == 200
    assert {s['code'] for s in client.get('/vlabs/subjects').json()} == {'EE1', 'EE2'}


def test_mixed_curriculum_excludes_theory_sessionals_assessment_and_resources():
    parser = scanner.SyllabusParser()
    parser.feed('A) Course Code : TH101 / LAB101 / TW101\nB) Course Title : Computing\nJ) Theory Session Outcomes and Units', 1)
    scanner.feed_table(parser, [['Unit', 'Contents', 'Hours'], ['UNIT-1', 'Theory content', '4']], 1)
    parser.feed('K) Laboratory (Practical) Session Outcomes and List of Practical [LAB 101]', 2)
    header = ['Practical/Lab Session Outcomes', 'S. No.', 'Laboratory Experiment/Practical Titles', 'Relevant COs']
    scanner.feed_table(parser, [header, ['Understand sorting', '1.', 'Implement sorting and', 'CO1']], 2)
    scanner.feed_table(parser, [header, ['', '', 'compare running times.', ''], ['Understand searching', '2.', 'Implement search.', 'CO2']], 3)
    # Headerless table continuation must preserve the title column.
    scanner.feed_table(parser, [['Analyze stacks', '3.', 'Implement a stack.', 'CO3']], 4)
    parser.feed('L) Sessional Work and Self Learning\n1. Prepare a report.', 4)
    parser.feed('O) Specification Table for Laboratory (Practical) Assessment:', 5)
    scanner.feed_table(parser, [header, ['', '1.', 'Implement sorting.', 'CO1']], 5)
    parser.feed('Q) Equipment\n1. Workstation', 6)
    group, = parser.result()['subjects']
    assert group['subject'] == 'Computing'
    assert group['subject_code'] == 'LAB101'
    assert [r['topic'] for r in group['experiments']] == [
        'Implement sorting and compare running times.', 'Implement search.', 'Implement a stack.']
    assert [r['source_page'] for r in group['experiments']] == [2, 3, 4]


def test_core_metadata_overrides_contents_typo_and_excludes_books():
    # The sample's C++ and C# laboratory tables incorrectly say "Theory".
    document = text_pdf([
        ['Programming Lab'], [], ['TEXT AND REFERENCE BOOKS', '1. Programming Reference'],
        ['Theory Course'], [], ['MINOR PROJECT'], [],
    ], tables={
        0: [['Subject Code: P1', 'Practical', 'Credits']],
        1: [['CONTENTS : Theory', '', 'Hours'], ['UNIT-01', 'Implement inheritance.', '4']],
        3: [['Subject Code: T1', 'Theory', 'Credits']],
        4: [['Unit', 'Contents', 'Hours'], ['UNIT-01', 'Theory only.', '4']],
        5: [['Subject Code: W1', 'Term Work', 'Credits']],
        6: [['Unit', 'Contents', 'Hours'], ['UNIT-01', 'Project report.', '4']],
    })
    group, = scanner.scan_document(document)['subjects']
    assert group['subject'] == 'Programming Lab'
    assert group['subject_code'] == 'P1'
    assert [r['topic'] for r in group['experiments']] == ['Implement inheritance.']


def test_assessment_columns_do_not_reactivate_practical_tables():
    parser = scanner.SyllabusParser()
    parser.feed('Subject: Computing Lab\nList of experiments\n1. Implement sorting.\nAssessment', 1)
    scanner.feed_table(parser, [['SN', 'Laboratory Practical Titles', 'PRA', 'PDA'],
                              ['1', 'Implement sorting.', '80', '20']], 2)
    assert len(parser.result()['subjects'][0]['experiments']) == 1


def test_full_semester_sample_when_supplied(client, auth_headers):
    """Run with LABSYNK_SAMPLE_PDF; keep the user's document out of the repository."""
    import os
    from pathlib import Path
    path = os.environ.get('LABSYNK_SAMPLE_PDF')
    if not path:
        pytest.skip('Set LABSYNK_SAMPLE_PDF to the supplied 102-page semester syllabus')
    response = client.post('/syllabus/upload', files={'file': ('semester.pdf', Path(path).read_bytes(), 'application/pdf')},
                           headers=auth_headers('assistant'))
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['page_count'] == 102
    assert result['ocr_pages'] == []
    expected = {'2000508B': 14, '2000508C': 5, '2000508D': 17, '2000508E': 11,
                '2000508F': 27, '2000508G': 4, '2000508H': 10, '2018506': 16,
                '2018507A': 14, '2018507B': 8, '2018507C': 14, '2018508A': 10, '2018508B': 13}
    from collections import Counter
    assert Counter(r['subject_code'] for r in result['experiments']) == expected
    assert len({r['subject'] for r in result['experiments']}) == 13
    assert all(21 <= r['source_page'] <= 99 for r in result['experiments'])
    topics = ' '.join(r['topic'] for r in result['experiments'])
    assert 'Books Recommended' not in topics
    assert 'CO-5' not in topics
    assert 'Plot Bar graph by Changing' not in topics  # LSO column, not the title
    ai = [r for r in result['experiments'] if r['subject_code'] == '2000508B']
    assert ai[3]['topic'].endswith('factorial of a number.')
    assert ai[-1]['topic'].startswith('Consider the Iris dataset')
    assert ai[-1]['topic'].endswith('Line width and Line style.')
    hardware = [r for r in result['experiments'] if r['subject_code'] == '2018506']
    assert 'Print head moves back and forth' in hardware[8]['topic']


def test_lettered_experiment_steps_are_not_curriculum_section_headings():
    parser = scanner.SyllabusParser()
    parser.feed('Subject: Circuits Lab\nExperiment 1: Measure current.\na) Connect the meter.\nb) Record the reading.\nExperiment 2: Measure voltage.', 1)
    rows = parser.result()['subjects'][0]['experiments']
    assert len(rows) == 2
    assert rows[0]['topic'] == 'Measure current. a) Connect the meter. b) Record the reading.'
