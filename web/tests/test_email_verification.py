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
