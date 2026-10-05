"""Local syllabus extraction: selectable text, tables, then English OCR.

The API calls scan_pdf, which runs document parsers in a bounded child process.
No uploaded content is sent to an AI provider.
"""
from collections import OrderedDict
from io import BytesIO
import json
import math
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import unicodedata

from utils.uploads import MAX_PDF_BYTES, MAX_PDF_PAGES

MAX_OCR_PAGES = 20
SCAN_TIMEOUT = 90
MAX_EXPERIMENTS = 300
_slots = threading.BoundedSemaphore(2)


class ScanError(ValueError):
    def __init__(self, message, status_code=422):
        super().__init__(message)
        self.status_code = status_code


def clean(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', value or '')).strip()


def number(value):
    if value.isdigit():
        return int(value)
    total = previous = 0
    for letter in reversed(value.upper()):
        current = {'I': 1, 'V': 5, 'X': 10}.get(letter, 0)
        total += -current if current < previous else current
        previous = current
    return total or None


SUBJECT = re.compile(r'^(?:subject|course)\s*(?:name|title)?\s*[:\-]\s*(.+)$', re.I)
CODE = re.compile(r'^(?:subject|course)\s*code\s*[:\-]?\s*([\w/-]+)', re.I)
SECTION = re.compile(r'^(?:(?:list of |suggested )?(?:experiments|practicals|laboratory exercises|lab exercises|practical exercises|practical contents)|contents)\s*[:\-]?$', re.I)
STOP = re.compile(r'^(?:course outcomes?|learning outcomes?|objectives?|books? recommended|references?|text(?:\s+and\s+reference)?\s*books?|assessment|evaluation|theory|marks distribution)\b', re.I)
UNIT = re.compile(r'^unit\s*[_:–—-]?\s*(\d+|[IVX]+)\b[\s.:–—-]*(.*)$', re.I)
EXPERIMENT = re.compile(r'^(?:experiment|exp\.?|expt\.?|practical|exercise)\s*(?:no\.?\s*)?(\d+)\s*[.:)–—-]?\s*(.*)$', re.I)
LIST_ITEM = re.compile(r'^(?:\(?\d{1,3}[.)]|\d{1,3}\s+[-–—]|[•●▪])\s*(.+)$')
LAB_TITLE = re.compile(r'^.{2,150}\b(?:lab(?:oratory)?|practicals?)(?:\s*[-–—:]\s*\w+)?\.?$', re.I)


class SyllabusParser:
    """Keep subject/unit context across pages and deduplicate repeated rows."""
    def __init__(self):
        self.subjects = OrderedDict()
        self.subject = 'Unassigned subject'
        self.code = ''
        self.fresh_code = False
        self.unit = None
        self.active = False
        self.pending = None
        self.branch = ''
        self.seen = set()
        self.count = 0
        self.mode = None
        self.table_columns = None
        self.excluded_sections = False

    def flush(self):
        if self.pending:
            topic, page, unit, subject, code = self.pending
            topic = clean(topic)
            if len(topic) >= 3:
                if len(topic) > 2000:
                    raise ScanError('An extracted experiment is too long. Split the PDF into smaller sections.')
                key = (subject.casefold(), code.casefold())
                identity = (key, unit, topic.casefold())
                if identity not in self.seen:
                    self.seen.add(identity)
                    self.count += 1
                    if self.count > MAX_EXPERIMENTS:
                        raise ScanError(f'The PDF contains more than {MAX_EXPERIMENTS} experiments. Split it into smaller files.')
                    group = self.subjects.setdefault(key, {'subject': subject, 'subject_code': code, 'experiments': []})
                    group['experiments'].append({'id': self.count, 'unit': unit, 'topic': topic,
                        'description': '', 'suggested_simulation': topic, 'source_page': page})
            self.pending = None

    def set_course(self, title, code, mode):
        self.flush()
        self.subject = clean(title)
        self.code = re.sub(r'\s+', '', code)
        self.unit = None
        self.mode = mode
        self.active = False
        self.table_columns = None
        self.fresh_code = False
        self.excluded_sections |= mode != 'practical'

    def feed(self, text, page, *, flush_end=True):
        for raw in text.splitlines():
            line = clean(raw)
            if not line or re.fullmatch(r'(?:page\s*)?\d+(?:\s*(?:of|/)\s*\d+)?', line, re.I):
                continue
            # Combined curricula separate theory, practicals and sessional work.
            heading = re.match(r'^([A-S])\)\s*((?:Course|Pre-requisite|Rationale|Scheme|Laboratory|Sessional|Evaluation|Specification|Suggested|Learning|Assessment|Theory|Major|Development|Details|List of|Mapping|Correlation)\b.*)', line, re.I)
            if heading:
                label, title = heading[1].upper(), heading[2]
                if label == 'A' and re.match(r'Course Code', title, re.I):
                    self.set_course('Unassigned subject', '', 'excluded')
                elif label == 'B' and re.match(r'Course Title', title, re.I):
                    self.subject = clean(title.split(':', 1)[-1])
                elif re.match(r'Laboratory.*List of Practical', title, re.I):
                    self.flush()
                    self.mode = 'practical'
                    self.active = True
                    self.unit = None
                    self.table_columns = None
                    code = re.search(r'\[([\w\s/-]+)\]', title)
                    self.code = re.sub(r'\s+', '', code[1]) if code else ''
                else:
                    self.flush()
                    self.mode = 'excluded'
                    self.active = False
                    self.table_columns = None
                    self.excluded_sections = True
                continue
            if re.match(r'^(?:note\s*:|course (?:learning )?objectives?|platform used|sessional work|term work|specification table|suggested learning)', line, re.I):
                self.flush()
                self.active = False
                continue
            branch = re.match(r'^(?:branch|department|programme|program)\s*:\s*(.+)$', line, re.I)
            if branch:
                self.flush()
                self.branch = self.branch or branch[1]
                continue
            code = CODE.match(line)
            if code:
                self.flush()
                self.code = code[1]
                self.fresh_code = True
                continue
            subject = SUBJECT.match(line)
            if subject or (LAB_TITLE.match(line) and not SECTION.match(line) and not LIST_ITEM.match(line) and not EXPERIMENT.match(line)):
                self.flush()
                name = clean(subject[1] if subject else line)
                if name.casefold() != self.subject.casefold():
                    # Keep a code immediately preceding its subject heading.
                    if not self.fresh_code:
                        self.code = ''
                    self.unit = None
                self.subject = name
                self.fresh_code = False
                self.mode = 'practical' if LAB_TITLE.match(name) else None
                self.active = False
                self.table_columns = None
                continue
            if STOP.match(line):
                if re.match(r'^theory\b', line, re.I):
                    self.mode = 'theory'
                    self.excluded_sections = True
                self.flush()
                self.active = False
                continue
            if SECTION.match(line) and self.mode not in ('theory', 'excluded'):
                self.flush()
                self.active = True
                continue
            self.fresh_code = False
            unit = UNIT.match(line)
            if unit:
                self.flush()
                self.unit = number(unit[1])
                # Units alone are headings; unit rows with content are practicals.
                if unit[2] and self.active:
                    self.pending = [unit[2], page, self.unit, self.subject, self.code]
                continue
            explicit = EXPERIMENT.match(line)
            item = LIST_ITEM.match(line) if self.active else None
            if (explicit and self.mode not in ('theory', 'excluded')) or item:
                self.flush()
                self.active = True
                self.pending = [explicit[2] if explicit else item[1], page, self.unit, self.subject, self.code]
            elif self.pending:
                # Avoid common repeated document/table headers in wrapped descriptions.
                if not re.match(r'^(?:s\.?\s*no|sl\.?\s*no|experiment no|unit no|hours?|credits?|semester|syllabus|.*\b(?:university|college)\b)', line, re.I):
                    self.pending[0] += ' ' + line
        # Free-text pages end a row; structured table rows can continue across pages.
        if flush_end:
            self.flush()

    def result(self):
        self.flush()
        return {'branch': self.branch, 'subjects': list(self.subjects.values())}


def table_columns(rows):
    """Identify title/number columns, excluding outcomes and assessment columns."""
    if any(row and UNIT.match(clean(row[0])) for row in rows):
        return (0, 1, 0)
    for i, row in enumerate(rows[:3]):
        cells = [clean(c) for c in row]
        joined = ' '.join(cells)
        if re.search(r'\bPRA\b|\bPDA\b|viva|assessment|equipment|specifications|Theory Session', joined, re.I):
            return None
        # Some source documents label laboratory content as "Theory" by mistake;
        # course metadata determines whether these unit tables are eligible.
        if any(UNIT.match(c) for c in cells):
            return (0, 1, 0)
        topic_col = next((j for j, c in enumerate(cells) if
            re.search(r'\b(?:experiment|practical|topic|contents?|description)\b', c, re.I)
            and not re.search(r'outcomes?|\b(?:no|number)\b', c, re.I)
            and len(c) < 80), None)
        if topic_col is not None:
            if cells[topic_col].lower().startswith('contents') and topic_col == 0 and len(cells) > 1 and not cells[1]:
                return (i + 1, 1, 0)
            number_col = next((j for j, c in enumerate(cells) if j != topic_col and
                re.search(r'unit|no\.?|s\.?n', c, re.I) and not re.search(r'outcomes?|COs', c, re.I)), None)
            return (i + 1, topic_col, number_col)
    return None


def feed_table(parser, rows, page):
    if not rows or parser.mode in ('theory', 'excluded'):
        return
    columns = table_columns(rows)
    if columns is None:
        # A continuation page may omit its header entirely. Reuse the schema only
        # when rows still have the expected serial-number/blank continuation shape.
        if not parser.active or parser.table_columns is None:
            return
        topic_col, number_col, width = parser.table_columns
        if number_col is None or any(len(r) != width or (clean(r[number_col]) and
                not re.fullmatch(r'\d+[.)]?', clean(r[number_col])) and
                not UNIT.match(clean(r[number_col]))) for r in rows):
            return
        start = 0
    else:
        start, topic_col, number_col = columns
        parser.table_columns = (topic_col, number_col, len(rows[0]))
        parser.active = True
    for row in rows[start:]:
        if len(row) <= topic_col:
            continue
        topic = clean(row[topic_col])
        label = clean(row[number_col]) if number_col is not None else ''
        if not topic:
            continue
        unit = UNIT.match(label)
        if unit or re.fullmatch(r'\d+[.)]?', label) or number_col is None:
            parser.flush()
            parser.unit = number(unit[1]) if unit else None
            parser.pending = [topic, page, parser.unit, parser.subject, parser.code]
        elif not label and parser.pending:
            parser.pending[0] += ' ' + topic


def feed_page(parser, page, page_number):
    """Read headings and table cells in document order with course context."""
    text = page.extract_text() or ''
    tables = sorted(page.find_tables(), key=lambda table: table.bbox[1])
    top = page.bbox[1]
    preceding = ''
    for table in tables:
        if table.bbox[1] < top:
            continue
        if table.bbox[1] > top:
            preceding = page.crop((page.bbox[0], top, page.bbox[2], table.bbox[1])).extract_text() or ''
            parser.feed(preceding, page_number, flush_end=False)
        rows = table.extract()
        first = rows[0] if rows else []
        metadata = next((clean(c) for c in first if re.match(r'(?:subject|course)\s*code', clean(c), re.I)), '')
        if metadata and re.search(r'code\s*:?\s*[\w/-]*\d', metadata, re.I):
            code = re.search(r'code\s*:?\s*([\w/-]+)', metadata, re.I)
            kind = ' '.join(clean(c) for c in first[1:])
            mode = 'practical' if re.search(r'\bPractical\b', kind, re.I) else 'theory'
            title = clean(preceding.splitlines()[-1]) if preceding.strip() else parser.subject
            parser.set_course(title, code[1] if code else '', mode)
        else:
            feed_table(parser, rows, page_number)
        top = table.bbox[3]
    if top < page.bbox[3] and tables and parser.active and parser.table_columns:
        # A row cut off by a page break can lack a bottom border, so pdfplumber
        # omits it from the table. Recover it using the established column bounds.
        topic_col, number_col, width = parser.table_columns
        last_table = tables[-1]
        if number_col is not None and len(last_table.columns) == width:
            number_box = last_table.columns[number_col].bbox
            label = clean(page.crop((number_box[0], top, number_box[2], page.bbox[3])).extract_text())
            if re.fullmatch(r'\d+[.)]?', label) or UNIT.match(label):
                topic_box = last_table.columns[topic_col].bbox
                topic = page.crop((topic_box[0], top, topic_box[2], page.bbox[3])).extract_text()
                row = [''] * width
                row[number_col], row[topic_col] = label, topic
                feed_table(parser, [row], page_number)
                return text
    if top < page.bbox[3]:
        tail = (page.crop((page.bbox[0], top, page.bbox[2], page.bbox[3])).extract_text() or '') if tables else text
        parser.feed(tail, page_number, flush_end=not tables)
    return text


def ocr_page(document, index):
    executable = shutil.which('tesseract')
    if not executable:
        raise ScanError('This PDF needs OCR. Install Tesseract with English language data on the server, or upload a searchable PDF.', 503)
    with tempfile.TemporaryDirectory(prefix='labsynk-ocr-') as directory:
        page = document[index]
        bitmap = None
        try:
            width, height = page.get_size()
            if not all(math.isfinite(n) and n > 0 for n in (width, height)):
                raise ScanError('The PDF contains an invalid page size.')
            scale = min(2.5, 3000 / max(width, height))
            bitmap = page.render(scale=scale)
            image = bitmap.to_pil()
            try:
                path = Path(directory) / 'page.png'
                image.save(path)
            finally:
                image.close()
        finally:
            if bitmap is not None:
                bitmap.close()
            page.close()
        try:
            result = subprocess.run([executable, str(path), 'stdout', '-l', 'eng', '--psm', '3'],
                capture_output=True, text=True, timeout=20, env={**os.environ, 'OMP_THREAD_LIMIT': '1'})
        except subprocess.TimeoutExpired:
            raise ScanError(f'OCR timed out on page {index + 1}. Upload a clearer scan or a smaller file.') from None
        if result.returncode:
            raise ScanError('OCR is unavailable. Check the server’s Tesseract English language data.', 503)
        return result.stdout


def scan_document(content):
    """Worker implementation, also used directly with generated PDF fixtures."""
    import pdfplumber
    import pypdfium2 as pdfium
    from pypdf import PdfReader
    if len(content) > MAX_PDF_BYTES:
        raise ScanError('PDF exceeds the 10 MiB limit', 413)
    try:
        reader = PdfReader(BytesIO(content))
        if reader.is_encrypted:
            raise ScanError('This PDF is password protected. Upload an unlocked copy.')
        page_count = len(reader.pages)
        if not 1 <= page_count <= MAX_PDF_PAGES:
            raise ScanError(f'Upload a PDF with 1 to {MAX_PDF_PAGES} pages.')
        parser = SyllabusParser()
        ocr_pages, empty_pages, warnings = [], [], []
        document = None
        try:
            with pdfplumber.open(BytesIO(content)) as pdf:
                for index, page in enumerate(pdf.pages):
                    text = page.extract_text() or ''
                    text_size = len(re.sub(r'\W', '', text))
                    image_area = sum(max(0, image['width']) * max(0, image['height']) for image in page.images)
                    if text_size < 40 or (text_size < 200 and image_area > page.width * page.height * 0.5):
                        # Empty pages need no OCR, but image-only / sparse scan pages do.
                        if page.images:
                            if len(ocr_pages) >= MAX_OCR_PAGES:
                                raise ScanError(f'This PDF needs OCR on more than {MAX_OCR_PAGES} pages. Split it into smaller files.')
                            if document is None:
                                document = pdfium.PdfDocument(content)
                            text = ocr_page(document, index)
                            ocr_pages.append(index + 1)
                    if not text.strip():
                        empty_pages.append(index + 1)
                    if index + 1 in ocr_pages:
                        parser.feed(text, index + 1)
                    else:
                        feed_page(parser, page, index + 1)
                    page.close()
        finally:
            if document is not None:
                document.close()
        result = parser.result()
        if not result['subjects']:
            raise ScanError('No experiments were recognized. Use a clearer PDF with experiment headings or numbered practicals, or enter topics manually.')
        if parser.excluded_sections:
            warnings.append('Only laboratory practicals are included. Theory, sessional/term work and assessment sections are excluded from the lab import.')
        if ocr_pages:
            warnings.append('Scanned pages were read with OCR. Check spelling, subjects and experiment boundaries before saving.')
        if empty_pages:
            warnings.append('No readable text on page(s): ' + ', '.join(map(str, empty_pages)))
        if any(s['subject'] == 'Unassigned subject' for s in result['subjects']):
            warnings.append('Some experiments have no subject heading. Assign a subject before saving.')
        return {**result, 'page_count': page_count, 'ocr_pages': ocr_pages, 'warnings': warnings}
    except ScanError:
        raise
    except Exception:
        raise ScanError('The PDF could not be read. It may be damaged; export it as a new PDF and try again.') from None


def scan_pdf(content):
    """Limit parser concurrency and kill the worker and its OCR children on timeout."""
    if not _slots.acquire(blocking=False):
        raise ScanError('The scanner is busy. Please try again shortly.', 429)
    try:
        with tempfile.TemporaryDirectory(prefix='labsynk-scan-') as directory, subprocess.Popen(
                [sys.executable, '-m', 'services.syllabus_scanner'],
                cwd=Path(__file__).resolve().parents[1], stdin=subprocess.PIPE,
                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, start_new_session=True,
                env={'PATH': os.environ.get('PATH', ''), 'TMPDIR': directory, 'LANG': 'C.UTF-8',
                     'OMP_THREAD_LIMIT': '1'}) as process:
            try:
                output, _ = process.communicate(content, timeout=SCAN_TIMEOUT)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.communicate()
                raise ScanError('Scanning took too long. Split the PDF into smaller files and try again.', 408) from None
            if process.returncode:
                raise ScanError('The PDF exceeded scanner resources or could not be read.')
            result = json.loads(output)
            if 'error' in result:
                raise ScanError(result['error'], result['status_code'])
            return result
    finally:
        _slots.release()


if __name__ == '__main__':
    import resource
    # Linux production workers: bound CPU and virtual memory independently of HTTP timeout.
    resource.setrlimit(resource.RLIMIT_CPU, (80, 80))
    resource.setrlimit(resource.RLIMIT_AS, (1536 * 1024 * 1024, 1536 * 1024 * 1024))
    try:
        print(json.dumps(scan_document(sys.stdin.buffer.read(MAX_PDF_BYTES + 1))))
    except ScanError as error:
        print(json.dumps({'error': str(error), 'status_code': error.status_code}))
