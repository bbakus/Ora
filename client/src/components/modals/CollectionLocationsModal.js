import React, { useState, useEffect } from 'react';
import './CollectionLocationsModal.css';

const CollectionLocationsModal = ({ isOpen, onClose, collection, onLocationClick }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localCollection, setLocalCollection] = useState(null);

  useEffect(() => {
    if (isOpen && collection) {
      console.log("Collection opened:", collection);
      setEditedName(collection.name);
      setLocalCollection(collection);
      setIsEditMode(false);
      setShowNameEdit(false);
      setIsDeleting(false);
      
      // Log all locations and their aura data
      if (collection.locations) {
        collection.locations.forEach(location => {
          console.log("Location:", location.name, "Aura data:", {
            aura_color1: location.aura_color1,
            aura_color2: location.aura_color2,
            aura_color: location.aura_color,
            aura: location.aura
          });
        });
      }
    }
  }, [isOpen, collection]);

  if (!isOpen || !localCollection) return null;

  const handleEditClick = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setShowNameEdit(false);
      setIsDeleting(false);
    }
  };

  const handleDeleteLocation = async (locationId, e) => {
    e.stopPropagation(); // Prevent location click
    
    try {
      const userId = localStorage.getItem('userId') || localCollection.user_id;
      
      if (!userId) {
        console.error("No user ID available for deleting location");
        return;
      }
      
      console.log(`Deleting location ${locationId} from collection ${localCollection.id}`);
      
      // Optimistically update UI
      const updatedLocations = localCollection.locations.filter(loc => loc.id !== locationId);
      setLocalCollection({
        ...localCollection,
        locations: updatedLocations,
        location_count: updatedLocations.length
      });
      
      // Use the regular collection endpoint with a query parameter
      const response = await fetch(`http://localhost:5001/api/users/${userId}/collections/${localCollection.id}?location_id=${locationId}`, {
        method: 'DELETE',
      });
      
      console.log(`Delete response status: ${response.status}`);
      
      // Update collections in parent component
      if (window.oraApp?.dashboard?.refreshCollections) {
        window.oraApp.dashboard.refreshCollections();
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      
      // Refresh collections anyway
      if (window.oraApp?.dashboard?.refreshCollections) {
        window.oraApp.dashboard.refreshCollections();
      }
    }
  };

  const handleNameEdit = () => {
    setShowNameEdit(!showNameEdit);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      console.error("Collection name cannot be empty");
      return;
    }
    
    console.log(`Renaming collection ${localCollection.id} to "${editedName}"`);
    
    // Optimistically update UI
    setLocalCollection({
      ...localCollection,
      name: editedName
    });
    
    try {
      const userId = localStorage.getItem('userId') || localCollection.user_id;
      
      if (!userId) {
        console.error("No user ID available for updating collection name");
        return;
      }
      
      const response = await fetch(`http://localhost:5001/api/users/${userId}/collections/${localCollection.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName
        }),
      });
      
      console.log(`Rename collection response status: ${response.status}`);
      
      // Update the collections in parent component
      if (window.oraApp?.dashboard?.refreshCollections) {
        window.oraApp.dashboard.refreshCollections();
      }
      
      setShowNameEdit(false);
    } catch (error) {
      console.error('Error updating collection name:', error);
      
      // Still try to refresh collections
      if (window.oraApp?.dashboard?.refreshCollections) {
        window.oraApp.dashboard.refreshCollections();
      }
      
      setShowNameEdit(false);
    }
  };

  const handleDeleteCollection = async () => {
    console.log(`Deleting collection ${localCollection.id}`);
    
    try {
      const userId = localStorage.getItem('userId') || localCollection.user_id;
      
      if (!userId) {
        console.error("No user ID available for deleting collection");
        return;
      }
      
      const response = await fetch(`http://localhost:5001/api/users/${userId}/collections/${localCollection.id}`, {
        method: 'DELETE',
      });
      
      console.log(`Delete collection response status: ${response.status}`);
      
      // Update the collections in parent component
      if (window.oraApp?.dashboard?.refreshCollections) {
        window.oraApp.dashboard.refreshCollections();
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error deleting collection:', error);
      
      // Still try to refresh and close
      if (window.oraApp?.dashboard?.refreshCollections) {
        window.oraApp.dashboard.refreshCollections();
      }
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay directly, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="collection-modal-overlay" onClick={handleOverlayClick}>
      <div className="collection-locations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {showNameEdit ? (
            <div className="name-edit-container">
              <input
                type="text"
                className="collection-name-input"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
              />
              <button className="save-name-button" onClick={handleSaveName}>Save</button>
            </div>
          ) : (
            <h2>{localCollection.name}</h2>
          )}
          
          <div className="header-actions">
            {isEditMode && (
              <button className="edit-action-button name-edit" onClick={handleNameEdit}>
                {showNameEdit ? 'Cancel' : 'Edit Name'}
              </button>
            )}
            <button className="edit-button" onClick={handleEditClick}>
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>
        
        <div className="locations-list">
          {localCollection.locations && localCollection.locations.length > 0 ? (
            localCollection.locations.map(location => {
              // Determine aura gradient
              let auraStyle = {};
              
              if (location.aura_color1 && location.aura_color2) {
                auraStyle.background = `linear-gradient(125deg, ${location.aura_color1}, ${location.aura_color2})`;
              } else if (location.aura?.color1 && location.aura?.color2) {
                auraStyle.background = `linear-gradient(125deg, ${location.aura.color1}, ${location.aura.color2})`;
              } else if (location.aura_color) {
                // Try to extract colors from aura_color string
                if (location.aura_color.includes('gradient')) {
                  // If it's already a gradient string, use it directly
                  auraStyle.background = location.aura_color;
                } else {
                  // Try to extract hex colors
                  const colors = location.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                  if (colors && colors.length >= 2) {
                    auraStyle.background = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                  } else if (colors && colors.length === 1) {
                    auraStyle.background = `linear-gradient(125deg, ${colors[0]}, ${colors[0]})`;
                  } else {
                    // Fallback to a default gradient
                    auraStyle.background = `linear-gradient(125deg, #6d4aff, #9e8aff)`;
                  }
                }
              } else if (location.aura?.color) {
                // Try to extract colors from aura.color string
                if (location.aura.color.includes('gradient')) {
                  // If it's already a gradient string, use it directly
                  auraStyle.background = location.aura.color;
                } else {
                  // Try to extract hex colors
                  const colors = location.aura.color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                  if (colors && colors.length >= 2) {
                    auraStyle.background = `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`;
                  } else if (colors && colors.length === 1) {
                    auraStyle.background = `linear-gradient(45deg, ${colors[0]}, ${colors[0]})`;
                  } else {
                    // Fallback to a default gradient
                    auraStyle.background = `linear-gradient(45deg, #6d4aff, #9e8aff)`;
                  }
                }
              } else {
                // Default gradient if no aura data found
                auraStyle.background = `linear-gradient(45deg, #6d4aff, #9e8aff)`;
              }
              
              return (
                <div 
                  key={location.id} 
                  className={`location-item ${isEditMode ? 'edit-mode' : ''}`}
                  onClick={() => {
                    if (!isEditMode && onLocationClick) {
                      onLocationClick(location);
                    }
                  }}
                >
                  {isEditMode && (
                    <button 
                      className="delete-button"
                      onClick={(e) => handleDeleteLocation(location.id, e)}
                    >
                      ×
                    </button>
                  )}
                  <div className="location-info">
                    <h3>{location.name}</h3>
                  </div>
                  <div className="location-aura" style={auraStyle}></div>
                </div>
              );
            })
          ) : (
            <div className="empty-locations">
              <p>No locations in this collection</p>
            </div>
          )}
        </div>
        
        {isEditMode && (
          <div className="delete-collection-container">
            <button className="delete-collection-button" onClick={handleDeleteCollection}>
              Delete Collection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionLocationsModal; 