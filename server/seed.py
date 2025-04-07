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
MAX_LOCATIONS_PER_TYPE = 25  # Increased from 10 to 30 locations per type
MAX_REVIEWS_PER_LOCATION = 15  # Increased from 5 to 15 reviews per location

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
    'chill': ['relaxed', 'calm', 'laid-back', 'cozy', 'mellow', 'relaxing', 'serene', 'peaceful', 'soothing', 'tranquil'],
    'energetic': ['lively', 'vibrant', 'dynamic', 'exciting', 'active', 'buzzing', 'pulsating', 'upbeat', 'spirited', 'animated'],
    'formal': ['elegant', 'sophisticated', 'upscale', 'refined', 'polished', 'classy', 'high-end', 'fancy', 'luxurious', 'chic'],
    'balanced': ['comfortable', 'welcoming', 'friendly', 'pleasant', 'harmonious', 'balanced', 'moderate', 'casual', 'nice', 'agreeable']
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
    # If no reviews, return default values
    if not reviews:
        return {'energy': 0.5, 'calmness': 0.5, 'warmth': 0.5, 
                'elegance': 0.5, 'casual': 0.5, 'freshness': 0.5,
                'authenticity': 0.5}
    
    # Initialize sentiment analyzer
    sia = SentimentIntensityAnalyzer()
    
    # Initialize category scores
    category_scores = {
        'energy': 0.5, 'calmness': 0.5, 'warmth': 0.5, 
        'elegance': 0.5, 'casual': 0.5, 'freshness': 0.5,
        'authenticity': 0.5
    }
    vibe_scores = {
        'chill': 0.5, 'energetic': 0.5, 'formal': 0.5, 'balanced': 0.5
    }
    
    # Process each review
    for review_text in reviews:
        # Skip empty reviews
        if not review_text:
            continue
        
        # Get sentiment score
        sentiment = sia.polarity_scores(review_text)
        sentiment_multiplier = 0.5 + sentiment['compound'] * 0.5  # Range from 0 to 1
        
        # Simple keyword matching for vibes
        lower_text = review_text.lower()
        
        # For each vibe category
        for vibe, keywords in VIBE_KEYWORDS.items():
            # Count keyword matches
            match_count = sum(lower_text.count(keyword) for keyword in keywords)
            if match_count > 0:
                vibe_scores[vibe] += 0.1 * match_count * sentiment_multiplier
    
    # Normalize vibe scores
    max_score = max(vibe_scores.values())
    if max_score > 1.0:
        for vibe in vibe_scores:
            vibe_scores[vibe] /= max_score
    
    # Generate aura properties based on vibes
    if vibe_scores['chill'] > max(vibe_scores['energetic'], vibe_scores['formal']):
        category_scores['calmness'] = 0.7 + random.random() * 0.3
        category_scores['warmth'] = 0.6 + random.random() * 0.3
    elif vibe_scores['energetic'] > max(vibe_scores['chill'], vibe_scores['formal']):
        category_scores['energy'] = 0.7 + random.random() * 0.3
        category_scores['freshness'] = 0.6 + random.random() * 0.3
    elif vibe_scores['formal'] > max(vibe_scores['chill'], vibe_scores['energetic']):
        category_scores['elegance'] = 0.7 + random.random() * 0.3
        category_scores['authenticity'] = 0.6 + random.random() * 0.3
    else:
        category_scores['casual'] = 0.7 + random.random() * 0.3
        category_scores['warmth'] = 0.6 + random.random() * 0.3
    
    # Add vibe scores to final output
    category_scores.update({f"vibe_{vibe}": score for vibe, score in vibe_scores.items()})
    
    return category_scores

