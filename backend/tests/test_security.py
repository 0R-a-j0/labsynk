from datetime import datetime, timedelta, timezone
from io import BytesIO
import os
from pathlib import Path
import subprocess
import sys

import jwt
import pytest
from pypdf import PdfWriter
from sqlalchemy import select

from models import User, Schedule, VLabSubject
from routers.auth import create_default_admin
from utils.auth import SECRET_KEY, create_access_token, get_password_hash, password_version
from utils.uploads import MAX_PDF_BYTES


WRITE_ROUTES = [
    ('POST', '/inventory/'), ('PUT', '/inventory/1'), ('DELETE', '/inventory/1'),
    ('POST', '/schedule/'), ('DELETE', '/schedule/1'),
    ('POST', '/vlabs/colleges'), ('DELETE', '/vlabs/colleges/1'),
    ('POST', '/vlabs/departments'), ('DELETE', '/vlabs/departments/1'),
    ('POST', '/vlabs/subjects'), ('PUT', '/vlabs/subjects/1'), ('DELETE', '/vlabs/subjects/1'),
    ('POST', '/vlabs/experiments'), ('PUT', '/vlabs/experiments/1'), ('DELETE', '/vlabs/experiments/1'),
    ('POST', '/vlabs/save'), ('POST', '/vlabs/subjects/1/lab-manual'),
    ('POST', '/syllabus/upload'), ('POST', '/syllabus/manual'), ('POST', '/ai/parse-syllabus'),
    ('POST', '/auth/register'), ('PUT', '/auth/users/1'), ('DELETE', '/auth/users/1'),
    ('GET', '/auth/me'), ('GET', '/auth/directory'), ('GET', '/auth/users'),
    ('POST', '/engagement/resources/suggest'), ('GET', '/engagement/resources/suggestions'),
    ('PATCH', '/engagement/resources/suggestions/1/status?status=Approved'),
    ('GET', '/engagement/inventory/reports'),
    ('PATCH', '/engagement/inventory/reports/1/status?status=Resolved'),
]


@pytest.mark.parametrize('method,path', WRITE_ROUTES)
def test_protected_routes_reject_guests(client, method, path):
    assert client.request(method, path).status_code == 401


@pytest.mark.parametrize('method,path', WRITE_ROUTES[:23])
def test_students_cannot_write_staff_data(client, auth_headers, method, path):
    assert client.request(method, path, headers=auth_headers('student')).status_code == 403


def test_public_reads_remain_available(client):
    for path in ['/inventory/', '/schedule/', '/vlabs/colleges', '/vlabs/subjects', '/auth/check']:
        assert client.get(path).status_code == 200


@pytest.mark.parametrize('target,updates', [
    ('hod', {'role': 'principal'}), ('principal', {'password': 'Attacker-password!'}),
    ('principal', {'email': 'attacker@example.com'}), ('assistant', {'role': 'principal'}),
    ('assistant', {'role': 'hod'}),
])
def test_hod_cannot_escalate_or_take_over_accounts(client, users, auth_headers, target, updates):
    result = client.put(f'/auth/users/{users[target].id}', json=updates, headers=auth_headers('hod'))
    assert result.status_code == 403
    assert users[target].role == target


def test_authorized_update_and_password_reset_revokes_token(client, users, auth_headers):
    old_token = auth_headers('assistant')
    result = client.put(f'/auth/users/{users["assistant"].id}',
                        json={'name': 'Updated', 'password': 'New-safe-password!'}, headers=auth_headers('hod'))
    assert result.status_code == 200
    assert result.json()['name'] == 'Updated'
    assert client.get('/auth/me', headers=old_token).status_code == 401
    result = client.post('/auth/login', json={'email': 'assistant@example.com', 'password': 'New-safe-password!'})
    assert result.status_code == 200
    assert client.get('/auth/me', headers={'Authorization': f'Bearer {result.json()["access_token"]}'}).status_code == 200


def test_expired_and_non_expiring_tokens_are_rejected(client, users):
    data = {'sub': str(users['principal'].id), 'pwd': password_version(users['principal'].hashed_password)}
    tokens = [jwt.encode(data, SECRET_KEY, algorithm='HS256'),
              create_access_token(data, timedelta(seconds=-1)),
              jwt.encode({**data, 'exp': datetime.now(timezone.utc) + timedelta(hours=1)}, 'wrong-secret' * 4, algorithm='HS256')]
    for token in tokens:
        assert client.get('/auth/me', headers={'Authorization': f'Bearer {token}'}).status_code == 401


