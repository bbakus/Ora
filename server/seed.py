import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent.absolute())
sys.path.append(project_root)

# Set the instance path explicitly
instance_path = os.path.join(project_root, 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)

# Load environment variables
load_dotenv()

from server.app import create_app
from server.extensions import db
from server.models.location import Location
from server.models.tag import Tag
from server.models.review import Review
from server.models.user import User
from server.models.collection import Collection
import googlemaps
import os
from datetime import datetime
import random
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.sentiment import SentimentIntensityAnalyzer
import numpy as np
from PIL import Image, ImageDraw
import io

import ssl
import certifi

ssl._create_default_https_context = ssl._create_unverified_context

# Create the app instance with explicit instance path
app = create_app(instance_path=instance_path)
app.app_context().push()  # Push an application context

# Download required NLTK data
nltk.download('punkt_tab')
nltk.download('stopwords')
nltk.download('vader_lexicon')

# Initialize Google Maps client
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
if not GOOGLE_MAPS_API_KEY:
    raise ValueError("GOOGLE_MAPS_API_KEY environment variable is required")

gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

# Test mode settings
TEST_MODE = False  # Set to False for full data import
MAX_LOCATIONS_PER_TYPE = 50  # Increase from 15 to 50 locations per type per area
MAX_REVIEWS_PER_LOCATION = 10  # Maximum reviews to import per location

# NYC boroughs and their centers - Add more neighborhoods
NYC_AREAS = [
    {
        'name': 'Manhattan',
        'center': (40.7831, -73.9712),
        'radius': 5000  # 5km radius
    },
    {
        'name': 'Brooklyn',
        'center': (40.6782, -73.9442),
        'radius': 5000
    },
    {
        'name': 'Queens',
        'center': (40.7282, -73.7949),
        'radius': 5000
    },
    # Add more specific neighborhoods for variety
    {
        'name': 'East Village',
        'center': (40.7265, -73.9815),
        'radius': 1500
    },
    {
        'name': 'West Village',
        'center': (40.7347, -74.0067),
        'radius': 1500
    },
    {
        'name': 'Upper East Side',
        'center': (40.7736, -73.9566),
        'radius': 2000
    },
    {
        'name': 'Williamsburg',
        'center': (40.7081, -73.9571),
        'radius': 2000
    },
    {
        'name': 'DUMBO',
        'center': (40.7033, -73.9894),
        'radius': 1000
    },
    # Add Jersey City and Hoboken
    {
        'name': 'Jersey City',
        'center': (40.7282, -74.0776),
        'radius': 5000
    },
    {
        'name': 'Hoboken',
        'center': (40.7440, -74.0324),
        'radius': 2000
    },
    {
        'name': 'Newport',  # Jersey City neighborhood
        'center': (40.7288, -74.0341),
        'radius': 1500
    },
    {
        'name': 'Journal Square',  # Jersey City neighborhood
        'center': (40.7327, -74.0637),
        'radius': 2000
    }
]

# Place types to search for - Add more types
PLACE_TYPES = [
    'restaurant',
    'cafe',  
    'bar',
    'park',
    'night_club',
    'museum',    # Added
    'art_gallery', # Added
    'movie_theater', # Added
    'book_store',  # Added
    'bakery',      # Added
    'shopping_mall' # Added
]

# Keywords that influence aura properties
AURA_KEYWORDS = {
    'energy': ['energetic', 'vibrant', 'lively', 'bustling', 'dynamic'],
    'calmness': ['peaceful', 'tranquil', 'serene', 'quiet', 'relaxing'],
    'warmth': ['warm', 'cozy', 'inviting', 'friendly', 'welcoming'],
    'elegance': ['elegant', 'sophisticated', 'refined', 'luxurious', 'upscale'],
    'casual': ['casual', 'laid-back', 'informal', 'relaxed', 'easy-going'],
    'freshness': ['clean', 'modern', 'fresh', 'bright', 'new', 'style', 'original'],
    'authenticity': ['authentic', 'traditional', 'genuine', 'historic', 'classic']
}

# Keywords that influence shape properties
VIBE_KEYWORDS = {
    'chill': ['quiet', 'relaxed', 'peaceful', 'tranquil', 'serene', 'calm', 'mellow'],
    'energetic': ['loud', 'bustling', 'vibrant', 'energetic', 'rowdy', 'lively', 'buzzing'],
    'formal': ['elegant', 'sophisticated', 'refined', 'upscale', 'formal', 'polished'],
    'casual': ['casual', 'laid-back', 'informal', 'relaxed', 'easy-going', 'unpretentious']
}

