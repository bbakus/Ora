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
AURA_NAMES = {
    'chill': ['Peaceful', 'Calming', 'Serene', 'Tranquil', 'Relaxed'],
    'energetic': ['Vibrant', 'Dynamic', 'Energetic', 'Lively', 'Electric'],
    'formal': ['Elegant', 'Sophisticated', 'Refined', 'Polished', 'Classic'],
    'balanced': ['Balanced', 'Harmonious', 'Uplifting', 'Inspiring', 'Well-rounded']
}

AURA_SHAPES = ['soft', 'pulse', 'flowing', 'sparkle']  # Based on popularity/review count

# More distinct aura colors for each vibe type
AURA_COLORS = {
    'chill': [
        {'light': '#66B2FF', 'dark': '#0066CC'},  # Blue
        {'light': '#A3CFEC', 'dark': '#4A89DC'},  # Light blue
        {'light': '#98D8C8', 'dark': '#45B7AF'},  # Teal blue
        {'light': '#BFDFFF', 'dark': '#3498DB'}   # Sky blue
    ],
    'energetic': [
        {'light': '#FFFF66', 'dark': '#CCCC00'},  # Yellow
        {'light': '#FFA726', 'dark': '#E67E22'},  # Orange
        {'light': '#FF5252', 'dark': '#D32F2F'},  # Red
        {'light': '#FF8A80', 'dark': '#FF5252'}   # Coral
    ],
    'formal': [
        {'light': '#CC99FF', 'dark': '#6600CC'},  # Purple
        {'light': '#9575CD', 'dark': '#5E35B1'},  # Deep purple
        {'light': '#BA68C8', 'dark': '#7B1FA2'},  # Magenta
        {'light': '#D1C4E9', 'dark': '#7E57C2'}   # Lavender
    ],
    'balanced': [
        {'light': '#99FFFF', 'dark': '#00CCCC'},  # Cyan
        {'light': '#80CBC4', 'dark': '#009688'},  # Teal
        {'light': '#AED581', 'dark': '#7CB342'},  # Light green
        {'light': '#B2DFDB', 'dark': '#26A69A'}   # Seafoam
    ]
}

VIBE_TYPES = list(AURA_COLORS.keys())  # ['chill', 'energetic', 'formal', 'balanced']

