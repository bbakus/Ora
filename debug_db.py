from server.app import create_app
from server.extensions import db
from server.models.user import User
import sqlite3

app = create_app()

with app.app_context():
    # Check if tables exist
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:", tables)
    
    # Create tables if they don't exist
    db.create_all()
    print("Tables created")
    
    # Check again
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables after create_all:", tables)
    
    # Try to create a user
    try:
        if not User.query.filter_by(email='test@example.com').first():
            user = User(username='testuser', email='test@example.com')
            user.set_password('password')
            db.session.add(user)
            db.session.commit()
            print("Test user created")
        else:
            print("Test user already exists")
    except Exception as e:
        print(f"Error creating user: {e}")
    
    conn.close() 