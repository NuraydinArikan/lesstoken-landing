"""
Tests for the cost guards on /api/v1/optimize.

This endpoint bills LessToken's own provider keys, not the caller's, so two
things must hold regardless of provider behavior:
  - a single request can't send unbounded text (MAX_TEXT_CHARS)
  - a free account can't call it without limit (DAILY_OPTIMIZE_LIMIT)

Both are enforced from the database (not an in-memory counter) because the
production process runs 4 gunicorn workers that don't share memory.
"""
import os
import sys
from datetime import datetime, timedelta

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import jwt
import pytest

import app as app_module
from database import db, User, OptimizationHistory


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


def _make_user_and_token(email="user@example.com"):
    with app_module.app.app_context():
        user = User(email=email, password="unused-hash")
        db.session.add(user)
        db.session.commit()
        user_id = user.id
    token = jwt.encode(
        {"user_id": user_id, "exp": datetime.utcnow() + timedelta(days=1)},
        app_module.app.config["SECRET_KEY"],
        algorithm="HS256",
    )
    return user_id, token


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_rejects_text_over_the_character_cap(client):
    _, token = _make_user_and_token()
    oversized = "a" * (app_module.MAX_TEXT_CHARS + 1)

    response = client.post(
        "/api/v1/optimize",
        json={"text": oversized, "provider": "openai"},
        headers=_auth_headers(token),
    )

    assert response.status_code == 400
    assert "too long" in response.get_json()["error"].lower()


def test_accepts_text_at_exactly_the_character_cap(client, monkeypatch):
    _, token = _make_user_and_token()
    monkeypatch.setattr(
        app_module,
        "optimize_text_with_provider",
        lambda **kwargs: {
            "optimized": "ok",
            "stats": {"inputTokens": 1, "outputTokens": 1, "reduction": 0},
        },
    )
    monkeypatch.setattr(app_module, "OPENAI_API_KEY", "fake-key-for-test")
    exactly_max = "a" * app_module.MAX_TEXT_CHARS

    response = client.post(
        "/api/v1/optimize",
        json={"text": exactly_max, "provider": "openai"},
        headers=_auth_headers(token),
    )

    assert response.status_code == 200


def test_blocks_the_request_after_the_daily_limit_is_reached(client, monkeypatch):
    user_id, token = _make_user_and_token()
    monkeypatch.setattr(
        app_module,
        "optimize_text_with_provider",
        lambda **kwargs: {
            "optimized": "ok",
            "stats": {"inputTokens": 1, "outputTokens": 1, "reduction": 0},
        },
    )
    monkeypatch.setattr(app_module, "OPENAI_API_KEY", "fake-key-for-test")

    # Backfill today's history directly rather than firing DAILY_OPTIMIZE_LIMIT
    # real requests - this test is about the boundary, not about generating load.
    with app_module.app.app_context():
        for _ in range(app_module.DAILY_OPTIMIZE_LIMIT):
            db.session.add(
                OptimizationHistory(
                    user_id=user_id,
                    input_text="x",
                    output_text="x",
                    provider="openai",
                    style="general",
                    input_tokens=1,
                    output_tokens=1,
                    reduction_percent=0,
                )
            )
        db.session.commit()

    response = client.post(
        "/api/v1/optimize",
        json={"text": "one more, please", "provider": "openai"},
        headers=_auth_headers(token),
    )

    assert response.status_code == 429
    body = response.get_json()
    assert body["code"] == "daily_limit_reached"
    assert "lesstoken.app/text" in body["error"]


def test_allows_a_request_one_below_the_daily_limit(client, monkeypatch):
    user_id, token = _make_user_and_token()
    monkeypatch.setattr(
        app_module,
        "optimize_text_with_provider",
        lambda **kwargs: {
            "optimized": "ok",
            "stats": {"inputTokens": 1, "outputTokens": 1, "reduction": 0},
        },
    )
    monkeypatch.setattr(app_module, "OPENAI_API_KEY", "fake-key-for-test")

    with app_module.app.app_context():
        for _ in range(app_module.DAILY_OPTIMIZE_LIMIT - 1):
            db.session.add(
                OptimizationHistory(
                    user_id=user_id,
                    input_text="x",
                    output_text="x",
                    provider="openai",
                    style="general",
                    input_tokens=1,
                    output_tokens=1,
                    reduction_percent=0,
                )
            )
        db.session.commit()

    response = client.post(
        "/api/v1/optimize",
        json={"text": "last free one today", "provider": "openai"},
        headers=_auth_headers(token),
    )

    assert response.status_code == 200


def test_yesterdays_requests_do_not_count_toward_todays_limit(client, monkeypatch):
    user_id, token = _make_user_and_token()
    monkeypatch.setattr(
        app_module,
        "optimize_text_with_provider",
        lambda **kwargs: {
            "optimized": "ok",
            "stats": {"inputTokens": 1, "outputTokens": 1, "reduction": 0},
        },
    )
    monkeypatch.setattr(app_module, "OPENAI_API_KEY", "fake-key-for-test")

    yesterday = datetime.utcnow() - timedelta(days=1)
    with app_module.app.app_context():
        for _ in range(app_module.DAILY_OPTIMIZE_LIMIT + 5):
            db.session.add(
                OptimizationHistory(
                    user_id=user_id,
                    input_text="x",
                    output_text="x",
                    provider="openai",
                    style="general",
                    input_tokens=1,
                    output_tokens=1,
                    reduction_percent=0,
                    created_at=yesterday,
                )
            )
        db.session.commit()

    response = client.post(
        "/api/v1/optimize",
        json={"text": "a new day", "provider": "openai"},
        headers=_auth_headers(token),
    )

    assert response.status_code == 200
