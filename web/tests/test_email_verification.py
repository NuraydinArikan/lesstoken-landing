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
from sqlalchemy.exc import IntegrityError
from werkzeug.security import (
    check_password_hash,
    generate_password_hash as generate_password_hash_for_test,
)

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
    # Softens the pre-hijacking window created by re-registration over a dead
    # signup row (see register()'s is_dead_signup comment): if this wasn't
    # the recipient's own request, the body must say so and make clear
    # ignoring it is safe, rather than being a bare, frictionless link.
    assert "yok sayabilirsiniz" in captured["json"]["text"]
    # Short timeout so a slow Resend can't hold a sync gunicorn worker (and,
    # with 4 workers, the whole API) hostage for long. See the comment next
    # to the timeout= arg in send_verification_email for the full reasoning.
    assert captured["timeout"] == 5


def test_send_verification_email_raises_when_resend_key_missing(monkeypatch):
    monkeypatch.setattr(app_module, "RESEND_API_KEY", None)

    with pytest.raises(RuntimeError):
        app_module.send_verification_email("someone@example.com", "abc123token")


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


def test_register_returns_a_generic_409_and_does_not_leak_internals_on_a_concurrent_duplicate(client, monkeypatch):
    """Two concurrent registrations of the same new address can both pass the
    existence check (register() checks, then does up to 5s of email I/O,
    then commits) - the loser's final db.commit() raises IntegrityError on
    the unique constraint on users.email. Before the fix, that fell through
    to `except Exception as e: jsonify({'error': str(e)})`, and
    SQLAlchemy's IntegrityError.__str__ embeds the full failed SQL statement
    AND its bound parameters - so the 500 body would have contained the
    plaintext email and the scrypt password hash. It must now come back as
    the same plain 409 a normal duplicate gets, with no exception internals
    in the body."""
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    secret_password_hash = "scrypt$32768$8$1$supersecrethashvalue"
    fake_integrity_error = IntegrityError(
        "INSERT INTO users (email, password) VALUES (?, ?)",
        {"email": "racer@example.com", "password": secret_password_hash},
        Exception("UNIQUE constraint failed: users.email"),
    )

    # register() commits twice before this point: once inside the rate
    # limiter's own bookkeeping, then again for the actual user row. Only the
    # second (the one this test targets) should raise - the first must behave
    # normally or every request would look rate-limiter-broken instead of
    # exercising the duplicate-email race this test is about.
    real_commit = db.session.commit
    calls = {"count": 0}

    def fake_commit():
        calls["count"] += 1
        if calls["count"] == 2:
            raise fake_integrity_error
        return real_commit()

    monkeypatch.setattr(db.session, "commit", fake_commit)

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "racer@example.com", "password": "hunter22"},
    )

    assert response.status_code == 409
    assert response.get_json() == {"error": "Email already registered"}

    body_text = response.get_data(as_text=True)
    assert "scrypt" not in body_text
    assert secret_password_hash not in body_text
    assert "racer@example.com" not in body_text
    assert "INSERT INTO users" not in body_text


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
    # No session is issued from a verification link - the user logs in
    # normally afterwards. See the comment in verify() for why.
    assert "token" not in response.get_json()

    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(email="pending@example.com").first()
        assert refreshed.email_verified is True
        # The token is deliberately NOT cleared - see
        # test_verify_is_idempotent_for_a_repeat_request_with_the_same_token
        # for why (email-link security scanners GET the link before the
        # human does, and would otherwise consume it).
        assert refreshed.verification_token == "valid-token"


