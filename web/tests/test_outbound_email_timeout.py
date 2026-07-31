"""
Both outbound-email senders (verification and contact) call the Resend HTTP
API synchronously from inside the request. With gunicorn running 4 sync
workers, a slow/unresponsive Resend used to be able to hold a request open
for up to `timeout=20` seconds - and since only 4 workers exist, 4
concurrent slow sends exhausted every worker, stalling the entire API,
including unrelated endpoints like /api/v1/health. Both are cut to
`timeout=5` to bound how long a single slow send can hold a worker hostage.
"""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["RESEND_API_KEY"] = "test-resend-key"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as app_module


class _FakeResponse:
    def raise_for_status(self):
        pass


def test_send_verification_email_uses_a_short_timeout(monkeypatch):
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured["timeout"] = timeout
        return _FakeResponse()

    monkeypatch.setattr(app_module.requests, "post", fake_post)

    app_module.send_verification_email("someone@example.com", "abc123token")

    assert captured["timeout"] == 5


def test_send_contact_email_uses_a_short_timeout(monkeypatch):
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured["timeout"] = timeout
        return _FakeResponse()

    monkeypatch.setattr(app_module.requests, "post", fake_post)

    app_module.send_contact_email("Someone", "someone@example.com", "Subject", "Message body")

    assert captured["timeout"] == 5
