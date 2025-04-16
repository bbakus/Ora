import React from 'react';
import './LocationModal.css';
import AuraVisualization from '../AuraVisualization'; // Import the AuraVisualization component

// Helper function to convert aura name to short format
const convertToShortFormat = (name) => {
  if (!name) return 'balanced-neutral-calm';
  
  // Remove any 'aura' or 'vibe' words and convert to lowercase
  const shortName = name.toLowerCase()
    .replace(/\b(aura|vibe)\b/g, '')
    .trim()
    .replace(/\s+/g, '-');
  
  return shortName || 'balanced-neutral-calm';
};

// Helper function to validate and normalize aura shape
const validateShape = (shape) => {
  if (!shape) return 'balanced';
  
  const validShapes = ['soft', 'pulse', 'flowing', 'sparkle', 'balanced', 'pulsing', 'sparkling'];
  const normalizedShape = shape.toLowerCase().trim();
  
  // Map legacy shape names to new ones
  const shapeMap = {
    'soft': 'balanced',
    'flow': 'flowing',
    'pulse': 'pulsing',
    'sparkle': 'sparkling'
  };
  
  return shapeMap[normalizedShape] || (validShapes.includes(normalizedShape) ? normalizedShape : 'balanced');
};

// These functions can be moved to a utility file
const formatPlaceType = (type) => {
  if (!type) return '';
  return type.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getPlaceTypeColor = (type) => {
  if (!type) return '#4285F4';
  
  // Define colors for different place types
  const typeColors = {
    restaurant: '#FF5252',
    cafe: '#FFA000',
    bar: '#7C4DFF',
    park: '#4CAF50',
    museum: '#00BCD4',
    store: '#FF9800',
    hotel: '#3F51B5',
    gym: '#F44336',
    theater: '#9C27B0',
    bakery: '#795548',
    grocery: '#009688',
    nightclub: '#673AB7'
  };
  
  // Look for partial matches in the type
  for (const [key, color] of Object.entries(typeColors)) {
    if (type.toLowerCase().includes(key)) {
      return color;
    }
  }
  
  return '#4285F4'; // Default color
};

// Generate a quirky detail based on location
const getQuirkyDetail = (locationData) => {
  if (!locationData) return '';
  
  const details = [
    "Popular among locals who appreciate authentic experiences.",
    "The perfect spot to escape the hustle and bustle of city life.",
    "Visitors often mention the unique atmosphere of this place.",
    "A hidden gem that feels like stepping into another world.",
    "Known for its welcoming staff and attention to detail.",
    "Has a certain magic that keeps people coming back.",
    "This spot captures the essence of the neighborhood.",
    "A favorite for those seeking something off the beaten path.",
    "Blends tradition and innovation in a beautiful way.",
    "The kind of place that makes lasting memories."
  ];
  
  // Use the location ID to select a detail (or randomize if no ID)
  const detailIndex = locationData.id 
    ? parseInt(locationData.id.toString().slice(-1)) % details.length 
    : Math.floor(Math.random() * details.length);
  
  return details[detailIndex];
};

const LocationModal = ({ location, onClose, onAddToCollection }) => {
  // Generate the quirky detail inside the component where 'location' prop is available
  const quirkyDetail = getQuirkyDetail(location);
  
  // Format aura name for display - completely remove the word 'aura'
  const formatAuraName = (hyphenatedName) => {
    if (!hyphenatedName) return '';
    
    // Split by hyphens and filter out any variant of 'aura'
    const filteredWords = hyphenatedName
      .split('-')
      .filter(word => !word.toLowerCase().includes('aura'));
    
    // Capitalize each remaining word
    return filteredWords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' · ');
  };
  
  // Get aura data from location object or use default values
  const getAuraData = (location) => {
    // First check if location has direct aura color fields
    if (location.aura_color1 && location.aura_color2 && location.aura_color3) {
      console.log("Using direct aura color fields:", location.aura_color1, location.aura_color2, location.aura_color3);
      return {
        name: convertToShortFormat(location.aura_name),
        color1: location.aura_color1,
        color2: location.aura_color2,
        color3: location.aura_color3,
        shape: validateShape(location.aura_shape || 'balanced')
      };
    }
    
    // Then check if location has a single aura_color (gradient string)
    if (location.aura_color) {
      console.log("Using aura_color (gradient):", location.aura_color);
      // Try to extract colors from gradient string
      const colors = location.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
      if (colors && colors.length >= 3) {
        return {
          name: convertToShortFormat(location.aura_name),
          color1: colors[0],
          color2: colors[1],
          color3: colors[2],
          shape: validateShape(location.aura_shape || 'balanced')
        };
      }
      if (colors && colors.length >= 2) {
        return {
          name: convertToShortFormat(location.aura_name),
          color1: colors[0],
          color2: colors[1],
          color3: colors[1], // Use second color as third color
          shape: validateShape(location.aura_shape || 'balanced')
        };
      }
      // Fallback to using the single color three times
      if (colors && colors.length === 1) {
        return {
          name: convertToShortFormat(location.aura_name),
          color1: colors[0],
          color2: colors[0],
          color3: colors[0],
          shape: validateShape(location.aura_shape || 'balanced')
        };
      }
    }

    // Check if location has an aura object
    if (location.aura && typeof location.aura === 'object') {
      console.log("Using location.aura object:", location.aura);
      if (location.aura.color1 && location.aura.color2 && location.aura.color3) {
        return {
          name: convertToShortFormat(location.aura.name),
          color1: location.aura.color1,
          color2: location.aura.color2,
          color3: location.aura.color3,
          shape: validateShape(location.aura.shape || 'balanced')
        };
      }
      
      // Try to extract colors from a gradient string in location.aura.color
      if (location.aura.color) {
        const colors = location.aura.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
        if (colors && colors.length >= 3) {
          return {
            name: convertToShortFormat(location.aura.name),
            color1: colors[0],
            color2: colors[1],
            color3: colors[2],
            shape: validateShape(location.aura.shape || 'balanced')
          };
        }
        if (colors && colors.length >= 2) {
          return {
            name: convertToShortFormat(location.aura.name),
            color1: colors[0],
            color2: colors[1],
            color3: colors[1], // Use second color as third color
            shape: validateShape(location.aura.shape || 'balanced')
          };
        }
        // Fallback to using the single color three times
        if (colors && colors.length === 1) {
          return {
            name: convertToShortFormat(location.aura.name),
            color1: colors[0],
            color2: colors[0],
            color3: colors[0],
            shape: validateShape(location.aura.shape || 'balanced')
          };
        }
      }
    }
    
    // Finally fall back to defaults
    console.log("Using default aura colors");
    return {
      name: 'balanced-neutral-calm',
      color1: '#7B1FA2',
      color2: '#BA68C8',
      color3: '#E1BEE7',
      shape: 'balanced'
    };
  };
  
  const auraData = getAuraData(location);
  
  // Format the aura name for display
  const formattedAuraName = formatAuraName(auraData.name);
  
  // Extract all three colors from the gradient
  let startColor = auraData.color1 || "#7B1FA2"; // Default primary color
  let middleColor = auraData.color2 || "#BA68C8"; // Default secondary color
  let endColor = auraData.color3 || "#E1BEE7"; // Default tertiary color
  
  // Add logging to help debug
  console.log("Location modal data:", {
    locationName: location.name,
    locationId: location.id,
    auraData,
    startColor,
    middleColor,
    endColor
  });
  
  // The renderAuraVisualization function will now use the AuraVisualization component
  const renderAuraVisualization = () => {
    const { color1, color2, color3, shape, name } = auraData;
    
    // Convert the three colors to a gradient string for AuraVisualization
    const gradientString = `linear-gradient(125deg, ${color1}, ${color2}, ${color3})`;
    
    // Maps database shape values to the actual shape names used in AuraVisualization
    // This ensures we use the EXACT SAME animations as the user aura
    const shapeMap = {
      'flowing': 'flowing',
      'balanced': 'balanced',
      'pulsing': 'pulsing',
      'sparkling': 'sparkling',
      // Support for legacy shape names
      'soft': 'balanced',
      'flow': 'flowing',
      'pulse': 'pulsing',
      'sparkle': 'sparkling'
    };
    
    // Get the correct shape name or default to balanced
    const auraShape = shapeMap[shape] || 'balanced';
    
    console.log("Rendering location aura shape:", auraShape, "from database value:", shape);
    
    return (
      <AuraVisualization 
        auraColor={gradientString}
        auraShape={auraShape}
        responseSpeed="medium" // Default speed
      />
    );
  };
  
  // Get icon for place type
  const getPlaceTypeIcon = (type) => {
    if (!type) return '📍';
    
    const typeIcon = {
      restaurant: '🍽️',
      cafe: '☕',
      bar: '🍹',
      park: '🌳',
      museum: '🏛️',
      store: '🛒',
      hotel: '🏨',
      gym: '💪',
      theater: '🎭',
      bakery: '🥐',
      grocery: '🛒',
      nightclub: '🎵'
    };
    
    // Look for partial matches in the type
    for (const [key, icon] of Object.entries(typeIcon)) {
      if (type.toLowerCase().includes(key)) {
        return icon;
      }
    }
    
    return '📍'; // Default if no match
  };
  
  // Open in Google Maps
  const openInGoogleMaps = () => {
    const { latitude, longitude, name } = location;
    const encodedName = encodeURIComponent(name);
    
    let googleMapsUrl;
    
    // If we have a Google Place ID, use that as priority (most accurate)
    if (location.google_place_id) {
      googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${location.google_place_id}`;
    } 
    // If we have a name and address, use that next
    else if (location.address) {
      const encodedAddress = encodeURIComponent(location.address);
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedName}+${encodedAddress}`;
    }
    // Fall back to coordinates only if that's all we have
    else {
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }
    
    window.open(googleMapsUrl, '_blank');
  };

  // Handle add to collection button click
  const handleAddToCollection = () => {
    if (onAddToCollection) {
      onAddToCollection(location);
    }
  };

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="location-modal-aura-visualization">
          {renderAuraVisualization()}
        </div>
        
        <div className="location-details">
          <h2>{location.name}</h2>
          
          {location.place_type && (
            <p 
              className="place-type" 
              style={{ 
                backgroundColor: getPlaceTypeColor(location.place_type),
                color: 'white',
                fontWeight: 'bold',
                boxShadow: `0 2px 4px rgba(0,0,0,0.2)`
              }}
            >
              {getPlaceTypeIcon(location.place_type)} {formatPlaceType(location.place_type)}
            </p>
          )}
          
          <p className="vibe-name">{formattedAuraName}</p>
          
          <div className="quirky-detail">
            <p>"{quirkyDetail}"</p>
          </div>
          
          <div className="location-metadata">
            <p className="address">{location.address}</p>
          </div>
          
          {onAddToCollection && (
            <button className="add-collection-button" onClick={handleAddToCollection}>
              Add to Collection
            </button>
          )}
          
          <div className="location-actions">
            <button className="google-maps-button" onClick={openInGoogleMaps}>
              Open in Google Maps
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationModal; 