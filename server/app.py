from flask import Flask
from flask_cors import CORS
from server.config import Config
from server.extensions import db, migrate, api

# Import models so Flask-Migrate can detect them
from server.models.user import User
from server.models.location import Location
from server.models.collection import Collection
from server.models.review import Review
from server.models.friend_request import FriendRequest

def create_app(config_class=Config, instance_path=None):
    app = Flask(__name__, instance_path=instance_path)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Enhanced CORS configuration
    CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type"], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]}})
    
    # Import and register routes
    with app.app_context():
        from server.routes import init_app as init_routes
        from server.routes import auth_routes, location_routes, review_routes, user_routes
        
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
        
        # Initialize all modular routes through the init_app function
        init_routes(app)
    
    @app.route('/')
    def index():
        return {'message': 'Welcome to Ora API'}, 200

    @app.route('/api/test')
    def test():
        return {'status': 'ok', 'message': 'API is working'}, 200

    @app.errorhandler(404)
    def not_found_error(error):
        # If it's an OPTIONS request, handle it properly for CORS
        if request.method == 'OPTIONS':
            response = app.make_default_options_response()
            # Add CORS headers for OPTIONS requests
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
            return response
            
        # For all other requests, log details and return JSON error
        print(f"404 Error: {request.path} not found")
        print(f"Method: {request.method}")
        print(f"Headers: {dict(request.headers)}")
        print(f"Data: {request.get_data().decode('utf-8', errors='ignore')}")
        
        return {
            'error': 'Not found',
            'path': request.path
        }, 404

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001)
