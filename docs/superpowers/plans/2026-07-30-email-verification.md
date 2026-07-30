# Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require signup email verification (click-a-link) on the LessToken account panel before a new account can log in or use `/api/v1/optimize`, without locking out any of today's existing users.

**Architecture:** Three new `User` columns (`email_verified`, `verification_token`, `verification_token_expires`) added via a hand-adjusted Flask-Migrate/Alembic migration (this project has never used a migration tool before — `init_db()` only calls `db.create_all()`, which never alters existing tables). Registration stops returning a JWT and instead emails a 24h verification link via the Resend HTTP API (the same mechanism the contact form now uses — see commit `daeb8eb`, which moved off raw SMTP because Railway blocks outbound SMTP ports). Login rejects unverified accounts with `403`. Two new endpoints — `GET /api/v1/auth/verify` and `POST /api/v1/auth/resend-verification` — complete the loop. Two frontend changes wire this into the existing Next.js auth page.

**Tech Stack:** Flask 2.3.3, Flask-SQLAlchemy 3.0.5, SQLAlchemy 2.0.20 (production; see Global Constraints), Flask-Migrate/Alembic (new), PyJWT 2.8.0, Resend HTTP API, Next.js (pages router).

## Global Constraints

- **Do not change any pinned version in `web/requirements-backend.txt`** except to add `Flask-Migrate==4.1.0`. Production runs the Dockerfile's Python 3.11 image; the pins are correct there.
- **Local dev/test machine has only Python 3.14 installed.** `SQLAlchemy==2.0.20` (the production pin) fails to import on it (`AssertionError: Class <class 'sqlalchemy.sql.elements.SQLCoreOperations'> directly inherits TypingOnly but has additional attributes {'__static_attributes__', '__firstlineno__'}`). Every task below installs `SQLAlchemy>=2.0.36` **only inside `web/.venv`** (gitignored, local-only) to work around this. Never add this upgrade to `requirements-backend.txt`.
- **`psycopg2-binary` cannot build locally** (no `pg_config`, no prebuilt wheel for Python 3.14). It is not needed for any task here — all tests and scratch verification use SQLite. Skip it when installing into `web/.venv`.
- **Flask resolves relative `sqlite:///` URIs against `<app>/instance/`, not the current directory.** Any scratch database used to verify migration behavior in this plan must use an **absolute path** in `SQLALCHEMY_DATABASE_URI`, or Alembic will silently connect to a different, empty database and autogenerate a full `create_table` instead of the intended `add_column`.
- **Never commit `web/.venv/`** — already covered by `web/.venv*/` in the root `.gitignore`.
- All new backend copy-facing strings (error messages, email body) are in Turkish, matching the existing `web/app.py` conventions (e.g. `'Email and message are required'` is the one English exception already in the file — follow existing endpoint's language per-endpoint, Turkish for user-facing errors on `/contact`, English for the older `/auth` and `/optimize` endpoints as they already are today. New `/auth/*` additions in this plan stay English to match the file the surrounding `register`/`login` code they extend).

---

## File Structure

- Modify: `web/requirements-backend.txt` — add `Flask-Migrate==4.1.0`
- Modify: `web/database.py` — add 3 columns to `User`
- Modify: `web/app.py` — wire up `Migrate`, add `send_verification_email()`, change `register()`/`login()`, add `verify()`/`resend_verification()`
- Create: `web/migrations/` — via `flask db init` (committed to git)
- Modify: `web/Dockerfile` — copy `migrations/`, run `flask db upgrade` before `gunicorn` starts
- Create: `web/tests/test_email_verification.py`
- Create: `pages/app/verify.jsx`
- Modify: `pages/app/auth.jsx`

---

### Task 1: Local Test Environment

**Files:** none (tooling only; `web/.venv/` is gitignored)

- [ ] **Step 1: Create the venv and install runtime deps minus the Postgres driver**

```bash
cd web
py -3.14 -m venv .venv
./.venv/Scripts/python.exe -m pip install --upgrade pip
grep -v psycopg2 requirements-backend.txt > ../reqs-no-pg.txt
./.venv/Scripts/python.exe -m pip install -r ../reqs-no-pg.txt
rm ../reqs-no-pg.txt
```

Expected: installs cleanly (Flask, Flask-SQLAlchemy, SQLAlchemy 2.0.20, PyJWT, requests, gunicorn, etc.) with no build errors.

- [ ] **Step 2: Upgrade SQLAlchemy in this venv only (see Global Constraints)**

```bash
./.venv/Scripts/python.exe -m pip install --upgrade "SQLAlchemy>=2.0.36"
```

- [ ] **Step 3: Install test and migration tooling**

```bash
./.venv/Scripts/python.exe -m pip install pytest Flask-Migrate
```

- [ ] **Step 4: Run the existing test suite as a baseline**

Run: `./.venv/Scripts/python.exe -m pytest tests/ -v`
Expected: `5 passed` (all of `tests/test_optimize_limits.py`).

No commit for this task — nothing tracked changes.

---

### Task 2: User Schema Fields + Migration

**Files:**
- Modify: `web/requirements-backend.txt`
- Modify: `web/database.py:16-24` (the `User` class)
- Modify: `web/app.py:19-21` (imports) and `web/app.py:69` (after `init_db(app)`)
- Create: `web/migrations/` and `web/migrations/versions/<hash>_add_email_verification_fields.py`

**Interfaces:**
- Produces: `User.email_verified` (bool), `User.verification_token` (str or `None`), `User.verification_token_expires` (`datetime` or `None`) — every later task reads/writes these three attributes by these exact names.

- [ ] **Step 1: Generate the migration against a scratch database that mirrors today's production schema**

This must happen **before** editing `database.py`, so the scratch database reflects the *old* schema and Alembic's autogenerate detects only the new columns as additions (not a full `create_table` — see Global Constraints on absolute paths).

```bash
cd web
.venv/Scripts/python.exe -c "
import os
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.abspath('scratch_pre.db')
import app as app_module
from database import db
with app_module.app.app_context():
    db.create_all()
print('scratch_pre.db created with the current (pre-change) schema')
"
```

Expected: `scratch_pre.db created with the current (pre-change) schema`, and a `web/scratch_pre.db` file now exists containing `users`, `optimization_history`, `user_settings` tables with today's columns.

- [ ] **Step 2: Add `Flask-Migrate` to `requirements-backend.txt`**

Append to `web/requirements-backend.txt`:

```
Flask-Migrate==4.1.0
```

- [ ] **Step 3: Wire `Migrate` into `web/app.py`**

Modify the import block at the top of `web/app.py`:

```python
import os
import json
import logging
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
```

Modify the line right after `init_db(app)` (currently `web/app.py:69`):

```python
# Initialize database
init_db(app)
migrate = Migrate(app, db)
```

This needs `db` imported — update the local-imports line (`web/app.py:20`):

```python
from database import init_db, get_db, db, User, OptimizationHistory
```

- [ ] **Step 4: Add the three columns to `User` in `web/database.py`**

Modify the `User` class (currently `web/database.py:16-38`):

```python
class User(db.Model):
    """User account model"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_token = db.Column(db.String(64), nullable=True, index=True)
    verification_token_expires = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    history = db.relationship('OptimizationHistory', backref='user', lazy=True, cascade='all, delete-orphan')
    settings = db.relationship('UserSettings', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<User {self.email}>'
```

(`datetime` is already imported at the top of `database.py`.)

- [ ] **Step 5: Install the new dependency and generate the migration against the pre-change scratch db**

```bash
.venv/Scripts/python.exe -m pip install Flask-Migrate==4.1.0
export FLASK_APP=app.py
export DATABASE_URL="sqlite:///$(pwd)/scratch_pre.db"
.venv/Scripts/python.exe -m flask db init
.venv/Scripts/python.exe -m flask db migrate -m "add email verification fields"
```

Expected in the migrate output: three lines like
```
INFO  [alembic.autogenerate.compare.tables] Detected added column 'users.email_verified'
INFO  [alembic.autogenerate.compare.tables] Detected added column 'users.verification_token'
INFO  [alembic.autogenerate.compare.tables] Detected added column 'users.verification_token_expires'
```
and **no** `Detected added table` line. If you see `Detected added table 'users'` instead, `DATABASE_URL` did not point at `scratch_pre.db` (check the absolute-path note in Global Constraints) — delete `web/migrations/`, fix the path, and redo this step.

- [ ] **Step 6: Hand-edit the generated migration to grandfather existing users**

Open the new file under `web/migrations/versions/`. Find the `batch_op.add_column(...)` call for `email_verified` and add `server_default=sa.true()`:

```python
batch_op.add_column(sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.true()))
```

Leave `verification_token` and `verification_token_expires` as autogenerated (they're nullable, so no default is required — existing users simply get `NULL` for both, which is correct: they have no pending verification).

Without this edit, applying the migration to a table that already has rows raises `IntegrityError: NOT NULL constraint failed` (Postgres: `column "email_verified" of relation "users" contains null values` for a non-empty table with no default) — verified locally; see the migration's `upgrade()` body for the surrounding `batch_alter_table` context.

- [ ] **Step 7: Verify the migration grandfathers existing rows**

```bash
.venv/Scripts/python.exe -c "
import sqlite3
conn = sqlite3.connect('scratch_pre.db')
conn.execute(\"INSERT INTO users (email, password) VALUES ('existing@example.com', 'hash')\")
conn.commit()
conn.close()
print('seeded one pre-existing user')
"
.venv/Scripts/python.exe -m flask db upgrade
.venv/Scripts/python.exe -c "
import sqlite3
conn = sqlite3.connect('scratch_pre.db')
print(conn.execute('SELECT email, email_verified, verification_token FROM users').fetchall())
conn.close()
"
```

Expected final line: `[('existing@example.com', 1, None)]` — the pre-existing user is verified (`1`/`True`) with no pending token.

- [ ] **Step 8: Clean up the scratch database and unset the env override**

```bash
rm scratch_pre.db
unset DATABASE_URL
```

(`web/migrations/` itself stays — it will be committed.)

- [ ] **Step 9: Run the existing test suite to confirm nothing broke**

Run: `.venv/Scripts/python.exe -m pytest tests/ -v`
Expected: `5 passed` (the in-memory test fixture uses `db.create_all()` directly, not migrations, so it already reflects the new columns via the updated `User` model).

- [ ] **Step 10: Commit**

```bash
git add web/requirements-backend.txt web/database.py web/app.py web/migrations
git commit -m "$(cat <<'EOF'
feat: add email-verification columns via a new Flask-Migrate baseline

This project had no migration tool before now - init_db() only ever
called db.create_all(), which never alters existing tables. Introduces
Flask-Migrate/Alembic and its first migration, hand-edited with
server_default=sa.true() on email_verified so existing production users
are grandfathered as verified rather than locked out.
EOF
)"
```

---

### Task 3: Deploy-Time Migration (Dockerfile)

**Files:**
- Modify: `web/Dockerfile`

**Interfaces:**
- Consumes: `web/migrations/` from Task 2.

- [ ] **Step 1: Update the Dockerfile to copy `migrations/` and run `flask db upgrade` before `gunicorn`**

Modify `web/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Railway's build context has proven ambiguous between the repository root and
# web/, so copy whatever the context is and locate the backend sources at build
# time rather than assuming either layout.
COPY . /src

RUN set -eux; \
    echo "--- build context contents ---"; \
    ls -la /src; \
    if [ -f /src/web/app.py ]; then SRC=/src/web; else SRC=/src; fi; \
    echo "--- using backend sources from: $SRC ---"; \
    cp "$SRC/requirements-backend.txt" "$SRC/app.py" "$SRC/database.py" "$SRC/optimizers.py" /app/; \
    cp -r "$SRC/migrations" /app/migrations; \
    pip install --no-cache-dir -r /app/requirements-backend.txt; \
    rm -rf /src

ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Railway routes the public domain to 8080. It normally injects PORT, but
# defaulting to 8080 keeps the container correct even when it does not.
ENV PORT=8080
EXPOSE 8080

# flask db upgrade runs every deploy. The very first deploy after this change
# applies the single migration from Task 2 directly (production's users table
# predates any migration tool, so there is no earlier revision to reconcile -
# Alembic just finds no alembic_version row and runs the one migration that
# exists). Every deploy after that is a no-op since it's already at head.
# Shell form so $PORT expands and && chains correctly.
CMD flask db upgrade && gunicorn -w 4 -b 0.0.0.0:$PORT -t 120 app:app
```

- [ ] **Step 2: Confirm the shell syntax is valid**

Run: `bash -n <(echo 'flask db upgrade && gunicorn -w 4 -b 0.0.0.0:$PORT -t 120 app:app')`
Expected: no output (syntax OK). Docker itself is not installed on this machine, so the real build/run is verified at deploy time on Railway in a later task, not here.

- [ ] **Step 3: Commit**

```bash
git add web/Dockerfile
git commit -m "feat: run flask db upgrade on every deploy before starting gunicorn"
```

---

### Task 4: `send_verification_email()`

**Files:**
- Modify: `web/app.py` (new function, placed near `send_contact_email`)
- Test: `web/tests/test_email_verification.py` (new file)

**Interfaces:**
- Consumes: `RESEND_API_KEY`, `MAIL_FROM` (already module-level in `app.py`).
- Produces: `send_verification_email(to_email: str, token: str) -> None`, raises on failure — later tasks call this and catch exceptions the same way `contact()` catches `send_contact_email` failures.

- [ ] **Step 1: Write the failing test**

Create `web/tests/test_email_verification.py`:

```python
"""
Tests for signup email verification.

Registration no longer returns a JWT directly - it creates an unverified
user, emails a 24h verification link via the Resend HTTP API, and only
issues a token once GET /api/v1/auth/verify confirms the token. Login
rejects unverified accounts. All of this depends on send_verification_email
never being called against the real Resend API in tests - every test here
monkeypatches requests.post.
"""
import os
import sys
from datetime import datetime, timedelta

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["RESEND_API_KEY"] = "test-resend-key"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

import app as app_module
from database import db, User


@pytest.fixture()
def client():
    app_module.app.config["TESTING"] = True
    with app_module.app.app_context():
        db.drop_all()
        db.create_all()
    with app_module.app.test_client() as c:
        yield c
    with app_module.app.app_context():
        db.drop_all()


class _FakeResponse:
    def raise_for_status(self):
        pass


def test_send_verification_email_posts_to_resend_with_the_link(monkeypatch):
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        captured["timeout"] = timeout
        return _FakeResponse()

    monkeypatch.setattr(app_module.requests, "post", fake_post)

    app_module.send_verification_email("someone@example.com", "abc123token")

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer test-resend-key"
    assert captured["json"]["to"] == ["someone@example.com"]
    assert "abc123token" in captured["json"]["text"]


def test_send_verification_email_raises_when_resend_key_missing(monkeypatch):
    monkeypatch.setattr(app_module, "RESEND_API_KEY", None)

    with pytest.raises(RuntimeError):
        app_module.send_verification_email("someone@example.com", "abc123token")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/Scripts/python.exe -m pytest web/tests/test_email_verification.py -v` (from repo root) or `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v` (from `web/`)
Expected: FAIL — `AttributeError: module 'app' has no attribute 'send_verification_email'`.

- [ ] **Step 3: Implement `send_verification_email`**

Add to `web/app.py`, directly after `send_contact_email` (currently ending at `web/app.py:501`):

```python
def send_verification_email(to_email, token):
    """Email a signup verification link via the Resend HTTP API.

    Raises on failure so the caller can roll back the new user row instead
    of leaving an account that can never be verified.
    """
    if not RESEND_API_KEY:
        raise RuntimeError('RESEND_API_KEY is not configured')

    link = f'https://lesstoken.app/app/verify?token={token}'
    body = (
        'LessToken hesabınızı doğrulamak için:\n'
        f'{link}\n\n'
        'Bu bağlantı 24 saat geçerlidir.\n'
    )

    response = requests.post(
        'https://api.resend.com/emails',
        headers={'Authorization': f'Bearer {RESEND_API_KEY}'},
        json={
            'from': MAIL_FROM,
            'to': [to_email],
            'subject': 'LessToken - E-posta Doğrulama',
            'text': body,
        },
        timeout=20,
    )
    response.raise_for_status()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add web/app.py web/tests/test_email_verification.py
git commit -m "feat: add send_verification_email, reusing the Resend HTTP API"
```

---

### Task 5: Registration No Longer Auto-Verifies

**Files:**
- Modify: `web/app.py:112-159` (`register()`)
- Test: `web/tests/test_email_verification.py` (append)

**Interfaces:**
- Consumes: `send_verification_email(to_email, token)` from Task 4.
- Produces: `register()` no longer returns `token` in its 201 response.

- [ ] **Step 1: Write the failing tests**

Append to `web/tests/test_email_verification.py`:

```python
def test_register_does_not_return_a_token(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "hunter22"},
    )

    assert response.status_code == 201
    body = response.get_json()
    assert "token" not in body


def test_register_creates_an_unverified_user_with_a_token(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "hunter22"},
    )

    with app_module.app.app_context():
        user = db.session.query(User).filter_by(email="new@example.com").first()
        assert user.email_verified is False
        assert user.verification_token is not None
        assert user.verification_token_expires > datetime.utcnow()


def test_register_sends_the_verification_email(client, monkeypatch):
    captured = {}
    monkeypatch.setattr(
        app_module,
        "send_verification_email",
        lambda to_email, token: captured.update(to_email=to_email, token=token),
    )

    client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "hunter22"},
    )

    assert captured["to_email"] == "new@example.com"
    with app_module.app.app_context():
        user = db.session.query(User).filter_by(email="new@example.com").first()
        assert captured["token"] == user.verification_token


def test_register_rolls_back_the_user_if_the_email_fails_to_send(client, monkeypatch):
    def raise_error(*a, **k):
        raise RuntimeError("Resend is down")

    monkeypatch.setattr(app_module, "send_verification_email", raise_error)

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "hunter22"},
    )

    assert response.status_code == 502
    with app_module.app.app_context():
        assert db.session.query(User).filter_by(email="new@example.com").first() is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: the 4 new tests FAIL (register still returns a token and never touches verification fields; `send_verification_email` monkeypatch target exists from Task 4 but `register()` never calls it yet).

- [ ] **Step 3: Implement the new `register()`**

Replace `web/app.py:112-159`:

```python
@app.route('/api/v1/auth/register', methods=['POST'])
def register():
    """Register a new user and email them a verification link"""
    try:
        data = request.get_json()

        # Validate input
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400

        email = data.get('email').lower().strip()
        password = data.get('password')

        # Check if user exists
        db = get_db()
        existing_user = db.query(User).filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409

        # Create new, unverified user
        token = secrets.token_urlsafe(32)
        user = User(
            email=email,
            password=generate_password_hash(password),
            email_verified=False,
            verification_token=token,
            verification_token_expires=datetime.utcnow() + timedelta(hours=24)
        )
        db.add(user)
        db.commit()

        try:
            send_verification_email(email, token)
        except Exception:
            logger.exception('Verification email delivery failed')
            db.delete(user)
            db.commit()
            return jsonify({
                'error': 'Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.'
            }), 502

        return jsonify({
            'message': 'Doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin.'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

Add `import secrets` to the top of `web/app.py` (alongside the existing `import os`, `import json`, `import logging`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: `6 passed` (2 from Task 4 plus 4 new).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `.venv/Scripts/python.exe -m pytest tests/ -v`
Expected: `11 passed` (5 from `test_optimize_limits.py` + 6 from `test_email_verification.py`).

- [ ] **Step 6: Commit**

```bash
git add web/app.py web/tests/test_email_verification.py
git commit -m "feat: registration emails a verification link instead of auto-issuing a token"
```

---

### Task 6: Login Rejects Unverified Accounts

**Files:**
- Modify: `web/app.py:162-200` (`login()`)
- Test: `web/tests/test_email_verification.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `web/tests/test_email_verification.py`:

```python
def test_login_rejects_an_unverified_account(client):
    with app_module.app.app_context():
        user = User(
            email="unverified@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=False,
        )
        db.session.add(user)
        db.session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "unverified@example.com", "password": "hunter22"},
    )

    assert response.status_code == 403
    assert response.get_json()["code"] == "email_not_verified"


def test_login_allows_a_verified_account(client):
    with app_module.app.app_context():
        user = User(
            email="verified@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=True,
        )
        db.session.add(user)
        db.session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "verified@example.com", "password": "hunter22"},
    )

    assert response.status_code == 200
    assert "token" in response.get_json()
```

Add this helper near the top of the test file (below the imports, so both tests can use it):

```python
from werkzeug.security import generate_password_hash as generate_password_hash_for_test
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: `test_login_rejects_an_unverified_account` FAILS (current `login()` has no verification check, returns 200); `test_login_allows_a_verified_account` currently passes already (unrelated to this change) but re-run both together.

- [ ] **Step 3: Implement the check in `login()`**

Modify `web/app.py:162-200`, inserting the check right after the password verification:

```python
@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    try:
        data = request.get_json()

        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400

        email = data.get('email').lower().strip()
        password = data.get('password')

        db = get_db()
        user = db.query(User).filter_by(email=email).first()

        if not user or not check_password_hash(user.password, password):
            return jsonify({'error': 'Invalid email or password'}), 401

        if not user.email_verified:
            return jsonify({
                'error': 'E-posta adresiniz doğrulanmamış',
                'code': 'email_not_verified'
            }), 403

        # Generate token
        token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(days=30)
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add web/app.py web/tests/test_email_verification.py
git commit -m "feat: login rejects unverified accounts with 403 email_not_verified"
```

---

### Task 7: `GET /api/v1/auth/verify`

**Files:**
- Modify: `web/app.py` (new route, placed after `login()`)
- Test: `web/tests/test_email_verification.py` (append)

- [ ] **Step 1: Write the failing tests**

Append to `web/tests/test_email_verification.py`:

```python
def test_verify_rejects_an_unknown_token(client):
    response = client.get("/api/v1/auth/verify?token=does-not-exist")
    assert response.status_code == 400


def test_verify_rejects_an_expired_token(client):
    with app_module.app.app_context():
        user = User(
            email="expired@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=False,
            verification_token="expired-token",
            verification_token_expires=datetime.utcnow() - timedelta(hours=1),
        )
        db.session.add(user)
        db.session.commit()

    response = client.get("/api/v1/auth/verify?token=expired-token")
    assert response.status_code == 400


def test_verify_accepts_a_valid_token(client):
    with app_module.app.app_context():
        user = User(
            email="pending@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=False,
            verification_token="valid-token",
            verification_token_expires=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(user)
        db.session.commit()

    response = client.get("/api/v1/auth/verify?token=valid-token")

    assert response.status_code == 200
    assert "token" in response.get_json()

    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(email="pending@example.com").first()
        assert refreshed.email_verified is True
        assert refreshed.verification_token is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: all 3 FAIL with 404 (route doesn't exist yet).

- [ ] **Step 3: Implement the route**

Add to `web/app.py`, directly after `login()`:

```python
@app.route('/api/v1/auth/verify', methods=['GET'])
def verify():
    """Confirm a signup verification link and log the user in"""
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Token is required'}), 400

    db = get_db()
    user = db.query(User).filter_by(verification_token=token).first()

    if not user or user.verification_token_expires < datetime.utcnow():
        return jsonify({'error': 'Link geçersiz veya süresi dolmuş'}), 400

    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()

    token = jwt.encode(
        {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=30)
        },
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )

    return jsonify({
        'message': 'E-posta doğrulandı',
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email
        }
    }), 200
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: `11 passed`.

