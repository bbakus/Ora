from flask import Flask
from flask_cors import CORS
from server.config import Config
from server.extensions import db, migrate, api

# Import models so Flask-Migrate can detect them
from server.models.user import User
from server.models.location import Location
from server.models.collection import Collection
from server.models.review import Review

def create_app(config_class=Config, instance_path=None):
    app = Flask(__name__, instance_path=instance_path)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Import and register routes
    with app.app_context():
        from server.routes import auth_routes, location_routes, review_routes, collection_routes, discover_routes, user_routes
        api.init_app(app)
        
        # Register all routes directly
        api.add_resource(location_routes.LocationList, '/api/locations')
        api.add_resource(location_routes.LocationById, '/api/locations/<int:location_id>')
        api.add_resource(location_routes.LocationAura, '/api/locations/<int:location_id>/aura')
        api.add_resource(location_routes.FetchNearbyLocations, '/api/fetch-nearby-locations')
        api.add_resource(auth_routes.SignUp, '/api/auth/signup')
        api.add_resource(auth_routes.Login, '/api/auth/login')
        api.add_resource(user_routes.UserAura, '/api/users/<user_id>/aura')
        api.add_resource(user_routes.UserData, '/api/users/<user_id>')
    
    @app.route('/')
    def index():
        return {'message': 'Welcome to Ora API'}, 200

    @app.route('/api/test')
    def test():
        return {'status': 'ok', 'message': 'API is working'}, 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001)
