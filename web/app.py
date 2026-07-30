"""
LessToken Web App Backend - Flask API
REST API for AI text optimization with user authentication
"""

import os
import json
import logging
import secrets
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

# Local imports (will create these)
from database import init_db, get_db, db, User, OptimizationHistory
from optimizers import optimize_text_with_provider

# Initialize Flask app
app = Flask(__name__)

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

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        timeout=20,
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
        timeout=20,
    )
    response.raise_for_status()


@app.route('/api/v1/contact', methods=['POST'])
def contact():
    """Handle contact form submissions"""
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
    except Exception as e:
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
