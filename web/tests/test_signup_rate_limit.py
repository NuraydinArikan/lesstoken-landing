"""
Tests for per-IP rate limiting on /api/v1/auth/register and
/api/v1/auth/resend-verification.

Both endpoints are public and unauthenticated: register() creates a DB row
and sends a real email via the Resend HTTP API, and resend-verification
re-sends one. With no limit at all, a single client could hammer either one
indefinitely - spamming Resend, filling the users table, or (for
resend-verification) using it as a mail-bombing vector against a victim's
inbox. Both are limited to SIGNUP_RATE_LIMIT requests per IP per hour,
counted from the database (production runs 4 gunicorn worker processes that
don't share memory - the same reason DAILY_OPTIMIZE_LIMIT in app.py is
DB-backed).

The IP itself is never stored - only a salted (SECRET_KEY-mixed) SHA-256
hash of it, pruned after 24h - so these tests also confirm the rate limit
is grouped by the real client IP as seen through Railway's proxy (via
ProxyFix), not by the proxy's own address.
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
from database import db, User, SignupAttempt


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


def _register(client, email, headers=None):
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "hunter22"},
        headers=headers or {},
    )


def _contact(client, headers=None):
    return client.post(
        "/api/v1/contact",
        json={"email": "someone@example.com", "message": "hello"},
        headers=headers or {},
    )


def test_register_blocks_the_request_after_the_limit_from_the_same_ip_within_an_hour(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    for i in range(app_module.SIGNUP_RATE_LIMIT):
        response = _register(client, f"limit{i}@example.com")
        assert response.status_code == 201

    over_limit = _register(client, "limit-over@example.com")
    assert over_limit.status_code == 429
    assert over_limit.headers.get("Retry-After") == str(app_module.SIGNUP_RATE_LIMIT_RETRY_AFTER)


def test_register_rate_limit_is_per_ip_a_different_ip_is_unaffected(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    for i in range(app_module.SIGNUP_RATE_LIMIT):
        response = _register(client, f"perip{i}@example.com")
        assert response.status_code == 201

    # Same (default) client IP is now blocked.
    blocked = _register(client, "perip-blocked@example.com")
    assert blocked.status_code == 429

    # A different client IP, arriving through the same single trusted proxy
    # hop, is unaffected.
    allowed = _register(
        client, "perip-allowed@example.com", headers={"X-Forwarded-For": "9.9.9.9"}
    )
    assert allowed.status_code == 201


def test_register_malformed_requests_dont_burn_the_rate_limit_budget(client, monkeypatch):
    """The rate-limit check must run after input validation, not before -
    otherwise SIGNUP_RATE_LIMIT malformed submissions (missing email/
    password) would lock out a real user for an hour without a single valid
    attempt ever being made."""
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    for _ in range(app_module.SIGNUP_RATE_LIMIT * 2):
        response = client.post("/api/v1/auth/register", json={"email": "no-password@example.com"})
        assert response.status_code == 400

    # None of the malformed requests above counted against the limit - a
    # real, valid registration from the same IP still succeeds.
    response = _register(client, "finally-valid@example.com")
    assert response.status_code == 201


def test_hash_ip_uses_hmac_not_naive_key_prepending(client):
    """_hash_ip must be a proper keyed HMAC digest, not sha256(key + ip) -
    the two happen to produce different digests for the same inputs, which
    is enough to confirm the construction actually changed."""
    import hashlib
    import hmac as hmac_module

    with app_module.app.app_context():
        ip = "203.0.113.7"
        actual = app_module._hash_ip(ip)

        naive_sha256 = hashlib.sha256(
            (app_module.app.config["SECRET_KEY"] + ip).encode()
        ).hexdigest()
        proper_hmac = hmac_module.new(
            app_module.app.config["SECRET_KEY"].encode(), ip.encode(), hashlib.sha256
        ).hexdigest()

        assert actual == proper_hmac
        assert actual != naive_sha256


def test_register_attempts_older_than_an_hour_dont_count(client, monkeypatch):
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    with app_module.app.app_context():
        ip_hash = app_module._hash_ip("127.0.0.1")
        for i in range(app_module.SIGNUP_RATE_LIMIT):
            db.session.add(SignupAttempt(
                ip_hash=ip_hash,
                endpoint="register",
                created_at=datetime.utcnow() - timedelta(hours=2),
            ))
        db.session.commit()

    response = _register(client, "afterold@example.com")
    assert response.status_code == 201


def test_contact_blocks_the_request_after_the_limit_from_the_same_ip_within_an_hour(client, monkeypatch):
    """/api/v1/contact is public, unauthenticated, and sends a real Resend
    email per request with no other limit - an attacker blocked at /register
    would otherwise simply move here and burn the Resend quota. It shares the
    same per-IP rate limiter helper as register/resend-verification."""
    monkeypatch.setattr(app_module, "send_contact_email", lambda *a, **k: None)

    for _ in range(app_module.SIGNUP_RATE_LIMIT):
        response = _contact(client)
        assert response.status_code == 200

    over_limit = _contact(client)
    assert over_limit.status_code == 429
    assert over_limit.headers.get("Retry-After") == str(app_module.SIGNUP_RATE_LIMIT_RETRY_AFTER)


def test_contact_rate_limit_bucket_is_independent_of_register(client, monkeypatch):
    """contact() is recorded under its own 'contact' endpoint name, so
    hammering it must not affect - and must not be affected by - the
    register() bucket for the same IP."""
    monkeypatch.setattr(app_module, "send_contact_email", lambda *a, **k: None)
    monkeypatch.setattr(app_module, "send_verification_email", lambda *a, **k: None)

    for _ in range(app_module.SIGNUP_RATE_LIMIT):
        assert _contact(client).status_code == 200
    assert _contact(client).status_code == 429

    # register() is untouched - it has its own counter.
    response = _register(client, "separate-bucket@example.com")
    assert response.status_code == 201


def test_resend_verification_rate_limit_response_is_identical_to_the_unknown_email_response(client, monkeypatch):
    sent_to = []
    monkeypatch.setattr(
        app_module,
        "send_verification_email",
        lambda to_email, token: sent_to.append(to_email),
    )

    request_count = app_module.SIGNUP_RATE_LIMIT + 1

    with app_module.app.app_context():
        for i in range(request_count):
            db.session.add(User(
                email=f"ratelimit-resend-{i}@example.com",
                password=generate_password_hash_for_test("hunter22"),
                email_verified=False,
                verification_token=f"old-token-{i}",
                # Well past both the 24h token expiry and the 60s resend
                # cooldown, so an un-rate-limited resend for any one of
                # these would succeed and actually send.
                verification_token_expires=datetime.utcnow() - timedelta(hours=48),
            ))
        db.session.commit()

    responses = [
        client.post(
            "/api/v1/auth/resend-verification",
            json={"email": f"ratelimit-resend-{i}@example.com"},
        )
        for i in range(request_count)
    ]

    # Only the first SIGNUP_RATE_LIMIT requests actually triggered a send.
    assert len(sent_to) == app_module.SIGNUP_RATE_LIMIT

    over_limit = responses[-1]
    unknown_email_response = client.post(
        "/api/v1/auth/resend-verification", json={"email": "totally-unknown@example.com"}
    )

    assert over_limit.status_code == 200
    assert unknown_email_response.status_code == 200
    assert over_limit.get_data() == unknown_email_response.get_data()
    # No Retry-After (or any other distinguishing header) either - unlike
    # register()/contact(), resend-verification's rate-limited branch must
    # return the exact same generic_response as every other branch, or the
    # header itself would leak whether the rate limiter fired.
    assert "Retry-After" not in over_limit.headers
    # The over-limit request was intercepted by the rate limiter, not the
    # normal "account is resendable" path - no extra email was sent.
    assert len(sent_to) == app_module.SIGNUP_RATE_LIMIT