- [ ] **Step 5: Commit**

```bash
git add web/app.py web/tests/test_email_verification.py
git commit -m "feat: add GET /api/v1/auth/verify"
```

---

### Task 8: `POST /api/v1/auth/resend-verification`

**Files:**
- Modify: `web/app.py` (new route, placed after `verify()`)
- Test: `web/tests/test_email_verification.py` (append)

**Interfaces:**
- Consumes: `send_verification_email` (Task 4).

- [ ] **Step 1: Write the failing tests**

Append to `web/tests/test_email_verification.py`:

```python
_GENERIC_RESEND_MESSAGE = "Eğer bu e-posta kayıtlıysa, doğrulama bağlantısı gönderildi"


def test_resend_verification_gives_the_same_message_for_an_unknown_email(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    response = client.post(
        "/api/v1/auth/resend-verification", json={"email": "nobody@example.com"}
    )

    assert response.status_code == 200
    assert _GENERIC_RESEND_MESSAGE in response.get_json()["message"]


def test_resend_verification_gives_the_same_message_for_an_already_verified_account(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)
    with app_module.app.app_context():
        db.session.add(User(
            email="verified2@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=True,
        ))
        db.session.commit()

    response = client.post(
        "/api/v1/auth/resend-verification", json={"email": "verified2@example.com"}
    )

    assert response.status_code == 200
    assert _GENERIC_RESEND_MESSAGE in response.get_json()["message"]


def test_resend_verification_issues_a_fresh_token_for_a_pending_account(client, monkeypatch):
    captured = {}
    monkeypatch.setattr(
        app_module,
        "send_verification_email",
        lambda to_email, token: captured.update(to_email=to_email, token=token),
    )
    with app_module.app.app_context():
        db.session.add(User(
            email="pending2@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=False,
            verification_token="old-token",
            verification_token_expires=datetime.utcnow() - timedelta(hours=25),
        ))
        db.session.commit()

    response = client.post(
        "/api/v1/auth/resend-verification", json={"email": "pending2@example.com"}
    )

    assert response.status_code == 200
    assert captured["to_email"] == "pending2@example.com"
    assert captured["token"] != "old-token"
    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(email="pending2@example.com").first()
        assert refreshed.verification_token == captured["token"]
        assert refreshed.verification_token_expires > datetime.utcnow()


def test_resend_verification_is_rate_limited_to_once_per_60_seconds(client, monkeypatch):
    captured = []
    monkeypatch.setattr(
        app_module,
        "send_verification_email",
        lambda to_email, token: captured.append(token),
    )
    with app_module.app.app_context():
        # expires 24h from "just now" -> this account was sent a link seconds ago
        db.session.add(User(
            email="pending3@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=False,
            verification_token="recent-token",
            verification_token_expires=datetime.utcnow() + timedelta(hours=24),
        ))
        db.session.commit()

    response = client.post(
        "/api/v1/auth/resend-verification", json={"email": "pending3@example.com"}
    )

    assert response.status_code == 200
    assert _GENERIC_RESEND_MESSAGE in response.get_json()["message"]
    assert captured == []  # no email actually sent - rate limited
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: all 4 FAIL with 404 (route doesn't exist yet).

- [ ] **Step 3: Implement the route**

Add to `web/app.py`, directly after `verify()`:

```python
RESEND_COOLDOWN_SECONDS = 60


