import os
import sys
import traceback
from pathlib import Path

# Add the project root directory to Python path
project_root = str(Path(__file__).absolute().parent)
sys.path.append(project_root)

print("==== Ora Database Reset & Reseed Script ====")
print("This script will reset your database and seed it with data from Google Places API.")
print("Warning: All existing data will be lost!")

confirmation = input("Are you sure you want to proceed? (yes/no): ")

if confirmation.lower() != 'yes':
    print("Operation cancelled.")
    sys.exit(0)

try:
    # Import necessary modules
    from server.app import create_app
    from server.extensions import db
    from server.models.location import Location
    from server.models.review import Review
    from server.models.user import User
    from server.models.collection import Collection
    import random
    from server.seed import seed_database, check_api_key, create_test_user, create_test_collection
    
    # Create app and initialize with database
    app = create_app()
    
    with app.app_context():
        print("\n1. Dropping all tables...")
        db.drop_all()
        
        print("2. Creating tables...")
        db.create_all()
        
        print("3. Checking Google API key...")
        check_api_key()
        
        print("4. Creating test user...")
        user = create_test_user()
        
        print("5. Creating test collection...")
        collection = create_test_collection(user)
        
        print("6. Fetching and adding locations from Google Places API...")
        seed_database()
        
        print("7. Running migrations to ensure schema is up to date...")
        try:
            # Ensure migrations directory exists
            from flask_migrate import upgrade
            migrations_dir = os.path.join(project_root, 'migrations')
            if not os.path.exists(migrations_dir):
                print("Initializing migrations...")
                os.system('export FLASK_APP=server.app && flask db init')
                os.system('export FLASK_APP=server.app && flask db migrate -m "Initial migration"')
            
            # Run upgrade
            upgrade()
            print("Migrations completed successfully!")
        except Exception as e:
            print(f"Error during migrations: {str(e)}")
            print("This may be normal if this is your first time running the app.")
        
except Exception as e:
    print(f"Error initializing application: {str(e)}")
    print("\nDetailed error information:")
    traceback.print_exc()
    sys.exit(1)

print("\n==== Operation completed successfully! ====")
print("Your database now has locations with data from Google Places API.")
print("You should now see the changes when running the application.") 