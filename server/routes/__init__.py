from server.extensions import api

# Import all route modules to ensure they are registered
from . import auth_routes
from . import location_routes
from . import review_routes
from . import collection_routes
from . import discover_routes
from . import user_routes
