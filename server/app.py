from flask import Flask
from flask_cors import CORS
from server.config import Config
from server.extensions import db, migrate, api

# Import models so Flask-Migrate can detect them
from server.models.user import User
from server.models.location import Location
from server.models.collection import Collection
from server.models.review import Review

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Import and register routes
    with app.app_context():
        from server.routes import auth_routes, location_routes, review_routes, collection_routes, discover_routes, user_routes
        api.init_app(app)
    
    @app.route('/')
    def index():
        return {'message': 'Welcome to Ora API'}, 200

    return app
