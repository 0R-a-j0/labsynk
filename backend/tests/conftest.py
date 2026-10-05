"""Isolated databases and synthetic credentials; never use deployment state."""
import os
from pathlib import Path
import secrets
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SECRET_KEY'] = secrets.token_urlsafe(48)
os.environ.pop('BOOTSTRAP_ADMIN_EMAIL', None)
os.environ.pop('BOOTSTRAP_ADMIN_PASSWORD', None)
os.environ.pop('GEMINI_API_KEY', None)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from main import app
from models import User
from utils.auth import create_access_token, get_password_hash, password_version


@pytest.fixture
def db():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as session:
        yield session
    engine.dispose()


@pytest.fixture
def users(db):
    password_hash = get_password_hash('Test-only-password!')
    result = {}
    for role in ('student', 'assistant', 'hod', 'principal'):
        user = User(email=f'{role}@example.com', hashed_password=password_hash, role=role, name=role)
        db.add(user)
        db.flush()
        result[role] = user
    db.commit()
    return result


@pytest.fixture
def auth_headers(users):
    def headers(role):
        user = users[role]
        token = create_access_token({'sub': str(user.id), 'pwd': password_version(user.hashed_password)})
        return {'Authorization': f'Bearer {token}'}
    return headers


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    # Separate rate-limit identity for each test, preserving real middleware behavior.
    with TestClient(app, client=(secrets.token_hex(8), 50000)) as client:
        yield client
    app.dependency_overrides.clear()
