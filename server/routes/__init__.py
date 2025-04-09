from server.extensions import api

# Import all route modules to ensure they are registered
from . import auth_routes
from . import location_routes
from . import review_routes
from . import collection_routes
from . import discover_routes
from . import user_routes
from . import friend_routes
from .openai import openai_routes

# Import route initialization functions
from .auth_routes import register_resources as register_auth_routes
from .user_routes import register_resources as register_user_routes
from .discover_routes import register_resources as register_discover_routes
from .collection_routes import register_resources as register_collection_routes
from .friend_routes import initialize_routes as register_friend_routes
from .openai.openai_routes import register_resources as register_openai_routes

def init_app(app):
    """Initialize all route modules with the app in one place to avoid duplicate registrations"""
    # Register all routes here in one place to avoid duplicate registrations
    register_auth_routes(api)
    register_user_routes(api)
    register_discover_routes(api)
    register_collection_routes(api)
    register_friend_routes(api)
    register_openai_routes(api)
    
    # Register routes for location_routes and review_routes if they have registration functions
    # Add them here if needed
    
    # Manually register location routes
    from .location_routes import LocationList, LocationById, LocationAura, FetchNearbyLocations
    api.add_resource(LocationList, '/api/locations')
    api.add_resource(LocationById, '/api/locations/<int:location_id>')
    api.add_resource(LocationAura, '/api/locations/<int:location_id>/aura')
    api.add_resource(FetchNearbyLocations, '/api/fetch-nearby-locations')
