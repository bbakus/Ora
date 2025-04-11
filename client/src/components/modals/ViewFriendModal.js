import React, {useEffect, useState} from "react";
import AuraVisualization from '../AuraVisualization';
import { useNavigate, useParams } from "react-router-dom";
import './ViewFriendModal.css';

function ViewFriendModal({friendId, onClose}) {
    const [friendData, setFriendData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [showCollectionLocations, setShowCollectionLocations] = useState(false);
    const [copyingCollection, setCopyingCollection] = useState(false);
    const { userId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFriendData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:5001/api/users/${friendId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch friend data');
                }
                const data = await response.json();
                
                // Fetch full collection data for each collection
                const collectionsWithLocations = await Promise.all(
                    data.collections.map(async (collection) => {
                        const collectionResponse = await fetch(`http://localhost:5001/api/users/${friendId}/collections/${collection.id}`);
                        if (!collectionResponse.ok) {
                            console.error(`Failed to fetch collection ${collection.id}`);
                            return collection;
                        }
                        const fullCollectionData = await collectionResponse.json();
                        return fullCollectionData;
                    })
                );
                
                setFriendData({
                    ...data,
                    collections: collectionsWithLocations
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFriendData();
    }, [friendId]);

    const validateShape = (shape) => {
        if (!shape) return 'balanced';
        
        const validShapes = ['soft', 'pulse', 'flowing', 'sparkle', 'balanced', 'pulsing', 'sparkling'];
        const normalizedShape = shape.toLowerCase().trim();
        
        const shapeMap = {
            'soft': 'balanced',
            'flow': 'flowing',
            'pulse': 'pulsing',
            'sparkle': 'sparkling'
        };
        
        return shapeMap[normalizedShape] || (validShapes.includes(normalizedShape) ? normalizedShape : 'balanced');
    };

    const getAuraData = () => {
        if (!friendData) return null;

        // First check if user has direct aura color fields
        if (friendData.aura_color1 && friendData.aura_color2 && friendData.aura_color3) {
            return {
                color1: friendData.aura_color1,
                color2: friendData.aura_color2,
                color3: friendData.aura_color3,
                shape: validateShape(friendData.aura_shape || 'balanced')
            };
        }
        
        // Then check if user has a single aura_color (gradient string)
        if (friendData.aura_color) {
            const colors = friendData.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
            if (colors && colors.length >= 3) {
                return {
                    color1: colors[0],
                    color2: colors[1],
                    color3: colors[2],
                    shape: validateShape(friendData.aura_shape || 'balanced')
                };
            }
            if (colors && colors.length >= 2) {
                return {
                    color1: colors[0],
                    color2: colors[1],
                    color3: colors[1],
                    shape: validateShape(friendData.aura_shape || 'balanced')
                };
            }
            if (colors && colors.length === 1) {
                return {
                    color1: colors[0],
                    color2: colors[0],
                    color3: colors[0],
                    shape: validateShape(friendData.aura_shape || 'balanced')
                };
            }
        }

        // Default fallback
        return {
            color1: '#0000FF',
            color2: '#800080',
            color3: '#00FFFF',
            shape: 'balanced'
        };
    };

    const handleCopyCollection = async (collectionId) => {
        console.log(`Copying collection ${collectionId} from user ${friendId} to user ${userId}`);
        
        try {
            setCopyingCollection(true);
            
            // Simple direct API call with proper headers
            const response = await fetch(`http://localhost:5001/api/users/${userId}/collections/copy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sourceUserId: parseInt(friendId),
                    collectionId: parseInt(collectionId)
                })
            });
            
            console.log('Response status:', response.status);
            
            // Parse the response
            const data = await response.text();
            console.log('Response text:', data);
            
            let responseData;
            try {
                responseData = JSON.parse(data);
                console.log('Parsed response:', responseData);
            } catch (e) {
                console.log('Could not parse response as JSON');
            }
            
            if (!response.ok) {
                throw new Error(responseData?.error || `Server error: ${response.status}`);
            }
            
            // Show success message
            alert('Collection copied successfully!');
        } catch (error) {
            console.error('Error copying collection:', error);
            alert(`Failed to copy collection: ${error.message}`);
        } finally {
            setCopyingCollection(false);
        }
    };

    const handleViewCollection = (collection) => {
        setSelectedCollection(collection);
        setShowCollectionLocations(true);
    };

    const getLocationAuraGradient = (location) => {
        if (!location) return 'linear-gradient(125deg, #6d4aff, #9e8aff)';
        
        // Check for direct aura color fields first
        if (location.aura_color1 && location.aura_color2) {
            if (location.aura_color3) {
                return `linear-gradient(125deg, ${location.aura_color1}, ${location.aura_color2}, ${location.aura_color3})`;
            }
            return `linear-gradient(125deg, ${location.aura_color1}, ${location.aura_color2})`;
        } 
        // Then check for aura_color string
        else if (location.aura_color) {
            if (location.aura_color.includes('gradient')) {
                return location.aura_color;
            } else {
                const colors = location.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                if (colors && colors.length >= 3) {
                    return `linear-gradient(125deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
                } else if (colors && colors.length >= 2) {
                    return `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                } else if (colors && colors.length === 1) {
                    return colors[0]; // Single solid color
                }
            }
        }
        
        // Default
        return 'linear-gradient(125deg, #6d4aff, #9e8aff)';
    };

    const handleViewLocationOnMap = (location) => {
        // Close the current modal
        onClose();
        
        // Set the complete location data in localStorage - this is key for the modal to open
        localStorage.setItem('selectedLocation', JSON.stringify(location));
        
        // Set the open flag separately
        localStorage.setItem('openLocationDetail', 'true');
        
        // Also store the source dashboard userId to enable proper back navigation
        localStorage.setItem('sourceUserId', userId);
        
        // Navigate to discover screen with userId to ensure back button works correctly
        navigate(`/discover/${userId}`);
    };

    if (loading) {
        return (
            <div className="view-friend-modal-container">
                <div className="view-friend-modal-content">
                    <div className="view-friend-modal-loading">Loading...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="view-friend-modal-container">
                <div className="view-friend-modal-content">
                    <div className="view-friend-modal-error">{error}</div>
                    <button className="view-friend-modal-close-button" onClick={onClose}>×</button>
                </div>
            </div>
        );
    }

    const auraData = getAuraData();

    return (
        <div className="view-friend-modal-container">
            <div className="view-friend-modal-content">
                <button className="view-friend-modal-close-button" onClick={onClose}>×</button>
                
               
                
                <div className="view-friend-modal-header">
                    <h2>{friendData.username}</h2>
                    <div className="view-friend-modal-aura-container">
                        {auraData && (
                            <AuraVisualization
                                auraColor={`linear-gradient(45deg, ${auraData.color1}, ${auraData.color2}, ${auraData.color3})`}
                                auraShape={auraData.shape}
                                responseSpeed="medium"
                            />
                        )}
                    </div>
                </div>

                <div className="view-friend-modal-collections">
                    <h3>Collections</h3>
                    {friendData.collections && friendData.collections.length > 0 ? (
                        <div className="view-friend-modal-collections-grid">
                            {friendData.collections.map(collection => {
                                // Determine aura gradient for the collection
                                let auraColor = 'linear-gradient(125deg, #6d4aff, #9e8aff)';
                                if (collection.locations && collection.locations.length > 0) {
                                    const firstLocation = collection.locations[0];
                                    if (firstLocation.aura_color1 && firstLocation.aura_color2) {
                                        auraColor = `linear-gradient(125deg, ${firstLocation.aura_color1}, ${firstLocation.aura_color2})`;
                                    } else if (firstLocation.aura_color) {
                                        if (firstLocation.aura_color.includes('gradient')) {
                                            auraColor = firstLocation.aura_color;
                                        } else {
                                            const colors = firstLocation.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                                            if (colors && colors.length >= 2) {
                                                auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                                            }
                                        }
                                    }
                                }

                                return (
                                    <div 
                                        key={collection.id} 
                                        className="view-friend-modal-collection-card"
                                        onClick={() => handleViewCollection(collection)}
                                    >
                                        <div className="collection-aura" style={{ background: auraColor }}></div>
                                        <div className="collection-info">
                                            <h4>{collection.name}</h4>
                                            <p>{collection.locations?.length || 0} locations</p>
                                        </div>
                                        <div className="collection-actions">
                                            <button 
                                                className="copy-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyCollection(collection.id);
                                                }}
                                                disabled={copyingCollection}
                                            >
                                                <span className="material-icons">
                                                    {copyingCollection ? 'hourglass_empty' : 'content_copy'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="no-collections">No collections available</p>
                    )}
                </div>

                {showCollectionLocations && selectedCollection && (
                    <div className="friend-collection-locations-modal">
                        <div className="friend-collection-locations-content">
                            <div className="friend-collection-locations-header" style={{ 
                                background: selectedCollection.locations && 
                                         selectedCollection.locations.length > 0 ? 
                                         getLocationAuraGradient(selectedCollection.locations[0]) : 
                                         'linear-gradient(125deg, #6d4aff, #9e8aff)'
                            }}>
                                <h3>{selectedCollection.name}</h3>
                                <button 
                                    className="close-button"
                                    onClick={() => setShowCollectionLocations(false)}
                                >
                                    <span className="material-icons">close</span>
                                </button>
                            </div>
                            <div className="friend-collection-locations-grid">
                                {selectedCollection.locations.map((location) => {
                                    // Determine aura gradient for the location
                                    let locationAura = 'linear-gradient(125deg, #6d4aff, #9e8aff)';
                                    
                                    // Check for direct aura color fields first
                                    if (location.aura_color1 && location.aura_color2) {
                                        locationAura = `linear-gradient(125deg, ${location.aura_color1}, ${location.aura_color2})`;
                                        if (location.aura_color3) {
                                            locationAura = `linear-gradient(125deg, ${location.aura_color1}, ${location.aura_color2}, ${location.aura_color3})`;
                                        }
                                    } 
                                    // Then check for aura_color string
                                    else if (location.aura_color) {
                                        if (location.aura_color.includes('gradient')) {
                                            locationAura = location.aura_color;
                                        } else {
                                            const colors = location.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                                            if (colors && colors.length >= 2) {
                                                locationAura = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                                                if (colors.length >= 3) {
                                                    locationAura = `linear-gradient(125deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
                                                }
                                            } else if (colors && colors.length === 1) {
                                                locationAura = colors[0]; // Single solid color
                                            }
                                        }
                                    }
                                    
                                    return (
                                        <div 
                                            key={location.id} 
                                            className="friend-location-card"
                                            onClick={() => handleViewLocationOnMap(location)}
                                        >
                                            <div 
                                                className="friend-location-aura"
                                                style={{ background: locationAura }}
                                            ></div>
                                            <div className="friend-location-info">
                                                <h4>{location.name}</h4>
                                            </div>
                                        </div>
                                    );
                                })}
                                {selectedCollection.locations.length === 0 && (
                                    <p className="friend-no-locations">No locations in this collection</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ViewFriendModal;

