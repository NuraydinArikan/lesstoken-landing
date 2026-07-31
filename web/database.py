"""
Database models and initialization for LessToken Web App
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import declarative_base

# Initialize SQLAlchemy
db = SQLAlchemy()

# ============================================================================
# Database Models
# ============================================================================

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


class OptimizationHistory(db.Model):
    """User optimization history"""
    __tablename__ = 'optimization_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    input_text = db.Column(db.Text, nullable=False)
    output_text = db.Column(db.Text, nullable=False)
    provider = db.Column(db.String(50), nullable=False)  # openai, claude, gemini, ollama
    style = db.Column(db.String(50), default='general')  # general, technical, marketing, academic
    input_tokens = db.Column(db.Integer, default=0)
    output_tokens = db.Column(db.Integer, default=0)
    reduction_percent = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'input': self.input_text[:200],  # Preview
            'output': self.output_text[:200],
            'provider': self.provider,
            'style': self.style,
            'reduction': self.reduction_percent,
            'inputTokens': self.input_tokens,
            'outputTokens': self.output_tokens,
            'timestamp': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<Optimization {self.id} by User {self.user_id}>'


class SignupAttempt(db.Model):
    """Per-IP rate-limit counter for public, unauthenticated signup-adjacent
    endpoints (register, resend-verification).

    Only a salted hash of the client's IP is ever stored - never the raw
    address - and rows are pruned once they're more than 24h old, so the
    IP is genuinely unrecoverable and the table stays small. `endpoint` keeps
    register and resend-verification counted separately. Counted from the
    database rather than an in-memory counter, same reasoning as
    OptimizationHistory / DAILY_OPTIMIZE_LIMIT: gunicorn runs 4 worker
    processes that don't share memory.
    """
    __tablename__ = 'signup_attempts'

    id = db.Column(db.Integer, primary_key=True)
    ip_hash = db.Column(db.String(64), nullable=False, index=True)
    endpoint = db.Column(db.String(50), nullable=False)
    # NOT NULL matters here specifically: a NULL created_at is neither
    # counted (`>= window_start` is NULL, not true) nor pruned (`< cutoff` is
    # NULL, not true) by the queries in app.py - it would leak permanently,
    # uncounted and unremovable, defeating both the rate limit and the
    # retention window.
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f'<SignupAttempt {self.endpoint} {self.ip_hash[:8]}...>'


class UserSettings(db.Model):
    """User preferences and settings"""
    __tablename__ = 'user_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    preferred_provider = db.Column(db.String(50), default='openai')
    preferred_style = db.Column(db.String(50), default='general')
    notifications_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'preferredProvider': self.preferred_provider,
            'preferredStyle': self.preferred_style,
            'notificationsEnabled': self.notifications_enabled
        }

    def __repr__(self):
        return f'<UserSettings for User {self.user_id}>'


# ============================================================================
# Database Initialization
# ============================================================================

def init_db(app):
    """Initialize database with Flask app.

    Schema creation/migration is Alembic's job (`flask db upgrade`, which the
    Dockerfile runs before gunicorn starts). Calling db.create_all() here used
    to race with that: on a brand-new database it would create the users
    table with the current model's columns (including the email-verification
    ones) before Alembic ever ran, so the migration that adds those same
    columns would then collide with them (CircularDependencyError on SQLite,
    DuplicateColumn on Postgres), crash-looping the container on any fresh
    database. Alembic's migration history already covers the full schema, so
    it creates everything correctly on an empty database on its own.
    """
    db.init_app(app)


def get_db():
    """Get database session"""
    return db.session


def reset_db(app):
    """DANGEROUS: Reset entire database (development only)"""
    with app.app_context():
        db.drop_all()
        db.create_all()
        print('⚠️  Database reset (all data deleted)')
