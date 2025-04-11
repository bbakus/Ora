# server/config.py
import os
from pathlib import Path

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev'
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    
    # Use DATABASE_URL environment variable if available (for production/deployment)
    # Otherwise fall back to SQLite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'sqlite:///{os.path.join(basedir, "instance", "app.db")}'
    
    # Handle special case for PostgreSQL URLs from Render (they start with 'postgres://')
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://')
    
    # Add options for handling foreign key constraints and extending timeout
    SQLALCHEMY_ENGINE_OPTIONS = {
        # Increase pool recycle time to prevent connection timeouts
        "pool_recycle": 3600,
        # Reconnect if disconnected
        "pool_pre_ping": True
    }
    
    # Add connect_timeout only for PostgreSQL connections
    if SQLALCHEMY_DATABASE_URI.startswith('postgresql://'):
        SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = {
            "connect_timeout": 30
        }
    # Add foreign_keys option only for SQLite connections
    elif SQLALCHEMY_DATABASE_URI.startswith('sqlite://'):
        SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = {
            "check_same_thread": False
        }
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Enable debugging in development
    DEBUG = os.environ.get('FLASK_DEBUG', False)