import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuraVisualization from '../AuraVisualization';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import UserAuraMarker from '../markers/UserAuraMarker';
import './DashboardScreen.css';
import AddFriendModal from '../modals/AddFriendModal';
import FriendRequestsModal from '../modals/FriendRequestsModal';
import CollectionLocationsModal from '../modals/CollectionLocationsModal';
import ViewFriendModal from '../modals/ViewFriendModal';
import API_BASE_URL from '../../config/api';

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

// Function to create pulsing dot SVG
const createPulsingDotSVG = () => {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="16" fill="#00FFFF" stroke="white" stroke-width="3">
        <animate attributeName="r" values="16;24;16" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="40" cy="40" r="32" fill="none" stroke="#00FFFF" stroke-width="2" opacity="0.5">
        <animate attributeName="r" values="32;40;32" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  `;
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
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);
    const [currentFriendsPage, setCurrentFriendsPage] = useState(0);
    const [collections, setCollections] = useState([]);
    const [recentLocations, setRecentLocations] = useState([]);
    
    // Add state for nearby auras
    const [nearbyAuras, setNearbyAuras] = useState([]);
    const [nearbyAurasLoading, setNearbyAurasLoading] = useState(true);
    
    // Add state for the collection locations modal
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState(null);

    const [showFriendModal, setShowFriendModal] = useState(false);
    const [selectedFriendId, setSelectedFriendId] = useState(null);
    
    // Load Google Maps API
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        id: 'google-map-script',
        libraries
    });
    
    console.log("DashboardScreen mounted with userId param:", userId);
    console.log("Google Maps API loading status:", { isLoaded, loadError });
    
    // Marker icon state for user location
    const [userMarkerIcon, setUserMarkerIcon] = useState(null);

    // State for modals
    const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
    const [isFriendRequestsModalOpen, setIsFriendRequestsModalOpen] = useState(false);
    
    // State for pending friend requests count
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Try to get cached data first for faster rendering
                const cachedData = localStorage.getItem(`user_${userId}`);
                if (cachedData) {
                    try {
                        const parsedData = JSON.parse(cachedData);
                        if (parsedData && Date.now() - parsedData.timestamp < 600000) { // 10 mins cache
                            console.log("Using cached user data from localStorage");
                            setUserData(parsedData.data);
                            setPendingRequestsCount(parsedData.data.pendingRequestsCount || 0);
                            return;
                        }
                    } catch (e) {
                        console.error("Error parsing cached data:", e);
                    }
                }

                console.log("Fetching user data for ID:", userId);
                const apiUrl = `${API_BASE_URL}/api/users/${userId}`;
                console.log("API URL:", apiUrl);

                const response = await fetch(apiUrl);
                console.log("API Response status:", response.status);

                if (!response.ok) {
                    throw new Error(`Failed to fetch user data: ${response.status}`);
                }

                const data = await response.json();
                console.log("User data received:", data);

                setUserData(data);
                setPendingRequestsCount(data.pendingRequestsCount || 0);

                // Update cache
                localStorage.setItem(`user_${userId}`, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));
                console.log("Updated user data in localStorage");
            } catch (error) {
                console.error("Error fetching user data:", error);
                setError(error.message);
            } finally {
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
            
            // Set loading state
            setLocationLoading(true);
            
            // Simple geolocation request with increased timeout
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
                    console.log("Using default location instead");
                    // Don't set error state, just use default location
                    setLocationLoading(false);
                },
                {
                    enableHighAccuracy: false, // Set to false for faster response
                    timeout: 30000, // Increased timeout to 30 seconds
                    maximumAge: 60000 // Allow cached positions up to 1 minute old
                }
            );
        } else {
            console.error("Geolocation not supported");
            setLocationError("Geolocation is not supported by this browser");
            setLocationLoading(false);
        }
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

    // Create and set user marker icon when map loads
    useEffect(() => {
        if (isLoaded && mapLoaded && window.google) {
            const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(createPulsingDotSVG());
            setUserMarkerIcon({
                url: iconUrl,
                scaledSize: new window.google.maps.Size(80, 80),
                anchor: new window.google.maps.Point(40, 40)
            });
        }
    }, [isLoaded, mapLoaded]);

    // Modify the fetchFriends function to actually fetch from API
    const fetchFriends = async () => {
        if (!userData) {
            setFriendsLoading(false);
            return;
        }
        
        try {
            setFriendsLoading(true);
            console.log("Fetching friends for user:", userId);
            
            // Fetch friends from API
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/friends`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friends: ${response.status}`);
            }
            
            const friendsData = await response.json();
            
            // Log the friends data to help with debugging
            console.log("Friends data received:", friendsData);
            friendsData.forEach(friend => {
                console.log(`Friend ${friend.username} aura data:`, {
                    id: friend.id,
                    aura_color: friend.aura_color,
                    aura_color1: friend.aura_color1,
                    aura_color2: friend.aura_color2,
                    aura_shape: friend.aura_shape
                });
            });
            
            setFriends(friendsData);
            setFriendsLoading(false);
        } catch (error) {
            console.error('Error fetching friends:', error);
            setFriends([]);
            setFriendsLoading(false);
        }
    };
    
    // Update the handleAddFriend function to open the modal
    const handleAddFriend = () => {
        setIsAddFriendModalOpen(true);
    };
    
    // Add handler to close the modal
    const handleCloseAddFriendModal = () => {
        setIsAddFriendModalOpen(false);
        // Optionally refresh friends list when modal closes
        fetchFriends();
    };
    
    // Call fetchFriends when component mounts
    useEffect(() => {
        if (userData) {
            fetchFriends();
        }
    }, [userData, userId]);
    
    // Fix the handleFriendClick function
    const handleFriendClick = (friendId) => {
        setSelectedFriendId(friendId);
        setShowFriendModal(true);
    };

    // Add handler for navigating friends
    const handleNextFriends = () => {
        const totalPages = Math.ceil(friends.length / 5);
        setCurrentFriendsPage((prevPage) => (prevPage + 1) % totalPages);
    };
    
    // Get the current page of friends to display
    const getCurrentPageFriends = () => {
        const startIndex = currentFriendsPage * 5;
        return friends.slice(startIndex, startIndex + 5);
    };

    

    // Load collections and recent locations
    useEffect(() => {
        if (userId) {
            setLoading(true);
            
            // Fetch collections from the API
            fetch(`${API_BASE_URL}/api/users/${userId}/collections`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch collections');
                    }
                    return response.json();
                })
                .then(collections => {
                    console.log("Fetched collections for dashboard:", collections);
                    
                    // Fetch locations for each collection to get their auras
                    const collectionsWithLocationPromises = collections.map(collection => 
                        fetch(`${API_BASE_URL}/api/users/${userId}/collections/${collection.id}`)
                            .then(response => response.ok ? response.json() : collection)
                            .catch(error => {
                                console.error(`Error fetching locations for collection ${collection.id}:`, error);
                                return collection;
                            })
                    );
                    
                    // Wait for all collections to be fetched with their locations
                    return Promise.all(collectionsWithLocationPromises);
                })
                .then(collectionsWithLocations => {
                    setCollections(collectionsWithLocations || []);
                    
                    // Get recent locations from localStorage as a fallback
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        try {
                            const userData = JSON.parse(storedUser);
                            const storedRecentLocations = userData.recentLocations || [];
                            
                            // If we have recent locations, fetch their details to ensure we have aura data
                            if (storedRecentLocations.length > 0) {
                                // Create promises for each location to fetch its complete data
                                const locationPromises = storedRecentLocations.map(location => 
                                    fetch(`${API_BASE_URL}/api/locations/${location.id}`)
                                        .then(response => {
                                            if (response.ok) return response.json();
                                            return location; // Return original location if fetch fails
                                        })
                                        .catch(error => {
                                            console.error(`Error fetching details for location ${location.id}:`, error);
                                            return location; // Return original location if fetch fails
                                        })
                                );
                                
                                // Wait for all location data to be fetched
                                Promise.all(locationPromises)
                                    .then(detailedLocations => {
                                        console.log("Fetched detailed recent locations:", detailedLocations);
                                        setRecentLocations(detailedLocations);
                                    })
                                    .catch(error => {
                                        console.error("Error fetching recent locations details:", error);
                                        setRecentLocations(storedRecentLocations);
                                    });
                            } else {
                                setRecentLocations([]);
                            }
                        } catch (error) {
                            console.error('Error parsing user data:', error);
                            setRecentLocations([]);
                        }
                    }
                    
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching collections:', error);
                    
                    // Fallback to localStorage
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        try {
                            const userData = JSON.parse(storedUser);
                            setCollections(userData.collections || []);
                            setRecentLocations(userData.recentLocations || []);
                        } catch (error) {
                            console.error('Error parsing user data:', error);
                            setCollections([]);
                            setRecentLocations([]);
                        }
                    }
                    
                    setLoading(false);
                });
        }
    }, [userId]);

    // Create collection function to pass to global namespace
    const createCollection = async (name, auraColor) => {
        try {
            if (!userId) return null;
            
            console.log("Creating new collection:", name);
            
            // Call the API to create a new collection
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: parseInt(userId),
                    name: name,
                    aura_color: auraColor || 'linear-gradient(125deg, #6d4aff, #9e8aff)'
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create collection: ${response.status}`);
            }
            
            const newCollection = await response.json();
            console.log("Created collection:", newCollection);
            
            // Update state
            setCollections(prevCollections => [...prevCollections, newCollection]);
            
            return newCollection.id;
        } catch (error) {
            console.error('Error creating collection:', error);
            
            // Fallback to local storage if API fails
            const newCollection = {
                id: Date.now().toString(), // Simple ID generation
                name,
                aura_color: auraColor || 'linear-gradient(125deg, #6d4aff, #9e8aff)',
                location_count: 0,
                locations: []
            };
            
            // Update state
            setCollections(prevCollections => [...prevCollections, newCollection]);
            
            // Update localStorage
            updateUserStorage({
                collections: [...collections, newCollection]
            });
            
            return newCollection.id;
        }
    };
    
    // Add location to collection function
    const addLocationToCollection = async (location, collectionId) => {
        try {
            if (!userId || !location || !collectionId) return false;
            
            console.log(`Adding location ${location.id} to collection ${collectionId}`);
            
            // Call API to add location to collection
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/collections/${collectionId}/add_location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    location_id: location.id
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Failed to add location to collection: ${response.status}`);
            }
            
            const updatedCollection = await response.json();
            console.log("Updated collection:", updatedCollection);
            
            // Update collections state with the newly updated collection
            setCollections(prevCollections => 
                prevCollections.map(col => 
                    col.id === updatedCollection.id ? updatedCollection : col
                )
            );
            
            return true;
        } catch (error) {
            console.error('Error adding location to collection:', error);
            
            // Fallback to localStorage if API fails
            // Find collection by ID
            const collectionIndex = collections.findIndex(c => c.id === collectionId);
            if (collectionIndex === -1) return false;
            
            // Check if location is already in collection
            const collection = collections[collectionIndex];
            const locationExists = collection.locations && 
                collection.locations.some(loc => loc.id === location.id);
            
            if (locationExists) return true; // Already exists, consider it a success
            
            // Create updated collections array
            const updatedCollections = [...collections];
            
            // Add location to collection
            const updatedLocations = [...(collection.locations || []), location];
            updatedCollections[collectionIndex] = {
                ...collection,
                locations: updatedLocations,
                location_count: updatedLocations.length
            };
            
            // Update state
            setCollections(updatedCollections);
            
            // Update localStorage
            updateUserStorage({
                collections: updatedCollections
            });
            
            return true;
        }
    };
    
    // Add location to recent views
    const addRecentLocation = (location) => {
        if (!location) return;
        
        // Ensure we have the complete location data with aura
        const fetchAndAddLocation = async () => {
            try {
                // Try to fetch complete location data
                const response = await fetch(`${API_BASE_URL}/api/locations/${location.id}`);
                let locationWithAura = location;
                
                if (response.ok) {
                    locationWithAura = await response.json();
                    console.log("Fetched complete location for recents:", locationWithAura);
                }
                
                // Remove if already exists (to move it to the top)
                const filteredLocations = recentLocations.filter(loc => loc.id !== locationWithAura.id);
                
                // Add to beginning of array (most recent first)
                const updatedLocations = [locationWithAura, ...filteredLocations].slice(0, 5); // Keep only 5 most recent
                
                // Update state
                setRecentLocations(updatedLocations);
                
                // Update localStorage
                updateUserStorage({
                    recentLocations: updatedLocations
                });
            } catch (error) {
                console.error("Error fetching location details:", error);
                
                // Fallback to using the location as-is
                const filteredLocations = recentLocations.filter(loc => loc.id !== location.id);
                const updatedLocations = [location, ...filteredLocations].slice(0, 5);
                setRecentLocations(updatedLocations);
                updateUserStorage({
                    recentLocations: updatedLocations
                });
            }
        };
        
        fetchAndAddLocation();
    };
    
    // Helper to update user data in localStorage
    const updateUserStorage = (updates) => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                localStorage.setItem('user', JSON.stringify({
                    ...userData,
                    ...updates
                }));
            }
        } catch (error) {
            console.error('Error updating localStorage:', error);
        }
    };
    
    // Add a function to refresh collections on demand
    const refreshCollections = () => {
        if (userId) {
            fetch(`${API_BASE_URL}/api/users/${userId}/collections`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch collections');
                    }
                    return response.json();
                })
                .then(collections => {
                    console.log("Refreshed collections:", collections);
                    setCollections(collections || []);
                })
                .catch(error => {
                    console.error('Error refreshing collections:', error);
                });
        }
    };
    
    // Expose refresh function in the global namespace
    useEffect(() => {
        if (!window.oraApp) {
            window.oraApp = {};
        }
        
        window.oraApp.dashboard = {
            createCollection,
            addLocationToCollection,
            addRecentLocation,
            refreshCollections
        };
        
        return () => {
            if (window.oraApp && window.oraApp.dashboard) {
                delete window.oraApp.dashboard;
            }
        };
    }, [collections, recentLocations]);
    
    // Refresh collections when dashboard screen is focused
    useEffect(() => {
        // Add focus event listener to refresh collections when window gains focus
        const handleFocus = () => {
            console.log("Window focused - refreshing collections");
            refreshCollections();
            
            // Also refresh recent locations from localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    const storedRecentLocations = userData.recentLocations || [];
                    
                    if (storedRecentLocations.length > 0) {
                        console.log("Loading recent locations from localStorage:", storedRecentLocations);
                        setRecentLocations(storedRecentLocations);
                    }
                } catch (error) {
                    console.error('Error parsing user data to get recent locations:', error);
                }
            }
        };
        
        window.addEventListener('focus', handleFocus);
        
        // Initial load
        refreshCollections();
        
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [userId]);

    // When rendering collections in the dashboard
    const renderRecentLocations = () => {
        if (recentLocations.length === 0) {
            return (
                <div className="empty-collections">
                    <p>No recent locations yet</p>
                </div>
            );
        }
        
        return recentLocations.map(location => {
            // Determine aura gradient using the same logic as for collections
            let auraColor = 'linear-gradient(125deg, #6d4aff, #9e8aff)'; // Default
            
            // Method 1: Check for aura_color1 and aura_color2
            if (location.aura_color1 && location.aura_color2) {
                auraColor = `linear-gradient(125deg, ${location.aura_color1}, ${location.aura_color2})`;
            }
            // Method 2: Check for gradient string in aura_color
            else if (location.aura_color) {
                // If it's already a gradient string, use it directly
                if (location.aura_color.includes('gradient')) {
                    auraColor = location.aura_color;
                } 
                // Try to extract hex colors from a string
                else {
                    const colors = location.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                    if (colors && colors.length >= 2) {
                        auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                    } else if (colors && colors.length === 1) {
                        auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[0]})`;
                    }
                }
            }
            // Method 3: Check for aura object
            else if (location.aura) {
                if (location.aura.color1 && location.aura.color2) {
                    auraColor = `linear-gradient(125deg, ${location.aura.color1}, ${location.aura.color2})`;
                } else if (location.aura.color) {
                    // If it's already a gradient string, use it directly
                    if (location.aura.color.includes('gradient')) {
                        auraColor = location.aura.color;
                    }
                    // Try to extract hex colors from the string
                    else {
                        const colors = location.aura.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                        if (colors && colors.length >= 2) {
                            auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                        } else if (colors && colors.length === 1) {
                            auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[0]})`;
                        }
                    }
                }
            }
            
            return (
                <div 
                    key={location.id} 
                    className="recent-location-card"
                    onClick={() => handleLocationClick(location)}
                >
                    <div 
                        className="recent-location-aura"
                        style={{ background: auraColor }}
                    ></div>
                    <div className="recent-location-content">
                        <h3>{location.name.split(' ').slice(0, 4).join(' ')}{location.name.split(' ').length > 4 ? '...' : ''}</h3>
                    </div>
                </div>
            );
        });
    };
    
    // Handle opening collection modal
    const handleOpenCollectionModal = (collection) => {
        // If we don't have the collection's locations, fetch them
        if (!collection.locations || collection.locations.length === 0) {
            fetchCollectionWithLocations(collection.id);
        } else {
            setSelectedCollection(collection);
            setIsCollectionModalOpen(true);
        }
    };
    
    // Fetch a collection with its locations
    const fetchCollectionWithLocations = async (collectionId) => {
        try {
            // First try the API
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/collections/${collectionId}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setSelectedCollection(data);
                    setIsCollectionModalOpen(true);
                    return;
                }
            }
            
            // If API fails, find collection in local state
            const collection = collections.find(c => c.id === collectionId);
            if (collection) {
                setSelectedCollection(collection);
                setIsCollectionModalOpen(true);
            }
        } catch (error) {
            console.error('Error fetching collection:', error);
            // Try to use local data if API fails
            const collection = collections.find(c => c.id === collectionId);
            if (collection) {
                setSelectedCollection(collection);
                setIsCollectionModalOpen(true);
            }
        }
    };
    
    // Handle location click from collection modal
    const handleLocationClick = (location) => {
        // Navigate to discover screen and pass the selected location
        navigate(`/discover/${userId}`, { 
            state: { selectedLocation: location } 
        });
    };

    // Handle closing collection modal
    const handleCloseCollectionModal = () => {
        setIsCollectionModalOpen(false);
    };
    
    const renderCollections = () => {
        if (collections.length === 0) {
            return (
                <div className="empty-collections">
                    <p>No collections yet</p>
                </div>
            );
        }
        
        return collections.map(collection => {
            // Default aura color for the collection
            let auraColor = collection.aura_color || 'linear-gradient(125deg, #6d4aff, #9e8aff)';
            
            // Extract aura color from the first location if available
            if (collection.locations && collection.locations.length > 0) {
                const firstLocation = collection.locations[0];
                
                // Method 1: Check for aura_color1 and aura_color2
                if (firstLocation.aura_color1 && firstLocation.aura_color2) {
                    auraColor = `linear-gradient(125deg, ${firstLocation.aura_color1}, ${firstLocation.aura_color2})`;
                }
                // Method 2: Check for gradient string in aura_color
                else if (firstLocation.aura_color) {
                    // If it's already a gradient string, use it directly
                    if (firstLocation.aura_color.includes('gradient')) {
                        auraColor = firstLocation.aura_color;
                    } 
                    // Try to extract hex colors from a string
                    else {
                        const colors = firstLocation.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                        if (colors && colors.length >= 2) {
                            auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                        } else if (colors && colors.length === 1) {
                            auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[0]})`;
                        }
                    }
                }
                // Method 3: Check for aura object
                else if (firstLocation.aura) {
                    if (firstLocation.aura.color1 && firstLocation.aura.color2) {
                        auraColor = `linear-gradient(125deg, ${firstLocation.aura.color1}, ${firstLocation.aura.color2})`;
                    } else if (firstLocation.aura.color) {
                        // If it's already a gradient string, use it directly
                        if (firstLocation.aura.color.includes('gradient')) {
                            auraColor = firstLocation.aura.color;
                        }
                        // Try to extract hex colors from the string
                        else {
                            const colors = firstLocation.aura.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                            if (colors && colors.length >= 2) {
                                auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                            } else if (colors && colors.length === 1) {
                                auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[0]})`;
                            }
                        }
                    }
                }
            }
            
            return (
                <div 
                    key={collection.id} 
                    className="saved-collection-card" 
                    onClick={() => handleOpenCollectionModal(collection)}
                >
                    <div 
                        className="saved-collection-aura"
                        style={{ background: auraColor }}
                    ></div>
                    <div className="saved-collection-content">
                        <h3>{collection.name}</h3>
                        <p>{collection.location_count || (collection.locations ? collection.locations.length : 0)} locations</p>
                    </div>
                </div>
            );
        });
    };

    const handleCreateCollection = () => {
        const name = prompt("Enter collection name:");
        if (name) {
            createCollection(name);
        }
    };

    // Function to fetch nearby locations with similar auras
    const fetchNearbyLocations = () => {
        if (!isLoaded || !currentLocation || !window.google) {
            console.log("Google Maps not loaded yet");
            return;
        }
        
        setNearbyAurasLoading(true);
        console.log("Fetching nearby locations within 2km radius");
        
        try {
            // Create a hidden div to use for PlacesService
            const mapNode = document.createElement("div");
            mapNode.style.display = "none";
            document.body.appendChild(mapNode);
            
            // Create a minimal map for the PlacesService
            const tempMap = new window.google.maps.Map(mapNode, {
                center: currentLocation,
                zoom: 15,
            });
            
            // Create a PlacesService using the temp map
            const service = new window.google.maps.places.PlacesService(tempMap);
            
            // Search for nearby places within 2km radius
            service.nearbySearch({
                location: currentLocation,
                radius: 2000, // 2km in meters
                types: ['restaurant', 'cafe', 'bar', 'museum', 'park', 'gym', 'store', 'art_gallery', 'bakery', 'shopping_mall']
            }, (results, status) => {
                // Clean up temp map node
                document.body.removeChild(mapNode);
                
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    console.log("Found nearby places:", results);
                    
                    // Process places to include distance and proper aura
                    const nearbyPlaces = results.map(place => {
                        // Calculate actual distance from user in km
                        const placeLocation = {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        };
                        const distance = calculateDistance(
                            currentLocation.lat, 
                            currentLocation.lng, 
                            placeLocation.lat, 
                            placeLocation.lng
                        );
                        
                        // Generate a stable aura color for the location based on its place_id
                        const placeHash = hashCode(place.place_id);
                        
                        // Create aura colors based on the place's hash (ensuring consistent colors for same places)
                        const hue1 = (placeHash % 360);
                        const hue2 = ((placeHash * 1.5) % 360);
                        const hue3 = ((placeHash * 2.5) % 360);
                        
                        const color1 = hslToHex(hue1, 80, 60);
                        const color2 = hslToHex(hue2, 80, 60);
                        const color3 = hslToHex(hue3, 80, 60);
                        
                        return {
                            id: place.place_id,
                            name: place.name,
                            distance: distance.toFixed(1), // Distance in km, 1 decimal place
                            distanceRaw: distance, // Raw distance for sorting
                            location: placeLocation,
                            vicinity: place.vicinity,
                            types: place.types || [],
                            aura_color: `linear-gradient(125deg, ${color1}, ${color2}, ${color3})`,
                            aura_color1: color1,
                            aura_color2: color2,
                            aura_color3: color3
                        };
                    });
                    
                    // Filter to locations within 2km and sort by distance
                    const filteredAndSorted = nearbyPlaces
                        .filter(place => place.distanceRaw <= 2.0)
                        .sort((a, b) => a.distanceRaw - b.distanceRaw)
                        .slice(0, 10); // Limit to 10 places
                    
                    setNearbyAuras(filteredAndSorted);
                    setNearbyAurasLoading(false);
                } else {
                    console.error("Places API error:", status);
                    setNearbyAuras([]);
                    setNearbyAurasLoading(false);
                }
            });
        } catch (error) {
            console.error("Error fetching nearby places:", error);
            setNearbyAuras([]);
            setNearbyAurasLoading(false);
        }
    };

    // Simple string hash function to generate consistent hashes for place IDs
    const hashCode = (str) => {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash);
    };

    // Convert HSL to Hex color
    const hslToHex = (h, s, l) => {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    };

    // Calculate distance between two points in km (haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c; // Distance in km
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI/180);
    };

    // Render the nearby auras
    const renderNearbyAuras = () => {
        if (nearbyAurasLoading) {
            return (
                <div className="loading-container">
                    <div className="loading-indicator"></div>
                    <p>Finding nearby auras...</p>
                </div>
            );
        }
        
        if (nearbyAuras.length === 0) {
            return (
                <div className="empty-auras">
                    <p>No auras found within 2km</p>
                    <button className="refresh-nearby-btn" onClick={fetchNearbyLocations}>
                        Search Again
                    </button>
                </div>
            );
        }
        
        return (
            <div className="nearby-auras-container">
                {nearbyAuras.map(place => (
                    <div 
                        key={place.id} 
                        className="nearby-aura-card"
                        onClick={() => handleNearbyLocationClick(place)}
                    >
                        <div className="nearby-aura-content">
                            <h3>{place.name.split(' ').slice(0, 4).join(' ')}{place.name.split(' ').length > 4 ? '...' : ''}</h3>
                            <p className="nearby-aura-details">
                                <span className="aura-distance">{place.distance} km away</span>
                            </p>
                        </div>
                        <div 
                            className="nearby-aura-placeholder"
                            style={{ background: place.aura_color }}
                        >
                            {/* No indicator */}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Handle click on nearby location
    const handleNearbyLocationClick = (location) => {
        // Navigate to discover screen with the selected location
        navigate(`/discover/${userId}`, { 
            state: { selectedLocation: location } 
        });
    };

    // Add useEffect to fetch nearby locations when map is loaded and user location is available
    useEffect(() => {
        if (isLoaded && mapRef.current && currentLocation && currentLocation !== DEFAULT_CENTER) {
            fetchNearbyLocations();
        }
    }, [isLoaded, mapRef.current, currentLocation]);

    // Add useEffect to fetch pending friend requests count
    useEffect(() => {
        if (userId) {
            fetchPendingRequestsCount();
        }
    }, [userId]);

    // Function to fetch pending friend requests count
    const fetchPendingRequestsCount = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/friend_requests?user_id=${userId}&type=received`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friend requests: ${response.status}`);
            }
            
            const data = await response.json();
            setPendingRequestsCount(data.length);
        } catch (error) {
            console.error('Error fetching friend requests count:', error);
            setPendingRequestsCount(0);
        }
    };

    // Add function to toggle friend requests modal
    const handleFriendRequests = () => {
        setIsFriendRequestsModalOpen(true);
    };
    
    // Add handler to close the friend requests modal
    const handleCloseFriendRequestsModal = () => {
        setIsFriendRequestsModalOpen(false);
        // Refresh friends list and pending requests count when modal closes
        fetchFriends();
        fetchPendingRequestsCount();
    };

    // Add helper function to handle aura color formatting
    const formatAuraBackground = (friend) => {
        try {
            // Consistent color map from AuraQuestionnaire.js
            const colorMap = {
                'red': '#FF0000',     // energy
                'blue': '#0000FF',    // calmness
                'orange': '#FFA500',  // warmth
                'purple': '#800080',  // elegance
                'green': '#00FF00',   // casual
                'cyan': '#00FFFF',    // freshness 
                'gold': '#FFD700',    // authenticity
                'yellow': '#FFFF00'   // additional color
            };

            if (!friend || !friend.aura_color) {
                return 'linear-gradient(125deg, #6a11cb, #2575fc, #00b7c2, #4ecdc4)';
            }

            // Check if aura_color contains a gradient or comma-separated colors
            if (friend.aura_color.includes('gradient') || friend.aura_color.includes(',')) {
                // Extract colors from the gradient
                const colorMatches = friend.aura_color.match(/#[0-9a-f]{6}/gi) || 
                                    friend.aura_color.match(/rgba?\([^)]+\)/gi);
                if (colorMatches && colorMatches.length) {
                    return `linear-gradient(125deg, ${colorMatches.join(', ')})`;
                }
            }

            // Check if the aura_color is a color name that needs mapping
            if (typeof friend.aura_color === 'string' && colorMap[friend.aura_color.toLowerCase()]) {
                const mappedColor = colorMap[friend.aura_color.toLowerCase()];
                return `linear-gradient(125deg, ${mappedColor}, ${mappedColor})`;
            }

            // Handle case when we have all three color properties
            if (friend.aura_color1 && friend.aura_color2 && friend.aura_color3) {
                // Check if these are color names that need mapping
                const color1 = colorMap[friend.aura_color1.toLowerCase()] || friend.aura_color1;
                const color2 = colorMap[friend.aura_color2.toLowerCase()] || friend.aura_color2;
                const color3 = colorMap[friend.aura_color3.toLowerCase()] || friend.aura_color3;
                return `linear-gradient(125deg, ${color1}, ${color2}, ${color3})`;
            }
            
            // Handle case when we have only two color properties
            if (friend.aura_color1 && friend.aura_color2) {
                // Check if these are color names that need mapping
                const color1 = colorMap[friend.aura_color1.toLowerCase()] || friend.aura_color1;
                const color2 = colorMap[friend.aura_color2.toLowerCase()] || friend.aura_color2;
                return `linear-gradient(125deg, ${color1}, ${color2})`;
            }

            // Single color case
            return `linear-gradient(125deg, ${friend.aura_color}, ${friend.aura_color})`;
        } catch (error) {
            console.error('Error formatting aura background:', error);
            return 'linear-gradient(125deg, #6a11cb, #2575fc, #00b7c2, #4ecdc4)';
        }
    };

    // Add logout handler
    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/auth');
    };

    if (loading) {
        return <div className="loading">Loading your aura...</div>;
    }

    if (!userData) {
        return <div className="error">Unable to load user data. Please try logging in again.</div>;
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Hello, {userData?.username || 'User'}</h1>
                <div className="header-right">
                    <button className="friend-requests-button" onClick={handleFriendRequests}>
                        <span className="material-icons">group_add</span>
                        {pendingRequestsCount > 0 && (
                            <span className="request-count">{pendingRequestsCount}</span>
                        )}
                    </button>
                    <button className="logout-button" onClick={handleLogout}>
                        <span className="material-icons">logout</span>
                    </button>
                </div>
            </header>
            
            <main className="dashboard-content">
                <div className="top-widgets">
                    <section className="widget aura-widget square-widget">
                        <div className="aura-visualization-dashboard">
                            <AuraVisualization 
                                auraColor={userData.aura_color} 
                                auraShape={userData.aura_shape}
                                responseSpeed={userData.response_speed}
                            />
                        </div>
                    </section>
                    
                    <section className="widget discover-widget" onClick={() => navigate(`/discover/${userId}`)}>
                        <div className="map-container full-size">
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={currentLocation}
                                    zoom={18}
                                    options={{
                                        disableDefaultUI: true,
                                        zoomControl: false,
                                        mapTypeControl: false,
                                        streetViewControl: false,
                                        fullscreenControl: false,
                                        clickableIcons: false,
                                        scrollwheel: false,
                                        draggable: false,
                                        styles: mapStyles
                                    }}
                                    onLoad={handleMapLoad}
                                >
                                    {mapLoaded && userMarkerIcon && (
                                        <Marker
                                            position={currentLocation}
                                            icon={userMarkerIcon}
                                            zIndex={999}
                                        />
                                    )}
                                </GoogleMap>
                            ) : (
                                <div className="map-placeholder">
                                    <div className="map-placeholder-content">
                                        <div className="placeholder-dot"></div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="map-overlay">
                                {/* Removed button and text */}
                            </div>
                        </div>
                    </section>
                </div>
                
                <section className="friends-widget">
                    <div className="friends-widget-header">
                        <h2>Friends</h2>
                        <button className="add-friend-btn" onClick={handleAddFriend}>
                            <span className="material-icons">person_add</span>
                            Add Friend
                        </button>
                    </div>
                    
                    {friendsLoading ? (
                        <div className="empty-friends">
                            <div className="loading-indicator"></div>
                            <p>Finding your friends...</p>
                        </div>
                    ) : (
                        <>
                            {friends.length > 0 ? (
                                <div className="friends-list-container">
                                    <div className="friends-list">
                                        {getCurrentPageFriends().map(friend => (
                                            <div 
                                                key={friend.id} 
                                                className="friend"
                                                onClick={() => handleFriendClick(friend.id)}
                                            >
                                                <div 
                                                    className="friend-aura"
                                                    style={{
                                                        background: formatAuraBackground(friend)
                                                    }}
                                                ></div>
                                                <h3 className="friend-name">{friend.username}</h3>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Only show the navigation button if we have more than 5 friends */}
                                    {friends.length > 5 && (
                                        <button 
                                            className="next-friends-btn" 
                                            onClick={handleNextFriends}
                                            aria-label="View more friends"
                                        >
                                            <span className="material-icons">arrow_forward</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-friends">
                                    <p>No Friends... yet!</p>
                                </div>
                            )}
                        </>
                    )}
                </section>
                
                <section className="widget collections-widget">
                    <div className="collections-container">
                        <div className="collections-grid">
                            <div className="collections-column-wrapper">
                                <h3 className="column-title">Recents</h3>
                                <div className="collections-column base-collections">
                                    {renderRecentLocations()}
                                </div>
                            </div>
                            
                            <div className="collections-column-wrapper">
                                <h3 className="column-title">Saved Collections</h3>
                                <div className="collections-column saved-collections">
                                    {renderCollections()}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Add Auras Nearby widget */}
                <section className="widget nearby-auras-widget">
                    <h2>Auras Nearby</h2>
                    {renderNearbyAuras()}
                </section>
            </main>
            
            <footer className="dashboard-footer">
                <button className="footer-button aura-guide-button" onClick={() => navigate('/aura-guide')}>Aura Guide</button>
            </footer>

            {/* Add Friend Modal */}
            <AddFriendModal 
                isOpen={isAddFriendModalOpen}
                onClose={handleCloseAddFriendModal}
                userId={userId}
            />

            {/* Collection Locations Modal */}
            <CollectionLocationsModal
                isOpen={isCollectionModalOpen}
                onClose={handleCloseCollectionModal}
                collection={selectedCollection}
                onLocationClick={handleLocationClick}
            />

            {/* Friend Requests Modal */}
            <FriendRequestsModal
                isOpen={isFriendRequestsModalOpen}
                onClose={handleCloseFriendRequestsModal}
                userId={userId}
            />

            {/* Add ViewFriendModal */}
            {showFriendModal && (
                <ViewFriendModal
                    friendId={selectedFriendId}
                    onClose={() => {
                        setShowFriendModal(false);
                        setSelectedFriendId(null);
                    }}
                />
            )}
        </div>
    );
}

export default DashboardScreen;