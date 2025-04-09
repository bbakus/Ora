import React, { useState } from 'react';
import { Marker } from '@react-google-maps/api';
import './AuraLocationMarker.css';

// SVG aura shapes
const AuraShapes = {
  soft: (size, colors) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${colors.color1}"/>
          <stop offset="50%" stop-color="${colors.color2}"/>
          <stop offset="100%" stop-color="${colors.color3}"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `,
  pulse: (size, colors) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${colors.color1}"/>
          <stop offset="50%" stop-color="${colors.color2}"/>
          <stop offset="100%" stop-color="${colors.color3}"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `,
  flowing: (size, colors) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${colors.color1}"/>
          <stop offset="50%" stop-color="${colors.color2}"/>
          <stop offset="100%" stop-color="${colors.color3}"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `,
  sparkle: (size, colors) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${colors.color1}"/>
          <stop offset="50%" stop-color="${colors.color2}"/>
          <stop offset="100%" stop-color="${colors.color3}"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `
};

function AuraLocationMarker({ location, position, onClick, zoom = 15, isExpanded = false, isHighlighted = false }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const getAuraData = (props) => {
    const { location } = props || {};
    
    // Check if we have a location with aura colors
    if (location && (location.aura_color1 || location.aura_color2 || location.aura_color3)) {
      const color1 = location.aura_color1 || '#6F6FFF';
      const color2 = location.aura_color2 || '#FF6F6F';
      const color3 = location.aura_color3 || color2; // Use color3 if available, otherwise fallback to color2
      return {
        colors: [color1, color2, color3],
        gradientString: `linear-gradient(135deg, ${color1}, ${color2}, ${color3})`
      };
    }
    
    // Check if we have a raw aura color string (could be a gradient)
    if (location && location.aura_color) {
      const colorString = location.aura_color;
      
      // If it's a gradient string, extract the colors
      if (colorString && colorString.includes('gradient')) {
        const colorMatches = colorString.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) || [];
        if (colorMatches.length >= 3) {
          return {
            colors: [colorMatches[0], colorMatches[1], colorMatches[2]],
            gradientString: colorString
          };
        } else if (colorMatches.length >= 2) {
          // If only two colors found, duplicate the second one for the third color
          return {
            colors: [colorMatches[0], colorMatches[1], colorMatches[1]],
            gradientString: `linear-gradient(135deg, ${colorMatches[0]}, ${colorMatches[1]}, ${colorMatches[1]})`
          };
        }
      }
      
      // If it's a single color, use it for all three colors
      if (colorString && colorString.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/)) {
        return {
          colors: [colorString, colorString, colorString],
          gradientString: `linear-gradient(135deg, ${colorString}, ${colorString}, ${colorString})`
        };
      }
    }
    
    // Check if we have an aura object with a color property
    if (location && location.aura && location.aura.color) {
      const aura = location.aura;
      // If the color is a gradient string, extract the colors
      if (aura.color.includes('gradient')) {
        const colorMatches = aura.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) || [];
        if (colorMatches.length >= 3) {
          return {
            colors: [colorMatches[0], colorMatches[1], colorMatches[2]],
            gradientString: aura.color
          };
        } else if (colorMatches.length >= 2) {
          // If only two colors found, duplicate the second one for the third color
          return {
            colors: [colorMatches[0], colorMatches[1], colorMatches[1]],
            gradientString: `linear-gradient(135deg, ${colorMatches[0]}, ${colorMatches[1]}, ${colorMatches[1]})`
          };
        }
      }
      
      // If it's a single color, use it for all three colors
      if (aura.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/)) {
        return {
          colors: [aura.color, aura.color, aura.color],
          gradientString: `linear-gradient(135deg, ${aura.color}, ${aura.color}, ${aura.color})`
        };
      }
    }
    
    // Fallback to default colors if no aura data is found
    console.warn('No valid aura data found, using default colors');
    return {
      colors: ['#6F6FFF', '#FF6F6F', '#FF6F6F'],
      gradientString: 'linear-gradient(135deg, #6F6FFF, #FF6F6F, #FF6F6F)'
    };
  };

  const auraData = getAuraData({ location });
  
  // Extract all three colors
  let startColor = auraData.colors[0] || "#7B1FA2"; // Default primary color
  let middleColor = auraData.colors[1] || "#BA68C8"; // Default secondary color
  let endColor = auraData.colors[2] || "#E1BEE7"; // Default tertiary color
  
  // Determine marker size based on zoom level
  const getMarkerSize = () => {
    // Base size that is increased if hovered
    let baseSize = 0;
    if (zoom >= 19) baseSize = 100; // Increased from 84 - fully zoomed in
    else if (zoom >= 18) baseSize = 90; // Increased from 72
    else if (zoom >= 17) baseSize = 80; // Increased from 60
    else if (zoom >= 16) baseSize = 70; // Increased from 54
    else if (zoom >= 15) baseSize = 60; // Increased from 48
    else if (zoom >= 14) baseSize = 50; // Increased from 42
    else if (zoom >= 13) baseSize = 45; // Increased from 36
    else if (zoom >= 12) baseSize = 40; // Increased from 30 - about 2 stops out
    else if (zoom >= 10) baseSize = 35; // Increased from 24
    else baseSize = 30; // Increased from 18 - Very small when zoomed far out
    
    // Return a slightly larger size when hovered
    return isHovered ? baseSize * 1.1 : baseSize;
  };

  const size = getMarkerSize();
  
  // For highlighted markers, create a larger SVG to contain the glow effect
  const svgWidth = isHighlighted ? size * 1.8 : size;
  const svgHeight = isHighlighted ? size * 2.0 : (size * 1.3);
  
  // Calculate the correct anchor point
  const anchorX = svgWidth / 2;
  const anchorY = size;
  
  // Get the appropriate aura shape based on location data
  const shape = location.aura_shape || 'flowing';
  const colorObject = {
    color1: startColor,
    color2: middleColor,
    color3: endColor
  };

  // Create SVG with the extracted gradient colors
  const svgContent = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 50 65" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${startColor}"/>
          <stop offset="50%" stop-color="${middleColor}"/>
          <stop offset="100%" stop-color="${endColor}"/>
        </linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="${isHovered ? 3.5 : 2}" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${isHovered ? 5 : 3}" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Pin drop shadow -->
      <path d="M25 25 L40 43 L25 65 L10 43 Z" 
        fill="rgba(0,0,0,0.2)" transform="translate(1,1)" />
      
      <!-- White pin shape with sharp point -->
      <path d="M25 25 L40 43 L25 65 L10 43 Z" 
        fill="white" stroke="#ddd" stroke-width="0.5" />
      
      <!-- White circle border around aura -->
      <circle cx="25" cy="25" r="24" fill="white" />
      
      <!-- Aura circle -->
      <circle cx="25" cy="25" r="22" fill="url(#auraGrad)" 
        filter="${shape === 'soft' ? 'url(#softGlow)' : 'url(#glow)'}" />
      
      ${isHighlighted ? `
      <!-- Static highlight ring (no animation) -->
      <circle cx="25" cy="25" r="28" fill="none" stroke="${startColor}" stroke-width="1.5" opacity="0.7" />
      ` : ''}
    </svg>
  `;

  // Convert SVG to data URL
  const svgBase64 = window.btoa(svgContent);
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  return (
    <Marker
      position={position}
      icon={{
        url: dataUrl,
        scaledSize: new window.google.maps.Size(svgWidth, svgHeight),
        origin: new window.google.maps.Point(0, 0),
        anchor: new window.google.maps.Point(anchorX, anchorY)
      }}
      onClick={() => onClick(location)}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      zIndex={isHighlighted ? 2500 : (isHovered ? 2000 : (isExpanded ? 1500 : 1000))}
      animation={null}
      opacity={1}
      clickable={true}
      options={{
        clickable: true,
        optimized: false,
        raiseOnDrag: true,
        draggable: false,
        zIndex: isHighlighted ? 2500 : (isHovered ? 2000 : (isExpanded ? 1500 : 1000)),
        cursor: 'pointer',
      }}
    />
  );
}

export default AuraLocationMarker; 