@app.route('/api/v1/auth/resend-verification', methods=['POST'])
def resend_verification():
    """Re-send a verification link. Always returns the same message so the
    response never reveals whether an email is registered."""
    generic_response = jsonify({
        'message': 'Eğer bu e-posta kayıtlıysa, doğrulama bağlantısı gönderildi'
    }), 200

    data = request.get_json(silent=True)
    if not data or not data.get('email'):
        return generic_response

    email = data.get('email').lower().strip()
    db = get_db()
    user = db.query(User).filter_by(email=email).first()

    if not user or user.email_verified:
        return generic_response

    if user.verification_token_expires:
        issued_at = user.verification_token_expires - timedelta(hours=24)
        seconds_since_issued = (datetime.utcnow() - issued_at).total_seconds()
        if seconds_since_issued < RESEND_COOLDOWN_SECONDS:
            return generic_response

    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
    db.commit()

    try:
        send_verification_email(email, token)
    except Exception:
        logger.exception('Resend verification email delivery failed')

    return generic_response
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/Scripts/python.exe -m pytest tests/test_email_verification.py -v`
Expected: `15 passed`.

- [ ] **Step 5: Run the full suite**

Run: `.venv/Scripts/python.exe -m pytest tests/ -v`
Expected: `20 passed` (5 + 15).

- [ ] **Step 6: Commit**

```bash
git add web/app.py web/tests/test_email_verification.py
git commit -m "feat: add POST /api/v1/auth/resend-verification with enumeration and rate-limit guards"
```

---

### Task 9: Frontend Verification Page

**Files:**
- Create: `pages/app/verify.jsx`

**Interfaces:**
- Consumes: `GET /api/v1/auth/verify?token=...` (Task 7), `POST /api/v1/auth/resend-verification` (Task 8), `apiUrl()` from `lib/api.js`.

- [ ] **Step 1: Create the page**

Create `pages/app/verify.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiUrl } from '../../lib/api';

