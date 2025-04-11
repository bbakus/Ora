#!/usr/bin/env python
import sys
import os
import time

# Add parent directory to Python path to make 'server' a recognized module
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from server.app import create_app
from server.extensions import db
from server.models.user import User
from server.models.location import Location
from server.models.collection import Collection
from server.models.review import Review
from server.models.friend_request import FriendRequest
from server.models.tag import Tag
from sqlalchemy import text

def reset_database():
    """Reset database completely and set up tables in correct order"""
    print("Resetting database...")
    
    app = create_app()
    
    with app.app_context():
        # Detect database type
        is_postgres = False
        try:
            # Get the database URL from app config
            db_url = app.config['SQLALCHEMY_DATABASE_URI'].lower()
            
            if 'postgresql' in db_url or 'postgres' in db_url:
                is_postgres = True
                print("Detected PostgreSQL database")
            elif 'sqlite' in db_url:
                print("Detected SQLite database")
            else:
                # Fallback to querying the database
                try:
                    result = db.session.execute(text("SELECT version();")).scalar()
                    if result and "postgresql" in result.lower():
                        is_postgres = True
                        print("Detected PostgreSQL database via version query")
                    else:
                        print("Detected non-PostgreSQL database via version query")
                except Exception:
                    print("Could not detect database type via version query. Assuming SQLite.")
        except Exception as e:
            # Fallback - if can't detect, assume SQLite
            print(f"Could not detect database type from URL: {e}. Assuming SQLite.")
        
        # Step 1: Disable foreign key checks
        print("Disabling foreign key constraints...")
        try:
            if is_postgres:
                # For PostgreSQL, use transaction-level disable of constraints
                # This approach avoids needing superuser privileges
                db.session.execute(text('SET CONSTRAINTS ALL DEFERRED;'))
            else:
                # For SQLite
                db.session.execute(text('PRAGMA foreign_keys = OFF;'))
            print("Foreign key constraints disabled.")
        except Exception as e:
            print(f"Warning: Could not disable foreign key checks: {e}")
        
        # Step 2: Drop all tables
        try:
            print("Dropping all tables...")
            db.drop_all()
            print("All tables dropped.")
        except Exception as e:
            print(f"Error dropping tables: {e}")
        
        # Step 3: Create tables in specific order
        tables_to_create = [
            User.__table__,
            Location.__table__,
            Tag.__table__,
            Collection.__table__,
            Review.__table__,
            FriendRequest.__table__
        ]
        
        print("Creating tables in specific order...")
        for table in tables_to_create:
            try:
                table.create(db.engine)
                print(f"Created table: {table.name}")
                time.sleep(0.5)  # Small delay to avoid race conditions
            except Exception as e:
                print(f"Error creating table {table.name}: {e}")
        
        # Step 4: Re-enable foreign key checks
        print("Re-enabling foreign key constraints...")
        try:
            if is_postgres:
                # For PostgreSQL, constraints will be checked at commit time
                # No need to explicitly re-enable
                pass
            else:
                # For SQLite
                db.session.execute(text('PRAGMA foreign_keys = ON;'))
            print("Foreign key constraints re-enabled.")
        except Exception as e:
            print(f"Warning: Could not re-enable foreign key checks: {e}")
        
        # Step 5: Commit session
        db.session.commit()
        print("Database reset complete!")
        
        # Try creating a test user
        try:
            test_user = User(
                username="testuser",
                email="test@example.com"
            )
            test_user.set_password("password123")
            
            db.session.add(test_user)
            db.session.commit()
            print("Test user created successfully!")
        except Exception as e:
            print(f"Error creating test user: {e}")
            db.session.rollback()

if __name__ == "__main__":
    reset_database() 