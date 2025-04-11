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

# Import models and extensions, but let the app context be created by the caller
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
import io
import ssl
import warnings
import time
import re

ssl._create_default_https_context = ssl._create_unverified_context

# NO LONGER creating app context here as it should be handled by caller
# app = create_app(instance_path=instance_path)
# app.app_context().push()  # Push an application context

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('vader_lexicon')

# Initialize Google Maps client
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
if not GOOGLE_MAPS_API_KEY:
    raise ValueError("GOOGLE_MAPS_API_KEY environment variable is required")

gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

# Constants
TEST_MODE = False  # Set to True for development/testing
MAX_LOCATIONS_PER_TYPE = 35  # Increased to have 10 more locations per area per type
MAX_REVIEWS_PER_LOCATION = 25  # Increased to capture 10 more reviews per location

# List of neighborhoods in NYC with their coordinates
NYC_AREAS = [
    {
        'name': 'Manhattan',
        'center': {'lat': 40.7831, 'lng': -73.9712},
        'radius': 5000
    },
    {
        'name': 'Brooklyn',
        'center': {'lat': 40.6782, 'lng': -73.9442},
        'radius': 5000
    },
    {
        'name': 'Queens',
        'center': {'lat': 40.7282, 'lng': -73.7949},
        'radius': 5000
    },
    {
        'name': 'Bronx',
        'center': {'lat': 40.8448, 'lng': -73.8648},
        'radius': 5000
    },
    {
        'name': 'Staten Island',
        'center': {'lat': 40.5795, 'lng': -74.1502},
        'radius': 5000
    },
    {
        'name': 'Jersey City',
        'center': {'lat': 40.7178, 'lng': -74.0431},
        'radius': 3000
    },
    {
        'name': 'Newport',
        'center': {'lat': 40.7269, 'lng': -74.0336},
        'radius': 1000
    },
    {
        'name': 'Hoboken',
        'center': {'lat': 40.7440, 'lng': -74.0324},
        'radius': 2000
    },
    {
        'name': 'Journal Square',
        'center': {'lat': 40.7327, 'lng': -74.0637},
        'radius': 1000
    },
    {
        'name': 'Grove St',
        'center': {'lat': 40.7192, 'lng': -74.0431},
        'radius': 1000
    },
    {
        'name': 'Dumbo',
        'center': {'lat': 40.7033, 'lng': -73.9894},
        'radius': 1000
    },
    {
        'name': 'Crown Heights',
        'center': {'lat': 40.6694, 'lng': -73.9422},
        'radius': 2000
    },
    {
        'name': 'Bushwick',
        'center': {'lat': 40.6958, 'lng': -73.9171},
        'radius': 2000
    },
    {
        'name': 'Harlem',
        'center': {'lat': 40.8116, 'lng': -73.9465},
        'radius': 2000
    },
    {
        'name': 'Hamilton Heights',
        'center': {'lat': 40.8252, 'lng': -73.9496},
        'radius': 1000
    },
    {
        'name': 'Greenwich Village',
        'center': {'lat': 40.7339, 'lng': -74.0011},
        'radius': 1000
    },
    {
        'name': 'Williamsburg',
        'center': {'lat': 40.7081, 'lng': -73.9571},
        'radius': 1500
    },
    {
        'name': 'East Village',
        'center': {'lat': 40.7265, 'lng': -73.9815},
        'radius': 1000
    },
    {
        'name': 'Lower East Side',
        'center': {'lat': 40.7195, 'lng': -73.9870},
        'radius': 1000
    },
    {
        'name': 'Chelsea',
        'center': {'lat': 40.7470, 'lng': -74.0010},
        'radius': 1000
    },
    {
        'name': 'Upper West Side',
        'center': {'lat': 40.7870, 'lng': -73.9754},
        'radius': 1500
    },
    {
        'name': 'Upper East Side',
        'center': {'lat': 40.7736, 'lng': -73.9566},
        'radius': 1500
    },
    {
        'name': 'SoHo',
        'center': {'lat': 40.7231, 'lng': -74.0006},
        'radius': 1000
    },
    {
        'name': 'Financial District',
        'center': {'lat': 40.7075, 'lng': -74.0113},
        'radius': 1000
    },
    {
        'name': 'Midtown',
        'center': {'lat': 40.7549, 'lng': -73.9840},
        'radius': 1500
    }
]