# Base colors for gradients
BASE_COLORS = {
    'energy': '#FF0000',      # Red
    'calmness': '#0000FF',    # Blue
    'warmth': '#FFA500',      # Orange
    'elegance': '#800080',    # Purple
    'casual': '#00FF00',      # Green
    'freshness': '#00FFFF',   # Cyan
    'authenticity': '#FFD700' # Gold
}

def analyze_reviews(reviews):
    """Analyze reviews to determine aura properties"""
    if not reviews:
        return {'energy': 0.5, 'calmness': 0.5, 'warmth': 0.5, 
                'elegance': 0.5, 'casual': 0.5, 'freshness': 0.5,
                'authenticity': 0.5}

    # Initialize sentiment analyzer
    sia = SentimentIntensityAnalyzer()
    
    # Initialize keyword counters
    keyword_counts = {category: 0 for category in AURA_KEYWORDS.keys()}
    vibe_counts = {category: 0 for category in VIBE_KEYWORDS.keys()}
    total_sentiment = 0
    
    # Process each review
    for review in reviews:
        # Get sentiment score
        sentiment = sia.polarity_scores(review)['compound']
        total_sentiment += sentiment
        
        # Count keywords for aura
        words = word_tokenize(review.lower())
        for category, keywords in AURA_KEYWORDS.items():
            for keyword in keywords:
                if keyword in words:
                    keyword_counts[category] += 1
        
        # Count keywords for vibe
        for category, keywords in VIBE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in words:
                    vibe_counts[category] += 1
    
    # Normalize aura counts
    max_count = max(keyword_counts.values()) or 1
    normalized_scores = {k: v/max_count for k, v in keyword_counts.items()}
    
    # Normalize vibe counts
    max_vibe = max(vibe_counts.values()) or 1
    normalized_vibes = {k: v/max_vibe for k, v in vibe_counts.items()}
    
    # Adjust based on overall sentiment
    sentiment_factor = (total_sentiment / len(reviews) + 1) / 2  # Convert to 0-1 range
    for category in normalized_scores:
        normalized_scores[category] *= sentiment_factor
    
    return normalized_scores, normalized_vibes

def generate_gradient(scores):
    """Generate a gradient based on aura scores"""
    # Create a 100x100 image for the gradient
    img = Image.new('RGB', (100, 100))
    draw = ImageDraw.Draw(img)
    
    # Calculate color components based on scores
    r = g = b = 0
    total_weight = 0
    
    for category, score in scores.items():
        base_color = BASE_COLORS[category]
        # Convert hex to RGB
        r += int(base_color[1:3], 16) * score
        g += int(base_color[3:5], 16) * score
        b += int(base_color[5:7], 16) * score
        total_weight += score
    
    if total_weight > 0:
        r = int(r / total_weight)
        g = int(g / total_weight)
        b = int(b / total_weight)
    
    # Create gradient
    for y in range(100):
        # Adjust color based on position
        factor = y / 100
        current_r = int(r * (1 - factor) + 255 * factor)
        current_g = int(g * (1 - factor) + 255 * factor)
        current_b = int(b * (1 - factor) + 255 * factor)
        
        # Draw line
        draw.line([(0, y), (100, y)], fill=(current_r, current_g, current_b))
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return buffered.getvalue()

def generate_shape(vibe_scores):
    """Generate a shape based on vibe scores"""
    # Create a 100x100 image for the shape
    img = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Determine base shape type based on vibe scores
    chill_score = vibe_scores['chill']
    energy_score = vibe_scores['energetic']
    formal_score = vibe_scores['formal']
    casual_score = vibe_scores['casual']
    
    # Set shape parameters based on dominant vibe
    if chill_score > max(energy_score, formal_score, casual_score):
        # Soft, rounded shape for chill spots
        num_points = 12
        radius_variation = 0.2
        base_radius = 45
    elif energy_score > max(chill_score, formal_score, casual_score):
        # Sharp, angular shape for energetic spots
        num_points = 8
        radius_variation = 0.8
        base_radius = 40
    elif formal_score > max(chill_score, energy_score, casual_score):
        # Geometric shape for formal spots
        num_points = 6
        radius_variation = 0.4
        base_radius = 42
    else:
        # Simple, organic shape for casual spots
        num_points = 10
        radius_variation = 0.3
        base_radius = 43
    
    # Create points for the shape
    points = []
    for i in range(num_points):
        angle = (2 * np.pi * i) / num_points
        # Add variation to radius based on vibe scores
        radius = base_radius + (radius_variation * base_radius * np.sin(angle * 3))
        x = 50 + radius * np.cos(angle)
        y = 50 + radius * np.sin(angle)
        points.append((x, y))
    
    # Draw the shape
    if len(points) > 2:
        draw.polygon(points, fill=(255, 255, 255, 128))
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return buffered.getvalue()

