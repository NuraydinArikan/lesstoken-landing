"""
LessToken Web App Backend - Flask API
REST API for AI text optimization with user authentication
"""

import os
import json
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from sqlalchemy.exc import IntegrityError
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

# Local imports (will create these)
from database import init_db, get_db, db, User, OptimizationHistory, SignupAttempt
from optimizers import optimize_text_with_provider

# Initialize Flask app
app = Flask(__name__)

# Railway runs a reverse proxy in front of this app, so without this,
# request.remote_addr is always the proxy's own address - every user on
# earth would share one IP-based rate-limit bucket, and the first few
# signups would lock out everyone. x_for=1 trusts exactly one proxy hop
# (Railway's) and resolves remote_addr to the real client address from the
# last X-Forwarded-For entry. Deliberately NOT hand-parsing
# X-Forwarded-For or trusting its leftmost entry - a client can put
# anything there; only the entry added by our own trusted proxy is safe to
# read, which is what x_for=1 does.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'sqlite:///lesstoken.db'
)

logger = logging.getLogger(__name__)

# Environment variables for AI providers
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')

# This endpoint bills our own API keys, not the caller's, so both limits below
# guard against real money leaking out: MAX_TEXT_CHARS stops a single oversized
# request (the 20,000-char cap on the /text page is client-side only - a
# direct API call could otherwise send arbitrarily large text), and
# DAILY_OPTIMIZE_LIMIT stops unlimited requests from one free, unverified
# account. Checked in the database rather than in-memory because gunicorn
# runs 4 worker processes that don't share memory.
MAX_TEXT_CHARS = 20000
DAILY_OPTIMIZE_LIMIT = 20

# register and resend-verification are both public, unauthenticated, and
# trigger a real outbound email (and, for register, a DB row) per request -
# with no limit at all either one is a free spam/cost vector. Limited to 5
# requests per IP per hour, counted from the database for the same reason
# as DAILY_OPTIMIZE_LIMIT above (4 gunicorn workers, no shared memory).
SIGNUP_RATE_LIMIT = 5
SIGNUP_RATE_LIMIT_WINDOW = timedelta(hours=1)
SIGNUP_ATTEMPT_RETENTION = timedelta(hours=24)

# Outgoing mail for the contact form, via Resend's HTTP API rather than raw
# SMTP: Railway's outbound network blocks SMTP ports (25/465/587), so a
# socket-level smtplib connection to smtp.resend.com times out every time.
# The API travels over regular HTTPS and isn't affected.
# Falls back to SMTP_PASSWORD so the key already set on Railway keeps working
# without renaming the variable there.
RESEND_API_KEY = os.getenv('RESEND_API_KEY') or os.getenv('SMTP_PASSWORD')
MAIL_FROM = os.getenv('MAIL_FROM', 'info@lesstoken.app')
CONTACT_TO = os.getenv('CONTACT_TO', 'info@lesstoken.app')

# Enable CORS for frontend
CORS(app, origins=[
    'https://lesstoken.app',
    'https://www.lesstoken.app',
    'http://localhost:3000',  # Development
])

# Initialize database
init_db(app)
migrate = Migrate(app, db)

# ============================================================================
# Authentication Middleware
# ============================================================================

