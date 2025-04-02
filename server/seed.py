import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Load environment variables
load_dotenv()

from app import create_app
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

# Create the app instance
app = create_app()
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
TEST_MODE = True  # Set to False for full data import
MAX_LOCATIONS_PER_TYPE = 3  # Maximum locations to import per place type per area
MAX_REVIEWS_PER_LOCATION = 5  # Maximum reviews to import per location

# NYC boroughs and their centers
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
    }
]

# Place types to search for
PLACE_TYPES = [
    'restaurant',
    'cafe',  # This will cover both cafes and coffee shops
    'bar',
    'park',
    'night_club'
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
    """Get detailed information about a place"""
    try:
        details = gmaps.place(place_id, fields=['name', 'formatted_address', 'rating', 'reviews'])
        return details['result']
    except Exception as e:
        print(f"Error getting details for place {place_id}: {e}")
        return None

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
    """Main seeding function"""
    with app.app_context():
        # Create test user and collection
        user = create_test_user()
        collection = create_test_collection(user)
        
        # Clear existing data if in test mode
        if TEST_MODE:
            print("Clearing existing data...")
            db.session.query(Location).delete()
            db.session.query(Tag).delete()
            db.session.query(Review).delete()
            db.session.commit()

        # Search for places in each NYC area
        for area in NYC_AREAS:
            print(f"Searching in {area['name']}...")
            
            for place_type in PLACE_TYPES:
                try:
                    # Search for places
                    places_result = gmaps.places_nearby(
                        location=area['center'],
                        radius=area['radius'],
                        type=place_type
                    )

                    if 'results' in places_result:
                        # Limit the number of results if in test mode
                        places = places_result['results'][:MAX_LOCATIONS_PER_TYPE] if TEST_MODE else places_result['results']
                        
                        for place in places:
                            # Check if location already exists
                            existing_location = Location.query.filter_by(google_place_id=place['place_id']).first()
                            if existing_location:
                                print(f"Skipping existing location: {place['name']}")
                                continue

                            # Get detailed information
                            details = get_place_details(place['place_id'])
                            if not details:
                                continue

                            # Create location
                            location = Location(
                                name=place['name'],
                                google_place_id=place['place_id'],
                                latitude=place['geometry']['location']['lat'],
                                longitude=place['geometry']['location']['lng'],
                                place_type=place_type,
                                address=details.get('formatted_address', ''),
                                rating=details.get('rating', 0.0)
                            )
                            db.session.add(location)
                            db.session.flush()  # Get location ID

                            # Create reviews if available
                            reviews = details.get('reviews', [])
                            # Limit the number of reviews if in test mode
                            reviews = reviews[:MAX_REVIEWS_PER_LOCATION] if TEST_MODE else reviews
                            
                            for review_data in reviews:
                                review = Review(
                                    body=review_data.get('text', ''),
                                    user_id=user.id,
                                    location_id=location.id
                                )
                                db.session.add(review)

                            # Create aura based on reviews
                            aura = create_aura(reviews)
                            db.session.add(aura)
                            db.session.flush()
                            location.tags.append(aura)

                            # Add to test collection
                            collection.locations.append(location)

                            print(f"Added {place['name']}")

                except Exception as e:
                    print(f"Error processing {place_type} in {area['name']}: {e}")
                    db.session.rollback()  # Rollback on error
                    continue

        # Commit all changes
        db.session.commit()
        print("Seeding completed!")

if __name__ == '__main__':
    seed_database() 