# Types of places to search for
PLACE_TYPES = [
    'restaurant',
    'bar',
    'cafe',
    'museum',
    'park',
    'shopping_mall',
    'point_of_interest',
    'tourist_attraction',
    'night_club',
    'bakery',
    'art_gallery'
]

# Vibey keywords for different vibes
VIBE_KEYWORDS = {
    'energy': ['energetic', 'vibrant', 'lively', 'dynamic', 'exciting', 'buzzing', 'pulsating', 'upbeat', 'spirited', 'animated'],
    'calmness': ['calm', 'peaceful', 'serene', 'tranquil', 'quiet', 'relaxing', 'soothing', 'mellow', 'gentle', 'soft'],
    'warmth': ['warm', 'cozy', 'inviting', 'welcoming', 'friendly', 'comfortable', 'homely', 'intimate', 'pleasant', 'charming'],
    'elegance': ['elegant', 'sophisticated', 'refined', 'classy', 'upscale', 'luxurious', 'chic', 'polished', 'premium', 'exclusive'],
    'casual': ['casual', 'laid-back', 'relaxed', 'informal', 'easygoing', 'unpretentious', 'simple', 'natural', 'organic', 'balanced'],
    'freshness': ['fresh', 'clean', 'crisp', 'modern', 'new', 'contemporary', 'innovative', 'light', 'airy', 'bright'],
    'authenticity': ['authentic', 'genuine', 'real', 'original', 'traditional', 'classic', 'heritage', 'true', 'pure', 'natural']
}

# Vibe colors for gradient generation
VIBE_COLORS = {
    'chill': [
        {'light': '#48c0eb', 'dark': '#1e6091'}, # Light blue to dark blue
        {'light': '#a5ddeb', 'dark': '#3494b7'}, # Light teal to dark teal
        {'light': '#a6d4eb', 'dark': '#2d637f'}, # Sky blue to navy
        {'light': '#c0d7e5', 'dark': '#6896b7'}, # Pale blue to steel blue
        {'light': '#b4e2e0', 'dark': '#49a09d'}  # Mint to teal
    ],
    'energetic': [
        {'light': '#f9637c', 'dark': '#a10a38'}, # Coral to crimson
        {'light': '#f9aa59', 'dark': '#d15614'}, # Light orange to burnt orange
        {'light': '#f8556d', 'dark': '#cb0e3d'}, # Pink to red
        {'light': '#f7cf5c', 'dark': '#e8a500'}, # Yellow to gold
        {'light': '#ff9393', 'dark': '#e93e3e'}  # Light red to bold red
    ],
    'formal': [
        {'light': '#c088f9', 'dark': '#5a28a4'}, # Lavender to deep purple
        {'light': '#a080e8', 'dark': '#4b3a87'}, # Periwinkle to indigo
        {'light': '#d9c8f6', 'dark': '#6c4c9f'}, # Pale purple to royal purple
        {'light': '#baabd6', 'dark': '#554286'}, # Light violet to deep violet
        {'light': '#c1aee8', 'dark': '#624c96'}  # Lilac to rich purple
    ],
    'balanced': [
        {'light': '#85dcb8', 'dark': '#2a9d78'}, # Mint to emerald
        {'light': '#a7eacc', 'dark': '#3dbf95'}, # Light mint to jade
        {'light': '#97e6d2', 'dark': '#39b592'}, # Seafoam to turquoise
        {'light': '#b8e4d3', 'dark': '#599b86'}, # Pale green to forest
        {'light': '#addcc0', 'dark': '#569b7f'}  # Light green to deep green
    ]
}