def test_missing_secret_fails_closed():
    env = {**os.environ, 'SECRET_KEY': ''}
    result = subprocess.run([sys.executable, '-c', 'import utils.auth'], env=env, cwd=Path(__file__).resolve().parents[1], capture_output=True)
    assert result.returncode != 0
    assert b'Set SECRET_KEY' in result.stderr


def test_no_automatic_default_admin(db, monkeypatch):
    monkeypatch.delenv('BOOTSTRAP_ADMIN_EMAIL', raising=False)
    monkeypatch.delenv('BOOTSTRAP_ADMIN_PASSWORD', raising=False)
    assert create_default_admin(db) is False
    assert db.query(User).count() == 0


def test_explicit_admin_bootstrap_is_idempotent(db, monkeypatch):
    monkeypatch.setenv('BOOTSTRAP_ADMIN_EMAIL', 'bootstrap@example.com')
    monkeypatch.setenv('BOOTSTRAP_ADMIN_PASSWORD', 'Synthetic-bootstrap-password!')
    assert create_default_admin(db) is True
    assert create_default_admin(db) is False
    assert db.query(User).one().role == 'principal'


@pytest.mark.parametrize('password', ['short', 'a' * 73, 'é' * 40])
def test_password_length_is_validated(client, auth_headers, password):
    assert client.post('/auth/register', json={'email': 'new@example.com', 'password': password},
                       headers=auth_headers('principal')).status_code == 422


def test_login_rate_limit(client):
    for _ in range(10):
        assert client.post('/auth/login', json={'email': 'absent@example.com', 'password': 'wrong'}).status_code == 401
    result = client.post('/auth/login', json={'email': 'absent@example.com', 'password': 'wrong'})
    assert result.status_code == 429
    assert int(result.headers['retry-after']) > 0


def test_request_body_limit_does_not_trust_content_length(client):
    result = client.post('/ai/chat', content=b'x' * (128 * 1024 + 1), headers={'Content-Length': '1'})
    assert result.status_code == 413


@pytest.mark.parametrize('name,content,code', [
    ('bad.pdf', b'not a pdf', 400), ('bad.txt', b'%PDF-1.4', 400),
    ('big.pdf', b'%PDF-' + b'x' * MAX_PDF_BYTES, 413),
])
def test_pdf_upload_validation(client, auth_headers, name, content, code):
    assert client.post('/syllabus/upload', files={'file': (name, content, 'application/pdf')},
                       headers=auth_headers('assistant')).status_code == code


def test_manual_upload_and_download(client, db, auth_headers, monkeypatch, tmp_path):
    from routers import vlabs
    monkeypatch.setattr(vlabs, 'LAB_MANUALS_DIR', str(tmp_path))
    subject = VLabSubject(name='Test', semester=1)
    db.add(subject)
    db.commit()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    pdf = BytesIO()
    writer.write(pdf)
    result = client.post(f'/vlabs/subjects/{subject.id}/lab-manual',
                         files={'file': ('manual.pdf', pdf.getvalue(), 'application/pdf')},
                         headers=auth_headers('assistant'))
    assert result.status_code == 200
    download = client.get(result.json()['lab_manual_url'])
    assert download.content == pdf.getvalue()
    assert download.headers['content-disposition'].startswith('attachment')
    assert download.headers['x-content-type-options'] == 'nosniff'
    assert client.get('/vlabs/lab-manuals/requirements.txt').status_code == 404
    assert client.get('/vlabs/lab-manuals/..%5Crequirements.txt').status_code == 404


def test_unsafe_urls_rejected(client, auth_headers):
    assert client.post('/engagement/resources/suggest', json={
        'tool_name': 'Bad', 'description': 'Bad', 'url': 'javascript:alert(1)',
    }, headers=auth_headers('student')).status_code == 422
    assert client.put('/vlabs/subjects/1', json={'default_compiler': 'data:text/html,bad'},
                      headers=auth_headers('assistant')).status_code == 422


def test_schedule_reads_do_not_delete_history(client, db):
    old = Schedule(lab_name='Past', start_time=datetime(2000, 1, 1), end_time=datetime(2000, 1, 2))
    db.add(old)
    db.commit()
    assert client.get('/schedule/').json() == []
    assert db.scalar(select(Schedule.id)) == old.id


