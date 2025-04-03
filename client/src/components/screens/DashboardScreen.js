import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuraVisualization from '../AuraVisualization';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import './DashboardScreen.css';

// NYC center coordinates as default
const DEFAULT_CENTER = {
  lat: 40.7128,
  lng: -74.0060
};

// Map container style
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Map styles for dark theme
const mapStyles = [
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#ffffff" }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.stroke",
    "stylers": [
      { "visibility": "on" },
      { "color": "#000000" },
      { "weight": 2 }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      { "color": "#1a1a1a" },
      { "weight": 0.8 }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [
      { "color": "#222222" }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      { "color": "#333333" }
    ]
  },
  {
    "featureType": "poi.business",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi.attraction",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi.government",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi.medical",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi.park",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi.place_of_worship",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      { "color": "#444444" }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#999999" }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      { "color": "#666666" }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#666666" }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      { "color": "#555555" }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry",
    "stylers": [
      { "color": "#444444" }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [
      { "color": "#333333" }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      { "color": "#1a1a1a" }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#999999" }
    ]
  }
];

// Google Maps libraries
const libraries = ['places'];

// Function to determine aura shape based on answer speed
const determineAuraShape = (speed) => {
    if (!speed) return 'balanced';
    
    // Check if a testing shape is requested in URL
    const urlParams = new URLSearchParams(window.location.search);
    const testShape = urlParams.get('testShape');
    if (testShape && ['balanced', 'sparkling', 'flowing', 'pulsing'].includes(testShape)) {
        console.log("Using test shape from URL:", testShape);
        return testShape;
    }
    
    if (speed < 3) return 'sparkling';
    if (speed > 7) return 'flowing';
    if (speed >= 3 && speed <= 5) return 'balanced';
    return 'pulsing';
};

function DashboardScreen() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(DEFAULT_CENTER);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState(null);
    const mapRef = useRef(null);
    
    // Load Google Maps API
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyApqLTebKHFgwbXJUm_Jf45yelcPMfrXck';
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        id: 'google-map-script',
        libraries
    });
    
    console.log("DashboardScreen mounted with userId param:", userId);
    console.log("Google Maps API loading status:", { isLoaded, loadError });
    
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                console.log("Fetching user data for ID:", userId);
                
                const storedUser = localStorage.getItem('user');
                let storedUserData = null;
                
                if (storedUser) {
                    storedUserData = JSON.parse(storedUser);
                    console.log("User data from localStorage:", storedUserData);
                    
                    if (storedUserData.aura_color || storedUserData.auraColor) {
                        console.log("Using user data with aura from localStorage");
                        const processedData = {
                            ...storedUserData,
                            username: storedUserData.username || "User",
                            aura_color: storedUserData.aura_color || storedUserData.auraColor || 'linear-gradient(to right, #6d4aff, #9e8aff)',
                            aura_shape: storedUserData.aura_shape || storedUserData.auraShape || determineAuraShape(5),
                            response_speed: storedUserData.response_speed || storedUserData.responseSpeed || 'medium'
                        };
                        setUserData(processedData);
                        setLoading(false);
                        return;
                    }
                }
                
                const apiUrl = `http://localhost:5001/api/users/${userId}`;
                console.log("API URL:", apiUrl);
                
                const response = await fetch(apiUrl);
                console.log("API Response status:", response.status);
                
                if (!response.ok) {
                    if (storedUserData) {
                        console.log("Using localStorage data as fallback");
                        const processedData = {
                            ...storedUserData,
                            username: storedUserData.username || "User",
                            aura_color: storedUserData.aura_color || storedUserData.auraColor || 'linear-gradient(to right, #6d4aff, #9e8aff)',
                            aura_shape: storedUserData.aura_shape || storedUserData.auraShape || determineAuraShape(5),
                            response_speed: storedUserData.response_speed || storedUserData.responseSpeed || 'medium'
                        };
                        setUserData(processedData);
                        setLoading(false);
                        return;
                    }
                    throw new Error(`Failed to fetch user data: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("User data received:", data);
                
                const processedData = {
                    ...data,
                    username: data.username || "User",
                    aura_color: data.aura_color || 'linear-gradient(to right, #6d4aff, #9e8aff)',
                    aura_shape: data.aura_shape || determineAuraShape(data.answer_speed),
                    response_speed: data.response_speed || 'medium'
                };
                
                setUserData(processedData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setLoading(false);
            }
        };

        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    // Get user's current location - SIMPLIFIED VERSION
    useEffect(() => {
        console.log("Geolocation effect running");
        
        // Simple direct geolocation request
        if (navigator.geolocation) {
            console.log("Requesting geolocation...");
            
            // Simple geolocation request
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("Location received:", position);
                    
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    console.log("Setting new location:", newLocation);
                    setCurrentLocation(newLocation);
                    setLocationLoading(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setLocationError(error.message);
                    setLocationLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            console.error("Geolocation not supported");
            setLocationError("Geolocation is not supported by this browser");
            setLocationLoading(false);
        }
    }, []);

    // Add a separate useEffect to force geolocation request
    useEffect(() => {
        console.log("Force geolocation effect running");
        
        // Force a geolocation request after a short delay
        const timer = setTimeout(() => {
            console.log("Forcing geolocation request after delay");
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log("Forced geolocation success:", position);
                        
                        const newLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        
                        console.log("Setting location from forced request:", newLocation);
                        setCurrentLocation(newLocation);
                        setLocationLoading(false);
                    },
                    (error) => {
                        console.error("Forced geolocation error:", error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            }
        }, 1000);
        
        return () => clearTimeout(timer);
    }, []);

    // Handle map load - SIMPLIFIED VERSION
    const handleMapLoad = (map) => {
        console.log("Map loaded");
        mapRef.current = map;
        setMapLoaded(true);
        
        console.log("Current location when map loads:", currentLocation);
        
        // Force map to center on current location
        if (currentLocation !== DEFAULT_CENTER) {
            console.log("Centering map on user location:", currentLocation);
            map.setCenter(currentLocation);
        }
        
        // Add a check to see if we need to request location again
        if (currentLocation === DEFAULT_CENTER) {
            console.log("Using default location, requesting geolocation again");
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log("Location received after map load:", position);
                        
                        const newLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        
                        console.log("Setting new location after map load:", newLocation);
                        setCurrentLocation(newLocation);
                        map.setCenter(newLocation);
                    },
                    (error) => {
                        console.error("Geolocation error after map load:", error);
                    }
                );
            }
        }
    };

    // Add a useEffect to log when currentLocation changes
    useEffect(() => {
        console.log("currentLocation changed:", currentLocation);
        
        // If map is loaded and we have a valid location, update it
        if (mapRef.current && currentLocation !== DEFAULT_CENTER) {
            console.log("Updating map center to new location:", currentLocation);
            mapRef.current.setCenter(currentLocation);
        }
    }, [currentLocation]);

    if (loading) {
        return <div className="loading">Loading your aura...</div>;
    }

    if (!userData) {
        return <div className="error">Unable to load user data. Please try logging in again.</div>;
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Hello, {userData.username}</h1>
            </header>
            
            <main className="dashboard-content">
                <div className="top-widgets">
                    <section className="widget aura-widget square-widget">
                        <div className="aura-visualization">
                            <AuraVisualization 
                                auraColor={userData.aura_color} 
                                auraShape={userData.aura_shape}
                                responseSpeed={userData.response_speed}
                            />
                        </div>
                    </section>
                    
                    <section className="widget discover-widget">
                        <h2>Discover</h2>
                        <div className="map-container">
                            {loadError ? (
                                <div className="map-error">
                                    Error loading map
                                </div>
                            ) : locationError ? (
                                <div className="map-error">
                                    {locationError}
                                </div>
                            ) : locationLoading ? (
                                <div className="map-loading">
                                    Getting your location...
                                </div>
                            ) : !isLoaded ? (
                                <div className="map-loading">
                                    Loading Google Maps API...
                                </div>
                            ) : (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={currentLocation}
                                    zoom={15}
                                    options={{
                                        disableDefaultUI: true,
                                        zoomControl: true,
                                        mapTypeControl: false,
                                        streetViewControl: false,
                                        fullscreenControl: false,
                                        styles: mapStyles
                                    }}
                                    onLoad={handleMapLoad}
                                    onClick={() => {
                                        console.log("Map clicked, navigating to discover");
                                        navigate(`/discover/${userId}`);
                                    }}
                                >
                                    {isLoaded && (
                                        <Marker
                                            position={currentLocation}
                                            icon={{
                                                url: currentLocation === DEFAULT_CENTER 
                                                    ? "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3e%3ccircle cx='7' cy='7' r='6' fill='%23FF5E62' stroke='%23FFFFFF' stroke-width='2'/%3e%3c/svg%3e"
                                                    : "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3e%3ccircle cx='7' cy='7' r='6' fill='%234285F4' stroke='%23FFFFFF' stroke-width='2'/%3e%3c/svg%3e",
                                                scaledSize: new window.google.maps.Size(14, 14),
                                                anchor: new window.google.maps.Point(7, 7)
                                            }}
                                        />
                                    )}
                                    {currentLocation === DEFAULT_CENTER && (
                                        <div className="default-location-notice">
                                            Using default location
                                        </div>
                                    )}
                                </GoogleMap>
                            )}
                        </div>
                    </section>
                </div>
                
                <section className="widget suggestions-widget">
                    <h2>Auras Nearby</h2>
                    <div className="suggestions-container">
                        <div className="location-suggestions">
                            <div className="location-card">
                                <div className="location-card-content">
                                    <h3>Serenity Gardens</h3>
                                </div>
                                <div className="location-aura-placeholder"></div>
                            </div>
                            <div className="location-card">
                                <div className="location-card-content">
                                    <h3>The Vibrant Café</h3>
                                </div>
                                <div className="location-aura-placeholder"></div>
                            </div>
                        </div>
                        <button className="action-button" onClick={() => navigate(`/discover/${userId}`)}>View More</button>
                    </div>
                </section>
                
                <section className="widget collections-widget">
                    <div className="collections-container">
                        <div className="collections-grid">
                            <div className="collections-column base-collections">
                                <h3 className="column-title">Recents</h3>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Serenity Gardens</h3>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>The Vibrant Café</h3>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Moonlight Bookshop</h3>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                            </div>
                            
                            <div className="collections-column saved-collections">
                                <h3 className="column-title">Saved Collections</h3>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Coffee Shops</h3>
                                        <p>5 items</p>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Weekend Getaways</h3>
                                        <p>3 items</p>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Meditation Spots</h3>
                                        <p>4 items</p>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                            </div>
                        </div>
                        <button className="action-button">Create New Collection</button>
                    </div>
                </section>
            </main>
            
            <footer className="dashboard-footer">
                <button className="footer-button">Aura Guide</button>
            </footer>
        </div>
    );
}

export default DashboardScreen;