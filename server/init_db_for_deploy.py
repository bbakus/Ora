#!/usr/bin/env python
import sys
import os

# Add parent directory to Python path to make 'server' a recognized module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server.app import create_app
from server.extensions import db
from flask_migrate import upgrade

def init_db():
    """Initialize the database for deployment"""
    print("Initializing database for deployment...")
    app = create_app()
    
    with app.app_context():
        try:
            # Run database migrations
            print("Running database migrations...")
            upgrade()
            
            print("Database initialization complete.")
        except Exception as e:
            print(f"Error initializing database: {e}")
            sys.exit(1)

if __name__ == "__main__":
    init_db() 