def generate_gradient(scores):
    """Generate a gradient based on aura scores"""
    # Find dominant aura categories
    aura_scores = {k: v for k, v in scores.items() if not k.startswith('vibe_')}
    aura_items = sorted(aura_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Get the top two categories
    if len(aura_items) >= 2:
        top_category = aura_items[0][0]
        second_category = aura_items[1][0]
    else:
        top_category = aura_items[0][0] if aura_items else 'energy'
        second_category = 'warmth'  # Default second category
    
    # Extract vibe scores
    vibe_scores = {k.replace('vibe_', ''): v for k, v in scores.items() if k.startswith('vibe_')}
    
    # Determine vibe type using the updated scores
    vibe_type = determine_vibe_type(vibe_scores)
    
    # Generate more diverse color combinations (40% chance)
    if random.random() < 0.4:
        # Use colors from the top two categories directly
        start_color = random.choice(BASE_COLORS[top_category])
        end_color = random.choice(BASE_COLORS[second_category])
    elif random.random() < 0.5:
        # Mix colors from different vibe categories (50% of remaining cases)
        all_vibe_types = list(VIBE_COLORS.keys())
        
        # Ensure we don't pick the same vibe twice
        primary_vibe = vibe_type
        remaining_vibes = [v for v in all_vibe_types if v != primary_vibe]
        secondary_vibe = random.choice(remaining_vibes)
        
        # Get colors from both categories
        primary_color_set = random.choice(VIBE_COLORS[primary_vibe])
        secondary_color_set = random.choice(VIBE_COLORS[secondary_vibe])
        
        # Mix them by using one's dark color with the other's light color
        if random.random() < 0.5:
            start_color = primary_color_set['dark']
            end_color = secondary_color_set['light']
        else:
            start_color = secondary_color_set['dark']
            end_color = primary_color_set['light']
    else:
        # Use colors from the determined vibe type
        color_set = random.choice(VIBE_COLORS[vibe_type])
        start_color = color_set['dark']
        end_color = color_set['light']
    
    return f"linear-gradient(45deg, {start_color}, {end_color})"

def determine_vibe_type(vibe_scores):
    """Determine the overall vibe type based on scores"""
    # Handle empty dictionary case
    if not vibe_scores:
        return 'balanced'  # Default vibe type if no scores available
        
    # Add some randomness for variety (softmax-like)
    temperature = 0.3  # Controls randomness - higher means more random
    randomized_scores = {}
    for vibe, score in vibe_scores.items():
        randomized_scores[vibe] = score + random.random() * temperature
    
    # Return the vibe with the highest score
    return max(randomized_scores.items(), key=lambda x: x[1])[0]

def determine_shape(rating):
    """Determine aura shape based on rating"""
    try:
        if rating <= 2.0:
            return "soft"
        elif rating <= 3.0:
            return "pulse"
        elif rating <= 4.0:
            return "flowing"
        else:
            return "sparkle"
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
        
        # Print for debugging
        print(f"    Got details for place {place_id}: {place_details.get('status')}")
        
        # Return the original response which includes a 'result' key
        return place_details
    except Exception as e:
        print(f"    Error getting place details for {place_id}: {e}")
        # Return empty dict with result key
        return {'result': {}}

def create_aura(review_texts, avg_rating):
    """Create an aura based on review texts and rating"""
    try:
        # Use a simpler approach with a fallback mechanism
        # Analyze sentiment of reviews
        sia = SentimentIntensityAnalyzer()
        sentiments = [sia.polarity_scores(text)['compound'] for text in review_texts if text]
        
        # Use simple keyword matching as fallback
        vibe_keywords = {
            'chill': ['relaxed', 'calm', 'chill', 'peaceful', 'quiet', 'cozy'],
            'energetic': ['lively', 'energetic', 'fun', 'exciting', 'vibrant', 'dynamic'],
            'formal': ['elegant', 'sophisticated', 'upscale', 'fancy', 'classy', 'professional'],
            'balanced': ['balanced', 'comfortable', 'pleasant', 'nice', 'good', 'decent']
        }
        
        # Map vibes to base color categories for more diverse combinations
        vibe_to_color_mapping = {
            'chill': ['calmness', 'freshness'],
            'energetic': ['energy', 'warmth', 'authenticity'],
            'formal': ['elegance', 'authenticity'],
            'balanced': ['casual', 'freshness', 'calmness']
        }
        
        # Default vibe if we can't determine one
        vibe = 'balanced'
        
        # Try to determine vibe from reviews
        if review_texts:
            # Combine all reviews into a single string and lowercase
            all_text = ' '.join(review_texts).lower()
            
            # Count occurrences of keywords for each vibe
            vibe_scores = {}
            for v, keywords in vibe_keywords.items():
                score = sum(all_text.count(keyword) for keyword in keywords)
                vibe_scores[v] = score
            
            # Use sentiment to influence the vibe
            avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0
            
            # Adjust vibe scores based on sentiment
            if avg_sentiment > 0.5:  # Very positive
                vibe_scores['energetic'] += 2
                vibe_scores['balanced'] += 1
            elif avg_sentiment > 0.2:  # Positive
                vibe_scores['chill'] += 1
                vibe_scores['balanced'] += 2
            elif avg_sentiment < -0.2:  # Negative
                vibe_scores['formal'] += 1
            
            # Select vibe with highest score
            vibe = max(vibe_scores, key=vibe_scores.get)
        
        # Decide whether to use diverse colors (70% chance) or vibe-based colors (30% chance)
        if random.random() < 0.7:
            # Use diverse colors - pick two different color categories
            primary_category = random.choice(vibe_to_color_mapping[vibe])
            
            # Get all color categories and remove the primary one
            all_categories = list(BASE_COLORS.keys())
            all_categories.remove(primary_category)
            
            # Pick a secondary category that's different from the primary
            secondary_category = random.choice(all_categories)
            
            # Get colors from each category
            start_color = random.choice(BASE_COLORS[primary_category])
            end_color = random.choice(BASE_COLORS[secondary_category])
            
            # Generate a name that reflects both color categories
            aura_name = f"{random.choice(AURA_NAMES[primary_category])} {primary_category.capitalize()}-{secondary_category.capitalize()} Aura"
        else:
            # Use vibe-based colors for consistency with previous code
            color_set = random.choice(VIBE_COLORS[vibe])
            start_color = color_set['dark']
            end_color = color_set['light']
            aura_name = f"{random.choice(AURA_NAMES[vibe])} {vibe.capitalize()} Aura"
        
        # Create the gradient
        gradient = f"linear-gradient(45deg, {start_color}, {end_color})"
        
        # Determine shape based on rating
        shape = determine_shape(avg_rating)
        
        return {
            'name': aura_name,
            'color': gradient,
            'shape': shape
        }
    except Exception as e:
        print(f"Error in create_aura: {e}")
        # Return a default aura in case of errors
        return {
            'name': "Dynamic Diverse Aura",
            'color': "linear-gradient(45deg, #FF5252, #26A69A)",  # Red to Teal
            'shape': "flowing"
        }

def seed_database():
    """Seed the database with locations and reviews"""
    print("Seeding database...")
    
    # Create test user
    user = create_test_user()
    test_collection = create_test_collection(user)
    print(f"Created test user: {user.username} and test collection: {test_collection.name}")
    
    # Count total locations added
    total_locations = 0
    
    # Process each area and place type
    for area in NYC_AREAS:
        print(f"Processing area: {area['name']}")
        
        for place_type in PLACE_TYPES:
            print(f"  - Searching for {place_type}s...")
            
            # Search for places in this area
            places_result = gmaps.places_nearby(
                location=area['center'],
                radius=area['radius'],
                type=place_type,
                rank_by="prominence"
            )
            
            # Limit the number of locations per type in test mode
            locations_limit = MAX_LOCATIONS_PER_TYPE if not TEST_MODE else 3
            places = places_result.get('results', [])[:locations_limit]
            
            print(f"    Found {len(places)} {place_type}s")
            
            # Process each place
            for place in places:
                try:
                    place_id = place.get('place_id')
                    if not place_id:
                        continue
                    
                    # Check if place already exists in database
                    existing_location = Location.query.filter_by(google_place_id=place_id).first()
                    if existing_location:
                        print(f"    Skipping existing location: {place.get('name')}")
                        continue
                    
                    # Get full place details
                    details = get_place_details(place_id)
                    
                    # Skip places without proper data
                    if not details or 'result' not in details:
                        continue
                    
                    place_details = details['result']
                    reviews_data = place_details.get('reviews', [])
                    
                    # Calculate avg rating
                    avg_rating = place_details.get('rating', 3.0)
                    
                    # Extract review text for analysis
                    review_texts = [review.get('text', '') for review in reviews_data]
                    
                    # Create aura based on reviews
                    aura = create_aura(review_texts, avg_rating)
                    
                    # Create location object
                    location = Location(
                        name=place_details.get('name', ''),
                        google_place_id=place_id,
                        latitude=place_details.get('geometry', {}).get('location', {}).get('lat'),
                        longitude=place_details.get('geometry', {}).get('location', {}).get('lng'),
                        place_type=place_type,
                        address=place_details.get('formatted_address', ''),
                        phone=place_details.get('formatted_phone_number', ''),
                        website=place_details.get('website', ''),
                        price_level=place_details.get('price_level', 0),
                        rating=avg_rating,
                        user_ratings_total=place_details.get('user_ratings_total', 0),
                        area=area['name'],
                        aura_name=aura['name'],
                        aura_color=aura['color'],
                        aura_shape=aura['shape']
                    )
                    
                    db.session.add(location)
                    db.session.flush()  # Flush to get the location ID
                    total_locations += 1
                    
                    # Add reviews for this location
                    review_limit = MAX_REVIEWS_PER_LOCATION if not TEST_MODE else 2
                    for review_data in reviews_data[:review_limit]:
                        review = Review(
                            location_id=location.id,
                            user_id=user.id,  # Assign to our test user
                            body=review_data.get('text', ''),
                            rating=review_data.get('rating', 0)
                        )
                        db.session.add(review)
                    
                    # Add to test collection
                    if random.random() < 0.3:  # 30% chance to add to collection
                        test_collection.locations.append(location)
                    
                    # Commit after each location to avoid transaction issues
                    db.session.commit()
                    print(f"    Added location: {location.name}")
                
                except Exception as e:
                    db.session.rollback()  # Roll back transaction on error
                    print(f"Error processing place: {e}")
                    continue
    
    # Check if we need to add sample data as fallback
    if total_locations == 0:
        print("No locations were added from API. Adding sample locations instead.")
        create_sample_locations(user, test_collection)
        total_locations = Location.query.count()
    
    print(f"Seeding complete. Added {total_locations} locations.")

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