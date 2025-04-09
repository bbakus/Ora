import React, { useState, useEffect } from 'react';
import './AddToCollectionModal.css';

// Helper function to determine place type color (copied from LocationModal.js)
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

// Helper function to format place type
const formatPlaceType = (type) => {
  if (!type) return '';
  return type.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const AddToCollectionModal = ({ 
  isOpen, 
  onClose, 
  location, 
  collections = [], 
  onCreateCollection, 
  onAddToCollection 
}) => {
  const [mode, setMode] = useState('select'); // 'select', 'create'
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [error, setError] = useState('');
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setNewCollectionName('');
      setSelectedCollectionId('');
      setError('');
    }
  }, [isOpen]);
  
  // Close modal with escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    if (mode === 'select') {
      if (!selectedCollectionId) {
        setError('Please select a collection');
        return;
      }
      
      // Debug log the selected ID
      console.log("Selected collection ID:", selectedCollectionId);
      
      // Make sure we're passing the ID correctly
      onAddToCollection(selectedCollectionId);
      onClose();
    } else if (mode === 'create') {
      if (!newCollectionName.trim()) {
        setError('Please enter a collection name');
        return;
      }
      
      // Create collection and get the ID back
      const collectionId = onCreateCollection(newCollectionName);
      console.log("New collection ID:", collectionId);
      
      if (collectionId) {
        onClose();
      }
    }
  };
  
  return (
    <div className="collection-modal-overlay" onClick={onClose}>
      <div className="collection-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="collection-modal-header">
          <h2>Add to Collection</h2>
          <div className="location-details">
            <p 
              className="location-name" 
              style={{
                backgroundColor: location.place_type ? getPlaceTypeColor(location.place_type) : '#4285F4',
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: '30px',
                marginBottom: '20px'
              }}
            >
              {location.name}
              {location.place_type && (
                <span className="place-type-label"> • {formatPlaceType(location.place_type)}</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="collection-modal-content">
          {mode === 'select' && (
            <>
              {collections.length > 0 ? (
                <>
                  <p className="instruction">Select a collection:</p>
                  
                  <div className="collections-list">
                    {collections.map(collection => {
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
                                  auraColor = `linear-gradient(45deg, ${firstLocation.aura.color1}, ${firstLocation.aura.color2})`;
                              } else if (firstLocation.aura.color) {
                                  // If it's already a gradient string, use it directly
                                  if (firstLocation.aura.color.includes('gradient')) {
                                      auraColor = firstLocation.aura.color;
                                  }
                                  // Try to extract hex colors from the string
                                  else {
                                      const colors = firstLocation.aura.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                                      if (colors && colors.length >= 2) {
                                          auraColor = `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`;
                                      } else if (colors && colors.length === 1) {
                                          auraColor = `linear-gradient(45deg, ${colors[0]}, ${colors[0]})`;
                                      }
                                  }
                              }
                          }
                      }
                      
                      return (
                        <div 
                          key={collection.id}
                          className={`collection-item ${selectedCollectionId === collection.id ? 'selected' : ''}`}
                          onClick={() => setSelectedCollectionId(collection.id)}
                        >
                          <div 
                            className="collection-color" 
                            style={{ background: auraColor }}
                          ></div>
                          <div className="collection-info">
                            <h3>{collection.name}</h3>
                            <p>{collection.location_count || 0} items</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mode-toggle">
                    <p>Or <button onClick={() => setMode('create')}>create a new collection</button></p>
                  </div>
                </>
              ) : (
                <>
                  <p className="empty-collections-message">You don't have any collections yet</p>
                  <button 
                    className="create-collection-btn" 
                    onClick={() => setMode('create')}
                  >
                    Create your first collection
                  </button>
                </>
              )}
            </>
          )}
          
          {mode === 'create' && (
            <>
              <p className="instruction">Name your new collection:</p>
              
              <input
                type="text"
                className="collection-name-input"
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                autoFocus
              />
              
              {collections.length > 0 && (
                <div className="mode-toggle">
                  <p>Or <button onClick={() => setMode('select')}>select an existing collection</button></p>
                </div>
              )}
            </>
          )}
          
          {error && <p className="error-message">{error}</p>}
        </div>
        
        <div className="collection-modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button 
            className="add-button"
            onClick={handleSubmit}
          >
            {mode === 'create' ? 'Create & Add' : 'Add to Collection'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToCollectionModal; 