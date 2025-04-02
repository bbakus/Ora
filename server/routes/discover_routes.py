from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.location import Location
from server.models.tag import Tag
from server.models.user import User
from server.extensions import db
from sqlalchemy import func, and_
from datetime import datetime, timedelta

# NYC borough boundaries (approximate)
NYC_BOUNDS = {
    'manhattan': {
        'min_lat': 40.7000,
        'max_lat': 40.8800,
        'min_lng': -74.0200,
        'max_lng': -73.9000
    },
    'brooklyn': {
        'min_lat': 40.5700,
        'max_lat': 40.7400,
        'min_lng': -74.0200,
        'max_lng': -73.8500
    },
    'queens': {
        'min_lat': 40.7000,
        'max_lat': 40.7800,
        'min_lng': -73.9500,
        'max_lng': -73.7500
    }
}

class DiscoverLocations(Resource):
    def get(self, user_id):
        # Get user's preferences and aura
        user = User.query.get(user_id)
        if not user:
            return {"error": "User not found"}, 404

        # Get query parameters
        lat = request.args.get('latitude', type=float)
        lng = request.args.get('longitude', type=float)
        radius = request.args.get('radius', 2, type=float)  # Default 2km radius
        place_type = request.args.get('place_type')  # Optional place type filter

        if not lat or not lng:
            return {"error": "Latitude and longitude are required"}, 400

        # Get all locations within NYC bounds
        locations = []
        for borough, bounds in NYC_BOUNDS.items():
            query = Location.query.filter(
                and_(
                    Location.latitude >= bounds['min_lat'],
                    Location.latitude <= bounds['max_lat'],
                    Location.longitude >= bounds['min_lng'],
                    Location.longitude <= bounds['max_lng']
                )
            )
            
            if place_type:
                query = query.filter(Location.place_type == place_type)
                
            borough_locations = query.all()
            locations.extend(borough_locations)

        # Filter locations based on aura matching and distance
        matching_locations = []
        for location in locations:
            distance = self._calculate_distance(lat, lng, location.latitude, location.longitude)
            if distance > radius:
                continue

            # Get the location's aura
            location_aura = location.tags[0] if location.tags else None
            
            if location_aura:
                # Calculate aura similarity score (used internally for sorting only)
                similarity_score = self._calculate_aura_similarity(user.aura_color, location_aura.color)
                
                matching_locations.append({
                    'id': location.id,
                    'name': location.name,
                    'latitude': location.latitude,
                    'longitude': location.longitude,
                    'google_place_id': location.google_place_id,
                    'place_type': location.place_type,
                    'aura': {
                        'color': location_aura.color,
                        'shape': location_aura.shape
                    },
                    'distance': distance
                })

        # Sort by distance and similarity score (internal sorting only)
        matching_locations.sort(key=lambda x: (x['distance'], -self._calculate_aura_similarity(user.aura_color, x['aura']['color'])))

        return jsonify(matching_locations), 200

    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        # Simple distance calculation (you might want to use PostGIS for better accuracy)
        # This is a rough approximation
        from math import radians, sin, cos, sqrt, atan2
        R = 6371  # Earth's radius in kilometers

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        distance = R * c

        return distance

    def _calculate_aura_similarity(self, user_aura, location_aura):
        # Convert hex colors to RGB
        def hex_to_rgb(hex_color):
            hex_color = hex_color.lstrip('#')
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

        # Get RGB values
        user_rgb = hex_to_rgb(user_aura)
        location_rgb = hex_to_rgb(location_aura)

        # Calculate color similarity (simple Euclidean distance)
        similarity = sum((a - b) ** 2 for a, b in zip(user_rgb, location_rgb))
        return similarity

class UserCollections(Resource):
    def get(self, user_id):
        user = User.query.get(user_id)
        if not user:
            return {"error": "User not found"}, 404

        collections = user.collections
        return [collection.to_dict() for collection in collections], 200

class PersonalizedSuggestions(Resource):
    def get(self, user_id):
        user = User.query.get(user_id)
        if not user:
            return {"error": "User not found"}, 404

        # Get user's aura preferences
        user_aura_color = user.aura_color
        user_aura_shape = user.aura_shape

        # Get all locations with matching auras
        matching_locations = []
        for location in Location.query.all():
            if location.tags:
                location_aura = location.tags[0]
                if location_aura.color == user_aura_color and location_aura.shape == user_aura_shape:
                    matching_locations.append(location)

        # Sort by rating and number of reviews
        matching_locations.sort(key=lambda x: (x.rating or 0, len(x.reviews)), reverse=True)

        # Return top 10 matching locations
        return [location.to_dict() for location in matching_locations[:10]], 200

# Register routes
api.add_resource(DiscoverLocations, '/api/discover/locations/<int:user_id>')
api.add_resource(UserCollections, '/api/discover/collections/<int:user_id>')
api.add_resource(PersonalizedSuggestions, '/api/discover/suggestions/<int:user_id>')




