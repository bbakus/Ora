import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import AuraVisualization from '../AuraVisualization';
import './DiscoverScreen.css';

// Replace the hardcoded API key with one that works on localhost
// This key allows HTTP referrers: localhost, *.localhost
const GOOGLE_MAPS_API_KEY = "AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg";

const NYC_CENTER = {
  lat: 40.7128,
  lng: -74.0060
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Improved map style - more vibrant night mode with better contrast
const mapStyles = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8ec3b9"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1a3646"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4b6878"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#64779e"
      }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4b6878"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#334e87"
      }
    ]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#283d6a"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6f9ba5"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3C7680"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#304a7d"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2c6675"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#255763"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#b0d5ce"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#283d6a"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3a4762"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0e1626"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#4e6d70"
      }
    ]
  }
];

function DiscoverScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: paramUserId } = useParams();
  const [currentLocation, setCurrentLocation] = useState(NYC_CENTER);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [placeType, setPlaceType] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [locationsFetched, setLocationsFetched] = useState(false);
  
  // Debugging for current position
  useEffect(() => {
    console.log("Current position state:", currentLocation);
  }, [currentLocation]);

  // Get the user ID from URL params or location state
  useEffect(() => {
    const userIdFromParams = paramUserId;
    const userIdFromState = location.state?.userId;
    
    if (userIdFromParams) {
      setUserId(userIdFromParams);
    } else if (userIdFromState) {
      setUserId(userIdFromState);
    } else {
      // Fallback to a hardcoded ID for testing
      setUserId(1);
      console.log("Using fallback user ID: 1");
    }
  }, [paramUserId, location]);
  
  // Fetch user data from API
  useEffect(() => {
    if (!userId) return;
    
    const fetchUserData = async () => {
      try {
        setUserDataLoading(true);
        const response = await fetch(`http://localhost:5000/api/users/${userId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("User data fetched:", data);
        setUserData(data);
        setUserDataLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback data only if API fails
        setUserData({
          username: "User",
          aura_color: "linear-gradient(to right, #6d4aff, #9e8aff)",
          aura_shape: "balanced",
          response_speed: "medium"
        });
        setUserDataLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId]);
  
  // Get user's geolocation if available - ENSURE THIS WORKS
  useEffect(() => {
    if (navigator.geolocation) {
      console.log("Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Got user geolocation:", position.coords);
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(userPos);
          console.log("Current location updated to:", userPos);
        },
        (error) => {
          console.error("Error getting geolocation:", error);
          console.log("Using NYC fallback due to geolocation error");
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.log("Geolocation not available in this browser");
    }
  }, []);
  
  // Fetch locations from API - ENSURE THIS WORKS WITH DEBUGGING
  useEffect(() => {
    if (!userId) {
      console.log("No userId available, skipping location fetch");
      return;
    }
    
    console.log(`Fetching locations for user ${userId} at position:`, currentLocation);
    fetchLocations();
  }, [userId, placeType, currentLocation.lat, currentLocation.lng]);

  // Handle filter change
  const handleFilterChange = (e) => {
    setPlaceType(e.target.value);
  };

  // Handle marker click
  const handleMarkerClick = (location) => {
    setSelectedLocation(location);
  };
  
  // Handle map load
  const handleMapLoad = (map) => {
    setMapReady(true);
    console.log("Google Maps loaded successfully");
    console.log("Current user position:", currentLocation);
    console.log("Locations data available:", locations.length, "locations");
  };
  
  // Custom marker component for auras
  const AuraMarker = ({ location }) => {
    // Get aura data with fallbacks for missing properties
    const auraColor = location.aura?.color || location.tags?.[0]?.color || '#8864fe';
    const auraShape = location.aura?.shape || location.tags?.[0]?.shape || 'balanced';
    
    // Process the aura color for use in SVG
    let markerColor = auraColor;
    if (auraColor.includes('gradient')) {
      // Extract the first color from the gradient for the marker
      const colorMatch = auraColor.match(/#[0-9A-Fa-f]{6}/);
      markerColor = colorMatch ? colorMatch[0] : '#8864fe';
    }
    
    // Run the aura color through the visualizer for consistency
    const processedAuraColor = AuraVisualization.processAuraColor 
      ? AuraVisualization.processAuraColor(auraColor) 
      : markerColor;
    
    return (
      <Marker
        position={{ lat: location.latitude, lng: location.longitude }}
        onClick={() => handleMarkerClick(location)}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,
            <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22" cy="22" r="18" fill="${encodeURIComponent(markerColor)}" opacity="0.9" />
              <circle cx="22" cy="22" r="15" fill="${encodeURIComponent(markerColor)}" opacity="0.7" />
              <circle cx="22" cy="22" r="10" fill="${encodeURIComponent(markerColor)}" opacity="0.9" />
            </svg>`,
          scaledSize: { width: 44, height: 44 },
          anchor: { x: 22, y: 22 }
        }}
      />
    );
  };

  // Helper function to calculate distance between two points (using Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Add the fetchLocations function
  const fetchLocations = async () => {
    try {
      setLoading(true);
      console.log("Starting location fetch from database...");
      
      // Using the correct API endpoint for locations
      const url = `http://localhost:5000/api/locations?user_id=${userId}${placeType ? `&place_type=${placeType}` : ''}`;
      console.log("Fetching locations from:", url);
      
      // Add debugging for network request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);
      
      console.log("Locations API response status:", response.status);
      
      // Log the raw response for debugging
      const responseText = await response.text();
      console.log("Raw API response:", responseText);
      
      // Parse the response text manually
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      console.log("Full API response data:", data);
      
      // Process the location data
      if (Array.isArray(data)) {
        console.log("Successfully fetched", data.length, "locations");
        
        if (data.length === 0) {
          console.log("API returned empty array, using sample data");
          throw new Error("Empty data array");
        }
        
        // Process each location to ensure consistent data format
        const processedLocations = data.map(loc => {
          console.log("Processing location:", loc);
          
          // Ensure location has necessary properties including coordinates
          return {
            ...loc,
            // Convert string coordinates to numbers if needed
            latitude: typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude,
            longitude: typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude,
            // If the API returns tags instead of aura, we'll adapt
            aura: loc.aura || (loc.tags && loc.tags.length > 0 ? {
              color: loc.tags[0].color,
              shape: loc.tags[0].shape
            } : undefined)
          };
        });
        
        console.log("Processed locations:", processedLocations);
        
        // Calculate distance for each location from user's current position
        const locationsWithDistance = processedLocations.map(loc => {
          const distance = calculateDistance(
            currentLocation.lat, 
            currentLocation.lng, 
            loc.latitude, 
            loc.longitude
          );
          return { ...loc, distance };
        });
        
        // Sort by distance
        const sortedLocations = locationsWithDistance.sort((a, b) => a.distance - b.distance);
        
        console.log("Locations sorted by distance:", sortedLocations);
        setLocations(sortedLocations);
        setLocationsFetched(true);
      } else {
        console.error("API returned unexpected data format:", data);
        throw new Error("Invalid data format");
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching locations:', error);
      if (error.name === 'AbortError') {
        console.log("Fetch request timed out after 10 seconds");
      }
      console.log("Using sample data due to fetch error");
      
      // Sample data for testing positioned relative to user's location
      const sampleLocations = [
        {
          id: 1,
          name: "Serenity Garden Cafe",
          latitude: currentLocation.lat + 0.003,
          longitude: currentLocation.lng + 0.005,
          place_type: "cafe",
          tags: [
            {
              color: "linear-gradient(to right, #FF5E62, #FF9966)",
              shape: "flowing"
            }
          ]
        },
        {
          id: 2,
          name: "Vibrant Bistro",
          latitude: currentLocation.lat - 0.002,
          longitude: currentLocation.lng + 0.008,
          place_type: "restaurant",
          tags: [
            {
              color: "linear-gradient(to right, #4776E6, #8E54E9)",
              shape: "sparkling"
            }
          ]
        },
        {
          id: 3,
          name: "Moonlight Bookshop",
          latitude: currentLocation.lat + 0.006,
          longitude: currentLocation.lng - 0.003,
          place_type: "store",
          tags: [
            {
              color: "linear-gradient(to right, #00d2ff, #3a7bd5)",
              shape: "balanced" 
            }
          ]
        },
        {
          id: 4,
          name: "Cosmic Coffee",
          latitude: currentLocation.lat - 0.004,
          longitude: currentLocation.lng - 0.007,
          place_type: "cafe",
          tags: [
            {
              color: "linear-gradient(to right, #f953c6, #b91d73)",
              shape: "intense" 
            }
          ]
        }
      ];
      
      // Calculate distance for sample locations
      const samplesWithDistance = sampleLocations.map(loc => {
        const distance = calculateDistance(
          currentLocation.lat, 
          currentLocation.lng, 
          loc.latitude, 
          loc.longitude
        );
        return { ...loc, distance };
      });
      
      // Sort by distance
      const sortedSamples = samplesWithDistance.sort((a, b) => a.distance - b.distance);
      
      console.log("Sample locations with distance:", sortedSamples);
      setLocations(sortedSamples);
      setLocationsFetched(true);
      setLoading(false);
    }
  };

  return (
    <div className="discover-screen">
      <header className="discover-header">
        <h1>Discover</h1>
        <div className="discover-filters">
          <select className="filter-select" value={placeType} onChange={handleFilterChange}>
            <option value="">All Places</option>
            <option value="restaurant">Restaurants</option>
            <option value="cafe">Cafes</option>
            <option value="bar">Bars</option>
            <option value="park">Parks</option>
            <option value="night_club">Night Clubs</option>
            <option value="store">Shops</option>
            <option value="museum">Museums</option>
            <option value="theater">Theaters</option>
          </select>
        </div>
      </header>
      
      <main className="discover-content">
        {/* Full-screen map container */}
        <div className="map-container full-screen">
          <LoadScript 
            googleMapsApiKey={GOOGLE_MAPS_API_KEY} 
            loadingElement={<div className="loading">Loading Google Maps...</div>}
            onError={(error) => {
              console.error("Google Maps loading error:", error);
              alert("Google Maps failed to load - check console for details. This app requires a valid Google Maps API key with http://localhost:3000 in the allowed referrers.");
            }}
            onLoad={() => console.log("Google Maps script loaded successfully")}
            libraries={["places"]}
            region="US"
            language="en"
            channel="ora-app"
            version="weekly"
            mapIds={["8e0a97af9386fef", "ed1309c122a3dfcb"]}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={currentLocation}
              zoom={14}
              options={{
                styles: mapStyles,
                zoomControl: true,
                mapTypeControl: false,
                scaleControl: true,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: false
              }}
              onLoad={handleMapLoad}
            >
              {/* Current location marker - SUPER VISIBLE WITH DEBUG INFO */}
              <Marker
                position={currentLocation}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,
                    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="32" cy="32" r="32" fill="rgba(0,0,0,0.2)" />
                      <circle cx="32" cy="32" r="28" fill="rgba(255,255,255,0.9)" />
                      <circle cx="32" cy="32" r="20" fill="#4285F4" />
                      <circle cx="32" cy="32" r="10" fill="white" />
                      <circle cx="32" cy="32" r="5" fill="#4285F4" />
                    </svg>`,
                  scaledSize: { width: 64, height: 64 },
                  anchor: { x: 32, y: 32 },
                  zIndex: 1000
                }}
              />
              
              {/* Debug label - always visible */}
              <Marker
                position={currentLocation}
                label={{
                  text: "YOU ARE HERE",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "16px",
                  className: "map-marker-label"
                }}
                options={{
                  zIndex: 1001
                }}
              />
              
              {/* Location markers with auras */}
              {!loading && mapReady && locationsFetched && locations.map(location => (
                <AuraMarker key={location.id} location={location} />
              ))}
              
              {/* Info window for selected location */}
              {selectedLocation && (
                <InfoWindow
                  position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
                  onCloseClick={() => setSelectedLocation(null)}
                >
                  <div className="location-info">
                    <h3>{selectedLocation.name}</h3>
                    <div className="location-aura">
                      <div 
                        className="aura-preview"
                        style={{ 
                          background: selectedLocation.aura?.color || selectedLocation.tags?.[0]?.color || '#8864fe',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px'
                        }}
                      ></div>
                      <div className="location-details">
                        <p className="location-type">{selectedLocation.place_type}</p>
                        <button 
                          className="view-details-btn"
                          onClick={() => navigate(`/location/${selectedLocation.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
          
          {/* Move debug overlay outside the GoogleMap component */}
          {/* Debug overlay for API status */}
          <div className="debug-overlay">
            <p>User ID: {userId || 'Not Set'}</p>
            <p>Position: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</p>
            <p>Locations: {locations.length} found {locationsFetched ? '✓' : '✗'}</p>
            <p>API Status: {loading ? 'Loading...' : 'Done'}</p>
          </div>
          
          {/* User Aura Overlay */}
          {!userDataLoading && (
            <div className="user-aura-overlay">
              <div className="user-aura-circle">
                <AuraVisualization 
                  auraColor={userData?.aura_color || "#8864fe"} 
                  auraShape={userData?.aura_shape || "balanced"}
                  responseSpeed={userData?.response_speed || "medium"}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Location cards as an overlay - optimized for 2 cards */}
        <div className="locations-overlay">
          <div className="handle">
            <div className="handle-bar"></div>
          </div>
          <h2>Locations Near You</h2>
          {loading ? (
            <div className="loading">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="no-locations">No locations found. Try adjusting your filters.</div>
          ) : (
            <div className="location-cards">
              {/* Only show the TWO CLOSEST locations */}
              {locations.slice(0, 2).map(location => {
                // Get aura color with fallback
                const auraColor = location.aura?.color || location.tags?.[0]?.color || '#8864fe';
                
                return (
                  <div 
                    key={location.id} 
                    className="location-card"
                    onClick={() => {
                      setSelectedLocation(location);
                      // Center the map on this location
                      setCurrentLocation({
                        lat: location.latitude,
                        lng: location.longitude
                      });
                    }}
                  >
                    <div className="location-content">
                      <h3>{location.name}</h3>
                      <p className="location-type">{location.place_type}</p>
                      <p className="location-distance">
                        {location.distance < 1 
                          ? `${Math.round(location.distance * 1000)} m away` 
                          : `${location.distance.toFixed(1)} km away`}
                      </p>
                    </div>
                    <div 
                      className="location-aura-marker" 
                      style={{ background: auraColor }}
                    ></div>
                  </div>
                );
              })}
              {locations.length > 2 && (
                <div className="more-locations-indicator">
                  <span>+{locations.length - 2} more locations</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Add this static method for consistent aura color processing
AuraVisualization.processAuraColor = (auraColor) => {
  if (!auraColor) return '#8864fe'; // Default
  
  if (auraColor.includes('gradient')) {
    // Extract first color from gradient
    const match = auraColor.match(/#[0-9A-Fa-f]{6}/);
    return match ? match[0] : '#8864fe';
  }
  
  return auraColor;
};

export default DiscoverScreen;