# Base colors for gradients - expanded palette
BASE_COLORS = {
    'energy': ['#FF0000', '#FF5252', '#FF4081', '#FF6E40'],       # Reds
    'calmness': ['#0000FF', '#2979FF', '#3D5AFE', '#448AFF'],     # Blues
    'warmth': ['#FFA500', '#FF9800', '#FF6D00', '#FFAB40'],       # Oranges
    'elegance': ['#800080', '#9C27B0', '#6A1B9A', '#AA00FF'],     # Purples
    'casual': ['#00FF00', '#76FF03', '#64DD17', '#B2FF59'],       # Greens
    'freshness': ['#00FFFF', '#18FFFF', '#00E5FF', '#84FFFF'],    # Cyans
    'authenticity': ['#FFD700', '#FFAB00', '#FFC400', '#FFD740']  # Golds
}

# Aura names for generated auras, organized by color category
AURA_NAMES = {
    'energy': ['Fiery', 'Passionate', 'Dynamic', 'Intense', 'Vibrant'],
    'calmness': ['Serene', 'Tranquil', 'Peaceful', 'Calm', 'Gentle'],
    'warmth': ['Radiant', 'Glowing', 'Sunny', 'Bright', 'Warm'],
    'elegance': ['Elegant', 'Sophisticated', 'Refined', 'Classic', 'Polished'],
    'casual': ['Natural', 'Organic', 'Fresh', 'Balanced', 'Harmonious'],
    'freshness': ['Crisp', 'Clear', 'Pure', 'Clean', 'Fresh'],
    'authenticity': ['Genuine', 'Authentic', 'True', 'Real', 'Original']
}

# Suppress specific UserWarnings about empty vocabulary
warnings.filterwarnings("ignore", category=UserWarning, message="Vocabulary is empty")

# REMOVED: No longer trying to load word vectors
# Set a flag to indicate we're using the simplified approach
word_vectors = None

# Add a new function for text preprocessing
def preprocess_text(text):
    """Clean and tokenize text for NLP processing"""
    if not text:
        return []
    
    # Convert to lowercase and remove punctuation
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # Tokenize and remove stopwords
    tokens = word_tokenize(text)
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if word not in stop_words and len(word) > 2]
    
    return tokens

# Add a new function for semantic similarity - simplified version
def calculate_semantic_similarity(tokens, keywords):
    """Calculate semantic similarity using simple word matching since we don't have word vectors"""
    if not tokens or not keywords:
        return 0.0
    
    # Simple overlap calculation
    matches = len(set(tokens).intersection(set(keywords)))
    total = len(set(tokens).union(set(keywords)))
    
    if total == 0:
        return 0.0
    
    return matches / total