export default function Verify() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('checking'); // checking | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setStatus('error');
      setErrorMessage('Doğrulama bağlantısı eksik.');
      return;
    }

    fetch(apiUrl(`/api/v1/auth/verify?token=${encodeURIComponent(token)}`))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          setStatus('error');
          setErrorMessage(data.error || 'Doğrulama başarısız oldu.');
          return;
        }
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setStatus('success');
        setTimeout(() => router.push('/app/dashboard'), 1500);
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('Bağlantı hatası.');
      });
  }, [router.isReady, token]);

  const handleResend = async (e) => {
    e.preventDefault();
    await fetch(apiUrl('/api/v1/auth/resend-verification'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resendEmail }),
    });
    setResendSent(true);
  };

  return (
    <>
      <Head>
        <title>E-posta Doğrulama - LessToken</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          {status === 'checking' && <p>Doğrulanıyor...</p>}

          {status === 'success' && (
            <>
              <p style={{ color: '#166534', fontWeight: 600 }}>
                E-postanız doğrulandı. Yönlendiriliyorsunuz...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <p style={{ color: '#991b1b', marginBottom: '20px' }}>{errorMessage}</p>
              {!resendSent ? (
                <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="email"
                    required
                    placeholder="E-posta adresiniz"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
                      color: 'white',
                      padding: '12px',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Yeni Doğrulama Bağlantısı Gönder
                  </button>
                </form>
              ) : (
                <p>Eğer bu e-posta kayıtlıysa, doğrulama bağlantısı gönderildi.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Manual check**

Run: `npm run dev` (repo root), then visit `http://localhost:3000/app/verify` with no token.
Expected: shows "Doğrulama bağlantısı eksik." and the resend form.

- [ ] **Step 3: Commit**

```bash
git add pages/app/verify.jsx
git commit -m "feat: add /app/verify page for signup email verification links"
```

---

### Task 10: Frontend Auth Page Updates

**Files:**
- Modify: `pages/app/auth.jsx`

- [ ] **Step 1: Handle `403 email_not_verified` on login and the new register response shape**

Add one state variable to the existing `useState` declarations (`pages/app/auth.jsx:8-15`):

```jsx
export default function Auth() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
```

Then replace `handleSubmit` (`pages/app/auth.jsx:25-60`):

```jsx
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNeedsVerification(false);

    try {
      const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';

      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'email_not_verified') {
          setNeedsVerification(true);
        } else {
          setError(data.error || 'Bir hata oluştu');
        }
        return;
      }

      if (!isLogin) {
        // Registration no longer returns a token - it sends a verification email.
        setNeedsVerification(true);
        return;
      }

      // Save token to localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard
      router.push('/app/dashboard');
    } catch (err) {
      setError('Bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 2: Show a "check your email" screen**

Replace the entire `return (...)` block of the component (`pages/app/auth.jsx:62-232`) with:

```jsx
  return (
    <>
      <Head>
        <title>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'} - LessToken</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '400px'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <img src="/logo.svg" alt="LessToken" style={{ width: '60px', height: '60px', marginBottom: '16px' }} />
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0369a1', marginBottom: '8px' }}>
              LessToken
            </h1>
            <p style={{ color: '#666', fontSize: '14px' }}>
              {isLogin ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {needsVerification ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#166534', marginBottom: '20px' }}>
                E-postanızı kontrol edin ve doğrulama bağlantısına tıklayın.
              </p>
              <button
                onClick={() => setNeedsVerification(false)}
                style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer' }}
              >
                Geri dön
              </button>
            </div>
          ) : (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                    Email Adresi
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                    Şifre
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Confirm Password (Register only) */}
                {!isLogin && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                      Şifre Tekrar
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #0369a1 0%, #06b6d4 100%)',
                    color: 'white',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    marginTop: '8px'
                  }}
                >
                  {loading ? 'Yükleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
                </button>
              </form>

              {/* Toggle Login/Register */}
              <div style={{ marginTop: '24px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
                </p>
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0369a1',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {isLogin ? 'Kayıt Olun' : 'Giriş Yapın'}
                </button>
              </div>

              {/* Terms */}
              <p style={{ fontSize: '12px', color: '#999', marginTop: '20px', textAlign: 'center', lineHeight: '1.5' }}>
                Devam ederek <a href="#" style={{ color: '#0369a1', textDecoration: 'none' }}>Şartları</a> ve
                <a href="#" style={{ color: '#0369a1', textDecoration: 'none' }}> Gizlilik Politikasını</a> kabul etmiş olursunuz.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Manual check**

Run: `npm run dev`, register a new account at `/app/auth`.
Expected: after submit, the form is replaced by "E-postanızı kontrol edin..." instead of redirecting to the dashboard.

- [ ] **Step 4: Commit**

```bash
git add pages/app/auth.jsx
git commit -m "feat: auth page shows a check-your-email screen instead of auto-login"
```

---

## Deploy Note (not a code task — flag for the user before running)

Tasks 1-10 are safe to develop and test locally end-to-end. **Deploying Task 2's migration to production is the one step in this plan that touches the live Railway Postgres database** — the first `flask db upgrade` run there will add three columns to a `users` table that currently holds real accounts. Per the verified behavior in Task 2 Step 7, this is safe (existing rows get grandfathered as `email_verified=true`), but it should not be pushed to `main` without the user's explicit go-ahead, the same way the Resend SMTP-to-API fix was confirmed before pushing earlier in this project.