def test_schedule_owner_and_interval(client, auth_headers, users):
    data = {'lab_name': 'Lab', 'start_time': '2099-01-01T09:00:00', 'end_time': '2099-01-01T10:00:00',
            'course_name': 'Course', 'batch': 'A', 'booked_by_id': users['principal'].id}
    result = client.post('/schedule/', json=data, headers=auth_headers('assistant'))
    assert result.status_code == 200
    assert result.json()['booked_by_id'] == users['assistant'].id
    assert client.post('/schedule/', json=data, headers=auth_headers('assistant')).status_code == 409
    data['end_time'] = data['start_time']
    assert client.post('/schedule/', json=data, headers=auth_headers('assistant')).status_code == 422


def test_blank_compiler_and_experiment_roundtrip(client, auth_headers):
    headers = auth_headers('principal')
    college = client.post('/vlabs/colleges', json={'name': 'Test'}, headers=headers).json()
    dept = client.post('/vlabs/departments', json={'name': 'Dept', 'college_id': college['id']}, headers=headers).json()
    result = client.post('/vlabs/subjects', json={'name': 'Subject', 'department_id': dept['id'],
                        'semester': 1, 'default_compiler': ''}, headers=headers)
    assert result.status_code == 200
    subject_id = result.json()['id']
    links = [{'source': 'Example', 'url': 'https://example.com/', 'description': 'Test'}]
    result = client.post('/vlabs/experiments', json={'subject_id': subject_id, 'topic': 'Topic',
                        'simulation_links': links}, headers=headers)
    assert result.status_code == 200
    assert result.json()['simulation_links'] == links
    result = client.put(f'/vlabs/experiments/{result.json()["id"]}', json={'topic': 'Changed'}, headers=headers)
    assert result.status_code == 200
    assert result.json()['topic'] == 'Changed'
    assert client.get('/vlabs/experiments').status_code == 200


def test_syllabus_save_rolls_back_whole_batch(client, db, auth_headers, monkeypatch):
    from routers import vlabs
    from models import College, Department
    college = College(name='Test')
    db.add(college)
    db.flush()
    department = Department(name='Dept', college_id=college.id)
    db.add(department)
    db.commit()
    payload = {'college_id': college.id, 'department_id': department.id, 'semester': 1,
               'subjects': [{'subject': 'First', 'experiments': []},
                            {'subject': 'Second', 'experiments': [{'topic': 'Fail'}]}]}
    def fail(*args, **kwargs):
        raise RuntimeError('Private database information')
    monkeypatch.setattr(vlabs.syllabus_service, 'get_simulation_links', fail)
    response = client.post('/vlabs/save', json=payload, headers=auth_headers('assistant'))
    assert response.status_code == 500
    assert 'Private database information' not in response.text
    assert db.query(VLabSubject).count() == 0


def test_invalid_optional_auth_not_downgraded_to_guest(client):
    assert client.get('/auth/check', headers={'Authorization': 'Bearer invalid'}).status_code == 401


def test_parser_page_limit():
    from services.syllabus_service import extract_text_from_pdf, parse_syllabus_with_pdfplumber
    from utils.uploads import MAX_PDF_PAGES
    writer = PdfWriter()
    for _ in range(MAX_PDF_PAGES + 1):
        writer.add_blank_page(width=72, height=72)
    pdf = BytesIO()
    writer.write(pdf)
    assert extract_text_from_pdf(pdf.getvalue()) == ''
    assert parse_syllabus_with_pdfplumber(pdf.getvalue())['subjects'] == []


def test_manual_syllabus_rejects_unstructured_topics(client, auth_headers):
    assert client.post('/syllabus/manual', json={'topics': [123]}, headers=auth_headers('assistant')).status_code == 422


def test_chat_failure_hides_provider_details(client, monkeypatch):
    from services import ai_service
    async def fail(*args):
        raise RuntimeError('Private provider credentials')
    monkeypatch.setattr(ai_service, 'chat_with_student', fail)
    result = client.post('/ai/chat', json={'query': 'Hello'})
    assert result.status_code == 503
    assert 'Private provider credentials' not in result.text


def test_ai_service_uses_async_sdk(monkeypatch):
    import asyncio
    from types import SimpleNamespace
    from unittest.mock import AsyncMock
    from services import ai_service
    generate = AsyncMock(return_value=SimpleNamespace(text='Synthetic answer'))
    monkeypatch.setattr(ai_service, 'get_gemini_client', lambda: SimpleNamespace(
        aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate))))
    assert asyncio.run(ai_service.chat_with_student('Question')) == 'Synthetic answer'
    generate.assert_awaited_once()
