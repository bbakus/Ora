import React from 'react';
import { Marker } from '@react-google-maps/api';

function UserAuraMarker({ position, zoom = 15 }) {
  // Make the marker larger and with brighter white color for better visibility
  const size = 80; // Fixed large size
  
  // Super simple white circle with no animations - guaranteed to work
  const svgContent = `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="userLocationGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="white" stop-opacity="1" />
          <stop offset="40%" stop-color="white" stop-opacity="0.7" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.3)" />
      <circle cx="50" cy="50" r="40" fill="white" stroke="black" stroke-width="1" />
      <circle cx="50" cy="50" r="25" fill="white" stroke="black" stroke-width="1" />
      <circle cx="50" cy="50" r="10" fill="white" />
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
        scaledSize: new window.google.maps.Size(size, size),
        origin: new window.google.maps.Point(0, 0),
        anchor: new window.google.maps.Point(size/2, size/2)
      }}
      zIndex={999}  // Highest z-index to ensure visibility
    />
  );
}

export default UserAuraMarker; 