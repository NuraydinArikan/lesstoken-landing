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
