#!/usr/bin/env python
import sys
import os

# Add parent directory to Python path to make 'server' a recognized module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server.app import create_app
from server.extensions import db, migrate
from flask_migrate import upgrade, init, migrate as create_migration
from sqlalchemy.exc import OperationalError
from sqlalchemy import text, inspect

# Import all models to ensure they're registered with SQLAlchemy
from server.models.user import User
from server.models.location import Location
from server.models.collection import Collection
from server.models.review import Review
from server.models.friend_request import FriendRequest
from server.models.tag import Tag

def init_db():
    """Initialize the database for deployment"""
    print("Initializing database for deployment...")
    
    # Check if DATABASE_URL is set
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set!")
        print("Please set the DATABASE_URL environment variable to your PostgreSQL connection string.")
        sys.exit(1)
    
    # Print the database URL (with password redacted for security)
    safe_url = database_url
    if '@' in safe_url and ':' in safe_url:
        # Extract credentials part
        creds_part = safe_url.split('@')[0]
        if ':' in creds_part:
            # Replace password with asterisks
            username = creds_part.split(':')[0]
            safe_url = safe_url.replace(creds_part, f"{username}:********")
    
    print(f"Using database URL: {safe_url}")
    
    # Create app with configuration
    app = create_app()
    
    # Configure Flask-Migrate to use the root migrations directory
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    migrations_dir = os.path.join(root_dir, 'migrations')
    app.config['MIGRATION_DIR'] = migrations_dir
    
    with app.app_context():
        try:
            # Test database connection
            print("Testing database connection...")
            db.engine.connect()
            print("Database connection successful!")
            
            # Simply create all tables directly
            print("Creating all tables directly...")
            db.create_all()
            print("Tables created successfully!")
            
            # Check if migrations directory exists
            if not os.path.exists(migrations_dir):
                print(f"Migrations directory not found at {migrations_dir}. Initializing...")
                # Change to root directory before initializing
                original_dir = os.getcwd()
                os.chdir(root_dir)
                init(directory=migrations_dir)
                
                # Create initial migration
                print("Creating initial migration...")
                create_migration(message='initial migration', directory=migrations_dir)
                
                # Change back to original directory
                os.chdir(original_dir)
            else:
                print(f"Found migrations directory at {migrations_dir}")
            
            # Try to run migrations, but catch errors
            try:
                print("Running database migrations...")
                upgrade(directory=migrations_dir)
            except Exception as e:
                print(f"Warning: Error running migrations: {e}")
                print("Continuing with direct table creation as fallback...")
            
            print("Database initialization complete.")
        except OperationalError as e:
            print(f"ERROR: Could not connect to the database: {e}")
            print("Please check your DATABASE_URL environment variable and ensure your PostgreSQL database is running.")
            sys.exit(1)
        except Exception as e:
            print(f"Error initializing database: {e}")
            sys.exit(1)

if __name__ == "__main__":
    init_db() 