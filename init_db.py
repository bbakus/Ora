from server.app import create_app
from server.extensions import db
from server.models.user import User
from server.models.location import Location
from server.models.collection import Collection
from server.models.review import Review

app = create_app()
with app.app_context():
    db.create_all()
    print("Database tables created successfully!") 