# Replace the analyze_reviews function with this enhanced version
def analyze_reviews(reviews):
    """Analyze reviews using simple keyword matching to determine aura properties"""
    try:
        # If no reviews, return default values
        if not reviews:
            print("No reviews found, using default vibe scores")
            return {
                'energy': 0.5, 'calmness': 0.5, 'warmth': 0.5, 
                'elegance': 0.5, 'casual': 0.5, 'freshness': 0.5,
                'authenticity': 0.5
            }
        
        # Initialize sentiment analyzer
        sia = SentimentIntensityAnalyzer()
        
        # Initialize category scores
        category_scores = {
            'energy': 0.5, 'calmness': 0.5, 'warmth': 0.5, 
            'elegance': 0.5, 'casual': 0.5, 'freshness': 0.5,
            'authenticity': 0.5
        }
        
        # Process each review
        for review_text in reviews:
            # Skip empty reviews
            if not review_text:
                continue
            
            # Get sentiment score
            sentiment = sia.polarity_scores(review_text)
            sentiment_multiplier = 0.5 + sentiment['compound'] * 0.5  # Range from 0 to 1
            
            # Simple keyword matching for properties
            lower_text = review_text.lower()
            
            # Energy-related keywords
            energy_keywords = ['energetic', 'vibrant', 'lively', 'dynamic', 'exciting', 'buzzing', 'pulsating']
            energy_matches = sum(lower_text.count(keyword) for keyword in energy_keywords)
            category_scores['energy'] += 0.1 * energy_matches * sentiment_multiplier
            
            # Calmness-related keywords
            calm_keywords = ['calm', 'peaceful', 'serene', 'tranquil', 'quiet', 'relaxing', 'soothing']
            calm_matches = sum(lower_text.count(keyword) for keyword in calm_keywords)
            category_scores['calmness'] += 0.1 * calm_matches * sentiment_multiplier
            
            # Warmth-related keywords
            warm_keywords = ['warm', 'cozy', 'inviting', 'welcoming', 'friendly', 'comfortable', 'homely']
            warm_matches = sum(lower_text.count(keyword) for keyword in warm_keywords)
            category_scores['warmth'] += 0.1 * warm_matches * sentiment_multiplier
            
            # Elegance-related keywords
            elegant_keywords = ['elegant', 'sophisticated', 'refined', 'classy', 'upscale', 'luxurious', 'chic']
            elegant_matches = sum(lower_text.count(keyword) for keyword in elegant_keywords)
            category_scores['elegance'] += 0.1 * elegant_matches * sentiment_multiplier
            
            # Casual-related keywords
            casual_keywords = ['casual', 'laid-back', 'relaxed', 'informal', 'easygoing', 'unpretentious', 'simple']
            casual_matches = sum(lower_text.count(keyword) for keyword in casual_keywords)
            category_scores['casual'] += 0.1 * casual_matches * sentiment_multiplier
            
            # Freshness-related keywords
            fresh_keywords = ['fresh', 'clean', 'crisp', 'modern', 'new', 'contemporary', 'innovative']
            fresh_matches = sum(lower_text.count(keyword) for keyword in fresh_keywords)
            category_scores['freshness'] += 0.1 * fresh_matches * sentiment_multiplier
            
            # Authenticity-related keywords
            authentic_keywords = ['authentic', 'genuine', 'real', 'original', 'traditional', 'classic', 'heritage']
            authentic_matches = sum(lower_text.count(keyword) for keyword in authentic_keywords)
            category_scores['authenticity'] += 0.1 * authentic_matches * sentiment_multiplier
        
        # Normalize scores
        max_score = max(category_scores.values())
        if max_score > 1.0:
            for category in category_scores:
                category_scores[category] /= max_score
        
        return category_scores
    except Exception as e:
        print(f"Error in analyze_reviews: {e}")
        # Return safe default values
        return {
            'energy': 0.5, 'calmness': 0.5, 'warmth': 0.5, 
            'elegance': 0.5, 'casual': 0.5, 'freshness': 0.5,
            'authenticity': 0.5
        }

def generate_gradient(scores):
    """Generate three distinct colors based on review analysis scores"""
    try:
        # If no scores, use default colors
        if not scores or sum(scores.values()) == 0:
            return {
                'aura_color1': '#7B1FA2',  # Purple
                'aura_color2': '#2196F3',  # Blue
                'aura_color3': '#FF5722'   # Orange
            }
        
        # Get top 3 categories by score
        top_categories = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Map categories to their corresponding colors
        colors = []
        for category, score in top_categories:
            if category in BASE_COLORS:
                # Use the color that matches the intensity of the score
                color_index = min(int(score * len(BASE_COLORS[category])), len(BASE_COLORS[category]) - 1)
                colors.append(BASE_COLORS[category][color_index])
            else:
                # If category not found, use a random color from any category
                random_category = random.choice(list(BASE_COLORS.keys()))
                colors.append(random.choice(BASE_COLORS[random_category]))
        
        # Ensure we have exactly 3 colors
        while len(colors) < 3:
            random_category = random.choice(list(BASE_COLORS.keys()))
            colors.append(random.choice(BASE_COLORS[random_category]))
        
        return {
            'aura_color1': colors[0],
            'aura_color2': colors[1],
            'aura_color3': colors[2]
        }
    except Exception as e:
        print(f"Error in generate_gradient: {e}")
        # Return safe default colors
        return {
            'aura_color1': '#7B1FA2',  # Purple
            'aura_color2': '#2196F3',  # Blue
            'aura_color3': '#FF5722'   # Orange
        }

