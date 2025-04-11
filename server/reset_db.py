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
        # Step 1: Disable foreign key checks
        print("Disabling foreign key constraints...")
        try:
            db.session.execute(text('SET session_replication_role = replica;'))
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
            db.session.execute(text('SET session_replication_role = DEFAULT;'))
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