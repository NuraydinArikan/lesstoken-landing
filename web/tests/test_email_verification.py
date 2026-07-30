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
from werkzeug.security import generate_password_hash as generate_password_hash_for_test

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
    assert "token" in response.get_json()

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
    double-click - must succeed again (fresh JWT), not 400."""
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
    assert "token" in first.get_json()

    second = client.get("/api/v1/auth/verify?token=scanner-token")
    assert second.status_code == 200
    assert "token" in second.get_json()

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