def test_verify_is_idempotent_for_a_repeat_request_with_the_same_token(client):
    """Email security scanners (Outlook Safe Links, Proofpoint, etc.) GET
    verification links automatically before the human clicks them. A second
    GET with the same valid token - whether from a scanner-then-human or a
    double-click - must succeed again, not 400."""
    with app_module.app.app_context():
        user = User(
            email="scanned@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=False,
            verification_token="scanner-token",
            verification_token_expires=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(user)
        db.session.commit()

    first = client.get("/api/v1/auth/verify?token=scanner-token")
    assert first.status_code == 200
    assert "token" not in first.get_json()

    second = client.get("/api/v1/auth/verify?token=scanner-token")
    assert second.status_code == 200
    assert "token" not in second.get_json()

    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(email="scanned@example.com").first()
        assert refreshed.email_verified is True


def test_verify_still_rejects_a_stale_link_after_the_token_naturally_expires(client):
    """Even for an already-verified account, a token past its 24h expiry must
    still 400 - the idempotency fix must not bypass the expiry check."""
    with app_module.app.app_context():
        user = User(
            email="stale@example.com",
            password=generate_password_hash_for_test("hunter22"),
            email_verified=True,
            verification_token="stale-token",
            verification_token_expires=datetime.utcnow() - timedelta(hours=1),
        )
        db.session.add(user)
        db.session.commit()

    response = client.get("/api/v1/auth/verify?token=stale-token")
    assert response.status_code == 400


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


# ============================================================================
# Registration squatting: re-registering over a dead, never-completed signup
# ============================================================================
#
# Historically, registering victim@example.com created a permanent unverified
# row. The real owner could then never sign up - register() returned 409
# "Email already registered" forever, and nothing ever purged the row. The
# fix: re-registering over an unverified row whose token has already expired
# (a dead signup) is treated as a fresh signup instead of a conflict. A still
# -live pending signup, or an already-verified account, still 409s so an
# attacker can't hijack a real in-flight signup or a verified account.


def test_reregistering_over_an_expired_unverified_row_succeeds_and_issues_a_new_token(client, monkeypatch):
    captured = {}
    monkeypatch.setattr(
        app_module,
        "send_verification_email",
        lambda to_email, token: captured.update(to_email=to_email, token=token),
    )
    with app_module.app.app_context():
        db.session.add(User(
            email="squatted@example.com",
            password=generate_password_hash_for_test("old-password"),
            email_verified=False,
            verification_token="dead-token",
            verification_token_expires=datetime.utcnow() - timedelta(hours=1),
        ))
        db.session.commit()

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "squatted@example.com", "password": "new-password"},
    )

    assert response.status_code == 201
    assert captured["to_email"] == "squatted@example.com"
    assert captured["token"] != "dead-token"

    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(email="squatted@example.com").first()
        assert refreshed.email_verified is False
        assert refreshed.verification_token == captured["token"]
        assert refreshed.verification_token_expires > datetime.utcnow()
        # password hash was overwritten to match the new registration
        assert check_password_hash(refreshed.password, "new-password")
        assert not check_password_hash(refreshed.password, "old-password")


def test_reregistering_over_a_dead_signup_rolls_back_cleanly_if_the_email_fails_to_send(client, monkeypatch):
    """The existing rollback test (test_register_rolls_back_the_user_if_the_
    email_fails_to_send) only covers the fresh-insert path, where rollback
    just discards a never-committed row. The overwrite path is different in
    kind: register() mutates the EXISTING victim row in place
    (user.password = ..., user.verification_token = ...) before attempting
    to send, so a failed send must roll back those in-place attribute
    changes too - if it didn't, a victim's dead signup could be silently
    overwritten with the attacker's password/token merely by the attacker
    triggering a send failure, with no successful response ever coming back
    to tip anyone off."""

    def raise_error(*a, **k):
        raise RuntimeError("Resend is down")

    monkeypatch.setattr(app_module, "send_verification_email", raise_error)

    original_password_hash = generate_password_hash_for_test("victims-original-password")
    with app_module.app.app_context():
        db.session.add(User(
            email="dead-signup-failed-send@example.com",
            password=original_password_hash,
            email_verified=False,
            verification_token="victims-original-token",
            verification_token_expires=datetime.utcnow() - timedelta(hours=1),  # dead
        ))
        db.session.commit()

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "dead-signup-failed-send@example.com", "password": "attacker-password"},
    )

    assert response.status_code == 502

    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(
            email="dead-signup-failed-send@example.com"
        ).first()
        # The row still exists at all (nothing deleted)...
        assert refreshed is not None
        # ...and every field still matches the victim's original values
        # (nothing overwritten) - not the attacker's password or a fresh
        # token issued as part of the failed attempt.
        assert refreshed.password == original_password_hash
        assert check_password_hash(refreshed.password, "victims-original-password")
        assert not check_password_hash(refreshed.password, "attacker-password")
        assert refreshed.verification_token == "victims-original-token"
        assert refreshed.verification_token_expires < datetime.utcnow()


def test_reregistering_over_a_still_live_unverified_row_still_conflicts(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)
    with app_module.app.app_context():
        db.session.add(User(
            email="pending-live@example.com",
            password=generate_password_hash_for_test("original-password"),
            email_verified=False,
            verification_token="live-token",
            verification_token_expires=datetime.utcnow() + timedelta(hours=1),
        ))
        db.session.commit()

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "pending-live@example.com", "password": "attacker-password"},
    )

    assert response.status_code == 409
    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(email="pending-live@example.com").first()
        assert refreshed.verification_token == "live-token"
        assert check_password_hash(refreshed.password, "original-password")


def test_reregistering_over_a_verified_account_still_conflicts(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)
    with app_module.app.app_context():
        db.session.add(User(
            email="already-verified@example.com",
            password=generate_password_hash_for_test("original-password"),
            email_verified=True,
        ))
        db.session.commit()

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "already-verified@example.com", "password": "attacker-password"},
    )

    assert response.status_code == 409
    with app_module.app.app_context():
        refreshed = db.session.query(User).filter_by(email="already-verified@example.com").first()
        assert check_password_hash(refreshed.password, "original-password")