def token_required(f):
    """Require valid JWT token for protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check for token in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(
                token,
                app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(current_user_id, *args, **kwargs)

    return decorated

# ============================================================================
# Authentication Routes
# ============================================================================

def _hash_ip(ip):
    """Salt the client IP with SECRET_KEY before storing it, so the stored
    value is useless for recovering the real IP without the server secret."""
    return hashlib.sha256((app.config['SECRET_KEY'] + ip).encode()).hexdigest()


def _record_signup_attempt_and_check_limit(endpoint):
    """Report whether this IP has already made SIGNUP_RATE_LIMIT or more
    requests to `endpoint` in the last hour, and if not, record this request
    against its counter.

    Only a salted hash of request.remote_addr is stored (see _hash_ip) - by
    the time this runs, ProxyFix has already resolved remote_addr to the
    real client address rather than Railway's proxy.

    The count check runs before the write, and a request that is about to be
    rejected returns immediately WITHOUT writing a row or committing - an
    attacker hammering this endpoint would otherwise force a DELETE + COUNT +
    INSERT + COMMIT on every single rejected request, turning the limiter
    into the DB-load amplifier it exists to prevent. This doesn't change the
    limiter's semantics: an IP still unblocks an hour after its 5th accepted
    attempt, since only accepted attempts are ever recorded.
    """
    session = get_db()
    now = datetime.utcnow()
    ip_hash = _hash_ip(request.remote_addr or '')

    # Pruning rows older than 24h doesn't need to happen on every call - it
    # only needs to happen often enough that the table doesn't grow forever.
    # Making it probabilistic (roughly 1 in 100 calls) means a burst of
    # requests - accepted or rejected - costs at most one COUNT plus,
    # usually, one INSERT, instead of a DELETE scan on every single request.
    if secrets.randbelow(100) == 0:
        session.query(SignupAttempt).filter(
            SignupAttempt.created_at < now - SIGNUP_ATTEMPT_RETENTION
        ).delete()

    window_start = now - SIGNUP_RATE_LIMIT_WINDOW
    recent_count = session.query(SignupAttempt).filter(
        SignupAttempt.ip_hash == ip_hash,
        SignupAttempt.endpoint == endpoint,
        SignupAttempt.created_at >= window_start,
    ).count()

    if recent_count >= SIGNUP_RATE_LIMIT:
        session.commit()  # commit the probabilistic prune, if it ran above
        return True

    session.add(SignupAttempt(ip_hash=ip_hash, endpoint=endpoint, created_at=now))
    session.commit()

    return False


@app.route('/api/v1/auth/register', methods=['POST'])
def register():
    """Register a new user and email them a verification link"""
    try:
        if _record_signup_attempt_and_check_limit('register'):
            return jsonify({
                'error': 'Too many signup attempts from this network. Please try again in an hour.'
            }), 429

        data = request.get_json()

        # Validate input
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400

        email = data.get('email').lower().strip()
        password = data.get('password')

        # Check if user exists
        db = get_db()
        existing_user = db.query(User).filter_by(email=email).first()

        # A row that is unverified AND whose token has already expired is a
        # dead, never-completed signup (the real owner never clicked the
        # link, and nothing ever purges the row). Treat re-registering over
        # it as a fresh signup rather than a permanent conflict - otherwise
        # squatting on someone else's email locks them out forever. Still
        # 409 when the row is verified, or unverified but its token is still
        # live, so an attacker can't hijack a real in-flight signup or a
        # verified account by re-registering during the 24h window.
        is_dead_signup = (
            existing_user is not None
            and not existing_user.email_verified
            and (
                existing_user.verification_token_expires is None
                or existing_user.verification_token_expires < datetime.utcnow()
            )
        )

        if existing_user and not is_dead_signup:
            return jsonify({'error': 'Email already registered'}), 409

        token = secrets.token_urlsafe(32)

        if is_dead_signup:
            user = existing_user
            user.password = generate_password_hash(password)
            user.verification_token = token
            user.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
        else:
            # Create new, unverified user
            user = User(
                email=email,
                password=generate_password_hash(password),
                email_verified=False,
                verification_token=token,
                verification_token_expires=datetime.utcnow() + timedelta(hours=24)
            )
            db.add(user)

        # Don't commit until the email actually sends: on failure, a plain
        # rollback() cleanly discards the uncommitted insert (new signup) or
        # the uncommitted overwrite (dead-signup re-registration) alike,
        # leaving no half-registered/half-overwritten row behind either way.
        try:
            send_verification_email(email, token)
        except Exception:
            logger.exception('Verification email delivery failed')
            db.rollback()
            return jsonify({
                'error': 'Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.'
            }), 502

        # Two concurrent registrations of the same new address can both pass
        # the existence check above (a real race, not just a hypothetical -
        # the check happens before up to 5s of network I/O in
        # send_verification_email). The loser's commit raises IntegrityError
        # on the unique constraint on users.email; treat that exactly like a
        # normal duplicate-email conflict rather than letting it fall through
        # to the generic 500 handler below.
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return jsonify({'error': 'Email already registered'}), 409

        return jsonify({
            'message': 'Doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin.'
        }), 201

    except Exception:
        logger.exception('Registration failed')
        return jsonify({'error': 'Internal server error'}), 500


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

    except Exception:
        logger.exception('Unhandled error in %s', request.path)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/v1/auth/verify', methods=['GET'])
def verify():
    """Confirm a signup verification link and log the user in"""
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Token is required'}), 400

    db = get_db()
    user = db.query(User).filter_by(verification_token=token).first()

    if not user or not user.verification_token_expires or user.verification_token_expires < datetime.utcnow():
        return jsonify({'error': 'Link geçersiz veya süresi dolmuş'}), 400

    # Deliberately don't clear verification_token/verification_token_expires
    # on success: automated email-link scanners (Outlook Safe Links,
    # Proofpoint, etc.) GET this link before the human ever clicks it. If the
    # token were consumed here, that scanner's request would burn it, and the
    # real user's click would then 400 on an account that's actually already
    # verified. Leaving the token in place makes a repeat GET with the same
    # token idempotent - it just re-issues a JWT - while the 24h expiry check
    # above still rejects a genuinely stale/expired link.
    if not user.email_verified:
        user.email_verified = True
        db.commit()

    # Deliberately issues no session here. This link travels through email and
    # is pre-fetched by security scanners (see the comment above), so anything
    # it hands back is effectively public - a JWT included. Confirming an
    # address is idempotent and harmless to repeat; handing out a 30-day
    # session is not. The user logs in normally afterwards.
    return jsonify({
        'message': 'E-posta doğrulandı'
    }), 200


RESEND_COOLDOWN_SECONDS = 60


@app.route('/api/v1/auth/resend-verification', methods=['POST'])
def resend_verification():
    """Re-send a verification link. Always returns the same message so the
    response never reveals whether an email is registered."""
    generic_response = jsonify({
        'message': 'Eğer bu e-posta kayıtlıysa, doğrulama bağlantısı gönderildi'
    }), 200

    # Rate-limited requests get the exact same generic_response as every
    # other branch below (unknown email, verified account, cooldown) - this
    # endpoint must never reveal, via a different status code or message,
    # whether an email is registered, verified, or just being rate-limited.
    if _record_signup_attempt_and_check_limit('resend-verification'):
        return generic_response

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


# ============================================================================
# Optimization Routes
# ============================================================================

@app.route('/api/v1/optimize', methods=['POST'])
@token_required
def optimize(current_user_id):
    """Optimize text using AI provider"""
    try:
        data = request.get_json()

        # Validate input
        if not data or not data.get('text'):
            return jsonify({'error': 'Text is required'}), 400

        text = data.get('text')
        provider = data.get('provider', 'openai')
        style = data.get('style', 'general')

        if len(text) > MAX_TEXT_CHARS:
            return jsonify({
                'error': f'Text is too long ({len(text)} chars). Maximum is {MAX_TEXT_CHARS} characters.'
            }), 400

        # Validate provider
        if provider not in ['openai', 'claude', 'gemini', 'ollama']:
            return jsonify({'error': 'Invalid provider'}), 400

        # Validate style
        if style not in ['general', 'technical', 'marketing', 'academic']:
            style = 'general'

        # Daily quota, counted from history rather than an in-memory counter
        # so it's correct across all 4 gunicorn workers.
        db = get_db()
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        requests_today = db.query(OptimizationHistory).filter(
            OptimizationHistory.user_id == current_user_id,
            OptimizationHistory.created_at >= today_start
        ).count()
        if requests_today >= DAILY_OPTIMIZE_LIMIT:
            return jsonify({
                'error': (
                    f'Daily free limit reached ({DAILY_OPTIMIZE_LIMIT} requests). '
                    'For unlimited use with your own API key, try the desktop app '
                    'or the web tools at lesstoken.app/text.'
                ),
                'code': 'daily_limit_reached'
            }), 429

        # Get appropriate API key
        api_key = None
        if provider == 'openai':
            api_key = OPENAI_API_KEY
        elif provider == 'claude':
            api_key = CLAUDE_API_KEY
        elif provider == 'gemini':
            api_key = GEMINI_API_KEY

        if not api_key and provider != 'ollama':
            return jsonify({'error': f'{provider} API key not configured'}), 503

        # Optimize text
        result = optimize_text_with_provider(
            text=text,
            provider=provider,
            style=style,
            api_key=api_key,
            ollama_url=OLLAMA_URL
        )

        # Save to history
        history_entry = OptimizationHistory(
            user_id=current_user_id,
            input_text=text,
            output_text=result['optimized'],
            provider=provider,
            style=style,
            input_tokens=result['stats']['inputTokens'],
            output_tokens=result['stats']['outputTokens'],
            reduction_percent=result['stats']['reduction']
        )
        db.add(history_entry)
        db.commit()

        return jsonify({
            'success': True,
            'result': result['optimized'],
            'stats': result['stats'],
            'history_id': history_entry.id
        }), 200

    except Exception:
        logger.exception('Unhandled error in %s', request.path)
        return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# History Routes
# ============================================================================

@app.route('/api/v1/history', methods=['GET'])
@token_required
def get_history(current_user_id):
    """Get user's optimization history"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        db = get_db()
        entries = db.query(OptimizationHistory)\
            .filter_by(user_id=current_user_id)\
            .order_by(OptimizationHistory.created_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()

        # Calculate stats
        all_entries = db.query(OptimizationHistory)\
            .filter_by(user_id=current_user_id)\
            .all()

        total_count = len(all_entries)
        avg_reduction = sum(e.reduction_percent for e in all_entries) / total_count if all_entries else 0
        total_input = sum(e.input_tokens for e in all_entries)
        total_saved = total_input - sum(e.output_tokens for e in all_entries)

        return jsonify({
            'success': True,
            'history': [
                {
                    'id': e.id,
                    'input': e.input_text[:200],  # Preview only
                    'output': e.output_text[:200],
                    'provider': e.provider,
                    'style': e.style,
                    'reduction': e.reduction_percent,
                    'inputTokens': e.input_tokens,
                    'outputTokens': e.output_tokens,
                    'timestamp': e.created_at.isoformat()
                }
                for e in entries
            ],
            'stats': {
                'totalCount': total_count,
                'avgReduction': round(avg_reduction, 1),
                'totalInput': total_input,
                'totalSaved': total_saved
            }
        }), 200

    except Exception:
        logger.exception('Unhandled error in %s', request.path)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/v1/history/<int:history_id>', methods=['GET'])
@token_required
def get_history_detail(current_user_id, history_id):
    """Get full details of a specific optimization"""
    try:
        db = get_db()
        entry = db.query(OptimizationHistory).filter_by(
            id=history_id,
            user_id=current_user_id
        ).first()

        if not entry:
            return jsonify({'error': 'History entry not found'}), 404

        return jsonify({
            'success': True,
            'entry': {
                'id': entry.id,
                'input': entry.input_text,  # Full text
                'output': entry.output_text,
                'provider': entry.provider,
                'style': entry.style,
                'reduction': entry.reduction_percent,
                'inputTokens': entry.input_tokens,
                'outputTokens': entry.output_tokens,
                'timestamp': entry.created_at.isoformat()
            }
        }), 200

    except Exception:
        logger.exception('Unhandled error in %s', request.path)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/v1/history', methods=['DELETE'])
@token_required
def clear_history(current_user_id):
    """Clear all user history"""
    try:
        db = get_db()
        db.query(OptimizationHistory).filter_by(user_id=current_user_id).delete()
        db.commit()

        return jsonify({
            'success': True,
            'message': 'History cleared'
        }), 200

    except Exception:
        logger.exception('Unhandled error in %s', request.path)
        return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# User Routes
# ============================================================================

@app.route('/api/v1/user/profile', methods=['GET'])
@token_required
def get_profile(current_user_id):
    """Get current user's profile"""
    try:
        db = get_db()
        user = db.query(User).filter_by(id=current_user_id).first()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat()
            }
        }), 200

    except Exception:
        logger.exception('Unhandled error in %s', request.path)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/v1/user/profile', methods=['PUT'])