def determine_vibe_type(vibe_scores):
    """Determine the overall vibe type based on scores"""
    try:
        # Filter to only include valid vibe types
        valid_scores = {k: v for k, v in vibe_scores.items() if k in VIBE_KEYWORDS}
        
        # Handle empty dictionary case
        if not valid_scores:
            return 'casual'  # Default to casual if no valid scores
            
        # Return the vibe with the highest score
        vibe_type = max(valid_scores.items(), key=lambda x: x[1])[0]
        return vibe_type
    except Exception as e:
        print(f"Error in determine_vibe_type: {e}")
        return 'casual'  # Default to casual on error

def determine_shape(rating):
    """Determine aura shape based on rating"""
    try:
        if rating <= 2.0:
            return "soft"  # Low energy, more relaxed
        elif rating <= 3.0:
            return "pulse"  # Moderate energy, steady
        elif rating <= 4.0:
            return "flowing"  # High energy, dynamic
        else:
            return "sparkle"  # Exceptional energy, vibrant
    except Exception as e:
        print(f"Error in determine_shape: {e}")
        return "flowing"  # Default shape

def create_test_user():
    """Create a test user if it doesn't exist"""
    user = User.query.filter_by(email='test@example.com').first()
    if not user:
        # Generate a random gradient for the test user
        vibe_type = random.choice(list(VIBE_COLORS.keys()))
        color_set = random.choice(VIBE_COLORS[vibe_type])
        gradient = f"linear-gradient(45deg, {color_set['dark']}, {color_set['light']})"
        
        # Set a random shape from the available options - high energy should get sparkle
        shape = random.choice(["soft", "pulse", "flowing", "sparkle"])
        
        user = User(
            username='testuser',
            email='test@example.com',
            aura_color=gradient,
            aura_shape=shape,
            response_speed='medium'  # Add a default response speed
        )
        
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
        print(f"Created test user with {shape} aura shape and gradient {gradient}")
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
        place_details = gmaps.place(place_id=place_id, fields=[
            'name', 'formatted_address', 'geometry', 'rating', 'reviews', 
            'type', 'formatted_phone_number', 'website', 'price_level', 'user_ratings_total'
        ])
        
        if place_details and 'result' in place_details:
            return place_details['result']
        return None
    except Exception as e:
        print(f"Error getting place details: {str(e)}")
        return None

def create_aura(review_texts, avg_rating):
    """Create an aura based on reviews and rating"""
    try:
        # Analyze reviews to get vibe scores
        vibe_scores = analyze_reviews(review_texts)
        
        # Generate three colors based on vibe scores
        colors = generate_gradient(vibe_scores)
        
        # Determine shape based on rating
        shape = determine_shape(avg_rating)
        
        # Determine the dominant vibe type
        vibe_type = determine_vibe_type(vibe_scores)
        
        # Get keywords for the dominant vibe
        keywords = VIBE_KEYWORDS.get(vibe_type, [])
        if not keywords:
            # If no keywords found, use the vibe type itself
            aura_name = f"{vibe_type.capitalize()} Aura"
        else:
            # Use a random keyword from the vibe's keywords
            aura_name = f"{vibe_type.capitalize()} {random.choice(keywords).capitalize()} Aura"
        
        return {
            'name': aura_name,
            'aura_color1': colors['aura_color1'],
            'aura_color2': colors['aura_color2'],
            'aura_color3': colors['aura_color3'],
            'shape': shape
        }
    except Exception as e:
        print(f"Error in create_aura: {e}")
        # Return default aura with casual vibe
        return {
            'name': 'Casual Relaxed Aura',
            'aura_color1': '#7B1FA2',  # Purple
            'aura_color2': '#2196F3',  # Blue
            'aura_color3': '#FF5722',  # Orange
            'shape': 'flowing'
        }

