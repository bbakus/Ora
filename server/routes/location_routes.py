from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api, db
from server.models.location import Location
from server.models.tag import Tag
from server.models.location_tag import location_tags
import requests
import os
import random  # Add this import for sample data generation
from sqlalchemy import func

# Import the analyze_place_and_create_aura function
from server.routes.discover_routes import analyze_place_and_create_aura, VIBE_TYPES, AURA_COLORS, AURA_NAMES

# Google Places API key from environment
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')

# Aura shapes and colors for testing
AURA_NAMES = ['Vibrant', 'Peaceful', 'Energizing', 'Calming', 'Inspiring', 'Healing', 'Balanced', 'Uplifting']

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

# Aura shapes based on popularity/reviews
AURA_SHAPES = ['soft', 'pulse', 'flowing', 'sparkle']
VIBE_TYPES = list(AURA_COLORS.keys())  # ['chill', 'energetic', 'formal', 'balanced']

# Define determine_shape locally
def determine_shape(avg_rating):
    """Determine the aura shape based on average rating"""
    if avg_rating <= 2.0:
        return "soft"      # 2 stars and below
    elif avg_rating <= 3.0:
        return "pulse"     # 3 stars
    elif avg_rating <= 4.0:
        return "flowing"   # 4 stars
    else:
        return "sparkle"   # 5 stars

# Simple function to create aura from reviews
def create_aura_from_reviews(reviews):
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
    
    # Decide approach: 60% diverse pairs, 40% traditional vibe colors
    use_diverse_colors = random.random() < 0.6
    
    if use_diverse_colors:
        # Use a diverse color pair for truly dynamic auras
        color_pair = random.choice(diverse_color_pairs)
        start_color, end_color = color_pair
        gradient = f"linear-gradient(45deg, {start_color}, {end_color})"
        
        # Pick a vibe type for naming
        vibe_type = random.choice(VIBE_TYPES)
    else:
        # Randomly select a vibe type
        vibe_type = random.choice(VIBE_TYPES)
        
        # Get the colors for this vibe - randomly select from the expanded palette
        color_set = random.choice(AURA_COLORS[vibe_type])
        
        # Create a gradient with distinct colors
        gradient = f"linear-gradient(45deg, {color_set['dark']}, {color_set['light']})"
    
    # Determine shape based on average rating of reviews
    if reviews and any('rating' in review for review in reviews):
        # Calculate average rating if available
        valid_reviews = [review for review in reviews if 'rating' in review]
        avg_rating = sum(review['rating'] for review in valid_reviews) / len(valid_reviews)
    else:
        # Default to lowest rating if no rating data
        avg_rating = 0
    
    # Assign shape based on rating
    if avg_rating <= 2.0:
        shape = "soft"      # 2 stars and below
    elif avg_rating <= 3.0:
        shape = "pulse"     # 3 stars
    elif avg_rating <= 4.0:
        shape = "flowing"   # 4 stars
    else:
        shape = "sparkle"   # 5 stars
    
    return {
        'name': random.choice(AURA_NAMES) + ' ' + vibe_type.capitalize(),
        'color': gradient,
        'shape': shape
    }

# Simple function to analyze place type
def analyze_place_and_create_aura(place_info):
    # Determine vibe type based on place type or name
    place_type = place_info.get('types', [])[0] if isinstance(place_info.get('types', []), list) and place_info.get('types') else ''
    name = place_info.get('name', '').lower()
    
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
    
    # Decide if we want to do cross-category color mixing (25% chance)
    do_cross_category = random.random() < 0.25
    
    if do_cross_category:
        # Pick two different vibe types based on weights
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
        # Traditional single-category approach with more randomness
        # Sometimes use weighted selection, sometimes completely random
        if random.random() < 0.7:  # 70% use weighted selection
            vibe_options = list(normalized_weights.keys())
            vibe_type = random.choices(
                vibe_options, 
                weights=[normalized_weights[vibe] for vibe in vibe_options],
                k=1
            )[0]
        else:  # 30% completely random selection
            vibe_type = random.choice(VIBE_TYPES)
            
        # Get the colors for this vibe - randomly select from the expanded palette
        color_set = random.choice(AURA_COLORS[vibe_type])
        start_color = color_set['dark']
        end_color = color_set['light']
    
    # Create a gradient with distinct colors
    gradient = f"linear-gradient(45deg, {start_color}, {end_color})"
    
    # Determine shape based on rating
    rating = place_info.get('rating', 0)
    if rating <= 2.0:
        shape = "soft"      # 2 stars and below
    elif rating <= 3.0:
        shape = "pulse"     # 3 stars
    elif rating <= 4.0:
        shape = "flowing"   # 4 stars
    else:
        shape = "sparkle"   # 5 stars
    
    return {
        'name': random.choice(AURA_NAMES) + ' ' + vibe_type.capitalize(),
        'color': gradient,
        'shape': shape
    }

