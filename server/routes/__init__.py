from server.extensions import api

# Import all route modules to ensure they are registered
from . import auth_routes
from . import location_routes
from . import review_routes
from . import collection_routes
from . import discover_routes
from . import user_routes
from . import friend_routes

# Initialize routes that need additional setup
from .friend_routes import initialize_routes as init_friend_routes
from .collection_routes import register_resources as init_collection_routes

def init_app(app):
    """Initialize all route modules with the app"""
    init_friend_routes(api)
    init_collection_routes(api)
