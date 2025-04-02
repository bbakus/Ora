from server.app import create_app
from server.extensions import db
from server.models.user import User
from server.models.location import Location
from server.models.collection import Collection
from server.models.review import Review
from werkzeug.security import generate_password_hash

app = create_app()

def seed_database():
    with app.app_context():
        # Create tables
        db.create_all()
        print("Tables created")
        
        # Create test user
        if not User.query.filter_by(email='test@example.com').first():
            user = User(
                username='testuser',
                email='test@example.com',
                hashed_password=generate_password_hash('password'),
                aura_color='#FF5733',
                aura_shape='circle'
            )
            db.session.add(user)
            db.session.commit()
            print("Test user created")
        else:
            print("Test user already exists")
        
        # Create a few locations
        if Location.query.count() == 0:
            locations = [
                Location(
                    name='Central Park',
                    google_place_id='ChIJ4zGFAZpYwokRGUGph3Mf37k',
                    latitude=40.7829,
                    longitude=-73.9654,
                    place_type='park',
                    address='Central Park, New York, NY',
                    rating=4.8
                ),
                Location(
                    name='Eiffel Tower',
                    google_place_id='ChIJLU7jZClu5kcR4PcOOO6p3I0',
                    latitude=48.8584,
                    longitude=2.2945,
                    place_type='tourist_attraction',
                    address='Champ de Mars, 5 Avenue Anatole France, Paris, France',
                    rating=4.6
                )
            ]
            db.session.add_all(locations)
            db.session.commit()
            print("Test locations created")
        else:
            print("Locations already exist")
            
        print("Database seeded successfully!")

if __name__ == "__main__":
    seed_database() 