def create_test_user():
    """Create a test user if it doesn't exist"""
    user = User.query.filter_by(email='test@example.com').first()
    if not user:
        user = User(
            username='testuser',
            email='test@example.com',
            aura_color=generate_gradient({'energy': 0.5, 'calmness': 0.5, 'warmth': 0.5, 
                                        'elegance': 0.5, 'casual': 0.5, 'freshness': 0.5,
                                        'authenticity': 0.5}),
            aura_shape=generate_shape({'chill': 0.5, 'energetic': 0.5, 'formal': 0.5, 'casual': 0.5})
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
    return user

def create_test_collection(user):
    """Create a test collection if it doesn't exist"""
    collection = Collection.query.filter_by(name='My Favorites', user_id=user.id).first()
    if not collection:
        collection = Collection(
            name='My Favorites',
            user_id=user.id
        )
        db.session.add(collection)
        db.session.commit()
    return collection

def get_place_details(place_id):
    """Get detailed information about a place from Google Maps API"""
    try:
        place_details = gmaps.place(place_id=place_id, fields=['name', 'formatted_address', 'rating', 'review', 'type'])
        return place_details.get('result', {})
    except Exception as e:
        print(f"Error getting place details for {place_id}: {e}")
        return {}

def create_aura(reviews):
    """Create an aura based on review analysis"""
    # Analyze reviews to get scores
    aura_scores, vibe_scores = analyze_reviews([review.get('text', '') for review in reviews])
    
    # Generate gradient and shape
    gradient = generate_gradient(aura_scores)
    shape = generate_shape(vibe_scores)
    
    # Determine dominant characteristics
    dominant_aura = max(aura_scores.items(), key=lambda x: x[1])[0]
    dominant_vibe = max(vibe_scores.items(), key=lambda x: x[1])[0]
    
    # Create a descriptive name
    name = f"{dominant_aura.capitalize()} {dominant_vibe.capitalize()}"
    
    return Tag(
        name=name,
        color=gradient,
        shape=shape
    )

def seed_database():
    """Seed the database with locations from Google Places API"""
    # Clear existing data
    print("Clearing existing data...")
    Location.query.delete()
    Tag.query.delete()
    Review.query.delete()
    db.session.commit()
    
    print("Starting database seeding...")
    locations_added = 0
    api_errors = 0
    
    # Create test user
    user = create_test_user()
    collection = create_test_collection(user)
    
    # Loop through each area and place type
    for area in NYC_AREAS:
        area_name = area['name']
        location = area['center']
        radius = area['radius']
        
        print(f"\nProcessing area: {area_name}")
        
        for place_type in PLACE_TYPES:
            print(f"  Searching for {place_type}s in {area_name}...")
            
            try:
                # Search for places of this type in this area
                places_result = gmaps.places_nearby(
                    location=location,
                    radius=radius,
                    type=place_type,
                    rank_by='prominence'  # Get the most popular places first
                )
                
                # Get search results
                places = places_result.get('results', [])
                print(f"    Found {len(places)} {place_type}s")
                
                # Process up to MAX_LOCATIONS_PER_TYPE places
                count = 0
                for place in places:
                    if count >= MAX_LOCATIONS_PER_TYPE:
                        break
                    
                    try:
                        place_id = place.get('place_id')
                        name = place.get('name')
                        
                        if not place_id or not name:
                            continue
                            
                        print(f"    Processing place: {name} ({place_id})")
                        
                        # Check if location already exists
                        existing = Location.query.filter_by(google_place_id=place_id).first()
                        if existing:
                            print(f"    Skipping {name} - already exists")
                            continue
                            
                        # Get place details
                        details = get_place_details(place_id)
                        
                        if not details:
                            print(f"    No details available for {name}")
                            continue
                        
                        # Create location
                        location_obj = Location(
                            name=name,
                            google_place_id=place_id,
                            latitude=place['geometry']['location']['lat'],
                            longitude=place['geometry']['location']['lng'],
                            place_type=place_type,
                            address=details.get('formatted_address', place.get('vicinity', '')),
                            rating=place.get('rating')
                        )
                        
                        db.session.add(location_obj)
                        db.session.flush()  # Get ID before creating reviews
                        
                        # Get reviews for analysis
                        reviews_data = details.get('reviews', [])
                        review_texts = []
                        
                        for i, review_data in enumerate(reviews_data):
                            if i >= MAX_REVIEWS_PER_LOCATION:
                                break
                                
                            review_text = review_data.get('text', '')
                            if review_text:
                                review_texts.append(review_text)
                                
                                # Create review object
                                review = Review(
                                    body=review_text,
                                    rating=review_data.get('rating', 0),
                                    user_id=user.id,
                                    location_id=location_obj.id
                                )
                                db.session.add(review)
                        
                        # Create aura based on reviews
                        if review_texts:
                            aura_scores, vibe_scores = analyze_reviews(review_texts)
                            
                            # Determine dominant characteristics for naming
                            dominant_aura = max(aura_scores.items(), key=lambda x: x[1])[0]
                            dominant_vibe = max(vibe_scores.items(), key=lambda x: x[1])[0]
                            
                            # Convert scores to colors
                            color_gradient = generate_gradient(aura_scores)
                            
                            # Create tag (aura)
                            tag = Tag(
                                name=f"{dominant_aura.capitalize()} {dominant_vibe.capitalize()}",
                                color=f"linear-gradient(to right, {BASE_COLORS[dominant_aura]}, {lighten_color(BASE_COLORS[dominant_aura], 30)})",
                                shape=dominant_vibe
                            )
                            
                            db.session.add(tag)
                            db.session.flush()
                            
                            # Associate tag with location
                            location_obj.tags.append(tag)
                        
                        # Add to collection
                        if random.random() < 0.3:  # 30% chance to add to collection
                            collection.locations.append(location_obj)
                        
                        count += 1
                        locations_added += 1
                        
                        # Commit every 10 locations to avoid long transactions
                        if locations_added % 10 == 0:
                            print(f"Committing batch: {locations_added} locations processed")
                            db.session.commit()
                        
                    except Exception as e:
                        print(f"    Error processing place {name}: {e}")
                        continue
                
                print(f"  Added {count} {place_type}s in {area_name}")
                
                # Attempt pagination if API supports it and we need more locations
                next_page_token = places_result.get('next_page_token')
                if next_page_token and count < MAX_LOCATIONS_PER_TYPE:
                    print("  Fetching next page of results...")
                    import time
                    time.sleep(2)  # Wait a bit for the next page token to be valid
                    
                    try:
                        places_result = gmaps.places_nearby(
                            page_token=next_page_token
                        )
                        more_places = places_result.get('results', [])
                        places.extend(more_places)
                        print(f"    Found {len(more_places)} more {place_type}s")
                    except Exception as e:
                        print(f"  Error fetching next page: {e}")
                
            except Exception as e:
                print(f"  Error searching for {place_type}s in {area_name}: {e}")
                api_errors += 1
                if api_errors > 5:
                    print("Too many API errors, stopping")
                    break
    
    # Final commit
    db.session.commit()
    print(f"\nSeeding complete! Added {locations_added} locations")

def lighten_color(hex_color, percent):
    """Lighten a hex color by a percentage"""
    # Remove hash if present
    hex_color = hex_color.lstrip('#')
    
    # Convert to RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    
    # Lighten
    r = min(255, r + (255 - r) * percent // 100)
    g = min(255, g + (255 - g) * percent // 100)
    b = min(255, b + (255 - b) * percent // 100)
    
    # Convert back to hex
    return f"#{r:02x}{g:02x}{b:02x}"

# Ensure we're using the right API key
def check_api_key():
    """Validate that the API key is working"""
    if not GOOGLE_MAPS_API_KEY:
        print("ERROR: No Google Maps API key found. Set the GOOGLE_MAPS_API_KEY environment variable.")
        return False
    
    try:
        # Simple test query
        result = gmaps.geocode('New York')
        if result:
            print(f"API key validated successfully!")
            return True
        else:
            print("API key validation failed - no results returned")
            return False
    except Exception as e:
        print(f"API key validation error: {e}")
        return False

if __name__ == '__main__':
    if check_api_key():
        seed_database()
    else:
        print("Seeding aborted due to API key issues") 