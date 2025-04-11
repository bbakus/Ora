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
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False