@token_required
def update_profile(current_user_id):
    """Update user profile"""
    try:
        data = request.get_json()
        db = get_db()
        user = db.query(User).filter_by(id=current_user_id).first()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Update password if provided
        if data.get('newPassword'):
            if not check_password_hash(user.password, data.get('currentPassword')):
                return jsonify({'error': 'Current password is incorrect'}), 401
            user.password = generate_password_hash(data.get('newPassword'))

        db.commit()

        return jsonify({
            'success': True,
            'message': 'Profile updated'
        }), 200

    except Exception:
        logger.exception('Unhandled error in %s', request.path)
        return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# Contact Routes
# ============================================================================

def _strip_header_newlines(value):
    """Keep user input out of the header block."""
    return ' '.join(str(value).splitlines()).strip()


def send_contact_email(name, email, subject, message):
    """Deliver a contact form submission via the Resend HTTP API.

    Raises on failure so the caller never reports success for a mail that was
    not actually sent.
    """
    if not RESEND_API_KEY:
        raise RuntimeError('RESEND_API_KEY is not configured')

    body = (
        f'Gönderen: {_strip_header_newlines(name)} <{_strip_header_newlines(email)}>\n'
        f'Konu: {_strip_header_newlines(subject)}\n\n'
        f'{message}\n'
    )

    response = requests.post(
        'https://api.resend.com/emails',
        headers={'Authorization': f'Bearer {RESEND_API_KEY}'},
        json={
            'from': MAIL_FROM,
            'to': [CONTACT_TO],
            'reply_to': _strip_header_newlines(email),
            'subject': f'[lesstoken.app] {_strip_header_newlines(subject)}',
            'text': body,
        },
        # Kept short deliberately: gunicorn runs 4 sync workers, and this
        # call happens synchronously inside the request (contact() reports
        # failure rather than success if the send doesn't complete). A slow
        # Resend at timeout=20 could hold a worker for 20s each; with only 4
        # workers, a handful of concurrent slow sends used to stall the
        # entire API, including unrelated endpoints like /api/v1/health.
        timeout=5,
    )
    response.raise_for_status()


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
        # Kept short deliberately: register()'s rollback of the new user row
        # on a failed send (see the docstring above) depends on this call
        # being synchronous, so it can't be moved to a background thread -
        # but that also means a slow Resend blocks a sync gunicorn worker
        # for the full timeout. With only 4 workers, a handful of concurrent
        # slow registrations at timeout=20 used to be enough to stall the
        # entire API, including unrelated endpoints like /api/v1/health.
        timeout=5,
    )
    response.raise_for_status()