class LocationList(Resource):
    def get(self):
        locations = Location.query.all()
        location_list = []
        
        for location in locations:
            # Get base location data
            location_dict = location.to_dict()
            
            # If the location doesn't have an aura already, create one using our analysis logic
            if 'aura' not in location_dict or not location_dict['aura']:
                try:
                    # Create an aura based on the location properties
                    aura_data = analyze_place_and_create_aura({
                        'name': location.name,
                        'types': [location.place_type] if location.place_type else [],
                        'rating': location.rating or 0
                    })
                    
                    # Add the aura data
                    location_dict['aura'] = aura_data
                    
                    # Create a tag if needed
                    if not location.tags:
                        aura_tag = Tag(
                            name=aura_data['name'],
                            color=aura_data['color'],
                            shape=aura_data['shape']
                        )
                        db.session.add(aura_tag)
                        db.session.flush()
                        location.tags.append(aura_tag)
                        db.session.commit()
                except Exception as e:
                    print(f"Error creating aura for location {location.id}: {e}")
                    # Fallback to default aura
                    location_dict['aura'] = {
                        'name': 'Balanced Neutral',
                        'color': 'linear-gradient(to right, #009688, #80CBC4)',
                        'shape': determine_shape(location.rating or 3.0)
                    }
            
            # Add to our response list
            location_list.append(location_dict)
        
        return location_list, 200

    def post(self):
        data = request.get_json()
        location = Location(
            name=data['name'],
            google_place_id=data['google_place_id'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            place_type=data['place_type'],
            address=data.get('address'),
            rating=data.get('rating')
        )
        db.session.add(location)
        db.session.commit()
        return location.to_dict(), 201

class LocationById(Resource):
    def get(self, location_id):
        location = Location.query.get_or_404(location_id)
        return location.to_dict(), 200

    def patch(self, location_id):
        location = Location.query.get_or_404(location_id)
        data = request.get_json()
        
        for field in ['name', 'google_place_id', 'latitude', 'longitude', 'place_type', 'address', 'rating']:
            if field in data:
                setattr(location, field, data[field])
        
        db.session.commit()
        return location.to_dict(), 200

    def delete(self, location_id):
        location = Location.query.get_or_404(location_id)
        db.session.delete(location)
        db.session.commit()
        return '', 204

class LocationAura(Resource):
    def post(self, location_id):
        """Analyze a location and assign an aura"""
        location = Location.query.get_or_404(location_id)
        
        # Get reviews from the request if available
        data = request.get_json() or {}
        reviews = data.get('reviews', [])
        
        # Create aura from reviews
        aura_data = create_aura_from_reviews(reviews)
        
        # Create a new Tag object
        aura_tag = Tag(
            name=aura_data['name'],
            color=aura_data['color'],
            shape=aura_data['shape']
        )
        
        # Add the tag to the location
        db.session.add(aura_tag)
        db.session.flush()  # Get the ID of the new tag
        
        # Remove any existing tags (we're replacing them)
        location.tags = []
        location.tags.append(aura_tag)
        
        db.session.commit()
        
        return {
            'location_id': location.id,
            'aura': aura_data
        }, 200

class FetchNearbyLocations(Resource):
    def get(self):
        """
        Fetch nearby locations from Google Places API, analyze, and store with auras
        
        Query parameters:
        - latitude: User's latitude
        - longitude: User's longitude
        - radius: Search radius in meters
        - place_type: Type of place to search for (optional)
        """
        try:
            latitude = request.args.get('latitude', type=float)
            longitude = request.args.get('longitude', type=float)
            radius = request.args.get('radius', default=5000, type=int)
            place_type = request.args.get('place_type')
            
            print(f"Received request for locations at lat={latitude}, lng={longitude}, radius={radius}, type={place_type}")
            
            if not latitude or not longitude:
                print("ERROR: Latitude and longitude are required")
                return {"error": "Latitude and longitude are required"}, 400
            
            # Force using sample data in development for consistency
            use_sample_data = os.environ.get('FLASK_ENV') == 'development'
            
            if not GOOGLE_PLACES_API_KEY:
                print("WARNING: Google Places API key not configured")
                use_sample_data = True
            
            if use_sample_data:
                print("USING SAMPLE DATA: Returning predefined locations")
                return self.get_sample_locations(latitude, longitude), 200
            
            # Build the Google Places API URL
            url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            params = {
                "location": f"{latitude},{longitude}",
                "radius": radius,
                "key": GOOGLE_PLACES_API_KEY
            }
            
            # Add place type if specified
            if place_type:
                params["type"] = place_type
            
            print(f"Querying Google Places API with params: {params}")
            print(f"Full URL: {url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
            
            # Make the request to Google Places API
            try:
                response = requests.get(url, params=params)
                print(f"Google Places API response status: {response.status_code}")
                response.raise_for_status()
                places_data = response.json()
                
                print(f"Google Places API response: {places_data.get('status')}")
                if places_data.get('status') != 'OK':
                    print(f"Google Places API error: {places_data.get('status')}")
                    print(f"Error message: {places_data.get('error_message', 'No error message')}")
                    # Return sample data instead of error
                    return self.get_sample_locations(latitude, longitude), 200
                
                # Process each place
                results = []
                for place in places_data.get('results', []):
                    try:
                        # Extract place data
                        print(f"Processing place: {place.get('name')} ({place.get('place_id')})")
                        
                        # Check if we already have this location
                        existing_location = Location.query.filter_by(
                            google_place_id=place.get('place_id')
                        ).first()
                        
                        if existing_location:
                            # Use existing location, just update coordinates
                            location = existing_location
                            location.latitude = place.get('geometry', {}).get('location', {}).get('lat')
                            location.longitude = place.get('geometry', {}).get('location', {}).get('lng')
                        else:
                            # Create new location
                            location = Location(
                                name=place.get('name'),
                                google_place_id=place.get('place_id'),
                                latitude=place.get('geometry', {}).get('location', {}).get('lat'),
                                longitude=place.get('geometry', {}).get('location', {}).get('lng'),
                                place_type=place.get('types', [])[0] if place.get('types') else None,
                                address=place.get('vicinity'),
                                rating=place.get('rating')
                            )
                            db.session.add(location)
                            db.session.flush()  # Get ID before creating aura
                        
                        # Get place details for reviews if location has no aura
                        if not location.tags:
                            # Create placeholder aura from location name and type
                            aura_data = analyze_place_and_create_aura({
                                'name': location.name,
                                'types': [location.place_type] if location.place_type else [],
                                'rating': location.rating
                            })
                            
                            # Create a new Tag object
                            aura_tag = Tag(
                                name=aura_data['name'],
                                color=aura_data['color'],
                                shape=aura_data['shape']
                            )
                            
                            # Add the tag to the location
                            db.session.add(aura_tag)
                            db.session.flush()
                            location.tags.append(aura_tag)
                        
                        # Add to results
                        results.append({
                            'id': location.id,
                            'name': location.name,
                            'google_place_id': location.google_place_id,
                            'latitude': location.latitude,
                            'longitude': location.longitude,
                            'place_type': location.place_type,
                            'address': location.address,
                            'rating': location.rating,
                            'aura': {
                                'name': location.tags[0].name if location.tags else "Unknown",
                                'color': location.tags[0].color if location.tags else "#8864fe",
                                'shape': location.tags[0].shape if location.tags else "balanced"
                            }
                        })
                        
                    except Exception as e:
                        print(f"Error processing place {place.get('name')}: {e}")
                        continue
                
                # Commit all changes
                db.session.commit()
                
                print(f"Returning {len(results)} locations")
                if len(results) == 0:
                    print("No results found, returning sample data")
                    return self.get_sample_locations(latitude, longitude), 200
                    
                return results, 200
                
            except Exception as e:
                print(f"Error fetching from Google Places API: {e}")
                # Return sample data on API error
                return self.get_sample_locations(latitude, longitude), 200
                
        except Exception as e:
            db.session.rollback()
            print(f"Error in fetch-nearby-locations endpoint: {e}")
            # Return sample data on any error
            return self.get_sample_locations(latitude, longitude), 200
    
    

# DO NOT add register_resources function here - routes are registered directly in app.py
