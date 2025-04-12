import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, OverlayView, Marker } from '@react-google-maps/api';
import AuraLocationMarker from '../markers/AuraLocationMarker';
import LocationModal from '../modals/LocationModal';
import AddToCollectionModal from '../modals/AddToCollectionModal';
import AuraVisualization from '../AuraVisualization';
import './DiscoverScreen.css';
import API_BASE_URL from '../../config/api';

// NYC coordinates as default center
const DEFAULT_CENTER = {
  lat: 40.7128,
  lng: -74.0060
};

// Map styling for dark mode
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],  // Hide all POIs
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

const libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100vh',
  backgroundColor: '#242f3e', // Match the dark map style background
  // Add hardware acceleration for smoother rendering
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  // Force GPU acceleration
  WebkitTransform: 'translate3d(0,0,0)',
  WebkitBackfaceVisibility: 'hidden'
};

const options = {
  styles: darkMapStyle,
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  noClear: true,
  clickableMarkers: true
};

// Helper function to create a cluster icon
function createClusterIcon(count) {
  const svg = `
    <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <circle cx="25" cy="25" r="22" fill="rgba(0,0,0,0.6)" />
      <circle cx="25" cy="25" r="20" fill="rgba(255,255,255,0.9)" stroke="#000" stroke-width="1" />
      <text x="25" y="30" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="#000">
        ${count > 9 ? '9+' : count}
      </text>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + window.btoa(svg);
}

// Add CollectionToast component
const CollectionToast = ({ message, isVisible, onClose }) => {
  // Auto-hide after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return isVisible ? (
    <div className="collection-toast">
      <span>{message}</span>
      <button onClick={onClose} className="toast-close-btn">×</button>
    </div>
  ) : null;
};

function DiscoverScreen() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const mapRef = useRef(null);
  
  // Get dashboard functions from global namespace since they can't be passed through router state
  const dashboard = window.oraApp?.dashboard || {};
  const addRecentLocation = dashboard.addRecentLocation;
  const createCollection = dashboard.createCollection;
  const addLocationToCollection = dashboard.addLocationToCollection;
  
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_CENTER);
  // Add a mapCenter ref to control when we actually want to update the map's center
  const mapCenterRef = useRef(DEFAULT_CENTER);
  // Add a state to track if we're still in initial loading
  const [initialMapLoad, setInitialMapLoad] = useState(true);
  const [locations, setLocations] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(16.5);
  const [currentBounds, setCurrentBounds] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const filterScrollRef = useRef(null);
  const [overlappedArea, setOverlappedArea] = useState(null);
  const mapInstanceRef = useRef(null);
  const [debouncedBounds, setDebouncedBounds] = useState(null);
  const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  
  // Add state for toast notification
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  // Add state for highlighted location (after modal closes)
  const [highlightedLocationId, setHighlightedLocationId] = useState(null);

  // Add a new state variable for aura matching toggle
  const [auraMatchEnabled, setAuraMatchEnabled] = useState(false);

  // Define common place types for filtering
  const placeTypes = [
    // Remove aura_match from the regular filter types
    { id: 'restaurant', label: 'Restaurants', icon: 'restaurant_menu' },
    { id: 'cafe', label: 'Cafes', icon: 'local_cafe' },
    { id: 'bar', label: 'Bars', icon: 'local_bar' },
    { id: 'park', label: 'Parks', icon: 'park' },
    { id: 'store', label: 'Stores', icon: 'store' },
    { id: 'museum', label: 'Museums', icon: 'museum' },
    { id: 'bakery', label: 'Bakeries', icon: 'bakery_dining' },
    { id: 'nightclub', label: 'Nightclubs', icon: 'nightlife' }
  ];

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    id: 'google-map-script',
    libraries
  });

  // Get collections from localStorage
  useEffect(() => {
    if (userId) {
      try {
        // Fetch collections from the API
        fetch(`http://localhost:5001/api/users/${userId}/collections`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch collections');
            }
            return response.json();
          })
          .then(collections => {
            console.log("Initial collections load:", collections);
            
            // Fetch locations for each collection to get their auras
            const collectionsWithLocationPromises = collections.map(collection => 
                fetch(`http://localhost:5001/api/users/${userId}/collections/${collection.id}`)
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
            console.log("Collections with locations:", collectionsWithLocations);
            setCollections(collectionsWithLocations || []);
          })
          .catch(error => {
            console.error('Error fetching collections:', error);
            
            // Try fallback to localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              console.log("Falling back to localStorage collections:", userData.collections);
              setCollections(userData.collections || []);
            }
          });
      } catch (error) {
        console.error('Error getting collections:', error);
        setCollections([]);
      }
    }
  }, [userId]);

  // Get user's current location
  useEffect(() => {
    const getUserLocation = () => {
      setLocationLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            console.log("GOT USER LOCATION:", userLocation);
            setCurrentLocation(userLocation);
            setLocationLoading(false);
            
            // Only set the map center on initial load
            if (!mapLoaded) {
              console.log("Setting initial map center");
              mapCenterRef.current = userLocation;
            }
            
            // Never auto-pan the map to the user location after initial load
            // This would interrupt the user's browsing experience
          },
          (error) => {
            console.error("Error getting user location:", error);
            setLocationLoading(false);
            // Keep default location if there's an error
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        console.log("Geolocation not supported by this browser");
        setLocationLoading(false);
      }
    };

    getUserLocation();
    
    // Set up a location tracking timer that refreshes position every 30 seconds
    // but NEVER forces the map to move
    const locationTracker = setInterval(() => {
      console.log("Refreshing user location in background (map will not move)...");
      getUserLocation();
    }, 30000);
    
    // Clean up the interval when component unmounts
    return () => clearInterval(locationTracker);
  }, [mapLoaded]);

  // Add a tracking effect for currentLocation
  useEffect(() => {
    console.log("CURRENT LOCATION CHANGED:", currentLocation);
  }, [currentLocation]);

  // Use the location data passed from the router
  useEffect(() => {
    if (state && state.selectedLocation) {
      console.log("Location passed from navigation:", state.selectedLocation);
      setSelectedLocation(state.selectedLocation);
      
      // Add to recent locations if the function is available
      if (addRecentLocation && typeof addRecentLocation === 'function') {
        addRecentLocation(state.selectedLocation);
      }
    }
  }, [state, addRecentLocation]);

  // Check for location data in localStorage (for friend view navigation)
  useEffect(() => {
    const storedLocationData = localStorage.getItem('selectedLocation');
    const shouldOpenDetail = localStorage.getItem('openLocationDetail');
    
    if (storedLocationData && shouldOpenDetail === 'true') {
      try {
        const locationData = JSON.parse(storedLocationData);
        console.log("Location loaded from localStorage:", locationData);
        
        // Set the selected location to open the modal
        setSelectedLocation(locationData);
        
        // Add to recent locations if the function is available
        if (addRecentLocation && typeof addRecentLocation === 'function') {
          addRecentLocation(locationData);
        }
        
        // Center the map on the location
        if (mapRef.current && locationData.latitude && locationData.longitude) {
          const locationPosition = { 
            lat: locationData.latitude, 
            lng: locationData.longitude 
          };
          
          // Update ref first to prevent controlled/uncontrolled switching issues
          mapCenterRef.current = locationPosition;
          
          // Then try to update the actual map
          if (mapLoaded) {
            mapRef.current.panTo(locationPosition);
          }
        }
        
        // Clear the localStorage flags to prevent reopening on reload
        localStorage.removeItem('selectedLocation');
        localStorage.removeItem('openLocationDetail');
        
        // Note: We keep sourceUserId in localStorage for back navigation
        // It will be cleared when the back button is used
      } catch (error) {
        console.error("Error processing location from localStorage:", error);
        localStorage.removeItem('selectedLocation');
        localStorage.removeItem('openLocationDetail');
      }
    }
  }, [mapLoaded, addRecentLocation]);

  // Function to scroll the filter bar
  const scrollFilters = (direction) => {
    if (!filterScrollRef.current) return;
    
    // Calculate scroll amount based on filter item width (approximately 100px per item)
    const scrollAmount = 600; // Scroll 6 items at a time (6 * 100px)
    const currentScroll = filterScrollRef.current.scrollLeft;
    
    // Only handle scrolling right since we removed the left button
    if (direction === 'right') {
      filterScrollRef.current.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Handle filter clicks
  const handleFilterClick = (filterId) => {
    setActiveFilter(filterId);
    // Reset overlapped area when changing filters
    setOverlappedArea(null);
  };

  // Handle map click - deselect active markers
  const handleMapClick = () => {
    setOverlappedArea(null);
  };

  // Fetch locations from the backend
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/locations`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch locations: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched locations sample:', data.slice(0, 3));
        
        // Filter out any locations without valid coordinates
        const validLocations = data.filter(loc => 
          loc && loc.latitude && loc.longitude && 
          !isNaN(loc.latitude) && !isNaN(loc.longitude)
        );
        
        if (validLocations.length === 0) {
          console.warn('No valid locations found with coordinates');
        }
        
        // Add additional properties to each location for rendering and interaction
        const enhancedLocations = validLocations.map(loc => {
          // Calculate a score based on rating and user_ratings_total
          const rating = loc.rating || 0;
          const userRatingsTotal = loc.user_ratings_total || 0;
          
          // This formula prioritizes high ratings with many reviews
          const ratingScore = (rating * 0.6) + (Math.min(userRatingsTotal, 500) / 500 * 0.4);
          
          // Add importance score based on multiple factors
          let importanceScore = ratingScore;
          
          // Boost newly added or featured locations
          if (loc.featured) importanceScore += 0.3;
          if (loc.newly_added) importanceScore += 0.2;
          
          // Adjust score based on place type - make each business type similarly visible
          const placeType = (loc.place_type || '').toLowerCase();
          
          // Assign scores more evenly for demo visualization
          if (placeType.includes('restaurant')) importanceScore += 0.05;
          if (placeType.includes('cafe')) importanceScore += 0.12;
          if (placeType.includes('bar')) importanceScore += 0.1;
          if (placeType.includes('park')) importanceScore += 0.18;
          if (placeType.includes('museum')) importanceScore += 0.15;
          if (placeType.includes('store')) importanceScore += 0.08;
          if (placeType.includes('hotel')) importanceScore += 0.13;
          if (placeType.includes('gym')) importanceScore += 0.14;
          if (placeType.includes('theater')) importanceScore += 0.16;
          if (placeType.includes('bakery')) importanceScore += 0.11;
          if (placeType.includes('nightclub')) importanceScore += 0.09;
          
          // Extract or generate aura colors if not already present
          let color1, color2;
          
          // Use aura_color1 and aura_color2 if present
          if (loc.aura_color1 && loc.aura_color2) {
            color1 = loc.aura_color1;
            color2 = loc.aura_color2;
          }
          
          if (!color1 || !color2) {
            // Use aura colors if present in aura object
            if (loc.aura && loc.aura.color1 && loc.aura.color2) {
              color1 = loc.aura.color1;
              color2 = loc.aura.color2;
            } 
            // Try to extract from aura.color or aura_color
            else if ((loc.aura && loc.aura.color) || loc.aura_color) {
              const colorStr = (loc.aura && loc.aura.color) || loc.aura_color;
              const colorMatch = colorStr && colorStr.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
              
              if (colorMatch && colorMatch.length >= 2) {
                color1 = colorMatch[0];
                color2 = colorMatch[1];
              } else if (colorMatch && colorMatch.length === 1) {
                color1 = colorMatch[0];
                color2 = colorMatch[0];
              }
            }
          }
          
          // Generate colors if not found
          if (!color1 || !color2) {
            // Generate colors based on place type
            if (placeType.includes('restaurant')) {
              color1 = '#FF5252';
              color2 = '#FF8A80';
            } else if (placeType.includes('cafe')) {
              color1 = '#795548';
              color2 = '#A1887F';
            } else if (placeType.includes('bar')) {
              color1 = '#9C27B0';
              color2 = '#CE93D8';
            } else if (placeType.includes('park')) {
              color1 = '#4CAF50';
              color2 = '#81C784';
            } else if (placeType.includes('museum')) {
              color1 = '#3F51B5';
              color2 = '#7986CB';
            } else if (placeType.includes('store')) {
              color1 = '#00BCD4';
              color2 = '#80DEEA';
            } else if (placeType.includes('hotel')) {
              color1 = '#FF9800';
              color2 = '#FFB74D';
            } else if (placeType.includes('gym')) {
              color1 = '#F44336';
              color2 = '#E57373';
            } else if (placeType.includes('theater')) {
              color1 = '#9E9E9E';
              color2 = '#E0E0E0';
            } else if (placeType.includes('bakery')) {
              color1 = '#FF9800';
              color2 = '#FFCC80';
            } else if (placeType.includes('grocery')) {
              color1 = '#8BC34A';
              color2 = '#AED581';
            } else if (placeType.includes('nightclub')) {
              color1 = '#7B1FA2';
              color2 = '#BA68C8';
            } else {
              // Default colors for unknown types
              color1 = '#2196F3';
              color2 = '#90CAF9';
            }
          }
          
          return {
            ...loc,
            importanceScore,
            aura_color1: color1,
            aura_color2: color2,
            // Set default aura shape based on place type or use existing
            aura_shape: loc.aura_shape || loc.aura?.shape || 'balanced',
            // Create aura name if not present
            aura_name: loc.aura_name || loc.aura?.name || 'balanced-neutral-calm'
          };
        });
        
        // Sort locations by importance score, descending
        enhancedLocations.sort((a, b) => b.importanceScore - a.importanceScore);
        
        setLocations(enhancedLocations);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Handle bounds change with debouncing
  const updateBounds = useCallback(() => {
    if (mapRef.current && mapRef.current.getBounds()) {
      setCurrentBounds(mapRef.current.getBounds());
    }
  }, []);
  
  // Debounced map interaction handler to prevent rendering issues during drag
  const handleMapInteraction = useCallback(() => {
    setOverlappedArea(null);
    
    // Clear any existing timeouts
    if (window.boundsTimeout) {
      clearTimeout(window.boundsTimeout);
    }
    
    // Debounce bounds update to prevent excessive re-rendering during drag
    window.boundsTimeout = setTimeout(() => {
      updateBounds();
    }, 100); // 100ms debounce delay
  }, [updateBounds]);

  // Get the locations most likely to be in the center of an overlapped area
  const getClusterCenter = (locations) => {
    if (!locations || locations.length === 0) {
      return DEFAULT_CENTER;
    }
    
    // Average the positions
    const sumLat = locations.reduce((acc, loc) => acc + loc.latitude, 0);
    const sumLng = locations.reduce((acc, loc) => acc + loc.longitude, 0);
    
    return {
      lat: sumLat / locations.length,
      lng: sumLng / locations.length
    };
  };

  // Generate positions for overlapped markers in a circle
  const getSpreadPosition = (location, index, total, center) => {
    if (!overlappedArea || overlappedArea.locations.findIndex(l => l.id === location.id) === -1) {
      // Return original position for non-overlapped markers
      return { lat: location.latitude, lng: location.longitude };
    }
    
    // Calculate positions in a circle for overlapped markers
    const spreadDistance = 0.0003; // Adjust based on zoom level if needed
    const angle = (2 * Math.PI * index) / total;
    
    return {
      lat: center.lat + spreadDistance * Math.sin(angle),
      lng: center.lng + spreadDistance * Math.cos(angle)
    };
  };

  // Modified map load handler to optimize tile loading
  const onLoad = useCallback((map) => {
    mapRef.current = map;
    setMapLoaded(true);
    
    // Set the initial center (but only once)
    if (mapCenterRef.current) {
      map.setCenter(mapCenterRef.current);
    }
    
    // After map is fully loaded, update state to no longer consider this initial loading
    setTimeout(() => {
      setInitialMapLoad(false);
      console.log("Map initial load complete - dragging should be smooth now");
    }, 1000);
    
    // Instead of tracking every center change, just update our ref after drag ends
    // This avoids interfering with the map's smooth drag behavior
    map.addListener('dragend', () => {
      const newCenter = map.getCenter();
      if (newCenter) {
        const centerLatLng = {
          lat: newCenter.lat(),
          lng: newCenter.lng()
        };
        // Update our ref with the user's chosen position without triggering rerenders
        mapCenterRef.current = centerLatLng;
      }
    });
    
    // Add dragstart listener to improve tile loading during drag
    map.addListener('dragstart', () => {
      // Set the map's background color to match the map style
      map.setOptions({
        backgroundColor: '#242f3e' // Dark blue/gray from our map style
      });
    });
    
    // Initial bounds setting
    if (map.getBounds()) {
      setCurrentBounds(map.getBounds());
      
      // Force an immediate bounds update to show locations
      console.log("Map loaded, setting initial bounds");
      updateBounds();
      
      // Trigger a map interaction to ensure locations are filtered properly
      handleMapInteraction();
    } else {
      // Wait for bounds to be available (happens after map fully loads)
      console.log("Map loaded but bounds not available yet, listening for idle event");
      map.addListener('idle', () => {
        if (map.getBounds()) {
          console.log("Map idle, bounds now available");
          setCurrentBounds(map.getBounds());
          updateBounds();
          handleMapInteraction();
        }
      });
    }
    
    // Optimize tile loading during drag
    map.setOptions({
      tilt: 0, // disable 45° imagery to improve performance
      maxZoom: 20,
      minZoom: 3,
      backgroundColor: '#242f3e', // Match the map style background
      // Additional options to improve tile loading
      gestureHandling: 'greedy',
      clickableIcons: false
    });
  }, [updateBounds, handleMapInteraction]);
  
  // Add effect to ensure locations are displayed when bounds are first set
  useEffect(() => {
    if (currentBounds && locations.length > 0 && mapLoaded) {
      console.log("Bounds and locations available, ensuring locations are filtered properly");
      // This will force the filtered locations to update based on the current bounds
      handleMapInteraction();
    }
  }, [currentBounds, locations, mapLoaded, handleMapInteraction]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapLoaded(false);
  }, []);

  // Handle zoom change
  const handleZoomChanged = () => {
    if (mapRef.current) {
      const zoom = mapRef.current.getZoom();
      setCurrentZoom(zoom);
      
      // Update bounds when zoom changes
      if (mapRef.current.getBounds()) {
        setCurrentBounds(mapRef.current.getBounds());
      }
    }
  };
  
  // Handle location click
  const handleLocationClick = (location) => {
    console.log("Location clicked:", location);
    setSelectedLocation(location);
    
    // Add location to recent views if function is available
    if (addRecentLocation && typeof addRecentLocation === 'function') {
      console.log("Adding location to recents:", location);
      addRecentLocation(location);
    } else {
      console.warn("addRecentLocation function not available. Make sure dashboard is initialized.");
      
      // Fallback: Store in localStorage directly if dashboard function isn't available
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const recentLocations = userData.recentLocations || [];
          
          // Remove if already exists (to move to top)
          const filteredLocations = recentLocations.filter(loc => loc.id !== location.id);
          
          // Add to beginning (most recent first)
          const updatedLocations = [location, ...filteredLocations].slice(0, 5);
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify({
            ...userData,
            recentLocations: updatedLocations
          }));
        }
      } catch (error) {
        console.error("Error updating recent locations in localStorage:", error);
      }
    }
  };

  // Handle add to collection button click
  const handleAddToCollection = (location) => {
    setIsAddToCollectionModalOpen(true);
  };

  // Close modal
  const handleModalClose = () => {
    if (selectedLocation) {
      // Set the highlighted location ID when the modal closes
      setHighlightedLocationId(selectedLocation.id);
      
      // Center map on the location that was just viewed
      if (mapRef.current) {
        const locationPosition = { lat: selectedLocation.latitude, lng: selectedLocation.longitude };
        mapRef.current.panTo(locationPosition);
        mapCenterRef.current = locationPosition;
      }
      
      // Clear the highlighted location after animation completes
      setTimeout(() => {
        setHighlightedLocationId(null);
      }, 5000);
    }
    setSelectedLocation(null);
  };

  // Handle collection modal close
  const handleCollectionModalClose = () => {
    setIsAddToCollectionModalOpen(false);
  };

  // Handle creating a new collection
  const handleCreateCollection = async (name) => {
    try {
      if (!selectedLocation || !userId) return null;
      
      console.log("Creating new collection:", name);
      console.log("User ID:", userId);
      
      // HARDCODED URL
      const response = await fetch(`http://localhost:5001/api/users/${userId}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: parseInt(userId),
          name: name,
          aura_color: selectedLocation?.aura_color || 'linear-gradient(to right, #6d4aff, #9e8aff)'
        }),
      });
      
      // Log response status
      console.log(`Create collection response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create collection error response:", errorText);
        throw new Error(`Failed to create collection: ${response.status}`);
      }
      
      const newCollection = await response.json();
      console.log("Created collection:", newCollection);
      
      // Update collections state
      setCollections(prev => [...prev, newCollection]);
      
      // Show success toast
      setToastMessage(`Created collection: ${name}`);
      setToastVisible(true);
      
      // Automatically add the current location to the new collection
      if (newCollection.id) {
        try {
          // HARDCODED URL
          const addResponse = await fetch(`http://localhost:5001/api/users/${userId}/collections/${newCollection.id}/add_location`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              location_id: selectedLocation.id
            }),
          });
          
          // Log response status
          console.log(`Add location response status: ${addResponse.status}`);
          
          if (!addResponse.ok) {
            const errorText = await addResponse.text();
            console.error("Add location error response:", errorText);
            throw new Error(`Failed to add location: ${addResponse.status}`);
          }
          
          if (addResponse.ok) {
            const updatedCollection = await addResponse.json();
            
            // Update collections state with the newly updated collection
            setCollections(prevCollections => 
              prevCollections.map(col => 
                col.id === updatedCollection.id ? updatedCollection : col
              )
            );
            
            // Refresh dashboard collections if the function is available
            if (window.oraApp?.dashboard?.refreshCollections) {
              window.oraApp.dashboard.refreshCollections();
            }
            
            // Update toast message to show location was added
            setToastMessage(`Added ${selectedLocation.name} to new collection!`);
            setToastVisible(true);
            
            // Close the modal
            setIsAddToCollectionModalOpen(false);
          }
        } catch (addError) {
          console.error('Error adding location to new collection:', addError);
        }
      }
      
      return newCollection.id;
    } catch (error) {
      console.error('Error creating collection:', error);
      // Show error toast
      setToastMessage(`Error creating collection: ${error.message}`);
      setToastVisible(true);
      return null;
    }
  };

  // Handle adding a location to an existing collection
  const handleAddLocationToCollection = async (collectionId) => {
    try {
      if (!selectedLocation) return;
      
      // Make sure collectionId is a number and not an object
      if (typeof collectionId === 'object') {
        console.error('Invalid collection ID, received object instead of ID value', collectionId);
        throw new Error('Invalid collection ID');
      }
      
      console.log(`Adding location ${selectedLocation.id} to collection ${collectionId}`);
      
      // HARDCODED URL
      const response = await fetch(`http://localhost:5001/api/users/${userId}/collections/${collectionId}/add_location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_id: selectedLocation.id
        }),
      });
      
      // Log response status
      console.log(`Add location to existing collection response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Add location error response:", errorText);
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
      
      // Refresh dashboard collections if the function is available
      if (window.oraApp?.dashboard?.refreshCollections) {
        window.oraApp.dashboard.refreshCollections();
      }
      
      // Show success toast
      setToastMessage(`Added ${selectedLocation.name} to collection!`);
      setToastVisible(true);
      
      // Close the modal
      setIsAddToCollectionModalOpen(false);
    } catch (error) {
      console.error('Error adding location to collection:', error);
      // Show error toast
      setToastMessage("Error adding to collection");
      setToastVisible(true);
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    // First check URL params for userId
    if (userId) {
      navigate(`/auth/${userId}/dashboard`);
    } else {
      // If no userId in URL, check localStorage for sourceUserId
      const sourceUserId = localStorage.getItem('sourceUserId');
      if (sourceUserId) {
        // Navigate back to the source dashboard using the stored userId
        navigate(`/auth/${sourceUserId}/dashboard`);
        // Clear the sourceUserId once used
        localStorage.removeItem('sourceUserId');
      } else {
        // Last resort - go to landing page if no userId found
        navigate('/');
      }
    }
  };

  // Extract all colors from gradients (up to 3 colors)
  const extractColors = (colorStr) => {
    if (!colorStr) return ['#000000'];
    
    // For gradient strings, extract all hex colors
    if (colorStr.includes('gradient')) {
      // Try to extract all hex color codes
      const hexMatches = colorStr.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) || [];
      
      // If we found hex colors, return them
      if (hexMatches.length > 0) {
        console.log(`Extracted ${hexMatches.length} hex colors from gradient:`, hexMatches);
        return hexMatches;
      }
      
      // If no hex colors found, try parsing from linear-gradient format
      // Format like: "linear-gradient(to right, #6d4aff, #9e8aff)"
      // or "linear-gradient(45deg, COLOR1, COLOR2, COLOR3)"
      try {
        const parts = colorStr.split(',');
        // Remove the "linear-gradient(...)" part and extract just colors
        const colors = parts.slice(1).map(part => {
          // Clean up the color string and extract just the color
          const cleaned = part.trim().replace(')', '');
          // Only return if it looks like a color (starts with # or rgb)
          if (cleaned.startsWith('#') || cleaned.startsWith('rgb')) {
            return cleaned;
          }
          // Try to extract hex color if embedded
          const hexMatch = cleaned.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/);
          if (hexMatch) {
            return hexMatch[0];
          }
          return null;
        }).filter(Boolean); // Remove null values
        
        if (colors.length > 0) {
          console.log(`Extracted ${colors.length} colors from gradient parts:`, colors);
          return colors;
        }
      } catch (e) {
        console.error("Error parsing gradient colors:", e);
      }
      
      // Last resort: try to extract rgb() or rgba() values
      try {
        const rgbMatches = colorStr.match(/rgb\([^)]+\)|rgba\([^)]+\)/g) || [];
        if (rgbMatches.length > 0) {
          console.log(`Extracted ${rgbMatches.length} RGB colors:`, rgbMatches);
          return rgbMatches;
        }
      } catch (e) {
        console.error("Error extracting RGB values:", e);
      }
      
      console.warn("Could not extract colors from gradient:", colorStr);
      return ['#000000']; // Default fallback
    }
    
    // Handle CSS named colors by converting to hex
    if (colorStr.match(/^[a-z]+$/i)) {
      // This is a simple check for named colors like "red", "blue", etc.
      // In a real app, you'd have a mapping of CSS color names to hex values
      console.log("Named color detected:", colorStr);
      return [colorStr]; // Return as is, parseHex will need to handle named colors
    }
    
    // For single colors, return as array
    return [colorStr];
  };

  // Helper function to calculate color similarity (0-1 range where 1 is identical)
  const calculateColorSimilarity = (color1, color2) => {
    // Handle missing colors
    if (!color1 || !color2) return 0;
    
    try {
      // Calculate Euclidean distance between colors
      const colorDiff = Math.sqrt(
        Math.pow(color1.r - color2.r, 2) +
        Math.pow(color1.g - color2.g, 2) +
        Math.pow(color1.b - color2.b, 2)
      );
      
      // Normalize to 0-1 range (255*sqrt(3) is max possible difference)
      const maxDiff = Math.sqrt(3 * Math.pow(255, 2));
      return 1 - (colorDiff / maxDiff);
    } catch (e) {
      console.error("Error calculating color similarity:", e);
      return 0;
    }
  };
  
  // Convert hex or other color formats to RGB
  const parseHex = (hex) => {
    if (!hex) return { r: 0, g: 0, b: 0 };
    
    // Handle named CSS colors - simplified mapping of common ones
    // In a full app, you'd use a complete mapping
    const colorMap = {
      'red': {r: 255, g: 0, b: 0},
      'green': {r: 0, g: 128, b: 0},
      'blue': {r: 0, g: 0, b: 255},
      'yellow': {r: 255, g: 255, b: 0},
      'purple': {r: 128, g: 0, b: 128},
      'black': {r: 0, g: 0, b: 0},
      'white': {r: 255, g: 255, b: 255},
      'gray': {r: 128, g: 128, b: 128},
      'orange': {r: 255, g: 165, b: 0},
      'pink': {r: 255, g: 192, b: 203}
    };
    
    if (typeof hex === 'string' && hex.toLowerCase() in colorMap) {
      return colorMap[hex.toLowerCase()];
    }
    
    // If not a string, or doesn't match patterns, return default
    if (typeof hex !== 'string' || (!hex.startsWith('#') && !hex.match(/^[0-9A-Fa-f]{6}$/))) {
      console.warn("Invalid color format:", hex);
      return { r: 0, g: 0, b: 0 };
    }
    
    // Handle hex format
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle both 3-digit and 6-digit formats
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Validate hex format
    if (!hex.match(/^[0-9A-Fa-f]{6}$/)) {
      console.warn("Invalid hex format:", hex);
      return { r: 0, g: 0, b: 0 };
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
  };

  // Center map on user's current location at ~500m view (approx. zoom level 16.5)
  const handleCenterOnUser = () => {
    console.log("CENTER ON USER CLICKED - Current location:", currentLocation);
    if (mapRef.current && currentLocation) {
      // This is the ONLY place where we explicitly center the map on user location
      mapRef.current.panTo(currentLocation);
      // Update the map center ref to match
      mapCenterRef.current = currentLocation;
      mapRef.current.setZoom(16.5); // Shows approximately 500m radius
      // Force a brief controlled mode to ensure the center takes effect
      setInitialMapLoad(true);
      setTimeout(() => {
        setInitialMapLoad(false);
      }, 500);
    }
  };

  // Get filtered locations based on current filters and view bounds
  const getFilteredLocations = useCallback(() => {
    // Early return if no locations or if component is unmounting
    if (!locations || locations.length === 0) return [];
    
    // Base locations to filter from
    let filteredLocations = locations;
    
    // Apply category filter if active
    if (activeFilter) {
      filteredLocations = locations.filter(location => {
        const placeType = (location.place_type || '').toLowerCase();
        const filterType = activeFilter.toLowerCase();
        
        // Map filter types to exact place types from database
        const placeTypeMap = {
          'store': 'shopping_mall',
          'hotel': 'lodging',
          'gym': 'gym',
          'theater': 'movie_theater',
          'nightclub': 'night_club',
          'grocery': 'grocery_or_supermarket'
        };
        
        // Get the exact place type to match against
        const exactPlaceType = placeTypeMap[filterType] || filterType;
        
        // Check for exact match
        return placeType === exactPlaceType;
      });
    }
    
    // Apply aura matching if enabled
    if (auraMatchEnabled && userData && userData.aura_color) {
      console.log("AURA MATCH FILTER ACTIVATED - Finding matching auras");
      
      // Pre-process the user aura once outside the loop
      const userAura = {
        color: userData.aura_color,
        shape: userData.aura_shape || 'flowing'
      };
      
      // Extract user's aura colors
      const userColors = extractColors(userAura.color);
      console.log(`User has ${userColors.length} aura colors:`, userColors);
      
      // Convert user colors to RGB for matching
      const userRgbColors = userColors.map(parseHex);
      
      // Result array - process locations that passed the first filter
      const matchingLocations = [];
      
      // Define the match threshold for all color comparisons
      const MATCH_THRESHOLD = 0.25; // Very permissive threshold for individual matches
      
      console.log(`Checking ${filteredLocations.length} locations for aura matches...`);
      console.log(`User colors:`, userColors);
      
      const matchLog = []; // For logging match details
      
      for (const location of filteredLocations) {
        // Skip invalid locations
        if (!location.latitude || !location.longitude) continue;
        
        // Extract location colors
        const locationColors = [];
        
        // First priority: check for individual color components
        if (location.aura_color1) locationColors.push(location.aura_color1);
        if (location.aura_color2) locationColors.push(location.aura_color2);
        if (location.aura_color3) locationColors.push(location.aura_color3);
        
        // Second priority: try to extract from aura_color gradient
        if (locationColors.length === 0 && location.aura_color) {
          const extractedColors = extractColors(location.aura_color);
          locationColors.push(...extractedColors);
        }
        
        // Third priority: try colors from aura object if present
        if (locationColors.length === 0 && location.aura) {
          if (location.aura.color1) locationColors.push(location.aura.color1);
          if (location.aura.color2) locationColors.push(location.aura.color2);
          if (location.aura.color3) locationColors.push(location.aura.color3);
          
          if (locationColors.length === 0 && location.aura.color) {
            locationColors.push(...extractColors(location.aura.color));
          }
        }
        
        // Skip locations with no colors
        if (locationColors.length === 0) continue;
        
        // Convert location colors to RGB for accurate comparison
        const locationRgbColors = locationColors.map(parseHex);
        
        console.log(`Location: ${location.name}, colors:`, locationColors);
        
        // Create a complete matrix of all possible color combinations
        const allPossibleCombinations = [];
        
        // Specifically track color matches by color name for debugging
        // This will help us see if red colors are being matched
        const colorTypeMatches = {
          red: 0,
          orange: 0,
          yellow: 0,
          green: 0,
          blue: 0,
          cyan: 0,
          purple: 0
        };
        
        // Track all matched combinations between user and location
        for (let i = 0; i < userRgbColors.length; i++) {
          for (let j = 0; j < locationRgbColors.length; j++) {
            const similarity = calculateColorSimilarity(userRgbColors[i], locationRgbColors[j]);
            
            // Analyze what type of color this is to track matches by color
            const userHex = userColors[i].toLowerCase();
            let userColorType = 'other';
            
            // Simplistic color classification based on hex value
            if (userHex.includes('ff0000') || (userRgbColors[i].r > 200 && userRgbColors[i].g < 100 && userRgbColors[i].b < 100)) {
              userColorType = 'red';
            } else if (userHex.includes('ffa500') || (userRgbColors[i].r > 200 && userRgbColors[i].g > 100 && userRgbColors[i].b < 100)) {
              userColorType = 'orange';
            } else if (userHex.includes('00ffff') || (userRgbColors[i].r < 100 && userRgbColors[i].g > 200 && userRgbColors[i].b > 200)) {
              userColorType = 'cyan';
            }
            
            // Is this a match?
            const isMatch = similarity >= MATCH_THRESHOLD;
            
            // If it's a match, increment the color type counter
            if (isMatch && userColorType in colorTypeMatches) {
              colorTypeMatches[userColorType]++;
            }
            
            // Store this combination
            allPossibleCombinations.push({
              userIndex: i,
              locationIndex: j,
              userColorHex: userColors[i],
              locationColorHex: locationColors[j],
              userColorType,
              similarity,
              isMatch
            });
          }
        }
        
        // Sort by similarity (highest first)
        allPossibleCombinations.sort((a, b) => b.similarity - a.similarity);
        
        // Now calculate our match metrics
        
        // 1. Count how many matches we have for each user color
        const userColorMatches = {};
        for (let i = 0; i < userColors.length; i++) {
          userColorMatches[i] = allPossibleCombinations
            .filter(c => c.userIndex === i && c.isMatch)
            .length;
        }
        
        // 2. Count how many matches we have for each location color
        const locationColorMatches = {};
        for (let j = 0; j < locationColors.length; j++) {
          locationColorMatches[j] = allPossibleCombinations
            .filter(c => c.locationIndex === j && c.isMatch)
            .length;
        }
        
        // 3. Count the total number of matches
        const totalMatches = allPossibleCombinations.filter(c => c.isMatch).length;
        
        // 4. Count distinct color types that have matches (red, cyan, etc.)
        const matchingColorTypes = Object.entries(colorTypeMatches)
          .filter(([, count]) => count > 0)
          .map(([type]) => type);
        
        // Get the top 4 best matches
        const topMatches = allPossibleCombinations.slice(0, 4);
        
        // Calculate the average similarity of the top 4 matches
        const topMatchAverage = topMatches.reduce((sum, c) => sum + c.similarity, 0) / 
                                Math.min(topMatches.length, 4);
        
        // Determine if this location has enough matches to be included
        // An "enough match" means:
        // 1. At least 2 distinct matches above threshold, OR
        // 2. Top match average is very high, OR
        // 3. At least 2 different user colors match with location colors, OR
        // 4. We specifically have matches for both red and cyan or red and another color
        const hasRedMatches = colorTypeMatches.red > 0;
        const hasCyanMatches = colorTypeMatches.cyan > 0;
        const hasOrangeMatches = colorTypeMatches.orange > 0;
        
        const hasRedCyanCombo = hasRedMatches && hasCyanMatches;
        const hasRedOrangeCombo = hasRedMatches && hasOrangeMatches;
        const hasOrangeCyanCombo = hasOrangeMatches && hasCyanMatches;
        
        const distinctUserColorsMatched = Object.values(userColorMatches).filter(count => count > 0).length;
        const distinctLocationColorsMatched = Object.values(locationColorMatches).filter(count => count > 0).length;
        
        const hasEnoughMatches = 
          (totalMatches >= 2) || 
          (topMatchAverage >= 0.6) || 
          (distinctUserColorsMatched >= 2) || 
          (distinctLocationColorsMatched >= 2) ||
          hasRedCyanCombo || 
          hasRedOrangeCombo || 
          hasOrangeCyanCombo;
        
        // Calculate an overall score for sorting
        const matchScore = 
          (totalMatches * 5) + 
          (distinctUserColorsMatched * 10) + 
          (distinctLocationColorsMatched * 10) + 
          (topMatchAverage * 20) +
          (hasRedCyanCombo ? 15 : 0) +
          (hasRedOrangeCombo ? 10 : 0) +
          (hasOrangeCyanCombo ? 10 : 0);
        
        // Log detailed match info for debugging
        matchLog.push({
          locationId: location.id,
          locationName: location.name,
          userColors: userColors,
          locationColors: locationColors,
          totalMatches,
          userColorMatches,
          locationColorMatches,
          matchingColorTypes,
          colorTypeMatches,
          hasRedCyanCombo,
          hasRedOrangeCombo,
          topMatchAverage,
          topMatches: topMatches.slice(0, 2), // Just show top 2 for brevity
          matchScore,
          included: hasEnoughMatches
        });
        
        // Include locations that meet our matching criteria
        if (hasEnoughMatches) {
          matchingLocations.push({
            ...location,
            auraMatchCount: Math.max(distinctUserColorsMatched, distinctLocationColorsMatched),
            auraMatchScore: matchScore,
            hasRedCyanCombo,
            hasRedOrangeCombo
          });
        }
      }
      
      // Log complete match summary for debugging
      console.log(`Found ${matchingLocations.length} locations with matching auras:`, matchLog);

      // Sort by match score (desc)
      matchingLocations.sort((a, b) => b.auraMatchScore - a.auraMatchScore);
      
      // Explicitly prioritize locations with red/cyan or red/orange matches
      // by giving them a bonus in the sort order
      matchingLocations.sort((a, b) => {
        // First priority: red/cyan combo
        if (a.hasRedCyanCombo && !b.hasRedCyanCombo) return -1;
        if (!a.hasRedCyanCombo && b.hasRedCyanCombo) return 1;
        
        // Second priority: red/orange combo
        if (a.hasRedOrangeCombo && !b.hasRedOrangeCombo) return -1;
        if (!a.hasRedOrangeCombo && b.hasRedOrangeCombo) return 1;
        
        // Fall back to score
        return b.auraMatchScore - a.auraMatchScore;
      });
      
      // Return the aura-matched locations
      filteredLocations = matchingLocations;
      
      // Ensure we show plenty of results
      if (filteredLocations.length > 75) {
        console.log(`Limiting from ${filteredLocations.length} to 75 top aura matches`);
        filteredLocations.splice(75);
      } else if (filteredLocations.length < 10) {
        // If we found fewer than 10 matches, add locations with any similarity
        console.log("Found fewer than 10 locations with color matches. Adding more...");
        
        // Sort all locations with any decent match but didn't meet our criteria
        const additionalLocations = matchLog
          .filter(entry => !entry.included && entry.topMatchAverage >= 0.2)
          .sort((a, b) => b.topMatchAverage - a.topMatchAverage)
          .slice(0, 20 - filteredLocations.length); // Fill up to 20 total
        
        for (const match of additionalLocations) {
          const location = locations.find(loc => loc.id === match.locationId);
          if (location) {
            filteredLocations.push({
              ...location,
              auraMatchCount: 1,
              auraMatchScore: match.topMatchAverage * 10 // Scale for consistency
            });
          }
        }
        
        console.log(`Added ${additionalLocations.length} additional locations with partial matches`);
      }
    }
    
    // Adaptive limit based on zoom level and performance 
    // More locations at wider zoom levels
    let maxLocations = 200; // Increased from 100 to 200 for wider coverage
    
    if (currentZoom < 12) {
      maxLocations = 180; // Far out - show more major landmarks
    } else if (currentZoom < 14) {
      maxLocations = 190; // Medium zoom - show more locations
    } else if (currentZoom < 16) {
      maxLocations = 195; // Closer zoom - show even more locations
    } else {
      maxLocations = 200; // Full detail in local neighborhood
    }
    
    // IMPORTANT: For smooth dragging, use a consistent number of markers
    if (currentBounds) {
      // Filter to locations in current view
      const locationsInView = filteredLocations.filter(location => {
        const position = { lat: location.latitude, lng: location.longitude };
        return currentBounds.contains(position);
      });
      
      // Prioritize by importance score
      locationsInView.sort((a, b) => b.importanceScore - a.importanceScore);
      
      // Limit to improve performance
      const result = locationsInView.slice(0, maxLocations);
      
      return result;
    } else {
      // If no bounds yet, show locations near current location based on distance
      const nearbyLocations = filteredLocations.filter(location => {
        if (!currentLocation || currentLocation === DEFAULT_CENTER) return true;
        
        // Simple distance calculation (approximate)
        const latDiff = Math.abs(location.latitude - currentLocation.lat);
        const lngDiff = Math.abs(location.longitude - currentLocation.lng);
        
        // This creates a rough square around the user location
        // More precise would be to use haversine formula but this is faster
        return latDiff < 0.05 && lngDiff < 0.05; // About 5km radius
      });
      
      // Sort by importance
      nearbyLocations.sort((a, b) => b.importanceScore - a.importanceScore);
      
      // If we still don't have locations, just show the top 10 important ones from all locations
      if (nearbyLocations.length === 0) {
        // console.log("No nearby locations, showing top important locations");
        filteredLocations.sort((a, b) => b.importanceScore - a.importanceScore);
        return filteredLocations.slice(0, 10);
      }
      
      return nearbyLocations.slice(0, maxLocations);
    }
  }, [locations, currentZoom, currentBounds, activeFilter, currentLocation, userData, auraMatchEnabled]);

  // Get filtered locations for current zoom level and type filter
  const filteredLocations = getFilteredLocations();

  // In the component body, add a console log to debug
  useEffect(() => {
    if (currentLocation) {
      console.log('Current location for marker:', currentLocation);
    }
  }, [currentLocation]);

  // Function to open the add to collection modal
  const handleOpenAddToCollectionModal = () => {
    // Make sure collections are loaded
    if (userId) {
      try {
        fetch(`http://localhost:5001/api/users/${userId}/collections`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch collections');
            }
            return response.json();
          })
          .then(userCollections => {
            console.log("Fetched collections:", userCollections);
            setCollections(userCollections || []);
            
            // Now open the modal
            setIsAddToCollectionModalOpen(true);
          })
          .catch(error => {
            console.error('Error fetching collections:', error);
            setToastMessage("Error loading collections");
            setToastVisible(true);
          });
      } catch (error) {
        console.error('Error initializing collection modal:', error);
      }
    } else {
      setIsAddToCollectionModalOpen(true);
    }
  };

  // Set up handlers for location modal actions
  useEffect(() => {
    if (mapRef.current && isLoaded && window.google) {
      // Set up map click handler for adding markers
      const clickListener = window.google.maps.event.addListener(
        mapRef.current,
        'click',
        (event) => {
          console.log('Map clicked, adding marker');
          // Implementation for adding markers on click
        }
      );

      // Location modal handler for adding to collection
      const handleLocationAddToCollection = (location) => {
        setSelectedLocation(location);
        handleOpenAddToCollectionModal();
      };

      // Expose handlers to window for LocationModal to use
      if (!window.mapHandlers) {
        window.mapHandlers = {};
      }

      window.mapHandlers.addToCollection = handleLocationAddToCollection;

      return () => {
        window.google.maps.event.removeListener(clickListener);
        if (window.mapHandlers) {
          delete window.mapHandlers.addToCollection;
        }
      };
    }
  }, [isLoaded, mapRef.current, handleOpenAddToCollectionModal]);

  // Set initial center location only once when currentLocation is first set
  useEffect(() => {
    // Only set the initial map center if it hasn't been manually changed yet
    // and we're still at the default location
    if (
      currentLocation && 
      currentLocation !== DEFAULT_CENTER && 
      mapCenterRef.current === DEFAULT_CENTER
    ) {
      console.log("Setting initial map center from currentLocation:", currentLocation);
      mapCenterRef.current = currentLocation;
      
      // If map is already loaded, set its center
      if (mapRef.current) {
        mapRef.current.setCenter(currentLocation);
        // Make sure we're in controlled mode during initial setup
        setInitialMapLoad(true);
        // Then release control after a small delay
        setTimeout(() => {
          setInitialMapLoad(false);
        }, 1000);
      }
    }
  }, [currentLocation]);

  // Fetch user data including aura
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
              aura_shape: storedUserData.aura_shape || storedUserData.auraShape || 'balanced',
              response_speed: storedUserData.response_speed || storedUserData.responseSpeed || 'medium'
            };
            setUserData(processedData);
            return;
          }
        }
        
        const apiUrl = `http://localhost:5001/api/users/${userId}`;
        console.log("API URL:", apiUrl);
        
        const response = await fetch(apiUrl);
        console.log("API Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API Response data:", data);
        
        // Ensure we have valid aura data
        if (!data.aura_color || !data.aura_color.includes('gradient')) {
            console.warn("Invalid or missing aura color gradient, using default");
            
            // Extract any individual colors that might be available
            const colors = [];
            if (data.aura_color1) colors.push(data.aura_color1);
            if (data.aura_color2) colors.push(data.aura_color2);
            if (data.aura_color3) colors.push(data.aura_color3);
            
            // If we have colors, create gradient from them
            if (colors.length > 0) {
                while (colors.length < 3) {
                    colors.push(colors[colors.length - 1] || '#0000FF');
                }
                data.aura_color = `linear-gradient(45deg, ${colors.join(', ')})`;
            } else {
                // Default gradient
                data.aura_color = 'linear-gradient(45deg, #0000FF, #800080, #00FF00)';
            }
        }
        
        // Ensure we have valid shape
        if (!data.aura_shape || !['sparkling', 'flowing', 'pulsing', 'balanced'].includes(data.aura_shape)) {
            console.warn("Invalid or missing aura shape, using default");
            data.aura_shape = 'balanced';
        }
        
        const processedData = {
          ...data,
          username: data.username || "User",
          aura_color: data.aura_color,
          aura_shape: data.aura_shape,
          response_speed: 'medium' // Always set to medium
        };
        
        setUserData(processedData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Set default user data if fetch fails
        setUserData({
          username: "User",
          aura_color: 'linear-gradient(to right, #6d4aff, #9e8aff)',
          aura_shape: 'balanced',
          response_speed: 'medium'
        });
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Add wheel event handler for filter bar
  const handleFilterWheel = (e) => {
    if (filterScrollRef.current) {
      // Prevent default vertical scrolling
      e.preventDefault();
      // Scroll horizontally based on wheel delta
      filterScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Add a new handler for the aura toggle
  const handleAuraToggle = () => {
    setAuraMatchEnabled(prev => !prev);
    // Reset overlapped area when toggling aura
    setOverlappedArea(null);
  };

  if (loadError) {
    return <div className="error-screen">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="loading-screen">Loading maps...</div>;
  }

  return (
    <div className="discover-container">
      <div className="discover-header">
        {/* Back button */}
        <button 
          className="back-button" 
          onClick={handleBackClick}
          style={{
            position: 'absolute',
            top: '350px',
            left: '20px',
            width: '200px',
            height: '200px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 900,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          <span 
            className="material-icons"
            style={{
              color: 'white',
              fontSize: '70px'
            }}
          >
            arrow_back
          </span>
        </button>
        
        {userData && (
          <div className="user-aura-container">
            <AuraVisualization 
              auraColor={userData.aura_color}
              auraShape={userData.aura_shape}
              responseSpeed={userData.response_speed}
            />
          </div>
        )}
        
        <button className="center-button" onClick={handleCenterOnUser}>
          <span className="material-icons">my_location</span>
        </button>
      </div>
      
      <div className="filter-bar-container">
        <div 
          className="filter-bar" 
          ref={filterScrollRef}
          onWheel={handleFilterWheel}
        >
          {/* "All" filter option */}
          <div 
            className={`filter-item ${activeFilter === null ? 'active' : ''}`}
            onClick={() => handleFilterClick(null)}
          >
            <span className="material-icons">all_inclusive</span>
            <span className="filter-label">All</span>
          </div>
          
          {/* Place type filters */}
          {placeTypes.map(type => (
            <div 
              key={type.id}
              className={`filter-item ${activeFilter === type.id ? 'active' : ''}`}
              onClick={() => handleFilterClick(type.id)}
            >
              <span className="material-icons">{type.icon}</span>
              <span className="filter-label">{type.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Add the large aura match button at the bottom of the screen */}
      <button 
        className={`aura-match-button-large ${auraMatchEnabled ? 'active' : ''}`} 
        onClick={handleAuraToggle}
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 60px',
          backgroundColor: auraMatchEnabled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.85)',
          color: auraMatchEnabled ? '#000000' : '#ffffff',
          border: auraMatchEnabled ? '4px solid #ffffff' : '4px solid #ffffff',
          borderRadius: '40px',
          boxShadow: '0 6px 15px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s',
          cursor: 'pointer',
          fontSize: '60px',
          fontWeight: '600',
          width: '85%',
          maxWidth: '800px',
          height: '80px'
        }}
      >
        <span className="material-icons" style={{ marginRight: '15px', fontSize: '36px' }}>auto_awesome</span>
        <span>Aura Match {auraMatchEnabled ? 'ON' : 'OFF'}</span>
      </button>
      
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        // Only use the controlled center during initial loading
        // After that, let Google Maps handle its own position for smooth dragging
        center={initialMapLoad ? mapCenterRef.current : undefined}
        zoom={16.5}
        options={{
          ...options,
          draggableCursor: 'grab',
          draggingCursor: 'grabbing',
          backgroundColor: '#242f3e', // Match map background to reduce white flashes
        }}
        onClick={handleMapClick}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onZoomChanged={handleZoomChanged}
        onDrag={() => {
          // Mark map as actively dragging (used in filtering)
          if (mapRef.current) {
            mapRef.current.set('dragging', true);
            
            // Adjust map rendering during drag for smoother performance
            if (!mapRef.current.get('dragOptimized')) {
              mapRef.current.set('dragOptimized', true);
              
              // Add a class to optimize visual appearance during drag
              document.querySelector('.gm-style')?.classList.add('map-dragging');
            }
          }
        }}
        onDragEnd={() => {
          // Clear dragging state and update bounds
          if (mapRef.current) {
            mapRef.current.set('dragging', false);
            mapRef.current.set('dragOptimized', false);
            
            // Remove optimization class
            document.querySelector('.gm-style')?.classList.remove('map-dragging');
          }
          handleMapInteraction();
        }}
      >
        {/* Fixed User location marker that stays at geographic coordinates */}
        {currentLocation && currentLocation !== DEFAULT_CENTER && (
          <>
            {/* Pulsing background effect */}
            <Marker
              position={currentLocation}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
                    <style>
                      @keyframes pulse {
                        0% { opacity: 0.7; r: 50; }
                        50% { opacity: 0.2; r: 80; }
                        100% { opacity: 0.7; r: 50; }
                      }
                      .pulse {
                        animation: pulse 2s infinite ease-in-out;
                      }
                    </style>
                    <!-- Animated pulsing circle -->
                    <circle cx="100" cy="100" r="50" fill="rgba(255,255,255,0.5)" class="pulse" />
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(200, 200),
                anchor: new window.google.maps.Point(100, 100),
              }}
              zIndex={10000}
              options={{ 
                clickable: false,
                optimized: false 
              }}
            />
            {/* Central white dot */}
            <Marker
              position={currentLocation}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <!-- Main white circle with glow effect -->
                    <circle cx="50" cy="50" r="32" fill="white" filter="url(#glow)" />
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(100, 100),
                anchor: new window.google.maps.Point(50, 50),
              }}
              zIndex={10001}
              options={{ 
                clickable: false,
                optimized: false 
              }}
            />
          </>
        )}

        {/* Location markers with natural overlap */}
        {!loading && mapLoaded && filteredLocations.map((location, index) => {
          // Calculate position - either original or spread apart position if overlapped
          const position = overlappedArea ? 
            getSpreadPosition(
              location, 
              overlappedArea.locations.findIndex(l => l.id === location.id), 
              overlappedArea.locations.length,
              overlappedArea.center
            ) : 
            { lat: location.latitude, lng: location.longitude };
          
          const isOverlapped = overlappedArea && 
            overlappedArea.locations.findIndex(l => l.id === location.id) !== -1;
          
          const isHighlighted = location.id === highlightedLocationId;
            
          return (
            <AuraLocationMarker
              key={location.id || `loc-${index}`}
              location={location}
              position={position}
              onClick={() => handleLocationClick(location)}
              zoom={currentZoom}
              isExpanded={isOverlapped}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </GoogleMap>
      
      {/* Location detail modal */}
      {selectedLocation && (
        <LocationModal 
          location={selectedLocation} 
          onClose={handleModalClose}
          onAddToCollection={handleAddToCollection}
        />
      )}
      
      {/* Collection Modal */}
      {selectedLocation && isAddToCollectionModalOpen && (
        <AddToCollectionModal
          isOpen={isAddToCollectionModalOpen}
          onClose={handleCollectionModalClose}
          location={selectedLocation}
          collections={collections}
          onCreateCollection={handleCreateCollection}
          onAddToCollection={handleAddLocationToCollection}
        />
      )}
      
      {/* Close button for expanded overlapped markers */}
      {overlappedArea && (
        <button 
          className="close-overlap-button"
          onClick={() => setOverlappedArea(null)}
        >
          ✕
        </button>
      )}
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading locations...</p>
        </div>
      )}
      
      {/* Toast notification */}
      <CollectionToast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}

export default DiscoverScreen;