@app.route('/api/v1/contact', methods=['POST'])
def contact():
    """Handle contact form submissions"""
    # Public, unauthenticated, and sends a real Resend email per request with
    # no other limit - exactly the same cost/spam vector as register() and
    # resend-verification, and without this an attacker blocked on those
    # endpoints would simply move here and burn the Resend quota, at which
    # point verification emails start failing and registration 502s for
    # everyone. Shares the same per-IP counter/limit, keyed under its own
    # endpoint name so it doesn't share a bucket with register/resend.
    if _record_signup_attempt_and_check_limit('contact'):
        return jsonify({
            'error': 'Too many requests from this network. Please try again in an hour.'
        }), 429

    data = request.get_json(silent=True)

    # Validate input
    if not data or not data.get('email') or not data.get('message'):
        return jsonify({'error': 'Email and message are required'}), 400

    name = data.get('name') or 'Ziyaretçi'
    email = data.get('email')
    subject = data.get('subject') or 'Bize Ulaşan Mesaj'
    message = data.get('message')

    try:
        send_contact_email(name, email, subject, message)
    except Exception:
        logger.exception('Contact form delivery failed')
        return jsonify({
            'error': 'Mesaj gönderilemedi. Lütfen doğrudan '
                     f'{CONTACT_TO} adresine yazın.'
        }), 502

    return jsonify({
        'success': True,
        'message': 'Mesajınız iletildi. En kısa sürede dönüş yapılacaktır.'
    }), 200


# ============================================================================
# Health & Status Routes
# ============================================================================

@app.route('/api/v1/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@app.route('/api/v1/status', methods=['GET'])
def status():
    """API status and provider availability"""
    return jsonify({
        'status': 'ok',
        'providers': {
            'openai': bool(OPENAI_API_KEY),
            'claude': bool(CLAUDE_API_KEY),
            'gemini': bool(GEMINI_API_KEY),
            'ollama': True  # Local provider
        },
        'database': 'connected'
    }), 200


# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# Main
# ============================================================================

if __name__ == '__main__':
    app.run(
        debug=os.getenv('FLASK_ENV') == 'development',
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000))
    )
