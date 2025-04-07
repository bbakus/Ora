import React, { useState } from 'react';
import { Marker } from '@react-google-maps/api';
import './AuraLocationMarker.css';

// SVG aura shapes
const AuraShapes = {
  soft: (size, color) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#FFFFFF"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `,
  pulse: (size, color) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#FFFFFF"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `,
  flowing: (size, color) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#FFFFFF"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `,
  sparkle: (size, color) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#FFFFFF"/>
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r="24" fill="url(#auraGrad)"/>
    </svg>
  `
};

function AuraLocationMarker({ location, position, onClick, zoom = 15, isExpanded = false, isHighlighted = false }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Extract aura data from location - handle both formats
  const getAuraData = () => {
    // First try the aura object
    if (location.aura) {
      return {
        color: location.aura.color,
        shape: location.aura.shape
      };
    }
    
    // Then try direct aura properties on location
    if (location.aura_color1 && location.aura_color2) {
      return {
        color: `linear-gradient(45deg, ${location.aura_color1}, ${location.aura_color2})`,
        shape: location.aura_shape
      };
    }
    
    if (location.aura_color || location.aura_shape) {
      return {
        color: location.aura_color,
        shape: location.aura_shape
      };
    }
    
    // Fallback to defaults
    return {
      color: 'linear-gradient(45deg, #7B1FA2, #BA68C8)',
      shape: 'soft'
    };
  };

  const auraData = getAuraData();
  
  // Extract both colors from the gradient
  let startColor = "#7B1FA2"; // Default primary color
  let endColor = "#BA68C8"; // Default secondary color
  
  if (auraData.color) {
    try {
      // Check if it's a gradient
      if (auraData.color.includes('linear-gradient')) {
        // Extract both colors from gradient
        const colors = auraData.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
        if (colors && colors.length >= 2) {
          startColor = colors[0];
          endColor = colors[1];
        } else if (colors && colors.length === 1) {
          startColor = colors[0];
        }
      } else {
        // Use the color directly
        startColor = auraData.color;
        endColor = auraData.color; 
      }
    } catch (e) {
      console.error("Error parsing aura color:", e);
    }
  }

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
  
  // Create SVG with the extracted gradient colors
  const svgContent = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 50 65" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${startColor}"/>
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
        filter="${auraData.shape === 'soft' ? 'url(#softGlow)' : 'url(#glow)'}" />
      
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