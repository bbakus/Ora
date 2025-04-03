# Ora - Discover Places with Auras

Ora is an application that helps users discover places with unique "auras" - visual representations of a location's mood, energy, and character. The app integrates with Google Maps and analyzes location data to assign both color and shape auras to places.

## Features

- **Location Discovery**: Explore places on a beautiful map interface with customizable search filters and radius
- **Aura Visualization**: Locations are displayed with unique aura visualizations using both colors and shapes
- **NLP-Powered Aura Analysis**: Reviews and place data are analyzed using natural language processing to assign meaningful auras
- **Google Places Integration**: Seamlessly pulls location data from Google Places API
- **User Aura Matching**: Match your own aura preferences with locations for personalized recommendations

## Technical Implementation

### Aura Analyzer

The app uses a sophisticated NLP-based aura analyzer that:

1. Processes reviews using sentiment analysis and keyword detection
2. Assigns both color and shape attributes to each aura based on the analysis
3. Generates a unique visual representation using SVG paths and gradients

### Google Places Integration

The application fetches location data from Google Places API and:

1. Stores locations in the database with their metadata
2. Retrieves reviews for sentiment analysis
3. Assigns auras to locations based on the analysis
4. Displays locations with their auras on the map

### Visualizations

Locations are displayed on the map using:

- Custom SVG markers with shapes that represent the aura shape (balanced, sparkling, flowing, pulsing)
- Radial gradients based on the aura color
- Visual effects that enhance the overall user experience

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- Google Maps API key
- Google Places API key

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys
3. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Install frontend dependencies:
   ```
   cd client
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   flask run
   ```
2. Start the frontend development server:
   ```
   cd client
   npm start
   ```

### API Keys Configuration

To use the Google Maps and Places APIs:

1. Create a project in the Google Cloud Console
2. Enable the Maps JavaScript API and Places API
3. Create API keys with appropriate restrictions
4. Add the keys to your `.env` file

## Key Components

- **DiscoverScreen**: Main interface for displaying and interacting with the map
- **LocationMarker**: Custom marker component that visualizes locations with their auras
- **AuraAnalyzer**: Backend service that processes location data and assigns auras
- **FetchNearbyLocations**: API endpoint that retrieves and processes Google Places data