# Simple function to analyze place type
def analyze_place_and_create_aura(place_info):
    # Determine vibe type based on place type or name
    if isinstance(place_info, str):
        name = place_info.lower()
        place_type = ""
        rating = 0  # Default rating when only name is provided
    else:
        place_type = place_info.get('types', [])[0] if isinstance(place_info.get('types', []), list) and place_info.get('types') else ''
        name = place_info.get('name', '').lower()
        rating = place_info.get('rating', 0)
    
    # Try to match place type to a vibe
    if place_type in ['restaurant', 'bar', 'night_club']:
        # More likely to be energetic
        vibe_weights = {'chill': 0.1, 'energetic': 0.6, 'formal': 0.2, 'balanced': 0.1}
    elif place_type in ['cafe', 'bakery', 'book_store']:
        # More likely to be chill
        vibe_weights = {'chill': 0.6, 'energetic': 0.1, 'formal': 0.1, 'balanced': 0.2}
    elif place_type in ['art_gallery', 'museum']:
        # More likely to be formal
        vibe_weights = {'chill': 0.2, 'energetic': 0.0, 'formal': 0.7, 'balanced': 0.1}
    elif place_type in ['park', 'shopping_mall']:
        # More likely to be balanced
        vibe_weights = {'chill': 0.2, 'energetic': 0.2, 'formal': 0.0, 'balanced': 0.6}
    else:
        # Default, evenly distributed
        vibe_weights = {'chill': 0.25, 'energetic': 0.25, 'formal': 0.25, 'balanced': 0.25}
    
    # Adjust based on name keywords
    if any(keyword in name for keyword in ['lounge', 'quiet', 'relax', 'spa', 'calm']):
        vibe_weights['chill'] += 0.2
    if any(keyword in name for keyword in ['party', 'club', 'bar', 'pub', 'tavern']):
        vibe_weights['energetic'] += 0.2
    if any(keyword in name for keyword in ['luxury', 'gourmet', 'fine', 'elegant']):
        vibe_weights['formal'] += 0.2
    if any(keyword in name for keyword in ['cafe', 'coffee', 'bistro', 'casual']):
        vibe_weights['balanced'] += 0.2
    
    # Normalize weights
    total = sum(vibe_weights.values())
    normalized_weights = {k: v/total for k, v in vibe_weights.items()}
    
    # Define diverse color pairs for truly contrasting gradients
    diverse_color_pairs = [
        ('#FF5252', '#26A69A'),  # Red + Teal
        ('#FF9800', '#3F51B5'),  # Orange + Indigo
        ('#FFEB3B', '#673AB7'),  # Yellow + Deep Purple
        ('#4CAF50', '#9C27B0'),  # Green + Purple
        ('#009688', '#E91E63'),  # Teal + Pink
        ('#2196F3', '#FF9800'),  # Blue + Orange
        ('#3F51B5', '#FFC107'),  # Indigo + Amber
        ('#9C27B0', '#CDDC39'),  # Purple + Lime
        ('#795548', '#00BCD4'),  # Brown + Cyan
        ('#607D8B', '#FFEB3B')   # Blue Grey + Yellow
    ]
    
    # Decide approach: 50% diverse color pairs, 25% cross-category, 25% traditional
    approach = random.random()
    
    if approach < 0.5:
        # Use a diverse color pair for truly contrasting gradients
        color_pair = random.choice(diverse_color_pairs)
        start_color, end_color = color_pair
        vibe_type = max(normalized_weights.items(), key=lambda x: x[1])[0]
    elif approach < 0.75:
        # Cross-category mixing (similar to original code)
        vibe_options = list(normalized_weights.keys())
        weights = [normalized_weights[vibe] for vibe in vibe_options]
        
        # Select primary vibe type
        primary_vibe = random.choices(vibe_options, weights=weights, k=1)[0]
        
        # For secondary vibe, adjust weights to discourage the same category
        sec_weights = weights.copy()
        primary_index = vibe_options.index(primary_vibe)
        sec_weights[primary_index] *= 0.3  # Reduce chance of selecting the same category
        
        # Renormalize secondary weights
        total_sec = sum(sec_weights)
        sec_weights = [w/total_sec for w in sec_weights]
        
        # Select secondary vibe type
        secondary_vibe = random.choices(vibe_options, weights=sec_weights, k=1)[0]
        
        # Get a color from each vibe's palette
        primary_color_set = random.choice(AURA_COLORS[primary_vibe])
        secondary_color_set = random.choice(AURA_COLORS[secondary_vibe])
        
        # Mix the colors from different categories (use dark from one, light from another)
        if random.random() < 0.5:
            start_color = primary_color_set['dark']
            end_color = secondary_color_set['light']
        else:
            start_color = secondary_color_set['dark']
            end_color = primary_color_set['light']
            
        # For naming, use the primary vibe
        vibe_type = primary_vibe
    else:
        # Traditional single-category approach
        vibe_options = list(normalized_weights.keys())
        vibe_type = random.choices(
            vibe_options, 
            weights=[normalized_weights[vibe] for vibe in vibe_options],
            k=1
        )[0]
            
        # Get the colors for this vibe
        color_set = random.choice(AURA_COLORS[vibe_type])
        start_color = color_set['dark']
        end_color = color_set['light']
    
    # Create a gradient with distinct colors
    gradient = f"linear-gradient(45deg, {start_color}, {end_color})"
    
    # Determine shape based on rating
    if rating <= 2.0:
        shape = "soft"      # 2 stars and below
    elif rating <= 3.0:
        shape = "pulse"     # 3 stars
    elif rating <= 4.0:
        shape = "flowing"   # 4 stars
    else:
        shape = "sparkle"   # 5 stars
    
    # Select a name based on the vibe type
    name = random.choice(AURA_NAMES[vibe_type]) + ' ' + vibe_type.capitalize()
    
    return {
        'name': name,
        'color': gradient,
        'shape': shape
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
                    aura_data = analyze_place_and_create_aura({
                        'name': location.name,
                        'types': [location.place_type] if location.place_type else [],
                        'rating': location.rating or 0
                    })
                    
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




