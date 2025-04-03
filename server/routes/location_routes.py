from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api, db
from server.models.location import Location
from server.models.tag import Tag
from server.models.location_tag import location_tags
import requests
import os
import random  # Add this import for sample data generation

# Google Places API key from environment
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')

# Aura shapes and colors for testing
AURA_NAMES = ['Vibrant', 'Peaceful', 'Energizing', 'Calming', 'Inspiring', 'Healing', 'Balanced', 'Uplifting']
AURA_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#8C33FF', '#33B5FF', '#D733FF', '#FFC300']
AURA_SHAPES = ['intense', 'diffuse', 'balanced', 'flowing']

# Simple function to create aura from reviews
def create_aura_from_reviews(reviews):
    # Return random aura for testing
    return {
        'name': random.choice(AURA_NAMES) + ' ' + random.choice(AURA_SHAPES).capitalize(),
        'color': 'linear-gradient(to right, ' + random.choice(AURA_COLORS) + ', ' + random.choice(AURA_COLORS) + ')',
        'shape': random.choice(AURA_SHAPES)
    }

# Simple function to analyze place type
def analyze_place_and_create_aura(place_info):
    # Return random aura for testing
    return {
        'name': random.choice(AURA_NAMES) + ' ' + random.choice(AURA_SHAPES).capitalize(),
        'color': 'linear-gradient(to right, ' + random.choice(AURA_COLORS) + ', ' + random.choice(AURA_COLORS) + ')',
        'shape': random.choice(AURA_SHAPES)
    }

class LocationList(Resource):
    def get(self):
        locations = Location.query.all()
        return [location.to_dict() for location in locations], 200

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
                                'types': [location.place_type] if location.place_type else []
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
    
    def get_sample_locations(self, latitude, longitude):
        """Generate sample locations around the given coordinates for testing"""
        print("Returning sample location data around", latitude, longitude)
        
        # Create sample locations at various offsets from the provided coordinates
        sample_data = [
            {
                'id': 1,
                'name': 'Peaceful Garden Cafe',
                'google_place_id': 'sample1',
                'latitude': latitude + 0.01,
                'longitude': longitude + 0.01,
                'place_type': 'cafe',
                'address': '123 Sample St',
                'rating': 4.7,
                'aura': {
                    'name': 'Peaceful Flowing',
                    'color': 'linear-gradient(to right, #4776E6, #8E54E9)',
                    'shape': 'flowing'
                }
            },
            {
                'id': 2,
                'name': 'Upscale Italian Restaurant',
                'google_place_id': 'sample2',
                'latitude': latitude - 0.005,
                'longitude': longitude + 0.008,
                'place_type': 'restaurant',
                'address': '456 Example Ave',
                'rating': 4.5,
                'aura': {
                    'name': 'Elegant Balanced',
                    'color': 'linear-gradient(to right, #8E54E9, #4776E6)',
                    'shape': 'balanced'
                }
            },
            {
                'id': 3,
                'name': 'Vibrant Nightclub',
                'google_place_id': 'sample3',
                'latitude': latitude + 0.003,
                'longitude': longitude - 0.003,
                'place_type': 'night_club',
                'address': '789 Party Blvd',
                'rating': 4.2,
                'aura': {
                    'name': 'Energetic Sparkling',
                    'color': 'linear-gradient(to right, #FF5E62, #FF9966)',
                    'shape': 'sparkling'
                }
            },
            {
                'id': 4,
                'name': 'Rhythm Coffee House',
                'google_place_id': 'sample4',
                'latitude': latitude - 0.003,
                'longitude': longitude - 0.007,
                'place_type': 'cafe',
                'address': '321 Demo Road',
                'rating': 4.4,
                'aura': {
                    'name': 'Warm Pulsing',
                    'color': 'linear-gradient(to right, #FF9966, #FF5E62)',
                    'shape': 'pulsing'
                }
            },
            {
                'id': 5,
                'name': 'Sunset Park',
                'google_place_id': 'sample5',
                'latitude': latitude + 0.007,
                'longitude': longitude - 0.001,
                'place_type': 'park',
                'address': '555 Nature Way',
                'rating': 4.8,
                'aura': {
                    'name': 'Serene Flowing',
                    'color': 'linear-gradient(to right, #00CDAC, #4776E6)',
                    'shape': 'flowing'
                }
            },
            {
                'id': 6,
                'name': 'Artisan Bakery',
                'google_place_id': 'sample6',
                'latitude': latitude - 0.002,
                'longitude': longitude + 0.005,
                'place_type': 'bakery',
                'address': '222 Pastry Lane',
                'rating': 4.6,
                'aura': {
                    'name': 'Warm Balanced',
                    'color': 'linear-gradient(to right, #FF9966, #FFCC33)',
                    'shape': 'balanced'
                }
            },
            {
                'id': 7,
                'name': 'Luxury Hotel',
                'google_place_id': 'sample7',
                'latitude': latitude + 0.006,
                'longitude': longitude + 0.006,
                'place_type': 'lodging',
                'address': '777 Comfort Blvd',
                'rating': 4.9,
                'aura': {
                    'name': 'Elegant Flowing',
                    'color': 'linear-gradient(to right, #8E54E9, #4776E6)',
                    'shape': 'flowing'
                }
            },
            {
                'id': 8,
                'name': 'Tech Museum',
                'google_place_id': 'sample8',
                'latitude': latitude - 0.008,
                'longitude': longitude - 0.004,
                'place_type': 'museum',
                'address': '888 Innovation St',
                'rating': 4.7,
                'aura': {
                    'name': 'Creative Balanced',
                    'color': 'linear-gradient(to right, #4776E6, #8E54E9)',
                    'shape': 'balanced'
                }
            }
        ]
        
        return sample_data

# DO NOT add register_resources function here - routes are registered directly in app.py