def seed_database():
    """Seed the database with locations from Google Places API"""
    print("🌱 Seeding database with locations...")
    
    # Get all place types
    place_types = PLACE_TYPES
    
    # Track total locations added
    total_locations = 0
    
    # Process each area
    for area in NYC_AREAS:
        print(f"\nProcessing area: {area['name']}")
        
        # Process each place type
        for place_type in place_types:
            print(f"  Searching for {place_type}s...")
            
            try:
                # Search for places of this type in the area
                places = gmaps.places_nearby(
                    location=area['center'],
                    radius=area['radius'],
                    type=place_type,
                    language='en'
                )
                
                if not places or 'results' not in places:
                    print(f"    No results found for {place_type} in {area['name']}")
                    continue
                
                # Process each place
                for place in places['results'][:MAX_LOCATIONS_PER_TYPE]:
                    try:
                        # Get detailed place information
                        place_details = get_place_details(place['place_id'])
                        
                        if not place_details:
                            print(f"    Could not get details for place: {place.get('name', 'Unknown')}")
                            continue
                        
                        # Skip locations without reviews
                        if not place_details.get('reviews') or len(place_details.get('reviews', [])) == 0:
                            print(f"    Skipping {place_details.get('name', 'Unknown')} - No reviews")
                            continue
                        
                        # Get review texts and average rating
                        review_texts = [review['text'] for review in place_details.get('reviews', [])[:MAX_REVIEWS_PER_LOCATION]]
                        avg_rating = place_details.get('rating', 0)
                        
                        # Print how many reviews were found
                        print(f"    Processing {place_details.get('name', 'Unknown')} with {len(review_texts)} reviews")
                        
                        try:
                            # Create aura based on reviews
                            aura = create_aura(review_texts, avg_rating)
                            
                            # Create location
                            location = Location(
                                name=place_details['name'],
                                address=place_details.get('formatted_address', ''),
                                latitude=place_details['geometry']['location']['lat'],
                                longitude=place_details['geometry']['location']['lng'],
                                place_type=place_type,
                                area=area['name'],
                                aura_name=aura['name'],
                                aura_color1=aura['aura_color1'],
                                aura_color2=aura['aura_color2'],
                                aura_color3=aura['aura_color3'],
                                aura_shape=aura['shape']
                            )
                            
                            # Add to database
                            db.session.add(location)
                            db.session.flush()  # This gives the location an ID without committing the entire transaction
                            total_locations += 1
                            
                            # Add reviews to the database from Google Places API
                            review_count = 0
                            for i, review_data in enumerate(place_details.get('reviews', [])[:MAX_REVIEWS_PER_LOCATION]):
                                try:
                                    # Create a Review object with the first user (ID 1) as default
                                    review = Review(
                                        location_id=location.id,
                                        user_id=1,  # Default to first user in database
                                        body=review_data.get('text', ''),
                                        rating=review_data.get('rating', 0)
                                    )
                                    db.session.add(review)
                                    review_count += 1
                                except Exception as re:
                                    print(f"    Error creating review: {re}")
                            
                            print(f"    Added {review_count} reviews for {location.name}")
                            
                            # Commit periodically to avoid memory issues
                            if total_locations % 10 == 0:
                                db.session.commit()
                                print(f"  Added {total_locations} locations so far...")
                        except KeyError as ke:
                            print(f"    KeyError in aura data for {place_details.get('name', 'Unknown')}: {ke}")
                            continue
                        except Exception as e:
                            print(f"    Error processing aura data: {e}")
                            continue
                        
                    except Exception as e:
                        print(f"Error processing place: {str(e)}")
                        continue
                
            except Exception as e:
                print(f"Error searching for {place_type} in {area['name']}: {str(e)}")
                continue
    
    # Final commit
    try:
        db.session.commit()
        print(f"\n✅ Successfully added {total_locations} locations!")
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Error committing locations: {str(e)}")

