from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.location import Location
from server.models.tag import Tag
from server.models.user import User
from server.extensions import db
from sqlalchemy import func, and_
from datetime import datetime, timedelta
import re
from server.models.location_tag import location_tags
import math
import os
import random

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

# Google Places API key from environment
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')

# Aura shapes and colors for testing
AURA_NAMES = ['Vibrant', 'Peaceful', 'Energizing', 'Calming', 'Inspiring', 'Healing', 'Balanced', 'Uplifting']
AURA_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#8C33FF', '#33B5FF', '#D733FF', '#FFC300']
AURA_SHAPES = ['intense', 'diffuse', 'balanced', 'flowing']

# Simple function to analyze place type
def analyze_place_and_create_aura(place_info):
    # Return random aura for testing
    return {
        'name': random.choice(AURA_NAMES) + ' ' + random.choice(AURA_SHAPES).capitalize(),
        'color': 'linear-gradient(to right, ' + random.choice(AURA_COLORS) + ', ' + random.choice(AURA_COLORS) + ')',
        'shape': random.choice(AURA_SHAPES)
    }

class DiscoverLocations(Resource):
    def get(self):
        user_id = request.args.get('user_id', type=int)
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        radius = request.args.get('radius', type=int, default=5000)  # Default 5km
        place_type = request.args.get('place_type')
        
        # Validate required parameters
        if not all([latitude, longitude]):
            return {"error": "Missing required parameters (latitude, longitude)"}, 400
        
        # Get user preferences if user_id is provided
        user_preferences = None
        if user_id:
            user = User.query.get(user_id)
            if user:
                # Assuming user.preferences contains aura preferences
                user_preferences = user.preferences
        
        # Query locations
        query = Location.query
        
        # Filter by place type if provided
        if place_type:
            query = query.filter(Location.place_type == place_type)
        
        # Get all locations (we'll filter by distance later)
        all_locations = query.all()
        
        # Filter locations within radius and calculate distance
        locations_in_radius = []
        for location in all_locations:
            # Calculate distance using Haversine formula
            distance = self.calculate_distance(
                latitude, longitude,
                location.latitude, location.longitude
            )
            
            # Only include locations within the specified radius
            if distance <= radius:
                location_dict = location.to_dict()
                location_dict['distance'] = distance
                
                # Add aura information
                if location.tags:
                    # Use the first tag as the aura
                    aura_tag = location.tags[0]
                    location_dict['aura'] = {
                        'name': aura_tag.name,
                        'color': aura_tag.color,
                        'shape': aura_tag.shape
                    }
                else:
                    # If no aura exists, create one based on available data
                    aura_data = analyze_place_and_create_aura(location.name)
                    
                    # Create a new Tag object
                    aura_tag = Tag(
                        name=aura_data['name'],
                        color=aura_data['color'],
                        shape=aura_data['shape']
                    )
                    
                    # Save the tag and associate with location
                    db.session.add(aura_tag)
                    db.session.flush()
                    location.tags.append(aura_tag)
                    db.session.commit()
                    
                    location_dict['aura'] = aura_data
                
                locations_in_radius.append(location_dict)
        
        # If user preferences exist, calculate aura match score and sort
        if user_preferences and 'aura' in user_preferences:
            user_aura = user_preferences['aura']
            
            for location in locations_in_radius:
                if 'aura' in location:
                    # Calculate similarity between user's aura and location's aura
                    similarity = self.calculate_aura_similarity(user_aura, location['aura'])
                    location['aura_match'] = similarity
            
            # Sort by aura match (highest match first)
            locations_in_radius.sort(key=lambda x: x.get('aura_match', 0), reverse=True)
        else:
            # No user preferences, sort by distance
            locations_in_radius.sort(key=lambda x: x['distance'])
        
        return locations_in_radius, 200
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate the great circle distance between two points
        on the earth (specified in decimal degrees)
        """
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Radius of earth in kilometers
        return c * r * 1000  # Convert to meters
    
    def calculate_aura_similarity(self, aura1, aura2):
        """
        Calculate similarity between two auras
        Returns a value between 0 and 1, where 1 is a perfect match
        """
        # Simple comparison based on aura name
        if aura1.get('name') == aura2.get('name'):
            return 1.0
        
        # Color comparison - convert hex to RGB and calculate difference
        color1 = aura1.get('color', '#000000')
        color2 = aura2.get('color', '#000000')
        
        # Handle gradient colors by extracting first color
        if 'gradient' in color1:
            color1 = color1.split('#')[1].split(',')[0]
            color1 = f"#{color1}"
        if 'gradient' in color2:
            color2 = color2.split('#')[1].split(',')[0]
            color2 = f"#{color2}"
            
        # Convert hex to RGB
        r1, g1, b1 = int(color1[1:3], 16), int(color1[3:5], 16), int(color1[5:7], 16)
        r2, g2, b2 = int(color2[1:3], 16), int(color2[3:5], 16), int(color2[5:7], 16)
        
        # Calculate color difference (Euclidean distance)
        color_diff = math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
        max_diff = math.sqrt(3 * 255**2)  # Maximum possible difference
        color_similarity = 1 - (color_diff / max_diff)
        
        # Shape comparison
        shape_similarity = 1.0 if aura1.get('shape') == aura2.get('shape') else 0.5
        
        # Combine similarities (weighted average)
        return 0.6 * color_similarity + 0.4 * shape_similarity

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
def register_resources(api):
    api.add_resource(DiscoverLocations, '/api/discover/locations')
    api.add_resource(UserCollections, '/api/discover/collections/<int:user_id>')
    api.add_resource(PersonalizedSuggestions, '/api/discover/suggestions/<int:user_id>')