def create_sample_locations(user, collection):
    """Create sample locations if API fails"""
    print("Creating sample locations...")
    
    # Sample locations in NYC
    sample_locations = [
        {
            'name': 'Central Park',
            'place_type': 'park',
            'latitude': 40.7812,
            'longitude': -73.9665,
            'address': 'Central Park, New York, NY',
            'rating': 4.8,
            'vibe': 'chill'
        },
        {
            'name': 'Empire State Building',
            'place_type': 'tourist_attraction',
            'latitude': 40.7484,
            'longitude': -73.9857,
            'address': '20 W 34th St, New York, NY 10001',
            'rating': 4.7,
            'vibe': 'formal'
        },
        {
            'name': 'Times Square',
            'place_type': 'tourist_attraction',
            'latitude': 40.7580,
            'longitude': -73.9855,
            'address': 'Times Square, New York, NY 10036',
            'rating': 4.6,
            'vibe': 'energetic'
        },
        {
            'name': 'Brooklyn Bridge',
            'place_type': 'tourist_attraction',
            'latitude': 40.7061,
            'longitude': -73.9969,
            'address': 'Brooklyn Bridge, New York, NY 10038',
            'rating': 4.8,
            'vibe': 'balanced'
        },
        {
            'name': 'The High Line',
            'place_type': 'park',
            'latitude': 40.7480,
            'longitude': -74.0048,
            'address': 'The High Line, New York, NY 10011',
            'rating': 4.7,
            'vibe': 'chill'
        },
        {
            'name': 'Rockefeller Center',
            'place_type': 'tourist_attraction',
            'latitude': 40.7587,
            'longitude': -73.9787,
            'address': '45 Rockefeller Plaza, New York, NY 10111',
            'rating': 4.6,
            'vibe': 'formal'
        },
        {
            'name': 'The Metropolitan Museum of Art',
            'place_type': 'museum',
            'latitude': 40.7794,
            'longitude': -73.9632,
            'address': '1000 5th Ave, New York, NY 10028',
            'rating': 4.8,
            'vibe': 'formal'
        },
        {
            'name': 'Brooklyn Brewery',
            'place_type': 'bar',
            'latitude': 40.7215,
            'longitude': -73.9576,
            'address': '79 N 11th St, Brooklyn, NY 11249',
            'rating': 4.5,
            'vibe': 'energetic'
        },
        {
            'name': 'Chelsea Market',
            'place_type': 'shopping_mall',
            'latitude': 40.7420,
            'longitude': -74.0048,
            'address': '75 9th Ave, New York, NY 10011',
            'rating': 4.6,
            'vibe': 'balanced'
        },
        {
            'name': 'Washington Square Park',
            'place_type': 'park',
            'latitude': 40.7308,
            'longitude': -73.9973,
            'address': 'Washington Square Park, New York, NY 10012',
            'rating': 4.7,
            'vibe': 'energetic'
        }
    ]
    
    for loc_data in sample_locations:
        # Create aura for the location
        color_set = random.choice(VIBE_COLORS[loc_data['vibe']])
        aura_color = f"linear-gradient(45deg, {color_set['dark']}, {color_set['light']})"
        
        # Determine shape based on rating
        aura_shape = determine_shape(loc_data['rating'])
        
        # Create location
        location = Location(
            name=loc_data['name'],
            google_place_id=f"sample_{random.randint(1000, 9999)}",
            latitude=loc_data['latitude'],
            longitude=loc_data['longitude'],
            place_type=loc_data['place_type'],
            address=loc_data['address'],
            phone="",
            website="",
            price_level=random.randint(1, 4),
            rating=loc_data['rating'],
            user_ratings_total=random.randint(100, 5000),
            area='Sample',
            aura_name=f"Sample {loc_data['vibe'].capitalize()} Aura",
            aura_color=aura_color,
            aura_shape=aura_shape
        )
        
        db.session.add(location)
        db.session.flush()  # This gives the location an ID without committing the entire transaction
        
        # Create some sample reviews
        sample_reviews = [
            f"I love {loc_data['name']}! It's a great place to visit.",
            f"Really enjoyed my time at {loc_data['name']}. Would recommend!",
            f"{loc_data['name']} is one of my favorite spots in NYC."
        ]
        
        for review_text in sample_reviews:
            review = Review(
                location_id=location.id,
                user_id=user.id,
                body=review_text,  # Use 'body' instead of 'text'
                rating=random.randint(3, 5)
            )
            db.session.add(review)
        
        # Add to collection (50% chance)
        if random.random() < 0.5:
            collection.locations.append(location)
    
    db.session.commit()
    print(f"Added {len(sample_locations)} sample locations.")

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